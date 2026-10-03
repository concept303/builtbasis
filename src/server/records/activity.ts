import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { ItemParams } from '../http/params';
import { requireProject } from '../lists/projects';
import { requireRecord } from './store';

export type ActivityAction = 'created' | 'field_changed' | 'status_changed';

export interface ActivityInput {
  recordId: number;
  userId: number;
  at: string;
  action: ActivityAction;
  field?: string;
  from?: unknown;
  to?: unknown;
  detail?: Record<string, unknown>;
}

export interface ActivityEntry {
  id: number;
  at: string;
  by: string;
  action: ActivityAction;
  field: string | null;
  from: unknown;
  to: unknown;
  detail: Record<string, unknown> | null;
}

const toJson = (value: unknown): string | null => (value === undefined ? null : JSON.stringify(value));
const fromJson = (value: string | null): unknown => (value === null ? null : JSON.parse(value));

/** Appends one entry to the record's activity log (design §5.12). Entries are never changed or deleted. */
export function recordActivity(db: Db, entry: ActivityInput): void {
  db.prepare(
    'INSERT INTO activity (record_id, at, user_id, action, field, old_value, new_value, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    entry.recordId,
    entry.at,
    entry.userId,
    entry.action,
    entry.field ?? null,
    toJson(entry.from),
    toJson(entry.to),
    toJson(entry.detail),
  );
}

/** Newest first. */
export function listActivity(db: Db, recordId: number): ActivityEntry[] {
  const rows = db
    .prepare(
      `SELECT a.id, a.at, u.username, a.action, a.field, a.old_value AS oldValue, a.new_value AS newValue, a.detail
       FROM activity a JOIN users u ON u.id = a.user_id
       WHERE a.record_id = ? ORDER BY a.at DESC, a.id DESC`,
    )
    .all(recordId) as {
    id: number;
    at: string;
    username: string;
    action: ActivityAction;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
    detail: string | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    at: row.at,
    by: row.username,
    action: row.action,
    field: row.field,
    from: fromJson(row.oldValue),
    to: fromJson(row.newValue),
    detail: fromJson(row.detail) as Record<string, unknown> | null,
  }));
}

export function registerActivityRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/activity', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listActivity(db, id);
  });
}
