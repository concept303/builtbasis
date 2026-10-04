import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createContributor } from '../../src/server/auth/contributors';
import { createSession } from '../../src/server/auth/sessions';
import * as storage from '../../src/server/files/storage';
import { get, OWNER, send } from './helpers';
import { addPhoto, JPEG, multipart, upload } from './file-fixture';
import { forceStatus, getRecord, makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
let id: number;
beforeEach(async () => { f = await makeFixture(); id = (await postRecord(f, { subtype: 'task', title: 'Find this spot' })).id; });
afterEach(async () => { vi.restoreAllMocks(); await f.ctx.close(); });

it('keeps multiple location photos and precise notes on a record without a tree selection', async () => {
  expect((await patchRecord(f, id, { locationNotes: '  Πίσω από το μπάνιο.\nΔείτε το κόκκινο σημάδι.' })).statusCode).toBe(200);
  const a = await addPhoto(f, id, { purpose: 'location', caption: 'Sketch' });
  const b = await addPhoto(f, id, { purpose: 'location', caption: 'Actual spot' });
  const evidence = await addPhoto(f, id, { phase: 'after' });
  expect(a).toMatchObject({ purpose: 'location', phase: null, caption: 'Sketch' });
  expect(b.id).not.toBe(a.id);
  expect(evidence).toMatchObject({ purpose: 'evidence', phase: 'after' });
  expect(await getRecord(f, id)).toMatchObject({ locationIds: [], locationNotes: '  Πίσω από το μπάνιο.\nΔείτε το κόκκινο σημάδι.' });
  const photos = (await get(f.ctx, f.cookie, recordUrl(f, id, '/photos'))).json();
  expect(photos.filter((p: { purpose: string }) => p.purpose === 'location').map((p: { id: number }) => p.id)).toEqual([b.id, a.id]);
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, `/photos/${a.id}/display`))).rawPayload).toEqual(JPEG);
});

it('shares and prints location instructions while excluding private notes', async () => {
  await patchRecord(f, id, { locationNotes: 'By the eastern window', notes: 'Private owner note' });
  const photo = await addPhoto(f, id, { purpose: 'location', caption: 'Window' });
  forceStatus(f, id, 'open');
  const link = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'Site' })).json();
  const token = new URL(link.url).hash.slice(1);
  const shared = await f.ctx.app.inject({ url: '/api/shared/record', headers: { authorization: `Bearer ${token}` } });
  expect(shared.statusCode).toBe(200);
  expect(shared.json().record.locationNotes).toBe('By the eastern window');
  expect(shared.json().photos).toContainEqual(expect.objectContaining({ id: photo.id, purpose: 'location', phase: null }));
  expect(shared.body).not.toContain('Private owner note');
  expect((await f.ctx.app.inject({ url: `/api/shared/photos/${photo.id}/display`, headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(200);
  const printed = (await get(f.ctx, f.cookie, recordUrl(f, id, '/print'))).json();
  expect(printed.record.locationNotes).toBe('By the eastern window');
  expect(printed.locationPhotos).toEqual([{ id: photo.id, caption: 'Window' }]);
  expect(printed.photos).toEqual([]);
});

it('scopes location photos to their record and deletes only the occurrence', async () => {
  const photo = await addPhoto(f, id, { purpose: 'location' });
  const other = await postRecord(f, { subtype: 'task' });
  for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
    const url = recordUrl(f, other.id, `/photos/${photo.id}${method === 'GET' ? '/original' : ''}`);
    const response = method === 'GET' ? await get(f.ctx, f.cookie, url) : await send(f.ctx, f.cookie, method, url, { caption: 'Changed' });
    expect(response.statusCode).toBe(404);
  }
  expect((await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/photos/${photo.id}`), { caption: 'Door on left' })).statusCode).toBe(200);
  expect((await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/photos/${photo.id}`), { phase: 'after' })).statusCode).toBe(400);
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/photos/${photo.id}`))).statusCode).toBe(200);
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/photos'))).json()).toEqual([]);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(1);
});

it('rejects mixed location/evidence metadata and overlong notes without changing the record', async () => {
  const before = await getRecord(f, id);
  for (const metadata of [{ purpose: 'location', phase: 'before' }, { purpose: 'evidence' }, { purpose: 'unknown', phase: 'before' }]) {
    const response = await upload(f, id, 'photos', [
      { name: 'metadata', data: JSON.stringify(metadata) },
      ...['original', 'display', 'thumbnail'].map(name => ({ name, filename: 'spot.jpg', data: JPEG })),
    ]);
    expect(response.statusCode).toBe(400);
  }
  expect((await patchRecord(f, id, { locationNotes: 'x'.repeat(20_001) })).statusCode).toBe(400);
  expect(await getRecord(f, id)).toEqual(before);
});

it('allows contributor location uploads only with a live upload grant, and keeps notes owner-only', async () => {
  forceStatus(f, id, 'open');
  const userId = createContributor(f.ctx.db, 'site', 'Site person', OWNER.password);
  const cookie = `bb_session=${createSession(f.ctx.db, userId).token}`;
  f.ctx.db.prepare('INSERT INTO record_grants VALUES (?,?,0,1)').run(id, userId);
  const form = multipart([
    { name: 'metadata', data: JSON.stringify({ purpose: 'location', caption: 'Site sketch' }) },
    ...['original', 'display', 'thumbnail'].map(name => ({ name, filename: 'spot.jpg', data: JPEG })),
  ]);
  const add = () => f.ctx.app.inject({ method: 'POST', url: `/api/assigned-records/${id}/photos`, headers: { cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body });
  expect((await add()).statusCode).toBe(403);
  f.ctx.db.prepare('UPDATE record_grants SET can_upload=1 WHERE user_id=?').run(userId);
  const accepted = await add();
  expect(accepted.statusCode).toBe(201);
  expect(accepted.json()).toMatchObject({ purpose: 'location', uploadedBy: 'Site person' });
  expect((await send(f.ctx, cookie, 'PATCH', recordUrl(f, id), { locationNotes: 'Cannot edit' })).statusCode).toBe(403);
  const before = await getRecord(f, id);
  const publish = storage.publishFile;
  vi.spyOn(storage, 'publishFile').mockImplementation(async (...args) => {
    await publish(...args);
    f.ctx.db.prepare('UPDATE record_grants SET can_upload=0 WHERE user_id=?').run(userId);
  });
  expect((await add()).statusCode).toBe(403);
  expect(await getRecord(f, id)).toEqual(before);
  expect(f.ctx.db.prepare('SELECT COUNT(*) FROM photos').pluck().get()).toBe(1);
});

it('does not commit a location upload after logout', async () => {
  const before = await getRecord(f, id);
  const publish = storage.publishFile;
  vi.spyOn(storage, 'publishFile').mockImplementation(async (...args) => {
    await publish(...args);
    f.ctx.db.exec('DELETE FROM sessions');
  });
  const response = await upload(f, id, 'photos', [
    { name: 'metadata', data: '{"purpose":"location"}' },
    ...['original', 'display', 'thumbnail'].map(name => ({ name, filename: 'spot.jpg', data: JPEG })),
  ]);
  expect(response.statusCode).toBe(401);
  expect(f.ctx.db.prepare('SELECT COUNT(*) FROM photos').pluck().get()).toBe(0);
  expect(f.ctx.db.prepare('SELECT updated_at FROM records WHERE id=?').pluck().get(id)).toBe(before.updatedAt);
});
