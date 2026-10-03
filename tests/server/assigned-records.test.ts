import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createContributor, disableContributor } from '../../src/server/auth/contributors';
import { createSession, deleteUserSessions } from '../../src/server/auth/sessions';
import * as storage from '../../src/server/files/storage';
import { addAttachment, JPEG, multipart, PDF } from './file-fixture';
import { get, OWNER, send } from './helpers';
import { forceStatus, makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
let userId: number;
let cookie: string;
beforeEach(async () => {
  f = await makeFixture();
  userId = createContributor(f.ctx.db, 'PRIVATE_LOGIN', 'Alex Builder', OWNER.password);
  cookie = `bb_session=${createSession(f.ctx.db, userId).token}`;
});
afterEach(async () => { vi.restoreAllMocks(); await f.ctx.close(); });
const assigned = (id: number, suffix = '') => `/api/assigned-records/${id}${suffix}`;
async function grant(id: number, canUpload = false, canAddLog = false) {
  const response = await f.ctx.app.inject({ method: 'PUT', url: recordUrl(f, id, `/grants/${userId}`),
    headers: { cookie: f.cookie, origin: f.ctx.origin }, payload: { canUpload, canAddLog } });
  expect(response.statusCode, response.body).toBe(200);
}
function upload(id: number, metadata: object = {}, photos = false) {
  const form = multipart([
    { name: 'metadata', data: JSON.stringify(photos ? { phase: 'before' } : metadata) },
    ...(photos ? ['original', 'display', 'thumbnail'].map(name => ({ name, filename: 'photo.jpg', data: JPEG }))
      : [{ name: 'file', filename: 'plan.pdf', data: PDF }]),
  ]);
  return f.ctx.app.inject({ method: 'POST', url: assigned(id, photos ? '/photos' : '/attachments'),
    headers: { cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body });
}

it('lists only granted non-Draft records and reads public Notes without private content or directory access', async () => {
  const record = await postRecord(f, { subtype: 'task', title: 'Assigned', notes: 'PRIVATE_NOTES' });
  const draft = await postRecord(f, { subtype: 'task', title: 'PRIVATE_DRAFT' });
  await postRecord(f, { subtype: 'task', title: 'PRIVATE_UNASSIGNED' });
  forceStatus(f, record.id, 'open');
  await grant(record.id);
  await grant(draft.id);
  expect((await patchRecord(f, record.id, { publicNotes: 'Public instructions' })).statusCode).toBe(200);
  const index = await get(f.ctx, cookie, '/api/assigned-records');
  expect(index.statusCode).toBe(200);
  expect(index.json()).toEqual([{ id: record.id, humanId: record.humanId, title: 'Assigned' }]);
  const response = await get(f.ctx, cookie, assigned(record.id));
  expect(response.statusCode).toBe(200);
  expect(response.json().record.publicNotes).toBe('Public instructions');
  expect(response.body).not.toContain('PRIVATE_');
  expect(response.json().permissions).toEqual({ canUpload: false, canAddLog: false });
  expect((await get(f.ctx, cookie, assigned(draft.id))).statusCode).toBe(404);
  expect((await get(f.ctx, cookie, '/api/contributors')).statusCode).toBe(403);
  expect((await get(f.ctx, f.cookie, '/api/contributors')).json()).toEqual([
    { id: userId, username: 'PRIVATE_LOGIN', displayName: 'Alex Builder', active: true },
  ]);
  expect((await send(f.ctx, cookie, 'PATCH', recordUrl(f, record.id), { notes: 'bad', publicNotes: 'bad' })).statusCode).toBe(403);
  expect((await upload(record.id)).statusCode).toBe(403);
  expect((await send(f.ctx, cookie, 'POST', assigned(record.id, '/log'), { text: 'bad' })).statusCode).toBe(403);
  const share = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/share-links'), { label: 'Reader' });
  const token = share.json().url.split('#')[1];
  const shared = await f.ctx.app.inject({ url: '/api/shared/record', headers: { authorization: `Bearer ${token}` } });
  expect(shared.json().record.publicNotes).toBe('Public instructions');
  expect(shared.body).not.toContain('PRIVATE_NOTES');
});

it('permits only public Log creation for addLog-only users and preserves genuine attribution', async () => {
  const record = await postRecord(f, { subtype: 'task' });
  forceStatus(f, record.id, 'open');
  await grant(record.id, false, true);
  const response = await send(f.ctx, cookie, 'POST', assigned(record.id, '/log'), { text: 'Installed' });
  expect(response.statusCode).toBe(201);
  expect(response.json().loggedBy).toBe('Alex Builder');
  expect(f.ctx.db.prepare('SELECT logged_by FROM log_entries WHERE id = ?').pluck().get(response.json().id)).toBe(userId);
  expect((await send(f.ctx, cookie, 'POST', assigned(record.id, '/log'), { text: 'secret', private: true })).statusCode).toBe(400);
  expect((await upload(record.id)).statusCode).toBe(403);
  for (const method of ['PATCH', 'DELETE'] as const) {
    expect((await send(f.ctx, cookie, method, recordUrl(f, record.id, `/log/${response.json().id}`), { text: 'changed' })).statusCode).toBe(403);
  }
});

it('permits uploads independently and only combined grants attach to public Logs', async () => {
  const record = await postRecord(f, { subtype: 'task' });
  forceStatus(f, record.id, 'open');
  const publicLog = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/log'), { text: 'Public' });
  const privateLog = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/log'), { text: 'PRIVATE_LOG', private: true });
  await grant(record.id, true, false);
  const response = await upload(record.id);
  expect(response.statusCode).toBe(201);
  expect(response.json().uploadedBy).toBe('Alex Builder');
  expect(f.ctx.db.prepare('SELECT uploaded_by FROM attachments WHERE id = ?').pluck().get(response.json().id)).toBe(userId);
  expect((await upload(record.id, {}, true)).statusCode).toBe(201);
  expect((await upload(record.id, { logEntryId: publicLog.json().id })).statusCode).toBe(403);
  await grant(record.id, true, true);
  expect((await upload(record.id, { logEntryId: privateLog.json().id })).statusCode).toBe(404);
  expect((await upload(record.id, { logEntryId: publicLog.json().id })).statusCode).toBe(201);
  expect((await send(f.ctx, cookie, 'DELETE', recordUrl(f, record.id, `/attachments/${response.json().id}`))).statusCode).toBe(403);
  expect((await get(f.ctx, cookie, assigned(record.id))).body).not.toContain('PRIVATE_');
});

it('rechecks grants on downloads and HEAD while isolating private and other-record occurrences', async () => {
  const record = await postRecord(f, { subtype: 'task' });
  const other = await postRecord(f, { subtype: 'task' });
  forceStatus(f, record.id, 'open');
  const file = await addAttachment(f, record.id);
  const foreignFile = await addAttachment(f, other.id);
  const log = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/log'), { text: 'private', private: true });
  const privateFile = await addAttachment(f, record.id, { logEntryId: log.json().id });
  await grant(record.id);
  for (const method of ['GET', 'HEAD'] as const) {
    const response = await f.ctx.app.inject({ method, url: assigned(record.id, `/attachments/${file.id}/file`), headers: { cookie } });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    if (method === 'HEAD') expect(response.body).toBe('');
    for (const id of [foreignFile.id, privateFile.id]) {
      expect((await f.ctx.app.inject({ method, url: assigned(record.id, `/attachments/${id}/file`), headers: { cookie } })).statusCode).toBe(404);
    }
  }
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, record.id, `/grants/${userId}`))).statusCode).toBe(200);
  for (const suffix of ['', `/attachments/${file.id}/file`]) {
    expect((await f.ctx.app.inject({ method: 'HEAD', url: assigned(record.id, suffix), headers: { cookie } })).statusCode).toBe(404);
  }
  await grant(record.id);
  disableContributor(f.ctx.db, 'PRIVATE_LOGIN');
  expect((await get(f.ctx, cookie, assigned(record.id))).statusCode).toBe(401);
});

