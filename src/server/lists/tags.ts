import type { FastifyInstance } from 'fastify';
import { TagBody, TagMergeBody, tagKey, type TagInput } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { assertHasAName } from './names';
import { requireProject } from './projects';

export interface Tag {
  id: number;
  nameEl: string;
  nameEn: string;
}

const SELECT = 'SELECT id, name_el AS nameEl, name_en AS nameEn FROM tags';

export function listTags(db: Db, projectId: number): Tag[] {
  return db.prepare(`${SELECT} WHERE project_id = ? ORDER BY id`).all(projectId) as Tag[];
}

export function getTag(db: Db, projectId: number, id: number): Tag {
  const tag = db.prepare(`${SELECT} WHERE project_id = ? AND id = ?`).get(projectId, id) as Tag | undefined;
  if (!tag) throw new HttpError(404, 'tag_not_found');
  return tag;
}

/** Other tags of the project whose Greek or English name matches the given names. */
function collidingTagIds(db: Db, projectId: number, names: { nameEl: string; nameEn: string }, exceptId: number | null): number[] {
  return db
    .prepare('SELECT id FROM tags WHERE project_id = ? AND id IS NOT ? AND (name_el_key = ? OR name_en_key = ?) ORDER BY id')
    .pluck()
    .all(projectId, exceptId, tagKey(names.nameEl), tagKey(names.nameEn)) as number[];
}

/** One colliding tag: offer it (use it, or merge into it). Two different tags: the names contradict each other. */
function rejectCollisions(ids: number[]): void {
  const [first] = ids;
  if (first === undefined) return;
  if (ids.length > 1) throw new HttpError(409, 'tag_names_conflict', { tagIds: ids });
  throw new HttpError(409, 'tag_name_taken', { existingTagId: first });
}

export function createTag(db: Db, projectId: number, input: TagInput): Tag {
  const names = { nameEl: input.nameEl ?? '', nameEn: input.nameEn ?? '' };
  assertHasAName(names);
  rejectCollisions(collidingTagIds(db, projectId, names, null));
  const info = db
    .prepare('INSERT INTO tags (project_id, name_el, name_en, name_el_key, name_en_key) VALUES (?, ?, ?, ?, ?)')
    .run(projectId, names.nameEl, names.nameEn, tagKey(names.nameEl), tagKey(names.nameEn));
  return getTag(db, projectId, Number(info.lastInsertRowid));
}

/** Records reference the tag by id, so a rename applies to every record carrying it (design §9.3). */
export function renameTag(db: Db, projectId: number, id: number, patch: TagInput): Tag {
  const current = getTag(db, projectId, id);
  const names = { nameEl: patch.nameEl ?? current.nameEl, nameEn: patch.nameEn ?? current.nameEn };
  assertHasAName(names);
  rejectCollisions(collidingTagIds(db, projectId, names, id));
  db.prepare(
    'UPDATE tags SET name_el = ?, name_en = ?, name_el_key = ?, name_en_key = ? WHERE project_id = ? AND id = ?',
  ).run(names.nameEl, names.nameEn, tagKey(names.nameEl), tagKey(names.nameEn), projectId, id);
  return getTag(db, projectId, id);
}

/**
 * Merges a tag into another, which keeps its own names (design §9.3).
 * Plan 3 adds: move the source tag's record links to the target (in this transaction) before the delete.
 */
export function mergeTag(db: Db, projectId: number, sourceId: number, intoId: number): Tag {
  if (sourceId === intoId) throw new HttpError(400, 'merge_into_self');
  getTag(db, projectId, sourceId);
  const target = getTag(db, projectId, intoId);
  db.transaction(() => {
    db.prepare('DELETE FROM tags WHERE project_id = ? AND id = ?').run(projectId, sourceId);
  })();
  return target;
}

/** Plan 3 adds: the number of affected records, shown to the owner before confirming (design §9.3). */
export function deleteTag(db: Db, projectId: number, id: number): void {
  getTag(db, projectId, id);
  db.prepare('DELETE FROM tags WHERE project_id = ? AND id = ?').run(projectId, id);
}

export function registerTagRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/tags', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listTags(db, projectId);
  });

  app.post('/api/projects/:projectId/tags', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(createTag(db, projectId, TagBody.parse(request.body)));
  });

  app.patch('/api/projects/:projectId/tags/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return renameTag(db, projectId, id, TagBody.parse(request.body));
  });

  app.post('/api/projects/:projectId/tags/:id/merge', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return mergeTag(db, projectId, id, TagMergeBody.parse(request.body).intoId);
  });

  app.delete('/api/projects/:projectId/tags/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteTag(db, projectId, id);
    return { ok: true };
  });
}
