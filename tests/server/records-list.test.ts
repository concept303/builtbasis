import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLocation } from '../../src/server/lists/locations';
import { createZoneType } from '../../src/server/lists/zone-types';
import { get } from './helpers';
import { forceStatus, makeFixture, patchRecord, postRecord, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

/** Human IDs of the listed records, and the totals. */
async function list(query = ''): Promise<{ ids: string[]; count: number; estimatedCost: number }> {
  const res = await get(f.ctx, f.cookie, `${f.base}/records${query === '' ? '' : `?${query}`}`);
  if (res.statusCode !== 200) throw new Error(`list failed: ${res.statusCode} ${res.body}`);
  const body = res.json();
  return { ids: body.records.map((record: { humanId: string }) => record.humanId), ...body.totals };
}

describe('record list filters (design §5.5, §10.2)', () => {
  it('filters on a location including everything inside it, listing and counting each record once', async () => {
    await postRecord(f, { subtype: 'task', locationIds: [f.locations.villa1, f.locations.v1Kitchen] });
    await postRecord(f, { subtype: 'task', locationIds: [f.locations.v2Kitchen] });
    await postRecord(f, { subtype: 'task' });
    expect(await list(`locationId=${f.locations.villa1}`)).toMatchObject({ ids: ['T-0001'], count: 1 });
    expect(await list(`locationId=${f.locations.villa1},${f.locations.villa2}`)).toMatchObject({
      ids: ['T-0001', 'T-0002'],
      count: 2,
    });
    expect(await list(`locationId=${f.locations.v1Ground}`)).toMatchObject({ ids: ['T-0001'] });
  });

  it('matches a zone type only on nodes that carry it, not on differently typed nodes inside them', async () => {
    const bathroom = createZoneType(f.ctx.db, f.projectId, { nameEn: 'Bathroom' }).id;
    const wc = createLocation(f.ctx.db, f.projectId, {
      kind: 'space',
      nameEn: 'WC',
      parentId: f.locations.v1Kitchen,
      zoneTypeId: bathroom,
    }).id;
    await postRecord(f, { subtype: 'task', locationIds: [wc] });
    expect((await list(`zoneTypeId=${f.zones.kitchen}`)).ids).toEqual([]);
    expect((await list(`zoneTypeId=${bathroom}`)).ids).toEqual(['T-0001']);
    expect((await list(`locationId=${f.locations.v1Kitchen}`)).ids).toEqual(['T-0001']);
  });

  it('filters on a zone type across buildings', async () => {
    await postRecord(f, { subtype: 'task', locationIds: [f.locations.v1Kitchen] });
    await postRecord(f, { subtype: 'task', locationIds: [f.locations.v2Kitchen] });
    await postRecord(f, { subtype: 'task', locationIds: [f.locations.villa1] });
    expect((await list(`zoneTypeId=${f.zones.kitchen}`)).ids).toEqual(['T-0001', 'T-0002']);
  });

  it('combines filters with AND and the values of one filter with OR', async () => {
    await postRecord(f, { subtype: 'quality_issue', severity: 'major', problemTypes: ['defect'], safety: true });
    await postRecord(f, { subtype: 'quality_issue', severity: 'minor', problemTypes: ['damage', 'incomplete'] });
    await postRecord(f, { subtype: 'task', severity: 'major', tradeIds: [f.trades.tiling], tagIds: [f.tags.stone] });
    await postRecord(f, { subtype: 'detail_clarification', ballInCourtId: f.people.architect });
    expect((await list('severity=major')).ids).toEqual(['QI-0001', 'T-0001']);
    expect((await list('severity=major,minor&subtype=quality_issue')).ids).toEqual(['QI-0001', 'QI-0002']);
    expect((await list('problemType=incomplete,nonconformance')).ids).toEqual(['QI-0002']);
    expect((await list('safety=true')).ids).toEqual(['QI-0001']);
    expect((await list(`tradeId=${f.trades.tiling}`)).ids).toEqual(['T-0001']);
    expect((await list(`tagId=${f.tags.stone},${f.tags.windows}`)).ids).toEqual(['T-0001']);
    expect((await list(`ballInCourtId=${f.people.architect}`)).ids).toEqual(['DC-0001']);
    expect((await list('status=draft')).count).toBe(4);
  });

  it('filters on due dates and on must-be-done-before links', async () => {
    const tiling = await postRecord(f, { subtype: 'task', title: 'Tiling', dueDate: '2026-11-30' });
    const leak = await postRecord(f, { subtype: 'quality_issue', dueDate: '2026-10-15', mustBeDoneBeforeIds: [tiling.id] });
    const done = await postRecord(f, { subtype: 'task', mustBeDoneBeforeIds: [tiling.id] });
    forceStatus(f, done.id, 'closed');
    expect((await list('dueFrom=2026-11-01&dueTo=2026-11-30')).ids).toEqual(['T-0001']);
    expect((await list(`before=${tiling.id}`)).ids).toEqual(['QI-0001', 'T-0002']);
    expect((await list(`after=${leak.id}`)).ids).toEqual(['T-0001']);
    expect((await list('blocking=true')).ids).toEqual(['QI-0001']);
  });

  it('searches title, description and ID, ignoring case and accents', async () => {
    await postRecord(f, { subtype: 'quality_issue', title: 'Πόρτα κουζίνας' });
    await postRecord(f, { subtype: 'task', title: 'Paint', description: 'Second coat, 100% coverage' });
    await postRecord(f, { subtype: 'task', title: 'Other' });
    expect((await list(`q=${encodeURIComponent('ΚΟΥΖΙΝΑΣ')}`)).ids).toEqual(['QI-0001']);
    expect((await list('q=second%20COAT')).ids).toEqual(['T-0001']);
    expect((await list('q=t-0002')).ids).toEqual(['T-0002']);
    expect((await list('q=100%25')).ids).toEqual(['T-0001']);
    expect((await list('q=0%25')).ids).toEqual(['T-0001']);
  });
});

describe('record list order and totals (design §10.2)', () => {
  it('sorts by priority, due date or update time; empty values last', async () => {
    await postRecord(f, { subtype: 'task', priority: 'low', dueDate: '2026-12-01' });
    await postRecord(f, { subtype: 'task', dueDate: '2026-10-01' });
    await postRecord(f, { subtype: 'task', priority: 'urgent' });
    expect((await list()).ids).toEqual(['T-0001', 'T-0002', 'T-0003']);
    expect((await list('sort=priority')).ids).toEqual(['T-0003', 'T-0001', 'T-0002']);
    expect((await list('sort=priority&dir=desc')).ids).toEqual(['T-0001', 'T-0003', 'T-0002']);
    expect((await list('sort=due')).ids).toEqual(['T-0002', 'T-0001', 'T-0003']);
    const setUpdated = f.ctx.db.prepare('UPDATE records SET updated_at = ? WHERE human_id = ?');
    setUpdated.run('2026-01-02T00:00:00.000Z', 'T-0001');
    setUpdated.run('2026-01-03T00:00:00.000Z', 'T-0002');
    setUpdated.run('2026-01-01T00:00:00.000Z', 'T-0003');
    expect((await list('sort=updated')).ids).toEqual(['T-0002', 'T-0001', 'T-0003']);
  });

  it('totals the estimated cost of the filtered records that are Outside contract scope only', async () => {
    const a = await postRecord(f, { subtype: 'task', outsideScope: true, estimatedCost: 1000.5, tagIds: [f.tags.stone] });
    await postRecord(f, { subtype: 'task', outsideScope: true, estimatedCost: 250 });
    await postRecord(f, { subtype: 'task', outsideScope: true, estimatedCost: 99.5, tagIds: [f.tags.stone] });
    await patchRecord(f, a.id, { outsideScope: false });
    expect(await list()).toMatchObject({ count: 3, estimatedCost: 349.5 });
    expect(await list(`tagId=${f.tags.stone}`)).toMatchObject({ count: 2, estimatedCost: 99.5 });
    expect(await list('outsideScope=false')).toMatchObject({ ids: ['T-0001'], estimatedCost: 0 });
  });

  it('returns the list columns', async () => {
    await postRecord(f, { subtype: 'task', title: 'Paint', completion: 40, safety: true });
    const res = await get(f.ctx, f.cookie, `${f.base}/records`);
    expect(res.json().records[0]).toEqual({
      id: expect.any(Number),
      humanId: 'T-0001',
      subtype: 'task',
      status: 'draft',
      title: 'Paint',
      ballInCourtId: null,
      dueDate: null,
      priority: null,
      severity: null,
      completion: 40,
      safety: true,
      updatedAt: expect.any(String),
    });
  });

  it('rejects unknown filters and unknown codes', async () => {
    const unknown = await get(f.ctx, f.cookie, `${f.base}/records?colour=red`);
    expect(unknown.statusCode).toBe(400);
    expect((await get(f.ctx, f.cookie, `${f.base}/records?status=finished`)).statusCode).toBe(400);
    expect((await get(f.ctx, f.cookie, `${f.base}/records?sort=title`)).statusCode).toBe(400);
  });
});
