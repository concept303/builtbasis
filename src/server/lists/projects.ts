import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ProjectParams } from '../http/params';

export interface Project {
  id: number;
  code: string;
  name: string;
  createdAt: string;
}

const SELECT = 'SELECT id, code, name, created_at AS createdAt FROM projects';

/** Projects are created by seed scripts only; v1 has no project screen (design §10). */
export function createProject(db: Db, input: { code: string; name: string }, now: Date = new Date()): Project {
  const info = db
    .prepare('INSERT INTO projects (code, name, created_at) VALUES (?, ?, ?)')
    .run(input.code, input.name, now.toISOString());
  return requireProject(db, Number(info.lastInsertRowid));
}

export function findProjectByCode(db: Db, code: string): Project | null {
  return (db.prepare(`${SELECT} WHERE code = ?`).get(code) as Project | undefined) ?? null;
}

export function listProjects(db: Db): Project[] {
  return db.prepare(`${SELECT} ORDER BY id`).all() as Project[];
}

export function requireProject(db: Db, projectId: number): Project {
  const project = db.prepare(`${SELECT} WHERE id = ?`).get(projectId) as Project | undefined;
  if (!project) throw new HttpError(404, 'project_not_found');
  return project;
}

export function registerProjectRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects', async () => listProjects(db));
  app.get('/api/projects/:projectId', async (request) =>
    requireProject(db, ProjectParams.parse(request.params).projectId),
  );
}
