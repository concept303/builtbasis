import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../../src/server/lists/projects';
import { get, loginAsOwner, makeContext, send, type TestContext } from './helpers';

let ctx: TestContext;
let cookie: string;
let base: string;

beforeEach(async () => {
  ctx = await makeContext();
  cookie = await loginAsOwner(ctx);
  base = `/api/projects/${createProject(ctx.db, { code: 'p1', name: 'Project 1' }).id}`;
});
afterEach(async () => {
  await ctx.close();
});

const createTag = (body: object) => send(ctx, cookie, 'POST', `${base}/tags`, body);

describe('tags (design §9.3)', () => {
  it('creates tags; a name only has to be unique within its own language', async () => {
    const stone = await createTag({ nameEl: 'Πέτρα', nameEn: 'Stone' });
    expect(stone.statusCode).toBe(201);
    expect(stone.json()).toEqual({ id: expect.any(Number), nameEl: 'Πέτρα', nameEn: 'Stone' });
    expect((await createTag({ nameEl: 'Stone' })).statusCode).toBe(201);
    expect((await get(ctx, cookie, `${base}/tags`)).json()).toHaveLength(2);
  });

  it('rejects a duplicate name ignoring case and accents, pointing to the existing tag', async () => {
    const stone = (await createTag({ nameEl: 'Πέτρα' })).json();
    const duplicate = await createTag({ nameEl: ' ΠΕΤΡΑ ', nameEn: 'Stone' });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: 'tag_name_taken', details: { existingTagId: stone.id } });
  });

  it('renames a tag, including a change of letter case only', async () => {
    const tag = (await createTag({ nameEl: 'πέτρα' })).json();
    const renamed = await send(ctx, cookie, 'PATCH', `${base}/tags/${tag.id}`, { nameEl: 'Πέτρα', nameEn: 'Stone' });
    expect(renamed.json()).toEqual({ id: tag.id, nameEl: 'Πέτρα', nameEn: 'Stone' });
  });

  it('offers a merge when a rename collides with exactly one tag; the target keeps its names', async () => {
    const target = (await createTag({ nameEl: 'Πέτρα', nameEn: 'Stone' })).json();
    const source = (await createTag({ nameEl: 'Πέτρες' })).json();
    const collision = await send(ctx, cookie, 'PATCH', `${base}/tags/${source.id}`, { nameEn: 'stone' });
    expect(collision.statusCode).toBe(409);
    expect(collision.json()).toEqual({ error: 'tag_name_taken', details: { existingTagId: target.id } });
    const merged = await send(ctx, cookie, 'POST', `${base}/tags/${source.id}/merge`, { intoId: target.id });
    expect(merged.json()).toEqual(target);
    expect((await get(ctx, cookie, `${base}/tags`)).json()).toEqual([target]);
  });

  it('rejects a rename whose names collide with two different tags', async () => {
    const a = (await createTag({ nameEl: 'Πέτρα' })).json();
    const b = (await createTag({ nameEn: 'Stone' })).json();
    const c = (await createTag({ nameEl: 'Μάρμαρο' })).json();
    const res = await send(ctx, cookie, 'PATCH', `${base}/tags/${c.id}`, { nameEl: 'πετρα', nameEn: 'STONE' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'tag_names_conflict', details: { tagIds: [a.id, b.id] } });
  });

  it("deletes a tag; refuses to merge a tag into itself or into another project's tag", async () => {
    const tag = (await createTag({ nameEl: 'Πισίνα' })).json();
    const self = await send(ctx, cookie, 'POST', `${base}/tags/${tag.id}/merge`, { intoId: tag.id });
    expect(self.statusCode).toBe(400);
    expect(self.json()).toEqual({ error: 'merge_into_self' });
    const other = createProject(ctx.db, { code: 'p2', name: 'Project 2' });
    const foreign = (await send(ctx, cookie, 'POST', `/api/projects/${other.id}/tags`, { nameEl: 'Πισίνα' })).json();
    const cross = await send(ctx, cookie, 'POST', `${base}/tags/${tag.id}/merge`, { intoId: foreign.id });
    expect(cross.statusCode).toBe(404);
    expect(cross.json()).toEqual({ error: 'tag_not_found' });
    expect((await send(ctx, cookie, 'DELETE', `${base}/tags/${tag.id}`)).statusCode).toBe(200);
    expect((await get(ctx, cookie, `${base}/tags`)).json()).toEqual([]);
  });
});
