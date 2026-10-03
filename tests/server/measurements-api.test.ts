import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compareItems, compareOverTime, type MeasurementSet } from '../../src/domain';
import { get, send } from './helpers';
import { makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

const setsUrl = (recordId: number, setId?: number) =>
  recordUrl(f, recordId, setId === undefined ? '/measurement-sets' : `/measurement-sets/${setId}`);

const row = (item: string, value: number, quantity = 'Stone thickness') => ({ item, quantity, value, unit: 'mm' });

describe('measurements (design §5.7)', () => {
  it('preserves full precision and creation order when dates are equal', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const first = await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14', phase: 'before', rows: [row('Left', 18.1234567890123)],
    });
    expect(first.statusCode).toBe(201);
    const second = await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14', phase: 'after', rows: [row('Left', 19.9876543210987)],
    });
    expect(second.statusCode).toBe(201);
    const sets = (await get(f.ctx, f.cookie, setsUrl(qi.id))).json();
    expect(sets.map((set: { id: number }) => set.id)).toEqual([first.json().id, second.json().id]);
    expect(sets.map((set: MeasurementSet) => set.rows[0]!.value)).toEqual([18.1234567890123, 19.9876543210987]);
  });

  it('rolls back metadata and rows on duplicate replacement, and accepts an empty replacement', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const created = await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14', phase: 'before', note: 'Original', rows: [row('Left', 18)],
    });
    expect(created.statusCode).toBe(201);
    const set = created.json();
    const rejected = await send(f.ctx, f.cookie, 'PATCH', setsUrl(qi.id, set.id), {
      note: 'Changed', rows: [row('Right', 19), row(' RIGHT ', 20)],
    });
    expect(rejected.statusCode).toBe(422);
    expect(rejected.json().error).toBe('duplicate_measurement_rows');
    expect((await get(f.ctx, f.cookie, setsUrl(qi.id))).json()).toEqual([set]);
    const emptied = await send(f.ctx, f.cookie, 'PATCH', setsUrl(qi.id, set.id), { rows: [] });
    expect(emptied.statusCode).toBe(200);
    expect(emptied.json()).toEqual({ ...set, rows: [] });
  });

  it('stores sets with their rows in entry order, and lists sets by date then creation', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const after = await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-10-02',
      phase: 'after',
      measuredById: f.people.contractor,
      rows: [row('Left', 18), row('Right', 18.2)],
    });
    expect(after.statusCode).toBe(201);
    expect(after.json()).toEqual({
      id: expect.any(Number),
      date: '2026-10-02',
      measuredById: f.people.contractor,
      phase: 'after',
      note: null,
      rows: [
        { item: 'Left', quantity: 'Stone thickness', value: 18, unit: 'mm', note: null },
        { item: 'Right', quantity: 'Stone thickness', value: 18.2, unit: 'mm', note: null },
      ],
    });
    await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14',
      phase: 'before',
      rows: [row('left ', 18), row('Right', 15.3), row('Top', 20)],
    });
    const sets = (await get(f.ctx, f.cookie, setsUrl(qi.id))).json();
    expect(sets.map((set: { date: string }) => set.date)).toEqual(['2026-09-14', '2026-10-02']);
  });

  it('feeds the shared comparison functions (between items, before vs after)', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14',
      phase: 'before',
      rows: [row('Left', 18), row('Right', 15.3)],
    });
    await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), { date: '2026-10-02', phase: 'after', rows: [row('right', 18)] });
    const sets: MeasurementSet[] = (await get(f.ctx, f.cookie, setsUrl(qi.id))).json();
    expect(compareItems(sets[0]!, 'Stone thickness', 'mm').map((entry) => entry.item)).toEqual(['Left', 'Right']);
    const series = compareOverTime(sets, 'Right', 'stone thickness', 'mm');
    expect(series.map((point) => point.value)).toEqual([15.3, 18]);
    expect(series[1]!.changeFromPrevious).toBeCloseTo(2.7);
  });

  it('rejects duplicate Item + Quantity + Unit within a set, after normalising labels', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const res = await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14',
      phase: 'before',
      rows: [row('Left side', 18), row('  LEFT   side', 19), { ...row('Left side', 1.8), unit: 'cm' }],
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({
      error: 'duplicate_measurement_rows',
      details: { keys: [JSON.stringify(['left side', 'stone thickness', 'mm'])] },
    });
    expect((await get(f.ctx, f.cookie, setsUrl(qi.id))).json()).toEqual([]);
  });

  it('edits a set, replacing its rows when rows are sent, and deletes it', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const set = (
      await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), { date: '2026-09-14', phase: 'before', rows: [row('Left', 18)] })
    ).json();
    const noteOnly = await send(f.ctx, f.cookie, 'PATCH', setsUrl(qi.id, set.id), { note: 'Laser meter' });
    expect(noteOnly.json()).toMatchObject({ note: 'Laser meter', rows: [row('Left', 18)] });
    const newRows = await send(f.ctx, f.cookie, 'PATCH', setsUrl(qi.id, set.id), { rows: [row('Top', 20), row('Left', 17)] });
    expect(newRows.json().rows.map((r: { item: string }) => r.item)).toEqual(['Top', 'Left']);
    expect((await send(f.ctx, f.cookie, 'DELETE', setsUrl(qi.id, set.id))).statusCode).toBe(200);
    expect((await get(f.ctx, f.cookie, setsUrl(qi.id))).json()).toEqual([]);
  });

  it('rejects an inactive measurer and a set of another record', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const inactive = await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14',
      phase: 'before',
      measuredById: f.people.retired,
    });
    expect(inactive.json().error).toBe('inactive_selection');
    const other = await postRecord(f, { subtype: 'quality_issue' });
    const set = (await send(f.ctx, f.cookie, 'POST', setsUrl(other.id), { date: '2026-09-14', phase: 'before' })).json();
    const res = await send(f.ctx, f.cookie, 'DELETE', setsUrl(qi.id, set.id));
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'measurement_set_not_found' });
  });
});
