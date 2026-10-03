import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../../src/server/lists/projects';
import { get, loginAsOwner, makeContext, send, type TestContext } from './helpers';

interface NodeJson {
  id: number;
  parentId: number | null;
  kind: string;
  zoneTypeId: number | null;
  nameEn: string;
  nameEl: string;
  sortOrder: number;
  active: boolean;
}

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

async function addNode(body: object): Promise<NodeJson> {
  const res = await send(ctx, cookie, 'POST', `${base}/locations`, body);
  expect(res.statusCode).toBe(201);
  return res.json();
}
const list = async (): Promise<NodeJson[]> => (await get(ctx, cookie, `${base}/locations`)).json();

describe('location tree (design §9.4)', () => {
  it('builds a tree; siblings get increasing sort order', async () => {
    const villa = await addNode({ kind: 'building', nameEn: 'Villa 1', nameEl: 'Βίλα 1' });
    const ground = await addNode({ parentId: villa.id, kind: 'level', nameEn: 'Ground' });
    const upper = await addNode({ parentId: villa.id, kind: 'level', nameEn: 'Upper' });
    expect(await list()).toEqual([
      { id: villa.id, parentId: null, kind: 'building', zoneTypeId: null, nameEn: 'Villa 1', nameEl: 'Βίλα 1', sortOrder: 1, active: true },
      { id: ground.id, parentId: villa.id, kind: 'level', zoneTypeId: null, nameEn: 'Ground', nameEl: '', sortOrder: 1, active: true },
      { id: upper.id, parentId: villa.id, kind: 'level', zoneTypeId: null, nameEn: 'Upper', nameEl: '', sortOrder: 2, active: true },
    ]);
  });

  it('validates kind, names, parent and zone type', async () => {
    const other = createProject(ctx.db, { code: 'p2', name: 'Project 2' });
    const foreignNode = (
      await send(ctx, cookie, 'POST', `/api/projects/${other.id}/locations`, { kind: 'building', nameEn: 'Elsewhere' })
    ).json();
    const foreignZone = (
      await send(ctx, cookie, 'POST', `/api/projects/${other.id}/zone-types`, { nameEn: 'Kitchen' })
    ).json();
    const post = (body: object) => send(ctx, cookie, 'POST', `${base}/locations`, body);
    expect((await post({ kind: 'room', nameEn: 'X' })).statusCode).toBe(400);
    expect((await post({ kind: 'space' })).json()).toEqual({ error: 'name_required' });
    expect((await post({ kind: 'space', nameEn: 'X', parentId: foreignNode.id })).json()).toEqual({
      error: 'invalid_parent',
    });
    expect((await post({ kind: 'space', nameEn: 'X', zoneTypeId: foreignZone.id })).json()).toEqual({
      error: 'invalid_zone_type',
    });
  });

  it('moves a node, but never under itself or one of its descendants', async () => {
    const villa1 = await addNode({ kind: 'building', nameEn: 'Villa 1' });
    const villa2 = await addNode({ kind: 'building', nameEn: 'Villa 2' });
    const ground = await addNode({ parentId: villa1.id, kind: 'level', nameEn: 'Ground' });
    const kitchen = await addNode({ parentId: ground.id, kind: 'space', nameEn: 'Kitchen' });
    const moved = await send(ctx, cookie, 'PATCH', `${base}/locations/${ground.id}`, { parentId: villa2.id });
    expect(moved.json()).toMatchObject({ id: ground.id, parentId: villa2.id });
    for (const parentId of [ground.id, kitchen.id]) {
      const res = await send(ctx, cookie, 'PATCH', `${base}/locations/${ground.id}`, { parentId });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'location_cycle' });
    }
    const top = await send(ctx, cookie, 'PATCH', `${base}/locations/${ground.id}`, { parentId: null });
    expect(top.json()).toMatchObject({ parentId: null });
  });

  it('retires a node: it stays in the tree, marked inactive', async () => {
    const node = await addNode({ kind: 'building', nameEn: 'Old wing' });
    const res = await send(ctx, cookie, 'PATCH', `${base}/locations/${node.id}`, { active: false });
    expect(res.json()).toMatchObject({ id: node.id, active: false });
    expect(await list()).toHaveLength(1);
  });

  it('deletes a node together with its descendants', async () => {
    const villa = await addNode({ kind: 'building', nameEn: 'Villa 1' });
    const ground = await addNode({ parentId: villa.id, kind: 'level', nameEn: 'Ground' });
    await addNode({ parentId: ground.id, kind: 'space', nameEn: 'Kitchen' });
    const keep = await addNode({ kind: 'building', nameEn: 'Site' });
    expect((await send(ctx, cookie, 'DELETE', `${base}/locations/${villa.id}`)).statusCode).toBe(200);
    expect((await list()).map((node) => node.id)).toEqual([keep.id]);
  });

  it('copies a branch with all its descendants under a new name', async () => {
    const kitchenType = (await send(ctx, cookie, 'POST', `${base}/zone-types`, { nameEn: 'Kitchen' })).json();
    const root = await addNode({ kind: 'other', nameEn: 'Project' });
    const villa1 = await addNode({ parentId: root.id, kind: 'building', nameEn: 'Villa 1', nameEl: 'Βίλα 1' });
    const ground = await addNode({ parentId: villa1.id, kind: 'level', nameEn: 'Ground' });
    await addNode({ parentId: ground.id, kind: 'space', nameEn: 'Kitchen', zoneTypeId: kitchenType.id });
    await addNode({ parentId: ground.id, kind: 'space', nameEn: 'Hall' });

    const res = await send(ctx, cookie, 'POST', `${base}/locations/${villa1.id}/copy`, { nameEn: 'Villa 2', nameEl: 'Βίλα 2' });
    expect(res.statusCode).toBe(201);
    const villa2: NodeJson = res.json();
    expect(villa2).toMatchObject({ parentId: root.id, kind: 'building', nameEn: 'Villa 2', nameEl: 'Βίλα 2', sortOrder: 2 });

    const nodes = await list();
    const childrenOf = (id: number) => nodes.filter((node) => node.parentId === id);
    const [ground2] = childrenOf(villa2.id);
    expect(ground2).toMatchObject({ kind: 'level', nameEn: 'Ground' });
    expect(
      childrenOf(ground2!.id).map(({ nameEn, zoneTypeId, sortOrder }) => ({ nameEn, zoneTypeId, sortOrder })),
    ).toEqual([
      { nameEn: 'Kitchen', zoneTypeId: kitchenType.id, sortOrder: 1 },
      { nameEn: 'Hall', zoneTypeId: null, sortOrder: 2 },
    ]);
    expect(nodes).toHaveLength(9);
    expect(childrenOf(villa1.id)).toHaveLength(1);
  });

  it('refuses to copy a branch into itself', async () => {
    const villa = await addNode({ kind: 'building', nameEn: 'Villa 1' });
    const ground = await addNode({ parentId: villa.id, kind: 'level', nameEn: 'Ground' });
    const res = await send(ctx, cookie, 'POST', `${base}/locations/${villa.id}/copy`, { nameEn: 'Villa 1b', parentId: ground.id });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'copy_into_own_branch' });
  });
});
