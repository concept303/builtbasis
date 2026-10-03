import { request as httpRequest } from 'node:http';
import { Readable } from 'node:stream';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
let address: string;
let id: number;
const prefix = Buffer.from('--wire\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n{}\r\n--wire\r\nContent-Disposition: form-data; name="file"; filename="wire.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.7\n');
const suffix = Buffer.from('\r\n--wire--\r\n');

beforeEach(async () => {
  f = await makeFixture();
  id = (await postRecord(f, { subtype: 'task' })).id;
  address = await f.ctx.app.listen({ port: 0, host: '127.0.0.1' });
});
afterEach(async () => { await f.ctx.close(); });

function body(total: number): Readable {
  return Readable.from((function* () {
    yield prefix;
    const chunk = Buffer.alloc(64 * 1024);
    let remaining = total - prefix.length - suffix.length;
    while (remaining > 0) {
      const size = Math.min(remaining, chunk.length);
      yield chunk.subarray(0, size);
      remaining -= size;
    }
    yield suffix;
  })());
}

function headers(declared?: number) {
  return { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data; boundary=wire',
    ...(declared === undefined ? {} : { 'content-length': String(declared) }) };
}

function upload(total: number, declared?: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const source = body(total);
    const req = httpRequest(new URL(recordUrl(f, id, '/attachments'), address), {
      method: 'POST', headers: headers(declared), agent: false,
    });
    const timer = setTimeout(() => req.destroy(new Error('Loopback upload timed out')), 20_000);
    req.on('error', reject);
    req.once('close', () => { clearTimeout(timer); source.destroy(); });
    source.on('error', error => req.destroy(error));
    req.on('response', response => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { responseBody += chunk; });
      response.on('error', reject);
      response.on('end', () => {
        resolve({ status: response.statusCode!, body: responseBody });
        source.destroy();
        req.destroy();
      });
    });
    source.pipe(req);
  });
}

async function stagedNames(): Promise<string[]> {
  try { return await readdir(join(f.ctx.config.filesDir, '.tmp')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
function occurrenceCount(): number {
  return f.ctx.db.prepare('SELECT COUNT(*) FROM attachments').pluck().get() as number;
}

it('accepts a normal Content-Length upload over a real HTTP socket', async () => {
  const response = await upload(1024, 1024);
  expect(response.status, response.body).toBe(201);
  expect(JSON.parse(response.body).size).toBe(1024 - prefix.length - suffix.length + 9);
  expect(occurrenceCount()).toBe(1);
  expect(await stagedNames()).toEqual([]);
});

it('accepts an exactly 100 MB chunked request streamed over a real HTTP socket', async () => {
  const response = await upload(100_000_000);
  expect(response.status, response.body).toBe(201);
  expect(JSON.parse(response.body).size).toBe(100_000_000 - prefix.length - suffix.length + 9);
  expect(occurrenceCount()).toBe(1);
  expect(await stagedNames()).toEqual([]);
}, 30_000);

it('returns a readable 413 over the socket for chunked overflow and removes staging', async () => {
  const response = await upload(100_000_001);
  expect(response.status).toBe(413);
  expect(JSON.parse(response.body)).toEqual({ error: 'upload_too_large' });
  expect(occurrenceCount()).toBe(0);
  expect(await stagedNames()).toEqual([]);
}, 30_000);

it('returns 413 for declared oversize without requiring the client to send the declared body', async () => {
  const response = await upload(1024, 100_000_001);
  expect(response.status).toBe(413);
  expect(JSON.parse(response.body)).toEqual({ error: 'upload_too_large' });
  expect(occurrenceCount()).toBe(0);
  expect(await stagedNames()).toEqual([]);
});

it('removes a partial staged file after client disconnect and continues serving requests', async () => {
  const req = httpRequest(new URL(recordUrl(f, id, '/attachments'), address), {
    method: 'POST', headers: headers(), agent: false,
  });
  req.on('error', () => {}); // Deliberate local socket cancellation below.
  try {
    req.write(prefix);
    req.write(Buffer.alloc(64 * 1024));
    await vi.waitFor(async () => { expect((await stagedNames()).length).toBe(1); }, { timeout: 5000 });
    req.destroy();
    await vi.waitFor(async () => { expect(await stagedNames()).toEqual([]); }, { timeout: 5000 });
    expect(occurrenceCount()).toBe(0);
    const response = await upload(1024, 1024);
    expect(response.status, response.body).toBe(201);
  } finally { req.destroy(); }
}, 15_000);
