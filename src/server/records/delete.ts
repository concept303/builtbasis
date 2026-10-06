import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams } from '../http/params';
import { requireRecord } from './store';

export function deleteRecord(db: Db, projectId: number, recordId: number, confirmHumanId: string): void {
  db.transaction(() => {
    const record = requireRecord(db, projectId, recordId);
    if (record.humanId !== confirmHumanId) throw new HttpError(409, 'record_confirmation_mismatch');
    const records = db.prepare(`SELECT DISTINCT r.id,r.human_id AS humanId,r.title FROM record_precedence p JOIN records r
      ON r.id=CASE WHEN p.earlier_id=? THEN p.later_id ELSE p.earlier_id END
      WHERE p.earlier_id=? OR p.later_id=? ORDER BY r.human_id,r.id`).all(recordId, recordId, recordId);
    if (records.length) throw new HttpError(409, 'record_has_dependencies', { records });
    for (const table of ['photos', 'attachments', 'share_links']) db.prepare(`DELETE FROM ${table} WHERE record_id=?`).run(recordId);
    db.prepare('UPDATE records SET chosen_option_id=NULL WHERE id=?').run(recordId);
    db.prepare('DELETE FROM records WHERE id=?').run(recordId);
    // Cascade-owned children disappear; identity counters and immutable blobs remain.
  }).immediate();
}
export function registerRecordDeleteRoutes(app: FastifyInstance, db: Db): void {
  app.delete('/api/projects/:projectId/records/:id', async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    const { confirmHumanId } = z.strictObject({ confirmHumanId: z.string().max(100) }).parse(request.body);
    deleteRecord(db, projectId, id, confirmHumanId);
    return reply.code(204).send();
  });
}
