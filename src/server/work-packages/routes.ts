import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { WorkPackageCreate, WorkPackagePatch } from '../../domain/work-packages';
import type { Db } from '../db/connection';
import { ItemParams, ProjectParams } from '../http/params';
import { createWorkPackage, deleteWorkPackage, getWorkPackageDetail, listWorkPackages, updateWorkPackage } from './store';

export function registerWorkPackageRoutes(app: FastifyInstance, db: Db): void {
  const base = '/api/projects/:projectId/work-packages';
  app.get(base, async request => listWorkPackages(db, ProjectParams.parse(request.params).projectId));
  app.post(base, async (request, reply) => reply.code(201).send(createWorkPackage(db, ProjectParams.parse(request.params).projectId, WorkPackageCreate.parse(request.body))));
  app.get(`${base}/:id`, async request => { const { projectId, id } = ItemParams.parse(request.params); return getWorkPackageDetail(db, projectId, id); });
  app.patch(`${base}/:id`, async request => { const { projectId, id } = ItemParams.parse(request.params); return updateWorkPackage(db, projectId, id, WorkPackagePatch.parse(request.body)); });
  app.delete(`${base}/:id`, async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    deleteWorkPackage(db, projectId, id, z.strictObject({ confirmName: z.string().max(200) }).parse(request.body).confirmName);
    return reply.code(204).send();
  });
}
