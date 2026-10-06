import { afterEach, beforeEach, expect, it } from 'vitest';
import { createContributor } from '../../src/server/auth/contributors';
import { createSession } from '../../src/server/auth/sessions';
import { openDatabase } from '../../src/server/db/connection';
import { calendarToday } from '../../src/domain/calendar';
import { get, send } from './helpers';
import { makeFixture, postRecord, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => { f = await makeFixture(); });
afterEach(async () => { await f.ctx.close(); });
const url = () => `${f.base}/work-packages`;
async function create(body: object = { name: 'Tiles' }) {
  const response = await send(f.ctx, f.cookie, 'POST', url(), body);
  expect(response.statusCode, response.body).toBe(201);
  return response.json();
}
it('creates, patches, resolves and deletes scoped packages with defaults and exact confirmation', async () => {
  const p = await create({ name: '  Tiles  ', description: '  Exact\nText ', responsibleId: f.people.contractor });
  expect(p).toMatchObject({ name: 'Tiles', description: '  Exact\nText ', status: 'planned', targetDate: null });
  expect((await send(f.ctx, f.cookie, 'PATCH', `${url()}/${p.id}`, { description: null })).json()).toMatchObject({ name: 'Tiles', description: null });
  expect((await get(f.ctx, f.cookie, `${url()}/${p.id}`)).json()).toMatchObject({ counts: { total: 0, outstanding: 0, overdue: 0 }, today: calendarToday() });
  expect((await send(f.ctx, f.cookie, 'DELETE', `${url()}/${p.id}`, { confirmName: 'tiles' })).statusCode).toBe(409);
  expect((await send(f.ctx, f.cookie, 'DELETE', `${url()}/${p.id}`, { confirmName: 'Tiles' })).statusCode).toBe(204);
  expect((await get(f.ctx, f.cookie, `${url()}/${p.id}`)).statusCode).toBe(404);
});
it('rejects normalized duplicates, invalid people and invalid projects; retains retired current person', async () => {
  const p = await create({ name: ' ΤΟΊΧΟΣ ', responsibleId: f.people.contractor });
  expect((await send(f.ctx, f.cookie, 'POST', url(), { name: 'τοιχοσ' })).json()).toMatchObject({ error: 'work_package_name_taken', details: { existingName: 'ΤΟΊΧΟΣ' } });
  for (const body of [{ name: ' ' }, { name: 'New', responsibleId: 99999 }, { name: 'New', responsibleId: f.people.retired }]) expect((await send(f.ctx, f.cookie, 'POST', url(), body)).statusCode).toBe(400);
  expect((await send(f.ctx, f.cookie, 'POST', '/api/projects/99999/work-packages', { name: 'New' })).statusCode).toBe(404);
  f.ctx.db.prepare('UPDATE people SET active=0 WHERE id=?').run(f.people.contractor);
  expect((await send(f.ctx, f.cookie, 'PATCH', `${url()}/${p.id}`, { responsibleId: f.people.contractor, status: 'completed' })).statusCode).toBe(200);
  expect((await get(f.ctx, f.cookie, `/api/projects/99999/work-packages/${p.id}`)).statusCode).toBe(404);
});
it('derives all counts without multiplying records, and preserves records when package status changes', async () => {
  const p = await create();
  for (const status of ['draft', 'open', 'on_hold', 'closed', 'cancelled', 'superseded']) {
    const r = await postRecord(f, { subtype: status === 'superseded' ? 'detail_clarification' : 'task' });
    f.ctx.db.prepare("UPDATE records SET work_package_id=?,status=?,due_date='2000-01-01' WHERE id=?").run(p.id, status, r.id);
  }
  const detail = (await get(f.ctx, f.cookie, `${url()}/${p.id}`)).json();
  expect(detail.counts).toMatchObject({ total: 6, outstanding: 3, overdue: 3 });
  expect(Object.keys(detail.counts.byStatus)).toHaveLength(10);
  expect(detail.bySubtypeStatus.reduce((n: number, row: { count: number }) => n + row.count, 0)).toBe(6);
  expect((await get(f.ctx, f.cookie, url())).json().packages[0].counts).toEqual(detail.counts);
  const before = f.ctx.db.prepare('SELECT * FROM records').all();
  await send(f.ctx, f.cookie, 'PATCH', `${url()}/${p.id}`, { status: 'completed' });
  expect(f.ctx.db.prepare('SELECT * FROM records').all()).toEqual(before);
  expect((await send(f.ctx, f.cookie, 'DELETE', `${url()}/${p.id}`, { confirmName: p.name })).json()).toMatchObject({ error: 'work_package_not_empty', details: { recordCount: 6 } });
});
it('protects every endpoint with owner access and Origin for mutations', async () => {
  const p = await create();
  const contributor = createContributor(f.ctx.db, 'worker', 'Worker', 'long-enough-password');
  const cookie = 'bb_session=' + createSession(f.ctx.db, contributor).token;
  for (const c of ['', cookie]) {
    const code = c ? 403 : 401;
    for (const path of [url(), `${url()}/${p.id}`]) expect((await get(f.ctx, c, path)).statusCode).toBe(code);
    for (const method of ['POST', 'PATCH', 'DELETE'] as const) expect((await send(f.ctx, c, method, method === 'POST' ? url() : `${url()}/${p.id}`, { name: 'Another', confirmName: 'Tiles' })).statusCode).toBe(code);
  }
  expect((await f.ctx.app.inject({ method: 'POST', url: url(), headers: { cookie: f.cookie }, payload: { name: 'Another' } })).statusCode).toBe(403);
});
it('serializes assignment and deletion across connections and includes packages in project deletion', async () => {
  const p = await create({ name: 'Tiles', responsibleId: f.people.contractor });
  const r = await postRecord(f, { subtype: 'task' });
  const second = openDatabase(f.ctx.config.dbPath);
  try {
    second.prepare('UPDATE records SET work_package_id=? WHERE id=?').run(p.id, r.id);
    expect((await send(f.ctx, f.cookie, 'DELETE', `${url()}/${p.id}`, { confirmName: 'Tiles' })).statusCode).toBe(409);
    second.prepare('UPDATE records SET work_package_id=NULL WHERE id=?').run(r.id);
    expect((await send(f.ctx, f.cookie, 'DELETE', `${url()}/${p.id}`, { confirmName: 'Tiles' })).statusCode).toBe(204);
    expect(() => second.prepare('UPDATE records SET work_package_id=? WHERE id=?').run(p.id, r.id)).toThrow(/FOREIGN KEY/);
  } finally { second.close(); }
  await create({ name: 'Other', responsibleId: f.people.contractor });
  expect((await get(f.ctx, f.cookie, `${f.base}/usage`)).json().workPackages).toBe(1);
  expect((await send(f.ctx, f.cookie, 'DELETE', f.base, { confirmName: 'Project 1' })).statusCode).toBe(200);
  expect(f.ctx.db.prepare('SELECT * FROM work_packages').all()).toEqual([]);
});
