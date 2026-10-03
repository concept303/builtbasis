import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { FastifyRequest } from 'fastify';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { blobPath } from '../../src/server/files/storage';
import { parseUpload } from '../../src/server/files/uploads';
import { get, send } from './helpers';
import { getRecord, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';
import { addAttachment, addPhoto, JPEG, multipart, PDF, PNG, upload } from './file-fixture';

let f: Fixture;
let id: number;
beforeEach(async () => {
  f = await makeFixture();
  id = (await postRecord(f, { subtype: 'task' })).id;
});
afterEach(async () => { await f.ctx.close(); });

it('stores photo bundles, preserves metadata and sorts phases', async () => {
  const after = await addPhoto(f, id, { phase: 'after' });
  const before = await addPhoto(f, id, { phase: 'before', takenAt: '2026-10-03T12:00:00+03:00' });
  expect(before).toMatchObject({ originalFilename: 'όψη.jpg', phase: 'before', takenAt: '2026-10-03T09:00:00.000Z' });
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/photos'))).json().map((p: { id: number }) => p.id)).toEqual([before.id, after.id]);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(1);
  const hash = f.ctx.db.prepare('SELECT original_hash FROM photos WHERE id=?').pluck().get(before.id) as string;
  expect(await readFile(blobPath(f.ctx.config.filesDir, hash))).toEqual(JPEG);
  f.ctx.db.prepare('UPDATE records SET updated_at=? WHERE id=?').run('2000-01-01', id);
  const patched = await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/photos/${before.id}`), { caption: 'Caption' });
  expect(patched.statusCode).toBe(200);
  expect(patched.json()).toMatchObject({ caption: 'Caption', uploadedAt: before.uploadedAt, uploadedBy: before.uploadedBy });
  expect((await getRecord(f, id)).updatedAt).not.toBe('2000-01-01');
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/photos/${before.id}`))).statusCode).toBe(200);
  expect((await addPhoto(f, id)).id).toBeGreaterThan(before.id);
});

it('commits each photo variant and attachment only with complete matching disk bytes', async () => {
  const original = PNG;
  const display = Buffer.concat([JPEG, Buffer.from('display')]);
  const thumbnail = Buffer.concat([JPEG, Buffer.from('thumbnail')]);
  const photo = await upload(f, id, 'photos', [
    { name: 'metadata', data: '{"phase":"during"}' },
    { name: 'original', filename: 'original.png', data: original },
    { name: 'display', filename: 'display.jpg', data: display },
    { name: 'thumbnail', filename: 'thumbnail.jpg', data: thumbnail },
  ]);
  expect(photo.statusCode).toBe(201);
  await addAttachment(f, id);
  const hashes = f.ctx.db.prepare('SELECT original_hash, display_hash, thumbnail_hash FROM photos WHERE id=?').get(photo.json().id) as Record<string, string>;
  for (const [column, bytes] of [['original_hash', original], ['display_hash', display], ['thumbnail_hash', thumbnail]] as const) {
    expect(hashes[column]).toBe(createHash('sha256').update(bytes).digest('hex'));
  }
  const blobs = f.ctx.db.prepare('SELECT hash,size FROM blobs').all() as { hash: string; size: number }[];
  expect(blobs).toHaveLength(4);
  for (const blob of blobs) {
    const bytes = await readFile(blobPath(f.ctx.config.filesDir, blob.hash));
    expect(bytes.length).toBe(blob.size);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(blob.hash);
  }
});

