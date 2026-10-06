import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ProjectParams } from '../http/params';

export interface Project { id: number; code: string; name: string; createdAt: string }
export interface ProjectUsage {
  workPackages: number;
  records: number; photos: number; attachments: number;
  people: number; trades: number; tags: number; locations: number; zoneTypes: number;
}
const ProjectBody = z.strictObject({ code: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(200) });
const DeleteBody = z.strictObject({ confirmName: z.string().min(1).max(200) });
const SELECT = 'SELECT id, code, name, created_at AS createdAt FROM projects';
function requireFreeCode(db: Db, code: string, exceptId: number | null = null): void {
  if (db.prepare('SELECT id FROM projects WHERE code = ? AND id IS NOT ?').get(code, exceptId)) throw new HttpError(409, 'project_code_taken');
}

export function createProject(db: Db, input: { code: string; name: string }, now: Date = new Date()): Project {
  const body = ProjectBody.parse(input);
  return db.transaction(() => {
    requireFreeCode(db, body.code);
    const id = db.prepare('UPDATE project_id_sequence SET last_id = MAX(last_id, (SELECT COALESCE(MAX(id), 0) FROM projects)) + 1 WHERE singleton = 1 RETURNING last_id').pluck().get() as number;
    db.prepare('INSERT INTO projects (id, code, name, created_at) VALUES (?, ?, ?, ?)').run(id, body.code, body.name, now.toISOString());
    return requireProject(db, id);
  }).immediate();
}
export function findProjectByCode(db: Db, code: string): Project | null {
  return (db.prepare(`${SELECT} WHERE code = ?`).get(code) as Project | undefined) ?? null;
}
export function listProjects(db: Db): Project[] { return db.prepare(`${SELECT} ORDER BY id`).all() as Project[]; }
export function requireProject(db: Db, projectId: number): Project {
  const project = db.prepare(`${SELECT} WHERE id = ?`).get(projectId) as Project | undefined;
  if (!project) throw new HttpError(404, 'project_not_found');
  return project;
}
export function updateProject(db: Db, projectId: number, input: { code: string; name: string }): Project {
  const body = ProjectBody.parse(input);
  return db.transaction(() => {
    requireProject(db, projectId); requireFreeCode(db, body.code, projectId);
    db.prepare('UPDATE projects SET code = ?, name = ? WHERE id = ?').run(body.code, body.name, projectId);
    return requireProject(db, projectId);
  }).immediate();
}
export function projectUsage(db: Db, projectId: number): ProjectUsage {
  requireProject(db, projectId);
  const count = (table: string, condition: string) => db.prepare(`SELECT count(*) FROM ${table} WHERE ${condition}`).pluck().get(projectId) as number;
  return {
    records: count('records', 'project_id = ?'),
    workPackages: count('work_packages', 'project_id = ?'),
    photos: count('photos', 'record_id IN (SELECT id FROM records WHERE project_id = ?)'),
    attachments: count('attachments', 'record_id IN (SELECT id FROM records WHERE project_id = ?)'),
    people: count('people', 'project_id = ?'), trades: count('trades', 'project_id = ?'),
    tags: count('tags', 'project_id = ?'), locations: count('location_nodes', 'project_id = ?'), zoneTypes: count('zone_types', 'project_id = ?'),
  };
}
export function deleteProject(db: Db, projectId: number, confirmName: string): void {
  db.transaction(() => {
    const project = requireProject(db, projectId);
    if (project.name !== confirmName) throw new HttpError(409, 'project_confirmation_mismatch');
    // File occurrences and access belong to this project. Immutable blob rows/files remain for backups.
    for (const table of ['photos', 'attachments', 'share_links']) db.prepare(`DELETE FROM ${table} WHERE record_id IN (SELECT id FROM records WHERE project_id = ?)`).run(projectId);
    db.prepare('DELETE FROM records WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM work_packages WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM record_counters WHERE project_id = ?').run(projectId);
    // Records and their cascade-owned history are gone before removing referenced managed-list entries.
    for (const table of ['location_nodes', 'zone_types', 'people', 'trades', 'tags']) db.prepare(`DELETE FROM ${table} WHERE project_id = ?`).run(projectId);
    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  }).immediate();
}
export function registerProjectRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects', async () => listProjects(db));
  app.get('/api/projects/:projectId', async request => requireProject(db, ProjectParams.parse(request.params).projectId));
  app.post('/api/projects', async (request, reply) => reply.status(201).send(createProject(db, ProjectBody.parse(request.body))));
  app.patch('/api/projects/:projectId', async request => updateProject(db, ProjectParams.parse(request.params).projectId, ProjectBody.parse(request.body)));
  app.get('/api/projects/:projectId/usage', async request => projectUsage(db, ProjectParams.parse(request.params).projectId));
  app.delete('/api/projects/:projectId', async request => {
    deleteProject(db, ProjectParams.parse(request.params).projectId, DeleteBody.parse(request.body).confirmName);
    return { ok: true };
  });
}
