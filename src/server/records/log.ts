import type { FastifyInstance } from 'fastify';
import { LogEntryBody, LogEntryPatch, type LogEntryInput, type LogEntryPatchInput } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { requireRecord, touchRecord } from './store';

/** A Log entry (design §5.11). `loggedAt` and `editedAt` are stored for the record but not shown in the UI. */
export interface LogEntry {
  id: number;
  eventAt: string;
  text: string;
  private: boolean;
  loggedBy: string;
  loggedAt: string;
  editedAt: string | null;
}

type LogRow = Omit<LogEntry, 'private'> & { private: number };
const SELECT = `SELECT l.id, l.event_at AS eventAt, l.text, l.private, u.display_name AS loggedBy,
  l.logged_at AS loggedAt, l.edited_at AS editedAt
  FROM log_entries l JOIN users u ON u.id = l.logged_by`;
const toEntry = (row: LogRow): LogEntry => ({ ...row, private: row.private === 1 });

/** Event times are stored in UTC so that they sort correctly whatever offset the browser sent. */
const toUtc = (value: string): string => new Date(value).toISOString();

/** Newest first: by event time, then by logged-at (design §5.11). */
export function listLog(db: Db, recordId: number): LogEntry[] {
  return (
    db.prepare(`${SELECT} WHERE l.record_id = ? ORDER BY l.event_at DESC, l.logged_at DESC, l.id DESC`).all(recordId) as LogRow[]
  ).map(toEntry);
}

function requireEntry(db: Db, recordId: number, entryId: number): LogEntry {
  const row = db.prepare(`${SELECT} WHERE l.record_id = ? AND l.id = ?`).get(recordId, entryId) as LogRow | undefined;
  if (!row) throw new HttpError(404, 'log_entry_not_found');
  return toEntry(row);
}

export function addLogEntry(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  input: LogEntryInput,
  now: Date = new Date(),
): LogEntry {
  return db.transaction((): LogEntry => {
    requireRecord(db, projectId, recordId);
    const at = now.toISOString();
    const info = db
      .prepare(
        'INSERT INTO log_entries (record_id, event_at, text, private, logged_by, logged_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(recordId, input.eventAt ? toUtc(input.eventAt) : at, input.text, input.private ? 1 : 0, userId, at);
    touchRecord(db, recordId, userId, at);
    return requireEntry(db, recordId, Number(info.lastInsertRowid));
  })();
}

/** Event time, text and the private marker can change; logged-at and logged-by never do. */
export function updateLogEntry(
  db: Db,
  projectId: number,
  recordId: number,
  entryId: number,
  userId: number,
  patch: LogEntryPatchInput,
  now: Date = new Date(),
): LogEntry {
  return db.transaction((): LogEntry => {
    requireRecord(db, projectId, recordId);
    const current = requireEntry(db, recordId, entryId);
    const at = now.toISOString();
    db.prepare('UPDATE log_entries SET event_at = ?, text = ?, private = ?, edited_at = ? WHERE id = ?').run(
      patch.eventAt ? toUtc(patch.eventAt) : current.eventAt,
      patch.text ?? current.text,
      (patch.private ?? current.private) ? 1 : 0,
      at,
      entryId,
    );
    touchRecord(db, recordId, userId, at);
    return requireEntry(db, recordId, entryId);
  })();
}

/** The composite attachment FK cascades occurrence deletion in this transaction; stored blobs remain. */
export function deleteLogEntry(
  db: Db,
  projectId: number,
  recordId: number,
  entryId: number,
  userId: number,
  now: Date = new Date(),
): void {
  db.transaction(() => {
    requireRecord(db, projectId, recordId);
    requireEntry(db, recordId, entryId);
    db.prepare('DELETE FROM log_entries WHERE id = ?').run(entryId);
    touchRecord(db, recordId, userId, now.toISOString());
  })();
}

export function registerLogRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/log', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listLog(db, id);
  });

  app.post('/api/projects/:projectId/records/:id/log', async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    const entry = addLogEntry(db, projectId, id, requireUserId(request), LogEntryBody.parse(request.body));
    return reply.status(201).send(entry);
  });

  app.patch('/api/projects/:projectId/records/:id/log/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateLogEntry(db, projectId, id, itemId, requireUserId(request), LogEntryPatch.parse(request.body));
  });

  app.delete('/api/projects/:projectId/records/:id/log/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteLogEntry(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
}
