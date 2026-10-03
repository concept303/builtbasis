import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { blobPath } from '../../src/server/files/storage';
import { addAttachment, addPhoto, JPEG, PDF } from './file-fixture';
import { send } from './helpers';
import { forceStatus, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

vi.mock('node:fs', async importOriginal => ({ ...await importOriginal<typeof import('node:fs')>() }));
vi.mock('node:fs/promises', async importOriginal => ({ ...await importOriginal<typeof import('node:fs/promises')>() }));

let f: Fixture;
let id: number;
let token: string;
beforeEach(async () => {
  f = await makeFixture();
  id = (await postRecord(f, { subtype: 'task', title: 'Evidence' })).id;
  forceStatus(f, id, 'open');
  const link = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'Reader' });
  expect(link.statusCode).toBe(201);
  token = link.json().url.split('#')[1];
});
afterEach(async () => { vi.restoreAllMocks(); await f.ctx.close(); });

function shared(path: string, method: 'GET' | 'HEAD' = 'GET', headers: Record<string, string> = {}) {
  return f.ctx.app.inject({ method, url: `/api/shared/${path}`, headers: { authorization: `Bearer ${token}`, ...headers } });
}
function owner(path: string, method: 'GET' | 'HEAD' = 'GET') {
  return f.ctx.app.inject({ method, url: recordUrl(f, id, `/${path}`), headers: { cookie: f.cookie } });
}

it('serves every photo variant with correct disposition while HEAD opens no stream and no read writes', async () => {
  const photo = await addPhoto(f, id);
  const changes = f.ctx.db.prepare('SELECT total_changes()').pluck().get();
  for (const variant of ['original', 'display', 'thumbnail']) {
    const path = `photos/${photo.id}/${variant}`;
    const response = await shared(path);
    expect(response.statusCode).toBe(200);
    expect(response.rawPayload).toEqual(JPEG);
    expect(response.headers['content-type']).toBe('image/jpeg');
    expect(response.headers['content-disposition']).toMatch(variant === 'original' ? /^attachment;/ : /^inline;/);
    expect(response.headers['content-disposition']).toContain("filename*=UTF-8''");
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBe('sandbox');
    expect((await owner(path)).rawPayload).toEqual(JPEG);
    const spy = vi.spyOn(fs, 'createReadStream');
    const head = await shared(path, 'HEAD');
    expect(head.statusCode).toBe(200);
    expect(head.body).toBe('');
    expect(head.headers['content-length']).toBe(String(JPEG.length));
    expect((await owner(path, 'HEAD')).body).toBe('');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  }
  expect(f.ctx.db.prepare('SELECT total_changes()').pluck().get()).toBe(changes);
  expect(f.ctx.db.prepare('SELECT view_count FROM share_links').pluck().get()).toBe(0);
});

