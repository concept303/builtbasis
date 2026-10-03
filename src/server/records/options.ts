import type { FastifyInstance } from 'fastify';
import { hasDecision, OptionBody, OptionPatch, type OptionInput, type OptionPatchInput } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { requireRecord, touchRecord, type RecordRow } from './store';

/** An option considered for the decision; kept even when rejected (design §5.6). */
export interface DecisionOption {
  id: number;
  label: string;
  description: string | null;
}

const SELECT = 'SELECT id, label, description FROM decision_options';

export function listOptions(db: Db, recordId: number): DecisionOption[] {
  return db.prepare(`${SELECT} WHERE record_id = ? ORDER BY sort_order, id`).all(recordId) as DecisionOption[];
}

function requireOption(db: Db, recordId: number, optionId: number): DecisionOption {
  const option = db.prepare(`${SELECT} WHERE record_id = ? AND id = ?`).get(recordId, optionId) as
    | DecisionOption
    | undefined;
  if (!option) throw new HttpError(404, 'option_not_found');
  return option;
}

/** Tasks have no decision (design §5.6). */
function requireDecisionRecord(db: Db, projectId: number, recordId: number): RecordRow {
  const record = requireRecord(db, projectId, recordId);
  if (!hasDecision(record.subtype)) throw new HttpError(400, 'field_not_applicable', { fields: ['options'] });
  return record;
}

export function addOption(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  input: OptionInput,
  now: Date = new Date(),
): DecisionOption {
  return db.transaction((): DecisionOption => {
    requireDecisionRecord(db, projectId, recordId);
    const at = now.toISOString();
    const info = db
      .prepare(
        `INSERT INTO decision_options (record_id, label, description, sort_order, created_at)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM decision_options WHERE record_id = ?), ?)`,
      )
      .run(recordId, input.label, input.description ?? null, recordId, at);
    touchRecord(db, recordId, userId, at);
    return requireOption(db, recordId, Number(info.lastInsertRowid));
  })();
}

export function updateOption(
  db: Db,
  projectId: number,
  recordId: number,
  optionId: number,
  userId: number,
  patch: OptionPatchInput,
  now: Date = new Date(),
): DecisionOption {
  return db.transaction((): DecisionOption => {
    requireDecisionRecord(db, projectId, recordId);
    const current = requireOption(db, recordId, optionId);
    db.prepare('UPDATE decision_options SET label = ?, description = ? WHERE id = ?').run(
      patch.label ?? current.label,
      patch.description === undefined ? current.description : patch.description,
      optionId,
    );
    touchRecord(db, recordId, userId, now.toISOString());
    return requireOption(db, recordId, optionId);
  })();
}

/** The chosen option cannot be deleted; choose another (or none) first. */
export function deleteOption(
  db: Db,
  projectId: number,
  recordId: number,
  optionId: number,
  userId: number,
  now: Date = new Date(),
): void {
  db.transaction(() => {
    const record = requireDecisionRecord(db, projectId, recordId);
    requireOption(db, recordId, optionId);
    if (record.chosenOptionId === optionId) throw new HttpError(409, 'option_is_chosen');
    db.prepare('DELETE FROM decision_options WHERE id = ?').run(optionId);
    touchRecord(db, recordId, userId, now.toISOString());
  })();
}

export function registerOptionRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/options', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listOptions(db, id);
  });

  app.post('/api/projects/:projectId/records/:id/options', async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    const option = addOption(db, projectId, id, requireUserId(request), OptionBody.parse(request.body));
    return reply.status(201).send(option);
  });

  app.patch('/api/projects/:projectId/records/:id/options/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateOption(db, projectId, id, itemId, requireUserId(request), OptionPatch.parse(request.body));
  });

  app.delete('/api/projects/:projectId/records/:id/options/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteOption(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
}
