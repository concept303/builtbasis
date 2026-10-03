import type { Status } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';

/** Multi-value references to managed lists live in join tables (design §11.3). */
const LINK_TABLES = {
  tradeIds: { table: 'record_trades', column: 'trade_id' },
  tagIds: { table: 'record_tags', column: 'tag_id' },
  locationIds: { table: 'record_locations', column: 'location_id' },
} as const;
export type LinkField = keyof typeof LINK_TABLES;
export const LINK_FIELDS = Object.keys(LINK_TABLES) as LinkField[];

/** Another record, as shown in "must be done before" and "requires first". */
export interface RecordRef {
  id: number;
  humanId: string;
  title: string | null;
  status: Status;
}

export function readLinkIds(db: Db, recordId: number, field: LinkField): number[] {
  const { table, column } = LINK_TABLES[field];
  return db.prepare(`SELECT ${column} FROM ${table} WHERE record_id = ? ORDER BY ${column}`).pluck().all(recordId) as number[];
}

export function replaceLinks(db: Db, recordId: number, field: LinkField, ids: readonly number[]): void {
  const { table, column } = LINK_TABLES[field];
  db.prepare(`DELETE FROM ${table} WHERE record_id = ?`).run(recordId);
  const insert = db.prepare(`INSERT INTO ${table} (record_id, ${column}) VALUES (?, ?)`);
  for (const id of ids) insert.run(recordId, id);
}

const REF_COLUMNS = 'r.id, r.human_id AS humanId, r.title, r.status';

/** Records this record must be done before (design §4.3). */
export function readMustBeDoneBefore(db: Db, recordId: number): RecordRef[] {
  return db
    .prepare(
      `SELECT ${REF_COLUMNS} FROM record_precedence p JOIN records r ON r.id = p.later_id
       WHERE p.earlier_id = ? ORDER BY r.human_id`,
    )
    .all(recordId) as RecordRef[];
}

/** Records that must be done before this one: the reverse view, "requires first" (design §4.3). */
export function readRequiresFirst(db: Db, recordId: number): RecordRef[] {
  return db
    .prepare(
      `SELECT ${REF_COLUMNS} FROM record_precedence p JOIN records r ON r.id = p.earlier_id
       WHERE p.later_id = ? ORDER BY r.human_id`,
    )
    .all(recordId) as RecordRef[];
}

/**
 * Replaces the records this record must be done before. Each must be another record of the same project,
 * and no link may close a cycle (design §4.3). Runs inside the caller's transaction.
 */
export function replaceMustBeDoneBefore(db: Db, projectId: number, recordId: number, laterIds: readonly number[]): void {
  if (laterIds.includes(recordId)) throw new HttpError(400, 'precedes_itself');
  if (laterIds.length > 0) {
    const placeholders = laterIds.map(() => '?').join(', ');
    const found = db
      .prepare(`SELECT id FROM records WHERE project_id = ? AND id IN (${placeholders})`)
      .pluck()
      .all(projectId, ...laterIds) as number[];
    const missing = laterIds.filter((id) => !found.includes(id));
    if (missing.length > 0) throw new HttpError(400, 'invalid_reference', { field: 'mustBeDoneBeforeIds', ids: missing });
  }
  db.prepare('DELETE FROM record_precedence WHERE earlier_id = ?').run(recordId);
  if (laterIds.length === 0) return;
  // A cycle appears if this record already has to wait for one of the new later records.
  const placeholders = laterIds.map(() => '?').join(', ');
  const cycle = db
    .prepare(
      `WITH RECURSIVE downstream(id) AS (
         SELECT later_id FROM record_precedence WHERE earlier_id IN (${placeholders})
         UNION
         SELECT p.later_id FROM record_precedence p JOIN downstream d ON p.earlier_id = d.id
       )
       SELECT 1 FROM downstream WHERE id = ? LIMIT 1`,
    )
    .get(...laterIds, recordId);
  if (cycle !== undefined) throw new HttpError(409, 'precedence_cycle');
  const insert = db.prepare('INSERT INTO record_precedence (earlier_id, later_id) VALUES (?, ?)');
  for (const laterId of laterIds) insert.run(recordId, laterId);
}
