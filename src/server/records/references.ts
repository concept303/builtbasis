import type { Db } from '../db/connection';
import { HttpError } from '../errors';

type ListTable = 'people' | 'trades' | 'tags' | 'location_nodes';

/** Tags have no active flag (design §9.3). */
const HAS_ACTIVE: Record<ListTable, boolean> = { people: true, trades: true, tags: false, location_nodes: true };

/**
 * Checks managed-list entries chosen for a record field. Every id must belong to the project;
 * a newly selected entry must also be active. Inactive entries already on the record stay valid
 * (design §9.1, §9.2, §9.4).
 */
export function checkSelection(
  db: Db,
  projectId: number,
  table: ListTable,
  field: string,
  ids: readonly number[],
  current: readonly number[] = [],
): void {
  const added = ids.filter((id) => !current.includes(id));
  if (ids.length === 0) return;
  const active = HAS_ACTIVE[table] ? 'active' : '1 AS active';
  const rows = db
    .prepare(`SELECT id, ${active} FROM ${table} WHERE project_id = ? AND id IN (${ids.map(() => '?').join(', ')})`)
    .all(projectId, ...ids) as { id: number; active: number }[];
  const activeById = new Map(rows.map((row) => [row.id, row.active]));
  const missing = ids.filter((id) => !activeById.has(id));
  if (missing.length > 0) throw new HttpError(400, 'invalid_reference', { field, ids: missing });
  const inactive = added.filter((id) => activeById.get(id) !== 1);
  if (inactive.length > 0) throw new HttpError(400, 'inactive_selection', { field, ids: inactive });
}

/** One person field (ball in court, responsible, issued by, decided by, measured by, checked by). */
export function checkPerson(
  db: Db,
  projectId: number,
  field: string,
  personId: number | null | undefined,
  current: number | null = null,
): void {
  if (personId === undefined || personId === null) return;
  checkSelection(db, projectId, 'people', field, [personId], current === null ? [] : [current]);
}

/** The chosen option must be one of the record's own options (design §5.6). */
export function checkOption(db: Db, recordId: number, optionId: number | null | undefined): void {
  if (optionId === undefined || optionId === null) return;
  const found = db.prepare('SELECT 1 FROM decision_options WHERE record_id = ? AND id = ?').get(recordId, optionId);
  if (found === undefined) throw new HttpError(400, 'invalid_reference', { field: 'chosenOptionId', ids: [optionId] });
}
