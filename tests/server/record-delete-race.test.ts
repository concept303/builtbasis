import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { deleteRecord } from '../../src/server/records/delete';
import * as storage from '../../src/server/files/storage';
import { addPhoto, addAttachment, JPEG, PDF, multipart } from './file-fixture';
import { makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';
let f: Fixture; let second: Db;
beforeEach(async () => { f = await makeFixture(); second = openDatabase(f.ctx.config.dbPath); });
afterEach(async () => { vi.restoreAllMocks(); second.close(); await f.ctx.close(); });
it.each(['photos', 'attachments'] as const)('rejects %s whose record was deleted while the upload published bytes', async kind => {
  const r = await postRecord(f, { subtype: 'task' });
  const publish = storage.publishFile; let removed = false;
  vi.spyOn(storage, 'publishFile').mockImplementation(async (...args) => {
    await publish(...args);
    if (!removed) { removed = true; deleteRecord(second, f.projectId, r.id, r.humanId); }
  });
  const form = multipart([{ name: 'metadata', data: JSON.stringify(kind === 'photos' ? { phase: 'before' } : {}) },
    ...(kind === 'photos' ? ['original', 'display', 'thumbnail'].map(name => ({ name, filename: 'photo.jpg', data: JPEG })) : [{ name: 'file', filename: 'file.pdf', data: PDF }])]);
  const res = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, r.id, `/${kind}`), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body });
  expect(res.statusCode, res.body).toBe(404);
  expect(removed).toBe(true);
  expect(f.ctx.db.prepare(`SELECT * FROM ${kind}`).all()).toEqual([]);
  expect(f.ctx.db.prepare('SELECT * FROM records').all()).toEqual([]);
});
it('removes a committed upload and serializes dependency updates with deletion', async () => {
  const a = await postRecord(f, { subtype: 'task' }); const b = await postRecord(f, { subtype: 'task' });
  await addPhoto(f, a.id); await addAttachment(f, a.id);
  await patchRecord(f, b.id, { mustBeDoneBeforeIds: [a.id] });
  expect(() => deleteRecord(second, f.projectId, a.id, a.humanId)).toThrow('record_has_dependencies');
  await patchRecord(f, b.id, { mustBeDoneBeforeIds: [] });
  deleteRecord(second, f.projectId, a.id, a.humanId);
  expect((await patchRecord(f, b.id, { mustBeDoneBeforeIds: [a.id] })).statusCode).toBe(400);
  expect(f.ctx.db.prepare('SELECT * FROM photos').all()).toEqual([]);
  expect(f.ctx.db.prepare('SELECT * FROM attachments').all()).toEqual([]);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBeGreaterThan(0);
});
