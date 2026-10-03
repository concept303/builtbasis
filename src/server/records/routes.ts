import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { registerActivityRoutes } from './activity';
import { registerRecordCoreRoutes } from './records';

/** Every records route (Plan 3). */
export function registerRecordRoutes(app: FastifyInstance, db: Db): void {
  registerRecordCoreRoutes(app, db);
  registerActivityRoutes(app, db);
}