it('keeps separate occurrences, joins current Log metadata and cascades private Log deletion without deleting bytes', async () => {
  const log = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'Plans received', private: true });
  expect(log.statusCode).toBe(201);
  const direct = await addAttachment(f, id);
  const linked = await addAttachment(f, id, { logEntryId: log.json().id });
  expect(linked.id).not.toBe(direct.id);
  expect(linked.logEntry).toMatchObject({ id: log.json().id, text: 'Plans received', private: true });
  expect(direct.logEntry).toBeNull();
  const renamed = await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/attachments/${direct.id}`), { title: 'Changed' });
  expect(renamed.statusCode).toBe(200);
  expect(renamed.json()).toMatchObject({ title: 'Changed', uploadedAt: direct.uploadedAt });
  const hash = f.ctx.db.prepare('SELECT blob_hash FROM attachments WHERE id=?').pluck().get(direct.id) as string;
  await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/log/${log.json().id}`), { text: 'Revised', private: false });
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/attachments'))).json()[0].logEntry).toMatchObject({ text: 'Revised', private: false });
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/log/${log.json().id}`))).statusCode).toBe(200);
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/attachments'))).json().map((a: { id: number }) => a.id)).toEqual([direct.id]);
  expect(await readFile(blobPath(f.ctx.config.filesDir, hash))).toEqual(PDF);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(1);
});

it('checks session, Origin and upload content type before parsing files', async () => {
  const parts = [{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }];
  expect((await upload(f, id, 'attachments', parts, { cookie: '' })).statusCode).toBe(401);
  expect((await upload(f, id, 'attachments', parts, { origin: '' })).statusCode).toBe(403);
  expect((await upload(f, id, 'attachments', parts, { origin: 'https://evil.example' })).statusCode).toBe(403);
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/attachments'))).statusCode).toBe(415);
  const form = multipart(parts);
  expect((await f.ctx.app.inject({ method: 'PATCH', url: recordUrl(f, id), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body })).statusCode).toBe(415);
});

it('rejects malformed envelopes and cleans temporary files; accepts metadata after files', async () => {
  for (const parts of [
    [{ name: 'metadata', data: '{}' }],
    [{ name: 'file', filename: 'a.pdf', data: PDF }],
    [{ name: 'unknown', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }],
    [{ name: 'metadata', data: '{bad' }, { name: 'file', filename: 'a.pdf', data: PDF }],
    [{ name: 'metadata', data: '{"unknown":1}' }, { name: 'file', filename: 'a.pdf', data: PDF }],
  ]) expect((await upload(f, id, 'attachments', parts)).statusCode).toBe(400);
  const response = await upload(f, id, 'attachments', [
    { name: 'file', filename: 'a.pdf', data: PDF }, { name: 'metadata', data: '{}' },
  ]);
  expect(response.statusCode).toBe(201);
  expect(await readdir(join(f.ctx.config.filesDir, '.tmp'))).toEqual([]);
});

it('terminates invalid-filename multipart streams', async () => {
  const source = Readable.from([PDF]);
  const request = {
    isMultipart: () => true,
    raw: Readable.from([]),
    parts: async function* () {
      yield { type: 'file', fieldname: 'file', filename: 'a'.repeat(256), file: source };
    },
  } as unknown as FastifyRequest;
  await expect(parseUpload(request, f.ctx.config.filesDir, 'attachments')).rejects.toMatchObject({ statusCode: 400 });
  expect(source.destroyed).toBe(true);
});

it('normalises malformed parser envelopes and accepts JSON metadata fields', async () => {
  const before = await getRecord(f, id);
  const missingBoundary = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data' }, payload: 'bad' });
  expect(missingBoundary.statusCode).toBe(400);
  expect(missingBoundary.json()).toEqual({ error: 'invalid_upload' });
  for (const [metadata, status] of [['{bad', 400], ['{}', 201]] as const) {
    const body = Buffer.concat([
      Buffer.from(`--json\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--json\r\nContent-Disposition: form-data; name="file"; filename="a.pdf"\r\n\r\n`), PDF, Buffer.from('\r\n--json--\r\n'),
    ]);
    const response = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data; boundary=json' }, payload: body });
    expect(response.statusCode).toBe(status);
    if (status === 400) {
      expect(response.json()).toEqual({ error: 'invalid_upload' });
      expect(await getRecord(f, id)).toEqual(before);
    }
  }
});

it('rejects duplicate photo parts, parser limits, bad third file and truncated multipart without changing evidence', async () => {
  const before = await getRecord(f, id);
  const files = ['original', 'display', 'thumbnail'].map(name => ({ name, filename: 'a.jpg', data: JPEG }));
  expect((await upload(f, id, 'photos', [{ name: 'metadata', data: '{"phase":"before"}' }, files[0]!, files[0]!, files[2]!])).statusCode).toBe(400);
  expect((await upload(f, id, 'photos', [{ name: 'metadata', data: '{"phase":"before"}' }, ...files, files[0]!])).statusCode).toBe(413);
  expect((await upload(f, id, 'photos', [{ name: 'metadata', data: '{"phase":"before"}' }, files[0]!, files[1]!, { ...files[2]!, data: PDF }])).statusCode).toBe(415);
  expect((await upload(f, id, 'attachments', [{ name: 'metadata', data: 'a'.repeat(16_385) }, { name: 'file', filename: 'a.pdf', data: PDF }])).statusCode).toBe(413);
  const form = multipart([{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }]);
  expect((await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body.subarray(0, -20) })).statusCode).toBe(400);
  expect(await getRecord(f, id)).toEqual(before);
  expect(f.ctx.db.prepare('SELECT count(*) FROM photos').pluck().get()).toBe(0);
  expect(await readdir(join(f.ctx.config.filesDir, '.tmp'))).toEqual([]);
});

it('scopes occurrences and Log associations to the record', async () => {
  const other = await postRecord(f, { subtype: 'task' });
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, other.id, '/log'), { text: 'Other' })).json();
  expect((await upload(f, id, 'attachments', [{ name: 'metadata', data: JSON.stringify({ logEntryId: entry.id }) }, { name: 'file', filename: 'a.pdf', data: PDF }])).statusCode).toBe(404);
  const attachment = await addAttachment(f, id);
  const photo = await addPhoto(f, id);
  for (const [kind, occurrenceId] of [['attachments', attachment.id], ['photos', photo.id]]) {
    expect((await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, other.id, `/${kind}/${occurrenceId}`), kind === 'photos' ? { caption: 'x' } : { title: 'x' })).statusCode).toBe(404);
    expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, other.id, `/${kind}/${occurrenceId}`))).statusCode).toBe(404);
  }
});

it('rolls database changes back after occurrence insertion and retains completed disk bytes', async () => {
  const before = await getRecord(f, id);
  f.ctx.db.exec("CREATE TRIGGER fail_touch BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT,'forced'); END");
  const response = await upload(f, id, 'attachments', [{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }]);
  expect(response.statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(0);
  expect(await getRecord(f, id)).toEqual(before);
  expect((await readdir(f.ctx.config.filesDir)).filter(name => name !== '.tmp')).toHaveLength(1);
});

it('rolls back the Log cascade if touching its record fails', async () => {
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'Private', private: true })).json();
  const attachment = await addAttachment(f, id, { logEntryId: entry.id });
  f.ctx.db.exec("CREATE TRIGGER fail_touch BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT,'forced'); END");
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/log/${entry.id}`))).statusCode).toBe(500);
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/attachments'))).json()[0].id).toBe(attachment.id);
});

