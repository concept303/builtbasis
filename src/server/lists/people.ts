import type { FastifyInstance } from 'fastify';
import { PersonCreate, PersonPatch, type PersonCreateInput, type PersonPatchInput, type PersonRole } from '../../domain';
import type { Db } from '../db/connection';
import { rethrowUnique } from '../db/sqlite-errors';
import { updateColumns } from '../db/update';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { requireProject } from './projects';

export interface Person {
  id: number;
  code: string;
  name: string;
  company: string | null;
  role: PersonRole;
  email: string | null;
  phone: string | null;
  /** Inactive people stay on existing records but are not offered for new selections (design §9.1). */
  active: boolean;
}

type PersonRow = Omit<Person, 'active'> & { active: number };
const SELECT = 'SELECT id, code, name, company, role, email, phone, active FROM people';
const toPerson = (row: PersonRow): Person => ({ ...row, active: row.active === 1 });

export function listPeople(db: Db, projectId: number): Person[] {
  return (db.prepare(`${SELECT} WHERE project_id = ? ORDER BY code`).all(projectId) as PersonRow[]).map(toPerson);
}

export function getPerson(db: Db, projectId: number, id: number): Person {
  const row = db.prepare(`${SELECT} WHERE project_id = ? AND id = ?`).get(projectId, id) as PersonRow | undefined;
  if (!row) throw new HttpError(404, 'person_not_found');
  return toPerson(row);
}

export function createPerson(db: Db, projectId: number, input: PersonCreateInput): Person {
  try {
    const info = db
      .prepare(
        'INSERT INTO people (project_id, code, name, company, role, email, phone, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        projectId,
        input.code,
        input.name,
        input.company ?? null,
        input.role,
        input.email ?? null,
        input.phone ?? null,
        input.active === false ? 0 : 1,
      );
    return getPerson(db, projectId, Number(info.lastInsertRowid));
  } catch (error) {
    return rethrowUnique(error, 'code_taken');
  }
}

export function updatePerson(db: Db, projectId: number, id: number, patch: PersonPatchInput): Person {
  getPerson(db, projectId, id);
  try {
    updateColumns(db, 'people', projectId, id, {
      code: patch.code,
      name: patch.name,
      company: patch.company,
      role: patch.role,
      email: patch.email,
      phone: patch.phone,
      active: patch.active === undefined ? undefined : Number(patch.active),
    });
  } catch (error) {
    rethrowUnique(error, 'code_taken');
  }
  return getPerson(db, projectId, id);
}

export function registerPeopleRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/people', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listPeople(db, projectId);
  });

  app.post('/api/projects/:projectId/people', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(createPerson(db, projectId, PersonCreate.parse(request.body)));
  });

  app.patch('/api/projects/:projectId/people/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return updatePerson(db, projectId, id, PersonPatch.parse(request.body));
  });
}