it('rechecks a grant revoked during publication before creating an occurrence', async () => {
  const record = await postRecord(f, { subtype: 'task' });
  forceStatus(f, record.id, 'open');
  await grant(record.id, true, false);
  const publish = storage.publishFile;
  vi.spyOn(storage, 'publishFile').mockImplementation(async (...args) => {
    await publish(...args);
    f.ctx.db.prepare('DELETE FROM record_grants WHERE user_id = ?').run(userId);
  });
  expect((await upload(record.id)).statusCode).toBe(404);
  expect(f.ctx.db.prepare('SELECT COUNT(*) FROM attachments').pluck().get()).toBe(0);
});

it.each(['disable', 'logout'] as const)('rejects an upload when %s ends access during publication', async action => {
  const record = await postRecord(f, { subtype: 'task' });
  forceStatus(f, record.id, 'open');
  await grant(record.id, true, false);
  const publish = storage.publishFile;
  vi.spyOn(storage, 'publishFile').mockImplementation(async (...args) => {
    await publish(...args);
    if (action === 'disable') disableContributor(f.ctx.db, 'PRIVATE_LOGIN');
    else deleteUserSessions(f.ctx.db, userId);
  });
  expect((await upload(record.id)).statusCode).toBe(401);
  expect(f.ctx.db.prepare('SELECT COUNT(*) FROM attachments').pluck().get()).toBe(0);
});
