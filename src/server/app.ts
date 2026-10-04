import { registerPrintRoutes } from './printing/routes';
import { resolve } from 'node:path';
import { registerWeb } from './web';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { ZodError } from 'zod';
import { DEFAULT_LOGIN_LIMITS, LoginLimiter } from './auth/login-limiter';
import type { AppConfig } from './config';
import type { Db } from './db/connection';
import { HttpError } from './errors';
import { registerGuards } from './http/guards';
import { registerProjectRoutes } from './lists/projects';
import { registerPeopleRoutes } from './lists/people';
import { registerTradeRoutes } from './lists/trades';
import { registerZoneTypeRoutes } from './lists/zone-types';
import { registerTagRoutes } from './lists/tags';
import { registerLocationRoutes } from './lists/locations';
import { registerRecordRoutes } from './records/routes';
import { registerFileRoutes } from './files/routes';
import { openStorageCapacity } from './files/capacity';
import { requireShareKey } from './sharing/crypto';
import { reconcileShareKey } from './sharing/links';
import { registerSharingRoutes } from './sharing/routes';
import { safeErrorDiagnostic, safeLogger } from './http/logging';
import { registerAccessRoutes } from './access/routes';
import { registerAuthRoutes } from './routes/auth';
import { registerHealthRoutes } from './routes/health';
import { registerOperationsStatus } from './monitoring/status';

export interface AppDeps {
  config: AppConfig;
  db: Db;
  /** Tests may pass their own limiter; the server uses the defaults. */
  limiter?: LoginLimiter;
  logger?: FastifyServerOptions['logger'];
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { config, db } = deps;
  requireShareKey(config.shareKey);
  const capacity = await openStorageCapacity(config.filesDir, {
    budgetBytes: config.filesStorageBudgetBytes ?? 0,
    freeReserveBytes: config.filesFreeReserveBytes ?? 0,
  });
  const revokedLinks = reconcileShareKey(db, config.shareKey);
  const app = Fastify({ logger: safeLogger(deps.logger), bodyLimit: 1024 * 1024 });
  if (revokedLinks > 0) app.log.info({ event: 'share_key_changed', revokedLinks });
  await app.register(cookie);
  await app.register(multipart);
  registerGuards(app, config, db);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      if (error.statusCode >= 500) {
        const cause: unknown = Object.getOwnPropertyDescriptor(error, 'cause')?.value;
        request.log.error({ event: 'internal_error', ...safeErrorDiagnostic(cause ?? error) });
      }
      return reply
        .status(error.statusCode)
        .send(error.details === undefined ? { error: error.code } : { error: error.code, details: error.details });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'invalid_input',
        details: error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message })),
      });
    }
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({ error: 'bad_request' });
    }
    request.log.error({ event: 'internal_error', ...safeErrorDiagnostic(error) });
    return reply.status(500).send({ error: 'internal_error' });
  });
  app.setNotFoundHandler(async (_request, reply) => reply.status(404).send({ error: 'not_found' }));

  registerHealthRoutes(app);
  registerOperationsStatus(app, config, capacity);
  registerAuthRoutes(app, { config, db, limiter: deps.limiter ?? new LoginLimiter(DEFAULT_LOGIN_LIMITS) });
  registerProjectRoutes(app, db);
  registerPeopleRoutes(app, db);
  registerTradeRoutes(app, db);
  registerZoneTypeRoutes(app, db);
  registerTagRoutes(app, db);
  registerLocationRoutes(app, db);
  registerRecordRoutes(app, db);
  registerPrintRoutes(app, db);
  registerFileRoutes(app, db, config, capacity);
  registerSharingRoutes(app, db, config);
  registerAccessRoutes(app, db, config, capacity);
  await registerWeb(app, resolve('dist/web'));
  return app;
}
