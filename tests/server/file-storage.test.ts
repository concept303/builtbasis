import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import * as fsPromises from 'node:fs/promises';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FILE_LIMITS } from '../../src/domain';
import { blobPath, discardStaged, publishFile, stageFile } from '../../src/server/files/storage';
import { HEIC, JPEG, OLE, PDF, PNG, ZIP } from './file-fixture';

vi.mock('node:fs/promises', async importOriginal => ({
  ...await importOriginal<typeof import('node:fs/promises')>(),
}));

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'bb-storage-')); });
afterEach(async () => { vi.restoreAllMocks(); await rm(dir, { recursive: true, force: true }); });

it('preserves original bytes, hashes content and publishes concurrent duplicate bytes without replacement', async () => {
  const a = await stageFile(dir, Readable.from([JPEG]), 'όψη.jpg', 'photo-original');
  const b = await stageFile(dir, Readable.from([JPEG]), '../../same.jpeg', 'attachment');
  expect(a.hash).toBe(createHash('sha256').update(JPEG).digest('hex'));
  expect(b.hash).toBe(a.hash);
  await Promise.all([publishFile(dir, a), publishFile(dir, b)]);
  expect(await readFile(blobPath(dir, a.hash))).toEqual(JPEG);
  expect(await readdir(join(dir, '.tmp'))).toEqual([]);
  const c = await stageFile(dir, Readable.from([JPEG]), 'c.jpg', 'attachment');
  await writeFile(blobPath(dir, a.hash), Buffer.alloc(JPEG.length));
  await expect(publishFile(dir, c)).rejects.toThrow();
  await discardStaged(c);
  expect(await readFile(blobPath(dir, a.hash))).toEqual(Buffer.alloc(JPEG.length));
  expect(() => blobPath(dir, '../guess')).toThrow();
});

it.each([
  ['a.jpg', JPEG, 'image/jpeg'], ['a.png', PNG, 'image/png'], ['a.heic', HEIC, 'image/heic'], ['a.heif', HEIC, 'image/heic'],
  ['a.pdf', PDF, 'application/pdf'], ['a.rtf', Buffer.from('{\\rtf1 synthetic}'), 'application/rtf'],
  ...['doc', 'xls', 'ppt'].map(ext => [`a.${ext}`, OLE, 'application/x-cfb']),
  ...['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'].map(ext => [`a.${ext}`, ZIP, 'application/zip']),
  ...['AC1006','AC1009','AC1012','AC1014','AC1015','AC1018','AC1021','AC1024','AC1027','AC1032'].map(sig => ['a.dwg', Buffer.from(sig), 'application/octet-stream']),
] as [string, Buffer, string][])('screens allowed signature for %s', async (filename, bytes, type) => {
  const file = await stageFile(dir, Readable.from([bytes]), filename, 'attachment');
  expect(file.contentType).toBe(type);
  await discardStaged(file);
});

it.each([
  ['a.jpg', Buffer.from('<html>bad</html>')], ['a.exe', JPEG], ['a.docm', ZIP], ['a.pdf', JPEG],
  ['a.jpg', Buffer.from('AC1032')], ['a.heic', Buffer.concat([Buffer.from([0,0,0,16]), Buffer.from('ftypmif1'), Buffer.alloc(4)])],
] as [string, Buffer][])('rejects a misleading or disallowed format %s', async (filename, bytes) => {
  await expect(stageFile(dir, Readable.from([bytes]), filename, 'attachment')).rejects.toMatchObject({ statusCode: 415 });
  expect(await readdir(join(dir, '.tmp'))).toEqual([]);
});

it('cleans incomplete, empty, wrong-derived-format and interrupted streams', async () => {
  await expect(stageFile(dir, Readable.from([]), 'a.jpg', 'photo-original')).rejects.toMatchObject({ statusCode: 415 });
  await expect(stageFile(dir, Readable.from([PNG]), 'a.png', 'photo-display')).rejects.toMatchObject({ statusCode: 415 });
  const broken = Readable.from((async function* () { yield JPEG; throw new Error('interrupted'); })());
  await expect(stageFile(dir, broken, 'a.jpg', 'photo-original')).rejects.toThrow('interrupted');
  expect(await readdir(join(dir, '.tmp'))).toEqual([]);
});

it('terminates sources rejected before staging and after a disk flush failure', async () => {
  const invalid = Readable.from([JPEG]);
  await expect(stageFile(dir, invalid, 'a'.repeat(256), 'attachment')).rejects.toThrow();
  expect(invalid.destroyed).toBe(true);
  await writeFile(join(dir, '.tmp'), 'occupied');
  const blocked = Readable.from([JPEG]);
  await expect(stageFile(dir, blocked, 'a.jpg', 'attachment')).rejects.toThrow();
  expect(blocked.destroyed).toBe(true);
  await rm(join(dir, '.tmp'));
  const originalOpen = fsPromises.open;
  vi.spyOn(fsPromises, 'open').mockImplementation(async (...args: Parameters<typeof originalOpen>) => {
    const handle = await originalOpen(...args);
    vi.spyOn(handle, 'sync').mockRejectedValue(new Error('forced_flush_failure'));
    return handle;
  });
  const failed = Readable.from([JPEG]);
  await expect(stageFile(dir, failed, 'a.jpg', 'attachment')).rejects.toThrow('forced_flush_failure');
  expect(failed.destroyed).toBe(true);
  expect(await readdir(join(dir, '.tmp'))).toEqual([]);
});

it.each(Object.entries(FILE_LIMITS))('enforces actual streamed limit for %s', async (purpose, limit) => {
  const source = (size: number) => Readable.from((function* () {
    yield JPEG;
    let remaining = size - JPEG.length;
    const chunk = Buffer.alloc(64 * 1024);
    while (remaining > 0) { const n = Math.min(remaining, chunk.length); yield chunk.subarray(0, n); remaining -= n; }
  })());
  const valid = await stageFile(dir, source(limit), 'a.jpg', purpose as keyof typeof FILE_LIMITS);
  expect(valid.size).toBe(limit); await discardStaged(valid);
  await expect(stageFile(dir, source(limit + 1), 'a.jpg', purpose as keyof typeof FILE_LIMITS)).rejects.toMatchObject({ statusCode: 413 });
  expect(await readdir(join(dir, '.tmp'))).toEqual([]);
});
