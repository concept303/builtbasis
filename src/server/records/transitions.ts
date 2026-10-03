import type { FastifyInstance } from 'fastify';
import {
  checkTransition,
  TransitionBody,
  type TransitionBodyInput,
  type VerificationMethod,
  type VerificationOutcome,
} from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { recordActivity } from './activity';
import { getRecordDetail, type RecordDetail } from './records';
import { checkPerson } from './references';
import { requireRecord, toRecordState } from './store';

export interface Verification {
  id: number;
  checkedById: number;
  date: string;
  method: VerificationMethod;
  outcome: VerificationOutcome;
  note: string | null;
  createdAt: string;
}

/** Newest first. */
export function listVerifications(db: Db, recordId: number): Verification[] {
  return db
    .prepare(
      `SELECT id, checked_by_id AS checkedById, date, method, outcome, note, created_at AS createdAt
       FROM verifications WHERE record_id = ? ORDER BY date DESC, id DESC`,
    )
    .all(recordId) as Verification[];
}

/**
 * Changes a record's status (design §8). The new status, its reason, any verification entry and the
 * activity entry are written in one transaction, or not at all (design §8.2).
 */
export function changeStatus(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  input: TransitionBodyInput,
  now: Date = new Date(),
): RecordDetail {
  return db.transaction((): RecordDetail => {
    const current = requireRecord(db, projectId, recordId);
    const result = checkTransition(toRecordState(current), input);
    if (!result.ok) throw new HttpError(422, 'transition_rejected', { errors: result.errors });

    const { to } = input;
    const at = now.toISOString();
    const withReason = to === 'on_hold' || to === 'cancelled';
    const reasonCode = withReason ? (input.reasonCode ?? null) : null;
    // The superseding note names the replacing record, so it stays visible on the record (design §8.1).
    const reasonNote = withReason ? (input.reasonNote ?? null) : to === 'superseded' ? (input.note ?? null) : null;
    db.prepare(
      `UPDATE records SET status = ?, status_before_hold = ?, status_reason_code = ?, status_reason_note = ?,
         updated_at = ?, updated_by = ?
       WHERE id = ?`,
    ).run(to, to === 'on_hold' ? current.status : null, reasonCode, reasonNote, at, userId, recordId);

    const detail: Record<string, unknown> = {};
    if (reasonCode !== null) detail.reasonCode = reasonCode;
    if (withReason && input.reasonNote) detail.reasonNote = input.reasonNote;
    if (input.note) detail.note = input.note;

    const verification = input.verification;
    if (result.verificationOutcome !== null && verification) {
      checkPerson(db, projectId, 'verification.checkedById', verification.checkedById);
      const info = db
        .prepare(
          `INSERT INTO verifications (record_id, checked_by_id, date, method, outcome, note, created_at, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          recordId,
          verification.checkedById,
          verification.date,
          verification.method,
          result.verificationOutcome,
          verification.note ?? null,
          at,
          userId,
        );
      detail.verification = {
        id: Number(info.lastInsertRowid),
        outcome: result.verificationOutcome,
        method: verification.method,
        checkedById: verification.checkedById,
        date: verification.date,
      };
    }

    recordActivity(db, {
      recordId,
      userId,
      at,
      action: 'status_changed',
      field: 'status',
      from: current.status,
      to,
      detail,
    });
    return getRecordDetail(db, projectId, recordId);
  })();
}

export function registerTransitionRoutes(app: FastifyInstance, db: Db): void {
  app.post('/api/projects/:projectId/records/:id/transitions', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return changeStatus(db, projectId, id, requireUserId(request), TransitionBody.parse(request.body));
  });

  app.get('/api/projects/:projectId/records/:id/verifications', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listVerifications(db, id);
  });
}
