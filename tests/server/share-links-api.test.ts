import { afterEach, beforeEach, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app';
import { createShareLink } from '../../src/server/sharing/links';
import { get, send } from './helpers';
import { getRecord, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
let id: number;
beforeEach(async () => {
  f = await makeFixture();
  id = (await postRecord(f, { subtype: 'task' })).id;
});
afterEach(async () => { await f.ctx.close(); });

it('creates/copies a Draft link privately, stores no plaintext token and revokes idempotently', async () => {
  const response = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'Architect' });
  expect(response.statusCode).toBe(201);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.headers['referrer-policy']).toBe('no-referrer');
  const created = response.json();
  expect(created.url).toMatch(/\/share#[A-Za-z0-9_-]{43}$/);
  const token = created.url.split('#')[1];
  const changes = () => f.ctx.db.prepare('SELECT total_changes()').pluck().get();
  const before = changes();
  const listed = await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'));
  expect(listed.json()[0]).toEqual(created);
  expect(changes()).toBe(before);
  expect(JSON.stringify(f.ctx.db.prepare('SELECT * FROM share_links').all())).not.toContain(token);
  const activity = (await get(f.ctx, f.cookie, recordUrl(f, id, '/activity'))).json();
  expect(activity[0]).toMatchObject({ action: 'share_created', detail: { linkId: created.id, label: 'Architect' } });
  expect(JSON.stringify(activity)).not.toContain(token);
  for (let n = 0; n < 2; n++) expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, `/share-links/${created.id}/revoke`))).statusCode).toBe(200);
  const revoked = (await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'))).json()[0];
  expect(revoked.revokedAt).toEqual(expect.any(String));
  expect(revoked.url).toBe(created.url);
  expect(f.ctx.db.prepare("SELECT count(*) FROM activity WHERE action='share_revoked'").pluck().get()).toBe(1);
});

it('validates future expiry, strict payloads, ownership and guards', async () => {
  const url = recordUrl(f, id, '/share-links');
  for (const body of [{ label: ' ' }, { label: 'x', extra: true }, { label: 'x', expiresAt: '2000-01-01T00:00:00Z' }]) {
    expect((await send(f.ctx, f.cookie, 'POST', url, body)).statusCode).toBe(400);
  }
  const userId = f.ctx.db.prepare('SELECT id FROM users').pluck().get() as number;
  expect(() => createShareLink(f.ctx.db, f.ctx.config, f.projectId, id, userId, { label: 'x', expiresAt: '2026-10-03T00:00:00.000Z' }, new Date('2026-10-03'))).toThrow('expiry_must_be_future');
  const created = (await send(f.ctx, f.cookie, 'POST', url, { label: 'x' })).json();
  const other = await postRecord(f, { subtype: 'task' });
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, other.id, `/share-links/${created.id}/revoke`))).statusCode).toBe(404);
  expect((await f.ctx.app.inject({ method: 'GET', url })).statusCode).toBe(401);
  expect((await f.ctx.app.inject({ method: 'POST', url, headers: { cookie: f.cookie }, payload: { label: 'x' } })).statusCode).toBe(403);
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, `/share-links/${created.id}/revoke`), { reason: 'x' })).statusCode).toBe(400);
});

it('rolls creation and revocation back if activity writing fails', async () => {
  const before = await getRecord(f, id);
  f.ctx.db.exec("CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT,'forced'); END");
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'x' })).statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT count(*) FROM share_links').pluck().get()).toBe(0);
  expect(await getRecord(f, id)).toEqual(before);
  f.ctx.db.exec('DROP TRIGGER fail_activity');
  const created = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'x' })).json();
  f.ctx.db.exec("CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT,'forced'); END");
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, `/share-links/${created.id}/revoke`))).statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT revoked_at FROM share_links').pluck().get()).toBeNull();
});

it('returns null URL for an old key and a controlled error for matching-key corruption', async () => {
  await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'x' });
  f.ctx.db.exec("UPDATE share_links SET token_tag=zeroblob(16)");
  const broken = await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'));
  expect(broken.statusCode).toBe(500);
  expect(broken.json()).toEqual({ error: 'share_copy_failed' });
  await f.ctx.app.close();
  f.ctx.app = await buildApp({ db: f.ctx.db, config: { ...f.ctx.config, shareKey: Buffer.alloc(32, 9) } });
  const old = (await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'))).json()[0];
  expect(old.url).toBeNull();
  expect(old.revokedAt).toEqual(expect.any(String));
});
