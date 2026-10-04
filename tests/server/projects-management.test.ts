import { afterEach, beforeEach, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createProject } from '../../src/server/lists/projects';
import { createContributor } from '../../src/server/auth/contributors';
import { createSession } from '../../src/server/auth/sessions';
import { makeFixture, type Fixture } from './record-fixture';
import { addAttachment, addPhoto, multipart, PDF } from './file-fixture';
import { get, send } from './helpers';

let f: Fixture;
beforeEach(async () => { f = await makeFixture(); });
afterEach(async () => { await f.ctx.close(); });

it('lets the owner create and rename a project with trimmed fields, and rejects duplicate codes', async () => {
  const created = await send(f.ctx, f.cookie, 'POST', '/api/projects', { code: ' new-project ', name: ' Νέο έργο ' });
  expect(created.statusCode).toBe(201);
  expect(created.json()).toMatchObject({ code: 'new-project', name: 'Νέο έργο' });
  const id = created.json().id;
  const renamed = await send(f.ctx, f.cookie, 'PATCH', `/api/projects/${id}`, { code: 'renamed', name: 'Renamed project' });
  expect(renamed.statusCode).toBe(200);
  expect(renamed.json()).toMatchObject({ id, code: 'renamed', name: 'Renamed project' });
  const duplicate = await send(f.ctx, f.cookie, 'POST', '/api/projects', { code: 'renamed', name: 'Another' });
  expect(duplicate.statusCode).toBe(409);
  expect(duplicate.json().error).toBe('project_code_taken');
  const conflict = await send(f.ctx, f.cookie, 'PATCH', `/api/projects/${id}`, { code: 'p1', name: 'Should not save' });
  expect(conflict.statusCode).toBe(409);
  expect((await get(f.ctx, f.cookie, `/api/projects/${id}`)).json().name).toBe('Renamed project');
});

it.each([{ code: '', name: 'Project' }, { code: 'p', name: '   ' }, { code: 'x'.repeat(81), name: 'Project' }, { code: 'p', name: 'x'.repeat(201) }, { code: 'p', name: 'Project', isOwner: true }])('rejects invalid project input without writing it', async input => {
  const response = await send(f.ctx, f.cookie, 'POST', '/api/projects', input);
  expect(response.statusCode).toBe(400);
  expect(f.ctx.db.prepare('SELECT count(*) FROM projects').pluck().get()).toBe(1);
});

it('deletes a confirmed populated project atomically, retaining other projects, users and immutable file bytes', async () => {
  const other = createProject(f.ctx.db, { code: 'keep', name: 'Keep this project' });
  const record = (await send(f.ctx, f.cookie, 'POST', `${f.base}/records`, { subtype: 'task', title: 'Delete this record', locationIds: [f.locations.v1Kitchen], tagIds: [f.tags.stone], responsibleId: f.people.contractor })).json();
  await addPhoto(f, record.id); await addAttachment(f, record.id);
  const log = await send(f.ctx, f.cookie, 'POST', `${f.base}/records/${record.id}/log`, { eventAt: '2026-10-04T12:00:00Z', text: 'Related history', private: true });
  expect(log.statusCode, log.body).toBe(201);
  const blobs = f.ctx.db.prepare('SELECT hash FROM blobs ORDER BY hash').pluck().all() as string[];
  const usage = await get(f.ctx, f.cookie, `${f.base}/usage`);
  expect(usage.statusCode).toBe(200);
  expect(usage.json()).toMatchObject({ records: 1, photos: 1, attachments: 1, locations: 7, people: 3 });
  const refused = await send(f.ctx, f.cookie, 'DELETE', f.base, { confirmName: 'Wrong project' });
  expect(refused.statusCode).toBe(409);
  expect(f.ctx.db.prepare('SELECT count(*) FROM records').pluck().get()).toBe(1);
  const deleted = await send(f.ctx, f.cookie, 'DELETE', f.base, { confirmName: 'Project 1' });
  expect(deleted.statusCode, deleted.body).toBe(200);
  expect((await get(f.ctx, f.cookie, '/api/projects')).json()).toEqual([other]);
  for (const table of ['records', 'record_counters', 'record_locations', 'record_tags', 'people', 'trades', 'tags', 'location_nodes', 'zone_types', 'photos', 'attachments', 'log_entries', 'activity', 'record_grants', 'share_links']) expect(f.ctx.db.prepare(`SELECT count(*) FROM ${table}`).pluck().get(), table).toBe(0);
  expect(f.ctx.db.prepare('SELECT count(*) FROM users').pluck().get()).toBe(1);
  expect(f.ctx.db.pragma('foreign_key_check')).toEqual([]);
  expect(f.ctx.db.prepare('SELECT hash FROM blobs ORDER BY hash').pluck().all()).toEqual(blobs);
  for (const hash of blobs) expect(existsSync(join(f.ctx.config.filesDir, hash.slice(0, 2), hash))).toBe(true);
});

