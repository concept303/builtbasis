import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ShareCreate } from '../../domain';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { authorizeShare, createShareLink, listShareLinks, revokeShareLink } from './links';
import { buildSharedRecord } from './projection';

export function registerSharingRoutes(app: FastifyInstance, db: Db, config: AppConfig): void {
  const url = '/api/projects/:projectId/records/:id/share-links';
  const options = { config: { privateResponse: true } };
  app.get(url, options, async request => {
    const { projectId, id } = ItemParams.parse(request.params);
    return listShareLinks(db, config, projectId, id);
  });
  app.post(url, options, async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    return reply.status(201).send(createShareLink(db, config, projectId, id, requireUserId(request), ShareCreate.parse(request.body)));
  });
  app.post(`${url}/:itemId/revoke`, options, async request => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    z.strictObject({}).parse(request.body);
    revokeShareLink(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
  app.get('/api/shared/record', { config: { shareRead: true, privateResponse: true } }, async (request, reply) => {
    return db.transaction(() => {
      const now = new Date();
      const access = authorizeShare(db, request.headers.authorization, now);
      if (request.method === 'HEAD') return reply.status(200).send();
      const payload = buildSharedRecord(db, access);
      db.prepare('UPDATE share_links SET view_count = view_count + 1, last_viewed_at = ? WHERE id = ?').run(now.toISOString(), access.linkId);
      return payload;
    })();
  });
}
