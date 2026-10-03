import type { FastifyInstance } from 'fastify';
import {
  duplicateRowKeys,
  MeasurementSetBody,
  MeasurementSetPatch,
  orderSets,
  type MeasurementPhase,
  type MeasurementRowInput,
  type MeasurementSetInput,
  type MeasurementSetPatchInput,
  type Unit,
} from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { checkPerson } from './references';
import { requireRecord, touchRecord } from './store';

export interface MeasurementRowOut {
  item: string;
  quantity: string;
  value: number;
  unit: Unit;
  note: string | null;
}

/** Rows keep the order they were entered in; the browser computes the comparisons with the shared domain functions. */
export interface MeasurementSetOut {
  id: number;
  date: string;
  measuredById: number | null;
  phase: MeasurementPhase;
  note: string | null;
  rows: MeasurementRowOut[];
}

type SetRow = Omit<MeasurementSetOut, 'rows'>;
const SET_COLUMNS = 'id, date, measured_by_id AS measuredById, phase, note';

function rowsOf(db: Db, setId: number): MeasurementRowOut[] {
  return db
    .prepare('SELECT item, quantity, value, unit, note FROM measurement_rows WHERE set_id = ? ORDER BY position')
    .all(setId) as MeasurementRowOut[];
}

/** Sets in set order: measurement date, then creation order (design §5.7). */
export function listMeasurementSets(db: Db, recordId: number): MeasurementSetOut[] {
  const sets = db.prepare(`SELECT ${SET_COLUMNS} FROM measurement_sets WHERE record_id = ?`).all(recordId) as SetRow[];
  return orderSets(sets).map((set) => ({ ...set, rows: rowsOf(db, set.id) }));
}

function requireSet(db: Db, recordId: number, setId: number): MeasurementSetOut {
  const set = db.prepare(`SELECT ${SET_COLUMNS} FROM measurement_sets WHERE record_id = ? AND id = ?`).get(recordId, setId) as
    | SetRow
    | undefined;
  if (!set) throw new HttpError(404, 'measurement_set_not_found');
  return { ...set, rows: rowsOf(db, setId) };
}

/** Item + Quantity + Unit must be unique within a set after normalising the labels (design §5.7). */
function replaceRows(db: Db, setId: number, rows: readonly MeasurementRowInput[]): void {
  const duplicates = duplicateRowKeys(rows);
  if (duplicates.length > 0) throw new HttpError(422, 'duplicate_measurement_rows', { keys: duplicates });
  db.prepare('DELETE FROM measurement_rows WHERE set_id = ?').run(setId);
  const insert = db.prepare(
    'INSERT INTO measurement_rows (set_id, position, item, quantity, value, unit, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  rows.forEach((row, index) => insert.run(setId, index + 1, row.item, row.quantity, row.value, row.unit, row.note ?? null));
}

export function addMeasurementSet(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  input: MeasurementSetInput,
  now: Date = new Date(),
): MeasurementSetOut {
  return db.transaction((): MeasurementSetOut => {
    requireRecord(db, projectId, recordId);
    checkPerson(db, projectId, 'measuredById', input.measuredById);
    const at = now.toISOString();
    const info = db
      .prepare(
        'INSERT INTO measurement_sets (record_id, date, measured_by_id, phase, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(recordId, input.date, input.measuredById ?? null, input.phase, input.note ?? null, at);
    const setId = Number(info.lastInsertRowid);
    replaceRows(db, setId, input.rows ?? []);
    touchRecord(db, recordId, userId, at);
    return requireSet(db, recordId, setId);
  })();
}

export function updateMeasurementSet(
  db: Db,
  projectId: number,
  recordId: number,
  setId: number,
  userId: number,
  patch: MeasurementSetPatchInput,
  now: Date = new Date(),
): MeasurementSetOut {
  return db.transaction((): MeasurementSetOut => {
    requireRecord(db, projectId, recordId);
    const current = requireSet(db, recordId, setId);
    checkPerson(db, projectId, 'measuredById', patch.measuredById, current.measuredById);
    db.prepare('UPDATE measurement_sets SET date = ?, measured_by_id = ?, phase = ?, note = ? WHERE id = ?').run(
      patch.date ?? current.date,
      patch.measuredById === undefined ? current.measuredById : patch.measuredById,
      patch.phase ?? current.phase,
      patch.note === undefined ? current.note : patch.note,
      setId,
    );
    if (patch.rows) replaceRows(db, setId, patch.rows);
    touchRecord(db, recordId, userId, now.toISOString());
    return requireSet(db, recordId, setId);
  })();
}

export function deleteMeasurementSet(
  db: Db,
  projectId: number,
  recordId: number,
  setId: number,
  userId: number,
  now: Date = new Date(),
): void {
  db.transaction(() => {
    requireRecord(db, projectId, recordId);
    requireSet(db, recordId, setId);
    db.prepare('DELETE FROM measurement_sets WHERE id = ?').run(setId);
    touchRecord(db, recordId, userId, now.toISOString());
  })();
}

export function registerMeasurementRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/measurement-sets', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listMeasurementSets(db, id);
  });

  app.post('/api/projects/:projectId/records/:id/measurement-sets', async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    const set = addMeasurementSet(db, projectId, id, requireUserId(request), MeasurementSetBody.parse(request.body));
    return reply.status(201).send(set);
  });

  app.patch('/api/projects/:projectId/records/:id/measurement-sets/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    const patch = MeasurementSetPatch.parse(request.body);
    return updateMeasurementSet(db, projectId, id, itemId, requireUserId(request), patch);
  });

  app.delete('/api/projects/:projectId/records/:id/measurement-sets/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteMeasurementSet(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
}