it('authorises identical blobs by occurrence and current private Log state', async () => {
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'PRIVATE_SENTINEL', private: true })).json();
  const direct = await addAttachment(f, id);
  const privateFile = await addAttachment(f, id, { logEntryId: entry.id, title: 'PRIVATE_SENTINEL' }, 'PRIVATE_SENTINEL.pdf');
  const other = await postRecord(f, { subtype: 'task' });
  const elsewhere = await addAttachment(f, other.id);
  expect((await shared(`attachments/${direct.id}/file`)).rawPayload).toEqual(PDF);
  const spy = vi.spyOn(fsPromises, 'stat');
  const deniedHead = await shared(`attachments/${privateFile.id}/file`, 'HEAD');
  expect(deniedHead.statusCode).toBe(404);
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
  for (const file of [privateFile, elsewhere]) {
    const denied = await shared(`attachments/${file.id}/file`, 'GET', { cookie: f.cookie, range: 'bytes=0-1', 'if-none-match': '*' });
    expect(denied.statusCode).toBe(404);
    expect(denied.json()).toEqual({ error: 'not_available' });
    expect(denied.headers['content-disposition']).toBeUndefined();
    expect(denied.body).not.toContain('PRIVATE_SENTINEL');
  }
  expect((await owner(`attachments/${privateFile.id}/file`)).rawPayload).toEqual(PDF);
  await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/log/${entry.id}`), { private: false });
  expect((await shared(`attachments/${privateFile.id}/file`)).statusCode).toBe(200);
  await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/log/${entry.id}`), { private: true });
  expect((await shared(`attachments/${privateFile.id}/file`)).statusCode).toBe(404);
  await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/log/${entry.id}`));
  expect((await shared(`attachments/${privateFile.id}/file`)).statusCode).toBe(404);
  expect((await shared(`attachments/${direct.id}/file`)).statusCode).toBe(200);
});

it('rechecks revocation, expiry and Draft state for every variant and attachments', async () => {
  const photo = await addPhoto(f, id);
  const file = await addAttachment(f, id);
  const paths = ['original','display','thumbnail'].map(variant => `photos/${photo.id}/${variant}`).concat(`attachments/${file.id}/file`);
  for (const state of ['draft','expired','revoked']) {
    if (state === 'draft') forceStatus(f, id, 'draft');
    if (state === 'expired') {
      forceStatus(f, id, 'open');
      f.ctx.db.exec("UPDATE share_links SET expires_at='2000-01-01T00:00:00.000Z'");
    }
    if (state === 'revoked') f.ctx.db.exec("UPDATE share_links SET expires_at=NULL, revoked_at='2000-01-01'");
    for (const path of paths) {
      expect((await shared(path)).json()).toEqual({ error: 'not_available' });
      expect((await shared(path, 'HEAD')).statusCode).toBe(404);
    }
  }
});

it('never reuses deleted occurrence access and rejects guessing hashes or bad variants', async () => {
  const first = await addAttachment(f, id);
  const photo = await addPhoto(f, id);
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/attachments/${first.id}`))).statusCode).toBe(200);
  const next = await addAttachment(f, id);
  expect(next.id).toBeGreaterThan(first.id);
  expect((await shared(`attachments/${first.id}/file`)).statusCode).toBe(404);
  expect((await shared(`attachments/${next.id}/file`)).statusCode).toBe(200);
  expect((await shared(`photos/${photo.id}/unknown`)).json()).toEqual({ error: 'not_available' });
  const hash = f.ctx.db.prepare('SELECT hash FROM blobs LIMIT 1').pluck().get() as string;
  expect((await shared(`attachments/${hash}/file`)).statusCode).toBe(404);
  expect((await f.ctx.app.inject({ method: 'GET', url: `/files/${hash}` })).statusCode).toBe(404);
  const other = await postRecord(f, { subtype: 'task' });
  expect((await f.ctx.app.inject({ method: 'GET', url: recordUrl(f, other.id, `/attachments/${next.id}/file`), headers: { cookie: f.cookie } })).statusCode).toBe(404);
});

it('downloads DWG and PDF with safe filenames and handles missing bytes without paths', async () => {
  const dwg = await addAttachment(f, id, {}, 'σχέδιο.dwg', Buffer.from('AC1032'));
  const response = await shared(`attachments/${dwg.id}/file`);
  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toBe('application/octet-stream');
  expect(response.headers['content-disposition']).toMatch(/^attachment;/);
  expect(response.headers['content-disposition']).toContain(encodeURIComponent('σχέδιο.dwg'));
  f.ctx.db.prepare('UPDATE attachments SET original_filename=? WHERE id=?').run('C:\\path\\bad\r\n".dwg', dwg.id);
  const safe = await owner(`attachments/${dwg.id}/file`);
  expect(safe.statusCode).toBe(200);
  expect(safe.headers['content-disposition']).not.toMatch(/[\r\n]/);
  expect(safe.headers['content-disposition']).not.toContain('path');
  const pdf = await addAttachment(f, id);
  expect((await shared(`attachments/${pdf.id}/file`)).headers['content-disposition']).toMatch(/^attachment;/);
  const hash = f.ctx.db.prepare('SELECT blob_hash FROM attachments WHERE id=?').pluck().get(pdf.id) as string;
  await fsPromises.unlink(blobPath(f.ctx.config.filesDir, hash));
  const missing = await shared(`attachments/${pdf.id}/file`);
  expect(missing.statusCode).toBe(404);
  expect(missing.body).not.toContain(f.ctx.config.filesDir);
});

it('rejects expired owner sessions independently of bearer authorisation', async () => {
  const file = await addAttachment(f, id);
  f.ctx.db.exec("UPDATE sessions SET expires_at='2000-01-01'");
  expect((await owner(`attachments/${file.id}/file`)).statusCode).toBe(401);
  expect((await shared(`attachments/${file.id}/file`)).statusCode).toBe(200);
});
