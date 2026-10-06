import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify from 'fastify';
import { expect, it } from 'vitest';
import { registerWeb } from '../../src/server/web';

it('serves explicit SPA routes and assets without replacing API errors or exposing arbitrary files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bb-web-'));
  const app = Fastify();
  try {
    await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, 'index.html'), '<!doctype html><title>BuiltBasis</title>');
    await writeFile(join(dir, 'assets', 'app.js'), 'export const ready=true');
    await writeFile(join(dir, 'secret.txt'), 'PRIVATE');
    app.get('/api/health', async () => ({ ok: true }));
    await registerWeb(app, dir);
    for (const url of ['/', '/login', '/projects/1/records/2', '/share', '/assigned/2', '/projects/1/work-packages', '/projects/1/work-packages/2']) {
      const response = await app.inject(url);
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['content-security-policy']).toContain("object-src 'none'");
      expect(response.headers['referrer-policy']).toBe('no-referrer');
    }
    expect((await app.inject('/assets/app.js')).statusCode).toBe(200);
    expect((await app.inject('/api/health')).json()).toEqual({ ok: true });
    for (const url of ['/api/missing', '/secret.txt', '/assets/missing.js', '/unknown']) {
      const response = await app.inject(url);
      expect(response.statusCode).toBe(404);
      expect(response.body).not.toContain('<title>');
      expect(response.body).not.toContain('PRIVATE');
    }
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});

it('keeps the backend usable before a browser build exists', async () => {
  const app = Fastify();
  try {
    await registerWeb(app, join(tmpdir(), `bb-missing-${Date.now()}`));
    expect((await app.inject('/')).statusCode).toBe(404);
  } finally { await app.close(); }
});
