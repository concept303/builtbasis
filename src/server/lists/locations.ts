import type { FastifyInstance } from 'fastify';
import {
  LocationCopy,
  LocationCreate,
  LocationPatch,
  type LocationCopyInput,
  type LocationCreateInput,
  type LocationNodeKind,
  type LocationPatchInput,
} from '../../domain';
import type { Db } from '../db/connection';
import { updateColumns } from '../db/update';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { assertHasAName } from './names';
import { requireProject } from './projects';

export interface LocationNode {
  id: number;
  parentId: number | null;
  kind: LocationNodeKind;
  zoneTypeId: number | null;
  nameEn: string;
  nameEl: string;
  sortOrder: number;
  /** Retired nodes stay on existing records but are not offered for new selections (design §9.4). */
  active: boolean;
}

type LocationRow = Omit<LocationNode, 'active'> & { active: number };
const COLUMNS =
  'id, parent_id AS parentId, kind, zone_type_id AS zoneTypeId, name_en AS nameEn, name_el AS nameEl, sort_order AS sortOrder, active';
const toNode = (row: LocationRow): LocationNode => ({ ...row, active: row.active === 1 });

export function listLocations(db: Db, projectId: number): LocationNode[] {
  return (
    db.prepare(`SELECT ${COLUMNS} FROM location_nodes WHERE project_id = ? ORDER BY sort_order, id`).all(projectId) as LocationRow[]
  ).map(toNode);
}

export function getLocation(db: Db, projectId: number, id: number): LocationNode {
  const row = db.prepare(`SELECT ${COLUMNS} FROM location_nodes WHERE project_id = ? AND id = ?`).get(projectId, id) as
    | LocationRow
    | undefined;
  if (!row) throw new HttpError(404, 'location_not_found');
  return toNode(row);
}

/** The node and every node inside it. Plan 3 also uses this for location filters (design §5.5). */
export function subtreeIds(db: Db, projectId: number, rootId: number): number[] {
  return db
    .prepare(
      `WITH RECURSIVE subtree(id) AS (
         SELECT id FROM location_nodes WHERE project_id = ? AND id = ?
         UNION ALL
         SELECT n.id FROM location_nodes n JOIN subtree s ON n.parent_id = s.id
       )
       SELECT id FROM subtree`,
    )
    .pluck()
    .all(projectId, rootId) as number[];
}

function checkParent(db: Db, projectId: number, parentId: number | null | undefined): number | null {
  if (parentId === undefined || parentId === null) return null;
  const found = db.prepare('SELECT 1 FROM location_nodes WHERE project_id = ? AND id = ?').get(projectId, parentId);
  if (found === undefined) throw new HttpError(400, 'invalid_parent');
  return parentId;
}

function checkZoneType(db: Db, projectId: number, zoneTypeId: number | null | undefined): number | null {
  if (zoneTypeId === undefined || zoneTypeId === null) return null;
  const found = db.prepare('SELECT 1 FROM zone_types WHERE project_id = ? AND id = ?').get(projectId, zoneTypeId);
  if (found === undefined) throw new HttpError(400, 'invalid_zone_type');
  return zoneTypeId;
}

function nextSortOrder(db: Db, projectId: number, parentId: number | null): number {
  return db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM location_nodes WHERE project_id = ? AND parent_id IS ?')
    .pluck()
    .get(projectId, parentId) as number;
}

export function createLocation(db: Db, projectId: number, input: LocationCreateInput): LocationNode {
  const names = { nameEn: input.nameEn ?? '', nameEl: input.nameEl ?? '' };
  assertHasAName(names);
  const parentId = checkParent(db, projectId, input.parentId);
  const zoneTypeId = checkZoneType(db, projectId, input.zoneTypeId);
  const info = db
    .prepare(
      'INSERT INTO location_nodes (project_id, parent_id, kind, zone_type_id, name_en, name_el, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      projectId,
      parentId,
      input.kind,
      zoneTypeId,
      names.nameEn,
      names.nameEl,
      input.sortOrder ?? nextSortOrder(db, projectId, parentId),
    );
  return getLocation(db, projectId, Number(info.lastInsertRowid));
}

