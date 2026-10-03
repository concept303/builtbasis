import type { FastifyInstance } from 'fastify';
import { AttachmentPatch, PhotoPatch, PhotoVariantParam } from '../../domain';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { requireCurrentSession } from '../auth/sessions';
import { SESSION_COOKIE } from '../http/guards';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireRecord } from '../records/store';
import { deleteOccurrence, editOccurrence, listAttachments, listPhotos, saveUpload } from './occurrences';
import { withUpload } from './admission';
import type { StorageCapacity } from './capacity';
import { resolveAttachmentFile, resolvePhotoFile, sendFile } from './downloads';
import { describeAttachment, resolveAttachmentView } from './previews';

export function registerFileRoutes(app: FastifyInstance, db: Db, config: AppConfig, capacity: StorageCapacity): void {
  app.get('/api/projects/:projectId/records/:id/attachments/:itemId/preview', { config: { privateResponse: true } }, async request => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireRecord(db, projectId, id);
    return describeAttachment(db, id, itemId, 'owner');
  });
  app.route({ method: ['GET', 'HEAD'], url: '/api/projects/:projectId/records/:id/attachments/:itemId/view', config: { privateResponse: true }, handler: async (request, reply) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireRecord(db, projectId, id);
    await sendFile(request, reply, config.filesDir, resolveAttachmentView(db, id, itemId, 'owner'), 'inline');
  } });
  app.route({ method: ['GET', 'HEAD'], url: '/api/projects/:projectId/records/:id/photos/:itemId/:variant', config: { privateResponse: true }, handler: async (request, reply) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    const variant = PhotoVariantParam.parse((request.params as { variant: unknown }).variant);
    requireRecord(db, projectId, id);
    const target = resolvePhotoFile(db, id, itemId, variant);
    await sendFile(request, reply, config.filesDir, target, variant === 'original' ? 'attachment' : 'inline');
  } });
  app.route({ method: ['GET', 'HEAD'], url: '/api/projects/:projectId/records/:id/attachments/:itemId/file', config: { privateResponse: true }, handler: async (request, reply) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireRecord(db, projectId, id);
    await sendFile(request, reply, config.filesDir, resolveAttachmentFile(db, id, itemId, 'owner'), 'attachment');
  } });
  for (const kind of ['photos', 'attachments'] as const) {
    const url = `/api/projects/:projectId/records/:id/${kind}`;
    app.post(url, { config: { multipart: true } }, async (request, reply) => {
      const { projectId, id } = ItemParams.parse(request.params);
      requireRecord(db, projectId, id);
      const userId = requireUserId(request);
      const result = await withUpload(request, config.filesDir, kind, capacity, envelope => db.transaction(() => {
        requireCurrentSession(db, request.cookies[SESSION_COOKIE], userId, true);
        return saveUpload(db, projectId, id, userId, kind, envelope);
      }).immediate());
      return reply.status(201).send(result);
    });
    app.get(url, async request => {
      const { projectId, id } = ItemParams.parse(request.params);
      requireRecord(db, projectId, id);
      return kind === 'photos' ? listPhotos(db, id) : listAttachments(db, id);
    });
    app.patch(`${url}/:itemId`, async request => {
      const { projectId, id, itemId } = RecordItemParams.parse(request.params);
      const patch = kind === 'photos' ? PhotoPatch.parse(request.body) : AttachmentPatch.parse(request.body);
      return editOccurrence(db, projectId, id, itemId, requireUserId(request), kind, patch);
    });
    app.delete(`${url}/:itemId`, async request => {
      const { projectId, id, itemId } = RecordItemParams.parse(request.params);
      deleteOccurrence(db, projectId, id, itemId, requireUserId(request), kind);
      return { ok: true };
    });
  }
}
