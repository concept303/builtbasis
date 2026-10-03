import type { FastifyInstance } from 'fastify';
import { findSessionUser, type SessionUser } from '../auth/sessions';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { shareHeaders } from './privacy';

export const SESSION_COOKIE = 'bb_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_API_ROUTES = new Set(['/api/health', '/api/auth/login']);

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
  interface FastifyContextConfig {
    /** Set on upload routes (Plan 4) to accept multipart/form-data instead of JSON. */
    multipart?: boolean;
    shareRead?: boolean;
    privateResponse?: boolean;
  }
}

/**
 * Request rules (design §11.5):
 * - every state-changing request needs Origin = the public origin and a JSON body
 *   (multipart only on routes that allow it);
 * - owner /api routes except health and login need a valid session;
 * - only explicitly marked shared GET/HEAD routes bypass that session requirement,
 *   and their handlers independently require a valid bearer share token;
 * - session lookup and file reads are read-only. Only a successful shared record GET
 *   updates its link's view counter; HEAD changes nothing.
 */
export function registerGuards(app: FastifyInstance, config: AppConfig, db: Db): void {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.config.privateResponse) shareHeaders(reply);
    if (SAFE_METHODS.has(request.method)) return;
    if (request.headers.origin !== config.publicOrigin) throw new HttpError(403, 'origin_rejected');
    const contentType = (request.headers['content-type']?.split(';', 1)[0] ?? '').trim().toLowerCase();
    const isJson = contentType === 'application/json';
    const isAllowedMultipart =
      contentType === 'multipart/form-data' && request.routeOptions.config?.multipart === true;
    if (!isJson && !isAllowedMultipart) throw new HttpError(415, 'unsupported_content_type');
  });

  app.addHook('preHandler', async (request) => {
    if (request.routeOptions.config.shareRead === true && (request.method === 'GET' || request.method === 'HEAD')) return;
    const token = request.cookies[SESSION_COOKIE];
    request.user = token ? findSessionUser(db, token) : null;
    const route = request.routeOptions.url ?? request.url;
    if (!route.startsWith('/api/') || PUBLIC_API_ROUTES.has(route)) return;
    if (request.user === null) throw new HttpError(401, 'unauthenticated');
  });
}
