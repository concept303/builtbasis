import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  codesOf,
  foldText,
  isCode,
  type CodeOf,
  type ListKey,
  type Priority,
  type Severity,
  type Status,
  type Subtype,
} from '../../domain';
import type { Db } from '../db/connection';
import { ProjectParams } from '../http/params';
import { subtreeIds } from '../lists/locations';
import { requireProject } from '../lists/projects';

/** One row of the record list (design §10.2). */
export interface RecordSummary {
  id: number;
  humanId: string;
  subtype: Subtype;
  status: Status;
  title: string | null;
  ballInCourtId: number | null;
  dueDate: string | null;
  priority: Priority | null;
  severity: Severity | null;
  completion: number | null;
  safety: boolean;
  updatedAt: string;
}

export interface RecordList {
  records: RecordSummary[];
  /** Estimated cost sums only records currently marked Outside contract scope (design §5.4, §10.2). */
  totals: { count: number; estimatedCost: number };
}

/** Comma-separated values in one query parameter, e.g. status=open,issued */
const csv = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((part) => part.trim())
            .filter((part) => part !== '')
        : value,
    z.array(item).min(1),
  );
const codes = <K extends ListKey>(key: K) =>
  csv(z.custom<CodeOf<K>>((value) => isCode(key, value), `Unknown ${key} code`));
const ids = csv(z.coerce.number().int().positive());
const flag = z.enum(['true', 'false']).transform((value) => value === 'true');

/** Filters combine with AND; the values of one filter combine with OR. */
export const RecordListQuery = z.strictObject({
  subtype: codes('subtype').optional(),
  status: codes('status').optional(),
  severity: codes('severity').optional(),
  priority: codes('priority').optional(),
  stage: codes('stage').optional(),
  problemType: codes('problemType').optional(),
  locationId: ids.optional(),
  zoneTypeId: ids.optional(),
  tradeId: ids.optional(),
  tagId: ids.optional(),
  ballInCourtId: ids.optional(),
  responsibleId: ids.optional(),
  safety: flag.optional(),
  outsideScope: flag.optional(),
  /** Records that must be done before this record (its "requires first"). */
  before: z.coerce.number().int().positive().optional(),
  /** Records that require this record first (its "must be done before"). */
  after: z.coerce.number().int().positive().optional(),
  /** Unfinished records that must be done before at least one unfinished record. */
  blocking: flag.optional(),
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(),
  q: z.string().max(200).optional(),
  sort: z.enum(['id', 'due', 'priority', 'severity', 'updated']).default('id'),
  dir: z.enum(['asc', 'desc']).optional(),
});
export type RecordListQueryInput = z.output<typeof RecordListQuery>;

const UNFINISHED = "('closed', 'cancelled', 'superseded')";

/** Most urgent / most severe first; empty last. Codes come from the value lists, never from input. */
const rank = (column: string, key: 'priority' | 'severity'): string =>
  `CASE ${column} ${codesOf(key)
    .map((code, index) => `WHEN '${code}' THEN ${index}`)
    .join(' ')} ELSE 99 END`;

const SORTS: Record<RecordListQueryInput['sort'], { expression: string; defaultDir: 'asc' | 'desc'; nullsLast?: string }> = {
  id: { expression: 'r.human_id', defaultDir: 'asc' },
  due: { expression: 'r.due_date', defaultDir: 'asc', nullsLast: 'r.due_date IS NULL' },
  priority: { expression: rank('r.priority', 'priority'), defaultDir: 'asc', nullsLast: 'r.priority IS NULL' },
  severity: { expression: rank('r.severity', 'severity'), defaultDir: 'asc', nullsLast: 'r.severity IS NULL' },
  updated: { expression: 'r.updated_at', defaultDir: 'desc' },
};

