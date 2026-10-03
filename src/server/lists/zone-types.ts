import type { FastifyInstance } from 'fastify';
import { ZoneTypeBody, type ZoneTypeInput } from '../../domain';
import type { Db } from '../db/connection';
import { updateColumns } from '../db/update';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { assertHasAName } from './names';
import { requireProject } from './projects';

export interface ZoneType {
  id: number;
  nameEn: string;
  nameEl: string;
}

const SELECT = 'SELECT id, name_en AS nameEn, name_el AS nameEl FROM zone_types';

export function listZoneTypes(db: Db, projectId: number): ZoneType[] {
  return db.prepare(`${SELECT} WHERE project_id = ? ORDER BY id`).all(projectId) as ZoneType[];
}

export function getZoneType(db: Db, projectId: number, id: number): ZoneType {
  const zone = db.prepare(`${SELECT} WHERE project_id = ? AND id = ?`).get(projectId, id) as ZoneType | undefined;
  if (!zone) throw new HttpError(404, 'zone_type_not_found');
  return zone;
}

export function createZoneType(db: Db, projectId: number, input: ZoneTypeInput): ZoneType {
  const names = { nameEn: input.nameEn ?? '', nameEl: input.nameEl ?? '' };
  assertHasAName(names);
  const info = db
    .prepare('INSERT INTO zone_types (project_id, name_en, name_el) VALUES (?, ?, ?)')
    .run(projectId, names.nameEn, names.nameEl);
  return getZoneType(db, projectId, Number(info.lastInsertRowid));
}

export function updateZoneType(db: Db, projectId: number, id: number, patch: ZoneTypeInput): ZoneType {
  const current = getZoneType(db, projectId, id);
  assertHasAName({ nameEn: patch.nameEn ?? current.nameEn, nameEl: patch.nameEl ?? current.nameEl });
  updateColumns(db, 'zone_types', projectId, id, { name_en: patch.nameEn, name_el: patch.nameEl });
  return getZoneType(db, projectId, id);
}

/** Allowed only while no location node uses the zone type. */
export function deleteZoneType(db: Db, projectId: number, id: number): void {
  getZoneType(db, projectId, id);
  const used = db
    .prepare('SELECT COUNT(*) FROM location_nodes WHERE project_id = ? AND zone_type_id = ?')
    .pluck()
    .get(projectId, id) as number;
  if (used > 0) throw new HttpError(409, 'zone_type_in_use');
  db.prepare('DELETE FROM zone_types WHERE project_id = ? AND id = ?').run(projectId, id);
}

export function registerZoneTypeRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/zone-types', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listZoneTypes(db, projectId);
  });

  app.post('/api/projects/:projectId/zone-types', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(createZoneType(db, projectId, ZoneTypeBody.parse(request.body)));
  });

  app.patch('/api/projects/:projectId/zone-types/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateZoneType(db, projectId, id, ZoneTypeBody.parse(request.body));
  });

  app.delete('/api/projects/:projectId/zone-types/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteZoneType(db, projectId, id);
    return { ok: true };
  });
}
