import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../../src/server/lists/projects';
import { get, loginAsOwner, makeContext, send, type TestContext } from './helpers';

let ctx: TestContext;
let cookie: string;
let projectId: number;
let base: string;

beforeEach(async () => {
  ctx = await makeContext();
  cookie = await loginAsOwner(ctx);
  projectId = createProject(ctx.db, { code: 'p1', name: 'Project 1' }).id;
  base = `/api/projects/${projectId}`;
});
afterEach(async () => {
  await ctx.close();
});

describe('projects', () => {
  it('lists projects and answers 404 for an unknown project', async () => {
    expect((await get(ctx, cookie, '/api/projects')).json()).toEqual([
      expect.objectContaining({ id: projectId, code: 'p1', name: 'Project 1' }),
    ]);
    const res = await get(ctx, cookie, '/api/projects/999/people');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'project_not_found' });
  });
});

describe('people (design §9.1)', () => {
  it('creates, lists and updates a person', async () => {
    const created = await send(ctx, cookie, 'POST', `${base}/people`, {
      code: 'ARCH-MK',
      name: 'Test Architect',
      role: 'architect',
      email: 'arch@example.com',
    });
    expect(created.statusCode).toBe(201);
    const person = created.json();
    expect(person).toEqual({
      id: expect.any(Number),
      code: 'ARCH-MK',
      name: 'Test Architect',
      company: null,
      role: 'architect',
      email: 'arch@example.com',
      phone: null,
      active: true,
    });
    const updated = await send(ctx, cookie, 'PATCH', `${base}/people/${person.id}`, { active: false, company: 'Studio' });
    expect(updated.json()).toMatchObject({ active: false, company: 'Studio', email: 'arch@example.com' });
    expect((await get(ctx, cookie, `${base}/people`)).json()).toHaveLength(1);
  });

  it('rejects a duplicate code, an unknown role and unknown fields', async () => {
    await send(ctx, cookie, 'POST', `${base}/people`, { code: 'C-PB', name: 'Contractor', role: 'main_contractor' });
    const duplicate = await send(ctx, cookie, 'POST', `${base}/people`, { code: 'C-PB', name: 'Other', role: 'other' });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: 'code_taken' });
    const badRole = await send(ctx, cookie, 'POST', `${base}/people`, { code: 'X', name: 'X', role: 'boss' });
    expect(badRole.statusCode).toBe(400);
    expect(badRole.json().error).toBe('invalid_input');
    const extra = await send(ctx, cookie, 'POST', `${base}/people`, { code: 'Y', name: 'Y', role: 'other', salary: 1 });
    expect(extra.statusCode).toBe(400);
  });

  it('answers 404 for a person of another project', async () => {
    const other = createProject(ctx.db, { code: 'p2', name: 'Project 2' });
    const foreign = (
      await send(ctx, cookie, 'POST', `/api/projects/${other.id}/people`, { code: 'A', name: 'A', role: 'other' })
    ).json();
    const res = await send(ctx, cookie, 'PATCH', `${base}/people/${foreign.id}`, { name: 'B' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'person_not_found' });
  });
});

describe('trades (design §9.2)', () => {
  it('creates, renames and retires a trade', async () => {
    const created = await send(ctx, cookie, 'POST', `${base}/trades`, {
      code: 'TIL',
      nameEn: 'Tiling',
      nameEl: 'Πλακίδια',
      defEn: 'Tiles.',
      defEl: 'Πλακίδια.',
    });
    expect(created.statusCode).toBe(201);
    const trade = created.json();
    expect(trade).toEqual({
      id: expect.any(Number),
      code: 'TIL',
      nameEn: 'Tiling',
      nameEl: 'Πλακίδια',
      defEn: 'Tiles.',
      defEl: 'Πλακίδια.',
      active: true,
    });
    const retired = await send(ctx, cookie, 'PATCH', `${base}/trades/${trade.id}`, { nameEl: 'Πλακάκια', active: false });
    expect(retired.json()).toMatchObject({ nameEn: 'Tiling', nameEl: 'Πλακάκια', active: false });
    expect((await get(ctx, cookie, `${base}/trades`)).json()).toHaveLength(1);
  });

  it('requires at least one name, also after an update', async () => {
    const none = await send(ctx, cookie, 'POST', `${base}/trades`, { code: 'X', nameEn: ' ' });
    expect(none.statusCode).toBe(400);
    expect(none.json()).toEqual({ error: 'name_required' });
    const trade = (await send(ctx, cookie, 'POST', `${base}/trades`, { code: 'Y', nameEn: 'Only English' })).json();
    expect(trade.nameEl).toBe('');
    const cleared = await send(ctx, cookie, 'PATCH', `${base}/trades/${trade.id}`, { nameEn: '' });
    expect(cleared.statusCode).toBe(400);
    expect(cleared.json()).toEqual({ error: 'name_required' });
  });
});