it('never reuses a deleted project ID, so an old browser URL cannot refer to a new project', async () => {
  const project = (await send(f.ctx, f.cookie, 'POST', '/api/projects', { code: 'temporary', name: 'Temporary' })).json();
  expect(project.id).toBeTypeOf('number');
  expect((await send(f.ctx, f.cookie, 'DELETE', `/api/projects/${project.id}`, { confirmName: 'Temporary' })).statusCode).toBe(200);
  const next = (await send(f.ctx, f.cookie, 'POST', '/api/projects', { code: 'next', name: 'Next' })).json();
  expect(next.id).toBeGreaterThan(project.id);
  expect((await get(f.ctx, f.cookie, `/api/projects/${project.id}`)).statusCode).toBe(404);
});

it('rejects contributor and anonymous project mutations and project deletion previews', async () => {
  const userId = createContributor(f.ctx.db, 'reader', 'Reader', 'test-password-long-enough');
  const cookie = 'bb_session=' + createSession(f.ctx.db, userId).token;
  for (const [method, url, body] of [['POST', '/api/projects', { code: 'x', name: 'X' }], ['PATCH', f.base, { name: 'Changed', code: 'p1' }], ['DELETE', f.base, { confirmName: 'Project 1' }]] as const) {
    expect((await send(f.ctx, cookie, method, url, body)).statusCode).toBe(403);
    expect((await send(f.ctx, '', method, url, body)).statusCode).toBe(401);
  }
  expect((await get(f.ctx, cookie, `${f.base}/usage`)).statusCode).toBe(403);
  expect((await get(f.ctx, '', `${f.base}/usage`)).statusCode).toBe(401);
});


it('never reuses deleted record IDs or lets a stale contributor page write to a replacement record', async () => {
  const userId = createContributor(f.ctx.db, 'builder', 'Builder', 'test-password-long-enough');
  const cookie = 'bb_session=' + createSession(f.ctx.db, userId).token;
  const original = await send(f.ctx, f.cookie, 'POST', `${f.base}/records`, { subtype: 'task', title: 'Original' });
  expect(original.statusCode).toBe(201);
  const oldId = original.json().id;
  f.ctx.db.prepare("UPDATE records SET status='open' WHERE id=?").run(oldId);
  f.ctx.db.prepare('INSERT INTO record_grants VALUES (?, ?, 1, 1)').run(oldId, userId);
  const share = await send(f.ctx, f.cookie, 'POST', `${f.base}/records/${oldId}/share-links`, { label: 'Old record' });
  expect(share.statusCode).toBe(201);
  const token = share.json().url.split('#')[1];
  expect((await send(f.ctx, f.cookie, 'DELETE', f.base, { confirmName: 'Project 1' })).statusCode).toBe(200);
  expect(f.ctx.db.prepare('SELECT count(*) FROM record_grants').pluck().get()).toBe(0);
  expect(f.ctx.db.prepare('SELECT count(*) FROM share_links').pluck().get()).toBe(0);
  const project = createProject(f.ctx.db, { code: 'replacement', name: 'Replacement' });
  const created = await send(f.ctx, f.cookie, 'POST', `/api/projects/${project.id}/records`, { subtype: 'task', title: 'Replacement record' });
  expect(created.statusCode).toBe(201);
  const newId = created.json().id;
  f.ctx.db.prepare("UPDATE records SET status='open' WHERE id=?").run(newId);
  f.ctx.db.prepare('INSERT INTO record_grants VALUES (?, ?, 1, 1)').run(newId, userId);
  expect((await get(f.ctx, cookie, `/api/assigned-records/${newId}`)).statusCode).toBe(200);
  const staleLog = await send(f.ctx, cookie, 'POST', `/api/assigned-records/${oldId}/log`, { text: 'Meant for the deleted record' });
  expect(staleLog.statusCode).toBe(404);
  const form = multipart([{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'old.pdf', data: PDF }]);
  const staleFile = await f.ctx.app.inject({ method: 'POST', url: `/api/assigned-records/${oldId}/attachments`, headers: { cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body });
  expect(staleFile.statusCode).toBe(404);
  expect(f.ctx.db.prepare('SELECT count(*) FROM log_entries').pluck().get()).toBe(0);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
  expect((await f.ctx.app.inject({ url: '/api/shared/record', headers: { authorization: 'Bearer ' + token } })).statusCode).toBe(404);
  expect(newId).toBeGreaterThan(oldId);
});
