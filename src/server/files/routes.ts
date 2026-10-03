import type { FastifyInstance } from 'fastify';
import { AttachmentPatch, PhotoPatch, PhotoVariantParam } from '../../domain';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireRecord } from '../records/store';
import { deleteOccurrence, editOccurrence, listAttachments, listPhotos, saveUpload } from './occurrences';
import { discardStaged, publishFile } from './storage';
import { parseUpload } from './uploads';
import { resolveAttachmentFile, resolvePhotoFile, sendFile } from './downloads';

export function registerFileRoutes(app: FastifyInstance, db: Db, config: AppConfig): void {
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
      const envelope = await parseUpload(request, config.filesDir, kind);
      try {
        for (const file of Object.values(envelope.files)) await publishFile(config.filesDir, file);
        return reply.status(201).send(saveUpload(db, projectId, id, requireUserId(request), kind, envelope));
      } finally {
        await Promise.all(Object.values(envelope.files).map(discardStaged));
      }
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
