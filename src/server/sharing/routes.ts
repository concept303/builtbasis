import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ShareCreate } from '../../domain';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { createShareLink, listShareLinks, revokeShareLink } from './links';

export function shareHeaders(reply: FastifyReply): void {
  reply.header('Cache-Control', 'no-store');
  reply.header('Referrer-Policy', 'no-referrer');
  reply.header('X-Robots-Tag', 'noindex, nofollow');
}

export function registerSharingRoutes(app: FastifyInstance, db: Db, config: AppConfig): void {
  const url = '/api/projects/:projectId/records/:id/share-links';
  const options = { onRequest: async (_request: unknown, reply: FastifyReply) => shareHeaders(reply) };
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
}
