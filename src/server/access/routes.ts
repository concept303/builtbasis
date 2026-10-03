import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LogEntryBody, PhotoVariantParam, type AttachmentMeta } from '../../domain';
import type { AppConfig } from '../config';
import { findSessionUser } from '../auth/sessions';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { resolveAttachmentFile, resolvePhotoFile, sendFile } from '../files/downloads';
import { saveUpload } from '../files/occurrences';
import { describeAttachment, resolveAttachmentView } from '../files/previews';
import { withUpload } from '../files/admission';
import type { StorageCapacity } from '../files/capacity';
import { ItemParams } from '../http/params';
import { SESSION_COOKIE } from '../http/guards';
import { requireUserId } from '../http/user';
import { recordActivity } from '../records/activity';
import { addLogEntry } from '../records/log';
import { requireRecord } from '../records/store';
import { buildSharedRecord } from '../sharing/projection';
import { requireContributorAccess } from './grants';

const Id = z.coerce.number().int().positive();
const AssignedParams = z.object({ id: Id });
const FileParams = AssignedParams.extend({ itemId: Id });
const GrantParams = ItemParams.extend({ userId: Id });
const GrantBody = z.strictObject({ canUpload: z.boolean(), canAddLog: z.boolean() });
const PublicLogBody = LogEntryBody.omit({ private: true });
const contributorConfig = { contributor: true, privateResponse: true };