/** Rename, change kind or zone type, reorder, retire (active: false) or move (parentId). */
export function updateLocation(db: Db, projectId: number, id: number, patch: LocationPatchInput): LocationNode {
  const current = getLocation(db, projectId, id);
  assertHasAName({ nameEn: patch.nameEn ?? current.nameEn, nameEl: patch.nameEl ?? current.nameEl });
  let parentId: number | null | undefined;
  if (patch.parentId !== undefined) {
    parentId = checkParent(db, projectId, patch.parentId);
    if (parentId !== null && subtreeIds(db, projectId, id).includes(parentId)) {
      throw new HttpError(409, 'location_cycle');
    }
  }
  const zoneTypeId = patch.zoneTypeId === undefined ? undefined : checkZoneType(db, projectId, patch.zoneTypeId);
  updateColumns(db, 'location_nodes', projectId, id, {
    parent_id: parentId,
    kind: patch.kind,
    zone_type_id: zoneTypeId,
    name_en: patch.nameEn,
    name_el: patch.nameEl,
    sort_order: patch.sortOrder,
    active: patch.active === undefined ? undefined : Number(patch.active),
  });
  return getLocation(db, projectId, id);
}

/**
 * Deletes the node and everything inside it.
 * Plan 3 adds: only when no record uses any of them; otherwise 409 and the owner retires the node instead (design §9.4).
 */
export function deleteLocation(db: Db, projectId: number, id: number): void {
  getLocation(db, projectId, id);
  const ids = subtreeIds(db, projectId, id);
  db.prepare(`DELETE FROM location_nodes WHERE project_id = ? AND id IN (${ids.map(() => '?').join(', ')})`).run(
    projectId,
    ...ids,
  );
}

/** Duplicates a node with all its descendants; the copy's root gets the new names (design §9.4). */
export function copyBranch(db: Db, projectId: number, sourceId: number, input: LocationCopyInput): LocationNode {
  const source = getLocation(db, projectId, sourceId);
  const names = { nameEn: input.nameEn ?? '', nameEl: input.nameEl ?? '' };
  assertHasAName(names);
  const parentId = input.parentId === undefined ? source.parentId : checkParent(db, projectId, input.parentId);
  if (parentId !== null && subtreeIds(db, projectId, sourceId).includes(parentId)) {
    throw new HttpError(409, 'copy_into_own_branch');
  }
  // Parents before children, so every child's new parent already exists when it is inserted.
  const rows = db
    .prepare(
      `WITH RECURSIVE subtree(id, depth) AS (
         SELECT id, 0 FROM location_nodes WHERE project_id = ? AND id = ?
         UNION ALL
         SELECT n.id, s.depth + 1 FROM location_nodes n JOIN subtree s ON n.parent_id = s.id
       )
       SELECT ${COLUMNS.split(', ').map((column) => `n.${column}`).join(', ')}
       FROM subtree s JOIN location_nodes n ON n.id = s.id
       ORDER BY s.depth, n.sort_order, n.id`,
    )
    .all(projectId, sourceId) as LocationRow[];
  const insert = db.prepare(
    'INSERT INTO location_nodes (project_id, parent_id, kind, zone_type_id, name_en, name_el, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const newRootId = db.transaction((): number => {
    const newIds = new Map<number, number>();
    for (const row of rows) {
      const isRoot = row.id === sourceId;
      const newParentId = isRoot ? parentId : newIds.get(row.parentId ?? -1);
      if (newParentId === undefined) throw new Error(`Copy order broken at location node ${row.id}`);
      const info = insert.run(
        projectId,
        newParentId,
        row.kind,
        row.zoneTypeId,
        isRoot ? names.nameEn : row.nameEn,
        isRoot ? names.nameEl : row.nameEl,
        isRoot ? nextSortOrder(db, projectId, parentId) : row.sortOrder,
        row.active,
      );
      newIds.set(row.id, Number(info.lastInsertRowid));
    }
    const rootId = newIds.get(sourceId);
    if (rootId === undefined) throw new Error('Copy produced no root');
    return rootId;
  })();
  return getLocation(db, projectId, newRootId);
}

export function registerLocationRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/locations', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listLocations(db, projectId);
  });

  app.post('/api/projects/:projectId/locations', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(createLocation(db, projectId, LocationCreate.parse(request.body)));
  });

  app.patch('/api/projects/:projectId/locations/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateLocation(db, projectId, id, LocationPatch.parse(request.body));
  });

  app.delete('/api/projects/:projectId/locations/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteLocation(db, projectId, id);
    return { ok: true };
  });

  app.post('/api/projects/:projectId/locations/:id/copy', async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(copyBranch(db, projectId, id, LocationCopy.parse(request.body)));
  });
}
