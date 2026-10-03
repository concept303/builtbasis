import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../../src/server/lists/projects';
import { send } from './helpers';
import { getRecord, makeFixture, patchRecord, postRecord, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

describe('trades, tags and locations on a record (design §5.2, §5.3, §5.5)', () => {
  it('sets and replaces the selections', async () => {
    const record = await postRecord(f, {
      subtype: 'task',
      tradeIds: [f.trades.masonry, f.trades.tiling],
      tagIds: [f.tags.stone],
      locationIds: [f.locations.v1Kitchen, f.locations.villa2],
    });
    expect(record).toMatchObject({
      tradeIds: [f.trades.tiling, f.trades.masonry].sort((a, b) => a - b),
      tagIds: [f.tags.stone],
      locationIds: [f.locations.villa2, f.locations.v1Kitchen].sort((a, b) => a - b),
    });
    const res = await patchRecord(f, record.id, { tagIds: [f.tags.windows], locationIds: [] });
    expect(res.json()).toMatchObject({ tagIds: [f.tags.windows], locationIds: [], tradeIds: record.tradeIds });
  });

  it("rejects another project's tag", async () => {
    const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
    const tag = (await send(f.ctx, f.cookie, 'POST', `/api/projects/${other.id}/tags`, { nameEl: 'Ξένη' })).json();
    const record = await postRecord(f, { subtype: 'task' });
    const res = await patchRecord(f, record.id, { tagIds: [f.tags.stone, tag.id] });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_reference', details: { field: 'tagIds', ids: [tag.id] } });
  });
});

describe('must be done before (design §4.3)', () => {
  it('shows the link on both records', async () => {
    const basement = await postRecord(f, { subtype: 'task', title: 'Basement tiling' });
    const leak = await postRecord(f, { subtype: 'quality_issue', title: 'Wall leak', mustBeDoneBeforeIds: [basement.id] });
    expect(leak.mustBeDoneBefore).toEqual([{ id: basement.id, humanId: 'T-0001', title: 'Basement tiling', status: 'draft' }]);
    expect((await getRecord(f, basement.id)).requiresFirst).toEqual([
      { id: leak.id, humanId: 'QI-0001', title: 'Wall leak', status: 'draft' },
    ]);
  });

  it('rejects the record itself and records of another project', async () => {
    const record = await postRecord(f, { subtype: 'task' });
    const self = await patchRecord(f, record.id, { mustBeDoneBeforeIds: [record.id] });
    expect(self.statusCode).toBe(400);
    expect(self.json()).toEqual({ error: 'precedes_itself' });
    const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
    const foreign = (await send(f.ctx, f.cookie, 'POST', `/api/projects/${other.id}/records`, { subtype: 'task' })).json();
    const res = await patchRecord(f, record.id, { mustBeDoneBeforeIds: [foreign.id] });
    expect(res.json()).toEqual({ error: 'invalid_reference', details: { field: 'mustBeDoneBeforeIds', ids: [foreign.id] } });
  });

  it('rejects a link that closes a cycle and keeps the existing links', async () => {
    const a = await postRecord(f, { subtype: 'task', title: 'A' });
    const b = await postRecord(f, { subtype: 'task', title: 'B' });
    const c = await postRecord(f, { subtype: 'task', title: 'C', mustBeDoneBeforeIds: [] });
    await patchRecord(f, a.id, { mustBeDoneBeforeIds: [b.id] });
    await patchRecord(f, b.id, { mustBeDoneBeforeIds: [c.id] });
    const direct = await patchRecord(f, b.id, { mustBeDoneBeforeIds: [c.id, a.id] });
    expect(direct.statusCode).toBe(409);
    expect(direct.json()).toEqual({ error: 'precedence_cycle' });
    const indirect = await patchRecord(f, c.id, { mustBeDoneBeforeIds: [a.id] });
    expect(indirect.statusCode).toBe(409);
    expect((await getRecord(f, b.id)).mustBeDoneBefore.map((ref) => ref.id)).toEqual([c.id]);
    expect((await getRecord(f, c.id)).mustBeDoneBefore).toEqual([]);
  });

  it('clears the links with an empty list', async () => {
    const a = await postRecord(f, { subtype: 'task' });
    const b = await postRecord(f, { subtype: 'task', mustBeDoneBeforeIds: [a.id] });
    expect((await patchRecord(f, b.id, { mustBeDoneBeforeIds: [] })).json().mustBeDoneBefore).toEqual([]);
    expect((await getRecord(f, a.id)).requiresFirst).toEqual([]);
  });
});
