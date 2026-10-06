import { afterEach, beforeEach, expect, it } from 'vitest';
import { createContributor } from '../../src/server/auth/contributors';
import { createSession } from '../../src/server/auth/sessions';
import { addAttachment, addPhoto } from './file-fixture';
import { get, send } from './helpers';
import { forceStatus, makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';
let f: Fixture;
beforeEach(async () => { f = await makeFixture(); });
afterEach(async () => { await f.ctx.close(); });
it('requires owner, Origin, exact ID and no dependencies in either direction', async () => {
  const a = await postRecord(f, { subtype: 'task', title: 'Before' });
  const b = await postRecord(f, { subtype: 'task', title: 'After', mustBeDoneBeforeIds: [a.id] });
  const cookie = 'bb_session=' + createSession(f.ctx.db, createContributor(f.ctx.db, 'worker', 'Worker', 'a sufficiently long password')).token;
  for (const c of ['', cookie]) expect((await send(f.ctx, c, 'DELETE', recordUrl(f, a.id), { confirmHumanId: a.humanId })).statusCode).toBe(c ? 403 : 401);
  expect((await f.ctx.app.inject({ method: 'DELETE', url: recordUrl(f, a.id), headers: { cookie: f.cookie }, payload: { confirmHumanId: a.humanId } })).statusCode).toBe(403);
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, a.id), { confirmHumanId: 'wrong' })).json().error).toBe('record_confirmation_mismatch');
  for (const r of [a, b]) expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, r.id), { confirmHumanId: r.humanId })).json()).toMatchObject({ error: 'record_has_dependencies', details: { records: [expect.objectContaining({ id: r.id === a.id ? b.id : a.id })] } });
  await patchRecord(f, b.id, { mustBeDoneBeforeIds: [] });
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, a.id), { confirmHumanId: a.humanId })).statusCode).toBe(204);
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, a.id), { confirmHumanId: a.humanId })).statusCode).toBe(404);
});
it('atomically removes owned evidence, chosen option, history and access but retains blobs and IDs', async () => {
  const r = await postRecord(f, { subtype: 'quality_issue', title: 'Disposable', problemTypes: ['defect'] });
  const sibling = await postRecord(f, { subtype: 'task', title: 'Keep' });
  const option = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, r.id, '/options'), { label: 'Repair' })).json();
  expect((await patchRecord(f, r.id, { chosenOptionId: option.id })).statusCode).toBe(200);
  for (const privateEntry of [true, false]) {
    const log = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, r.id, '/log'), { text: 'History', private: privateEntry })).json();
    await addAttachment(f, r.id, { logEntryId: log.id });
  }
  await addPhoto(f, r.id); await addPhoto(f, r.id, { purpose: 'location' });
  await addAttachment(f, sibling.id);
  await send(f.ctx, f.cookie, 'POST', recordUrl(f, r.id, '/measurement-sets'), { date: '2026-10-06', phase: 'before', rows: [{ item: 'Wall', quantity: 'Width', value: 1.2, unit: 'm' }] });
  f.ctx.db.prepare("INSERT INTO verifications(record_id,checked_by_id,date,method,outcome,note,created_at,created_by) VALUES(?,?,'2026-10-06','visual','passed','Full note','now',(SELECT id FROM users LIMIT 1))").run(r.id, f.people.architect);
  forceStatus(f, r.id, 'open');
  const link = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, r.id, '/share-links'), { label: 'Reader' })).json();
  f.ctx.db.prepare('INSERT INTO record_grants VALUES(?,(SELECT id FROM users LIMIT 1),1,1)').run(r.id);
  const blobs = f.ctx.db.prepare('SELECT * FROM blobs').all();
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, r.id), { confirmHumanId: r.humanId })).statusCode).toBe(204);
  for (const table of ['photos','attachments','decision_options','measurement_sets','verifications','log_entries','activity','record_grants','share_links']) expect(f.ctx.db.prepare(`SELECT count(*) FROM ${table} WHERE record_id=?`).pluck().get(r.id), table).toBe(0);
  expect(f.ctx.db.prepare('SELECT count(*) FROM measurement_rows').pluck().get()).toBe(0);
  expect(f.ctx.db.prepare('SELECT * FROM blobs').all()).toEqual(blobs);
  expect((await get(f.ctx, f.cookie, recordUrl(f, sibling.id))).statusCode).toBe(200);
  expect((await f.ctx.app.inject({ url: '/api/shared/record', headers: { authorization: `Bearer ${new URL(link.url).hash.slice(1)}` } })).statusCode).toBe(404);
  const next = await postRecord(f, { subtype: 'quality_issue' });
  expect(next.id).toBeGreaterThan(sibling.id); expect(next.humanId).not.toBe(r.humanId);
  expect(f.ctx.db.pragma('foreign_key_check')).toEqual([]);
});
