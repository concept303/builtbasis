import { afterEach, beforeEach, expect, it } from 'vitest';
import { createContributor } from '../../src/server/auth/contributors';
import { createSession } from '../../src/server/auth/sessions';
import { get, OWNER, send } from './helpers';
import { addPhoto } from './file-fixture';
import { forceStatus, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';
let f: Fixture;
beforeEach(async () => { f = await makeFixture(); });
afterEach(async () => { await f.ctx.close(); });

it('returns only printable fields and GET never creates a share or changes records', async () => {
  const record = await postRecord(f, { subtype: 'task', title: 'Printable title', description: 'Printable description', notes: 'PRIVATE_SENTINEL', publicNotes: 'PUBLIC_NOTES_SENTINEL', outsideScope: true, estimatedCost: 98234.56 });
  await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/log'), { text: 'LOG_SENTINEL', private: false });
  const before = f.ctx.db.serialize();
  const response = await get(f.ctx, f.cookie, recordUrl(f, record.id, '/print'));
  expect(response.statusCode, response.body).toBe(200);
  expect(response.json().record).toMatchObject({ title: 'Printable title', description: 'Printable description' });
  for (const value of ['PRIVATE_SENTINEL', 'PUBLIC_NOTES_SENTINEL', 'LOG_SENTINEL', '98234.56', 'publicNotes', 'outsideScope', 'estimatedCost', 'activity', 'attachments', 'statusReason', 'completion', 'safety', 'mustBeDoneBefore']) expect(response.body).not.toContain(value);
  expect(response.headers['cache-control']).toContain('no-store');
  expect(f.ctx.db.serialize()).toEqual(before);
});

it('prints at most four Before and After photos most recent first, excluding During', async () => {
  const record = await postRecord(f, { subtype: 'task' });
  for (const phase of ['before', 'after', 'during']) for (let i = 1; i <= 5; i++) await addPhoto(f, record.id, { phase, caption: `${phase}-${i}` });
  const response = await get(f.ctx, f.cookie, recordUrl(f, record.id, '/print'));
  expect(response.statusCode).toBe(200);
  expect(response.json().photos.map((p: { caption: string }) => p.caption)).toEqual(['before-5', 'before-4', 'before-3', 'before-2', 'after-5', 'after-4', 'after-3', 'after-2']);
});

it('requires an owner session and scopes the record to its project', async () => {
  const record = await postRecord(f, { subtype: 'task' });
  const url = recordUrl(f, record.id, '/print');
  expect((await f.ctx.app.inject({ url })).statusCode).toBe(401);
  const id = createContributor(f.ctx.db, 'reader', 'Reader', OWNER.password);
  const cookie = `bb_session=${createSession(f.ctx.db, id).token}`;
  expect((await get(f.ctx, cookie, url)).statusCode).toBe(403);
  forceStatus(f, record.id, 'open');
  const share = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/share-links'), { label: 'Reader' });
  expect((await f.ctx.app.inject({ url, headers: { authorization: `Bearer ${share.json().url.split('#')[1]}` } })).statusCode).toBe(401);
  expect((await get(f.ctx, f.cookie, `/api/projects/999999/records/${record.id}/print`)).statusCode).toBe(404);
});

it('selects the latest set by date then id for every phase and retains comparison history', async () => {
  const record = await postRecord(f, { subtype: 'task' });
  for (const [date, phase, value] of [['2026-01-02', 'before', 10], ['2026-01-01', 'before', 5], ['2026-01-02', 'before', 12], ['2026-01-03', 'after', 8]] as const) {
    const response = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/measurement-sets'), { date, phase, rows: [{ item: 'Wall', quantity: 'Width', unit: 'mm', value }] });
    expect(response.statusCode).toBe(201);
  }
  const payload = (await get(f.ctx, f.cookie, recordUrl(f, record.id, '/print'))).json();
  expect(payload.measurements.map((set: { rows: { value: number }[] }) => set.rows[0]!.value)).toEqual([12, 8]);
  expect(payload.comparisons[0].points.map((point: { value: number; changeFromPrevious: number | null }) => [point.value, point.changeFromPrevious])).toEqual([[5, null], [10, 5], [12, 2], [8, -4]]);
});