it('rechecks a Log association deleted while its multipart bytes are arriving', async () => {
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'Soon removed' })).json();
  const form = multipart([
    { name: 'metadata', data: JSON.stringify({ logEntryId: entry.id }) },
    { name: 'file', filename: 'a.pdf', data: PDF },
  ]);
  const payload = Readable.from((async function* () {
    yield form.body.subarray(0, form.body.length - 40);
    f.ctx.db.prepare('DELETE FROM log_entries WHERE id=?').run(entry.id);
    yield form.body.subarray(form.body.length - 40);
  })());
  const response = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload });
  expect(response.statusCode).toBe(404);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
});

it('rejects an oversized attachment by actual streamed bytes without a Content-Length', async () => {
  const payload = Readable.from((function* () {
    yield Buffer.from('--limit\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n{}\r\n--limit\r\nContent-Disposition: form-data; name="file"; filename="a.pdf"\r\nContent-Type: application/pdf\r\n\r\n');
    yield PDF;
    let remaining = 50_000_001 - PDF.length;
    const chunk = Buffer.alloc(64 * 1024);
    while (remaining > 0) {
      const n = Math.min(remaining, chunk.length);
      yield chunk.subarray(0, n);
      remaining -= n;
    }
    yield Buffer.from('\r\n--limit--\r\n');
  })());
  const response = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data; boundary=limit' }, payload });
  expect(response.statusCode).toBe(413);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
  expect(await readdir(join(f.ctx.config.filesDir, '.tmp'))).toEqual([]);
});
