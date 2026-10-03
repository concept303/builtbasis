import { Readable } from 'node:stream';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
let id: number;
beforeEach(async () => { f = await makeFixture(); id = (await postRecord(f, { subtype: 'task' })).id; });
afterEach(async () => { await f.ctx.close(); });
const prefix = Buffer.from('--budget\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n{}\r\n--budget\r\nContent-Disposition: form-data; name="file"; filename="a.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.7\n');
const suffix = Buffer.from('\r\n--budget--\r\n');
function body(total: number) {
  return Readable.from((function* () {
    yield prefix;
    let remaining = total - prefix.length - suffix.length;
    const chunk = Buffer.alloc(64 * 1024);
    while (remaining > 0) { const size = Math.min(remaining, chunk.length); yield chunk.subarray(0, size); remaining -= size; }
    yield suffix;
  })());
}
function request(total: number, declared?: number) {
  return f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'),
    headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data; boundary=budget', ...(declared === undefined ? {} : { 'content-length': String(declared) }) },
    payload: body(total),
  });
}
it('accepts a streamed multipart envelope exactly 100,000,000 bytes including boundaries and part headers', async () => {
  const response = await request(100_000_000);
  expect(response.statusCode, response.body).toBe(201);
  expect(response.json().size).toBe(100_000_000 - prefix.length - suffix.length + 9);
});
it('rejects chunked total envelope overflow even when its only file is below 100 MB and removes staging', async () => {
  const response = await request(100_000_001);
  expect(response.statusCode).toBe(413);
  expect(response.json()).toEqual({ error: 'upload_too_large' });
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
  expect(await readdir(join(f.ctx.config.filesDir, '.tmp'))).toEqual([]);
});
it('rejects declared oversize before publishing any occurrence', async () => {
  const response = await request(1000, 100_000_001);
  expect(response.statusCode).toBe(413);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
});
it('counts a delayed epilogue after the final multipart boundary before committing', async () => {
  const payload = Readable.from((async function* () {
    yield prefix;
    yield suffix;
    await new Promise<void>(resolve => setImmediate(resolve));
    let remaining = 100_000_001 - prefix.length - suffix.length;
    const chunk = Buffer.alloc(64 * 1024);
    while (remaining > 0) { const size = Math.min(remaining, chunk.length); yield chunk.subarray(0,size); remaining -= size; }
  })());
  const response = await f.ctx.app.inject({ method:'POST',url:recordUrl(f,id,'/attachments'),headers:{cookie:f.cookie,origin:f.ctx.origin,'content-type':'multipart/form-data; boundary=budget'},payload });
  expect(response.statusCode).toBe(413);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
  expect(await readdir(join(f.ctx.config.filesDir,'.tmp'))).toEqual([]);
});