describe('zone types (design §9.5)', () => {
  it('creates, renames and deletes an unused zone type', async () => {
    const zone = (await send(ctx, cookie, 'POST', `${base}/zone-types`, { nameEn: 'Kitchen' })).json();
    expect(zone).toEqual({ id: expect.any(Number), nameEn: 'Kitchen', nameEl: '' });
    const renamed = await send(ctx, cookie, 'PATCH', `${base}/zone-types/${zone.id}`, { nameEl: 'Κουζίνα' });
    expect(renamed.json()).toEqual({ id: zone.id, nameEn: 'Kitchen', nameEl: 'Κουζίνα' });
    expect((await send(ctx, cookie, 'DELETE', `${base}/zone-types/${zone.id}`)).statusCode).toBe(200);
    expect((await get(ctx, cookie, `${base}/zone-types`)).json()).toEqual([]);
  });

  it('refuses to delete a zone type that a location node uses', async () => {
    const zone = (await send(ctx, cookie, 'POST', `${base}/zone-types`, { nameEn: 'Kitchen' })).json();
    ctx.db
      .prepare('INSERT INTO location_nodes (project_id, kind, zone_type_id, name_en) VALUES (?, ?, ?, ?)')
      .run(projectId, 'space', zone.id, 'Kitchen');
    const res = await send(ctx, cookie, 'DELETE', `${base}/zone-types/${zone.id}`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'zone_type_in_use' });
  });
});

describe('project-scoped managed lists', () => {
  it.each([
    ['trades', { code: 'T', nameEn: 'Trade' }, 'trade_not_found'],
    ['zone-types', { nameEn: 'Zone' }, 'zone_type_not_found'],
  ] as const)('hides foreign %s from updates and lists', async (list, input, error) => {
    const other = createProject(ctx.db, { code: 'p2', name: 'Project 2' });
    const foreign = (await send(ctx, cookie, 'POST', `/api/projects/${other.id}/${list}`, input)).json();
    const res = await send(ctx, cookie, 'PATCH', `${base}/${list}/${foreign.id}`, { nameEn: 'Changed' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error });
    expect((await get(ctx, cookie, `${base}/${list}`)).json()).toEqual([]);
    if (list === 'zone-types') {
      const removed = await send(ctx, cookie, 'DELETE', `${base}/${list}/${foreign.id}`);
      expect(removed.statusCode).toBe(404);
      expect(removed.json()).toEqual({ error });
    }
    expect((await get(ctx, cookie, `/api/projects/${other.id}/${list}`)).json()).toEqual([foreign]);
  });

  it.each(['trades', 'zone-types'])('validates the completed bilingual row for %s', async (list) => {
    const input = list === 'trades' ? { code: 'T' } : {};
    const missing = await send(ctx, cookie, 'POST', `${base}/${list}`, { ...input, nameEn: ' ', nameEl: ' ' });
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toEqual({ error: 'name_required' });
    const created = await send(ctx, cookie, 'POST', `${base}/${list}`, { ...input, nameEl: 'Ελληνικά' });
    expect(created.statusCode).toBe(201);
    const item = created.json();
    const cleared = await send(ctx, cookie, 'PATCH', `${base}/${list}/${item.id}`, { nameEl: ' ' });
    expect(cleared.statusCode).toBe(400);
    expect(cleared.json()).toEqual({ error: 'name_required' });
    expect((await get(ctx, cookie, `${base}/${list}`)).json()).toEqual([item]);
    const switched = await send(ctx, cookie, 'PATCH', `${base}/${list}/${item.id}`, { nameEn: 'English', nameEl: '' });
    expect(switched.statusCode).toBe(200);
    expect(switched.json()).toMatchObject({ nameEn: 'English', nameEl: '' });
  });

  it.each(['people', 'trades'])('rejects duplicate %s codes on update without changing the row', async (list) => {
    const input = list === 'people' ? { name: 'Name', role: 'other' } : { nameEn: 'Name' };
    const first = await send(ctx, cookie, 'POST', `${base}/${list}`, { ...input, code: 'A' });
    expect(first.statusCode).toBe(201);
    const second = (await send(ctx, cookie, 'POST', `${base}/${list}`, { ...input, code: 'B' })).json();
    const duplicate = await send(ctx, cookie, 'PATCH', `${base}/${list}/${second.id}`, { code: 'A' });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: 'code_taken' });
    expect((await get(ctx, cookie, `${base}/${list}`)).json()).toEqual([first.json(), second]);
  });
});