const placeholders = (values: readonly unknown[]): string => values.map(() => '?').join(', ');
const likePattern = (text: string): string => `%${foldText(text).replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

/**
 * The record list with filters, text search, sorting and totals (design §5.5, §10.2).
 * A record ticked on several matching locations appears and counts once.
 */
export function listRecords(db: Db, projectId: number, query: RecordListQueryInput): RecordList {
  const where: string[] = ['r.project_id = ?'];
  const params: unknown[] = [projectId];
  const anyOf = (column: string, values: readonly unknown[] | undefined): void => {
    if (!values) return;
    where.push(`${column} IN (${placeholders(values)})`);
    params.push(...values);
  };
  const linkedTo = (table: string, column: string, values: readonly number[] | undefined): void => {
    if (!values) return;
    where.push(`EXISTS (SELECT 1 FROM ${table} l WHERE l.record_id = r.id AND l.${column} IN (${placeholders(values)}))`);
    params.push(...values);
  };
  /** A location filter includes every node inside the selected ones (design §5.5). */
  const locatedIn = (nodeIds: readonly number[]): void => {
    const all = [...new Set(nodeIds.flatMap((nodeId) => subtreeIds(db, projectId, nodeId)))];
    if (all.length === 0) where.push('0');
    else linkedTo('record_locations', 'location_id', all);
  };

  anyOf('r.subtype', query.subtype);
  anyOf('r.status', query.status);
  anyOf('r.severity', query.severity);
  anyOf('r.priority', query.priority);
  anyOf('r.stage', query.stage);
  anyOf('r.ball_in_court_id', query.ballInCourtId);
  anyOf('r.responsible_id', query.responsibleId);
  if (query.problemType) {
    where.push(`EXISTS (SELECT 1 FROM json_each(r.problem_types) j WHERE j.value IN (${placeholders(query.problemType)}))`);
    params.push(...query.problemType);
  }
  linkedTo('record_trades', 'trade_id', query.tradeId);
  linkedTo('record_tags', 'tag_id', query.tagId);
  if (query.locationId) locatedIn(query.locationId);
  if (query.zoneTypeId) {
    // Only nodes that carry the zone type; unlike a location filter, nodes inside them do not count (design §9.5).
    where.push(
      `EXISTS (SELECT 1 FROM record_locations l JOIN location_nodes n ON n.id = l.location_id
        WHERE l.record_id = r.id AND n.project_id = ? AND n.zone_type_id IN (${placeholders(query.zoneTypeId)}))`,
    );
    params.push(projectId, ...query.zoneTypeId);
  }
  if (query.safety !== undefined) {
    where.push('r.safety = ?');
    params.push(Number(query.safety));
  }
  if (query.outsideScope !== undefined) {
    where.push('r.outside_scope = ?');
    params.push(Number(query.outsideScope));
  }
  if (query.before !== undefined) {
    where.push('r.id IN (SELECT earlier_id FROM record_precedence WHERE later_id = ?)');
    params.push(query.before);
  }
  if (query.after !== undefined) {
    where.push('r.id IN (SELECT later_id FROM record_precedence WHERE earlier_id = ?)');
    params.push(query.after);
  }
  if (query.blocking !== undefined) {
    const blocks = `(r.status NOT IN ${UNFINISHED} AND EXISTS (
      SELECT 1 FROM record_precedence p JOIN records l ON l.id = p.later_id
      WHERE p.earlier_id = r.id AND l.status NOT IN ${UNFINISHED}))`;
    where.push(query.blocking ? blocks : `NOT ${blocks}`);
  }
  if (query.dueFrom) {
    where.push('r.due_date >= ?');
    params.push(query.dueFrom);
  }
  if (query.dueTo) {
    where.push('r.due_date <= ?');
    params.push(query.dueTo);
  }
  if (query.q && foldText(query.q) !== '') {
    where.push(
      "(bb_fold(r.title) LIKE ? ESCAPE '\\' OR bb_fold(r.description) LIKE ? ESCAPE '\\' OR bb_fold(r.human_id) LIKE ? ESCAPE '\\')",
    );
    const pattern = likePattern(query.q);
    params.push(pattern, pattern, pattern);
  }

  const sort = SORTS[query.sort];
  const dir = (query.dir ?? sort.defaultDir).toUpperCase();
  const orderBy = [sort.nullsLast, `${sort.expression} ${dir}`, 'r.human_id ASC'].filter(Boolean).join(', ');
  const whereSql = where.join(' AND ');

  const rows = db
    .prepare(
      `SELECT r.id, r.human_id AS humanId, r.subtype, r.status, r.title, r.ball_in_court_id AS ballInCourtId,
         r.due_date AS dueDate, r.priority, r.severity, r.completion, r.safety, r.updated_at AS updatedAt
       FROM records r WHERE ${whereSql} ORDER BY ${orderBy}`,
    )
    .all(...params) as (Omit<RecordSummary, 'safety'> & { safety: number })[];
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN r.outside_scope = 1 THEN r.estimated_cost_cents END), 0) AS cents
       FROM records r WHERE ${whereSql}`,
    )
    .get(...params) as { count: number; cents: number };

  return {
    records: rows.map((row) => ({ ...row, safety: row.safety === 1 })),
    totals: { count: totals.count, estimatedCost: totals.cents / 100 },
  };
}

export function registerRecordListRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listRecords(db, projectId, RecordListQuery.parse(request.query));
  });
}
