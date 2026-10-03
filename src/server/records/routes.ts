import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { registerActivityRoutes } from './activity';
import { registerRecordListRoutes } from './list';
import { registerLogRoutes } from './log';
import { registerMeasurementRoutes } from './measurements';
import { registerOptionRoutes } from './options';
import { registerRecordCoreRoutes } from './records';
import { registerTransitionRoutes } from './transitions';

/** Every records route (Plan 3). */
export function registerRecordRoutes(app: FastifyInstance, db: Db): void {
  registerRecordCoreRoutes(app, db);
  registerActivityRoutes(app, db);
  registerTransitionRoutes(app, db);
  registerOptionRoutes(app, db);
  registerMeasurementRoutes(app, db);
  registerLogRoutes(app, db);
  registerRecordListRoutes(app, db);
}