export function registerAccessRoutes(app: FastifyInstance, db: Db, config: AppConfig, capacity: StorageCapacity): void {
  app.get('/api/contributors', { config: { privateResponse: true } }, async () => {
    const rows = db.prepare(`SELECT id, username, display_name AS displayName, is_active AS active
      FROM users WHERE is_owner = 0 ORDER BY display_name, id`).all() as { id: number; username: string; displayName: string; active: number }[];
    return rows.map(row => ({ ...row, active: row.active === 1 }));
  });
  const grantsUrl = '/api/projects/:projectId/records/:id/grants';
  app.get(grantsUrl, { config: { privateResponse: true } }, async request => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireRecord(db, projectId, id);
    const rows = db.prepare(`SELECT user_id AS userId, can_upload AS canUpload, can_add_log AS canAddLog
      FROM record_grants WHERE record_id = ? ORDER BY user_id`).all(id) as { userId: number; canUpload: number; canAddLog: number }[];
    return rows.map(row => ({ ...row, canUpload: row.canUpload === 1, canAddLog: row.canAddLog === 1 }));
  });
  app.put(`${grantsUrl}/:userId`, { config: { privateResponse: true } }, async request => {
    const { projectId, id, userId } = GrantParams.parse(request.params);
    const body = GrantBody.parse(request.body);
    return db.transaction(() => {
      requireRecord(db, projectId, id);
      if (!db.prepare('SELECT id FROM users WHERE id = ? AND is_owner = 0 AND is_active = 1').get(userId)) {
        throw new HttpError(404, 'contributor_not_found');
      }
      const old = db.prepare('SELECT can_upload, can_add_log FROM record_grants WHERE record_id = ? AND user_id = ?').get(id, userId) as { can_upload: number; can_add_log: number } | undefined;
      db.prepare(`INSERT INTO record_grants VALUES (?,?,?,?) ON CONFLICT(record_id,user_id)
        DO UPDATE SET can_upload=excluded.can_upload, can_add_log=excluded.can_add_log`)
        .run(id, userId, Number(body.canUpload), Number(body.canAddLog));
      if (!old || old.can_upload !== Number(body.canUpload) || old.can_add_log !== Number(body.canAddLog)) {
        recordActivity(db, { recordId: id, userId: requireUserId(request), at: new Date().toISOString(),
          action: 'grant_changed', detail: { userId, ...body } });
      }
      return { userId, ...body };
    })();
  });
  app.delete(`${grantsUrl}/:userId`, { config: { privateResponse: true } }, async request => {
    const { projectId, id, userId } = GrantParams.parse(request.params);
    return db.transaction(() => {
      requireRecord(db, projectId, id);
      const result = db.prepare('DELETE FROM record_grants WHERE record_id = ? AND user_id = ?').run(id, userId);
      if (result.changes) recordActivity(db, { recordId: id, userId: requireUserId(request), at: new Date().toISOString(),
        action: 'grant_revoked', detail: { userId } });
      return { ok: true };
    })();
  });

  app.get('/api/assigned-records', { config: contributorConfig }, async request => db.prepare(`
    SELECT r.id, r.human_id AS humanId, r.title FROM record_grants g
    JOIN records r ON r.id = g.record_id JOIN users u ON u.id = g.user_id
    WHERE g.user_id = ? AND u.is_active = 1 AND u.is_owner = 0 AND r.status <> 'draft'
    ORDER BY r.id`).all(requireUserId(request)));
  app.route({ method: ['GET', 'HEAD'], url: '/api/assigned-records/:id', config: contributorConfig,
    handler: async (request, reply) => {
      const { id } = AssignedParams.parse(request.params);
      const access = requireContributorAccess(db, requireUserId(request), id);
      if (request.method === 'HEAD') return reply.send();
      return { ...buildSharedRecord(db, access), permissions: { canUpload: access.canUpload, canAddLog: access.canAddLog } };
    },
  });
  app.post('/api/assigned-records/:id/log', { config: contributorConfig }, async (request, reply) => {
    const { id } = AssignedParams.parse(request.params);
    const userId = requireUserId(request);
    const body = PublicLogBody.parse(request.body);
    const entry = db.transaction(() => {
      const access = requireContributorAccess(db, userId, id, 'addLog');
      return addLogEntry(db, access.projectId, id, userId, body);
    })();
    return reply.status(201).send({ id: entry.id, eventAt: entry.eventAt, text: entry.text, loggedBy: entry.loggedBy, attachmentIds: [] });
  });
  for (const kind of ['photos', 'attachments'] as const) {
    app.post(`/api/assigned-records/:id/${kind}`, { config: { ...contributorConfig, multipart: true } }, async (request, reply) => {
      const { id } = AssignedParams.parse(request.params);
      const userId = requireUserId(request);
      requireContributorAccess(db, userId, id, 'upload');
      const result = await withUpload(request, config.filesDir, kind, capacity, envelope => db.transaction(() => {
          const token = request.cookies[SESSION_COOKIE];
          if (!token || findSessionUser(db, token)?.userId !== userId) throw new HttpError(401, 'unauthenticated');
          const access = requireContributorAccess(db, userId, id, 'upload');
          const logEntryId = kind === 'attachments' ? (envelope.metadata as AttachmentMeta).logEntryId : null;
          if (logEntryId != null) {
            if (!db.prepare('SELECT id FROM log_entries WHERE id = ? AND record_id = ? AND private = 0').get(logEntryId, id)) {
              throw new HttpError(404, 'log_entry_not_found');
            }
          }
          const occurrence = saveUpload(db, access.projectId, id, userId, kind, envelope);
          return buildSharedRecord(db, access)[kind].find(item => item.id === occurrence.id);
      })());
      return reply.status(201).send(result);
    });
  }
  app.route({ method: ['GET', 'HEAD'], url: '/api/assigned-records/:id/photos/:itemId/:variant', config: contributorConfig,
    handler: async (request, reply) => {
      const { id, itemId } = FileParams.parse(request.params);
      requireContributorAccess(db, requireUserId(request), id);
      const variant = PhotoVariantParam.parse((request.params as { variant: unknown }).variant);
      await sendFile(request, reply, config.filesDir, resolvePhotoFile(db, id, itemId, variant), variant === 'original' ? 'attachment' : 'inline');
    },
  });
  app.route({ method: ['GET', 'HEAD'], url: '/api/assigned-records/:id/attachments/:itemId/file', config: contributorConfig,
    handler: async (request, reply) => {
      const { id, itemId } = FileParams.parse(request.params);
      requireContributorAccess(db, requireUserId(request), id);
      await sendFile(request, reply, config.filesDir, resolveAttachmentFile(db, id, itemId, 'shared'), 'attachment');
    },
  });
  app.route({ method: ['GET', 'HEAD'], url: '/api/assigned-records/:id/attachments/:itemId/preview', config: contributorConfig,
    handler: async (request, reply) => {
      const { id, itemId } = FileParams.parse(request.params);
      requireContributorAccess(db, requireUserId(request), id);
      const descriptor = describeAttachment(db, id, itemId, 'shared');
      if (request.method === 'HEAD') return reply.send();
      return descriptor;
    },
  });
  app.route({ method: ['GET', 'HEAD'], url: '/api/assigned-records/:id/attachments/:itemId/view', config: contributorConfig,
    handler: async (request, reply) => {
      const { id, itemId } = FileParams.parse(request.params);
      requireContributorAccess(db, requireUserId(request), id);
      await sendFile(request, reply, config.filesDir, resolveAttachmentView(db, id, itemId, 'shared'), 'inline');
    },
  });
}
