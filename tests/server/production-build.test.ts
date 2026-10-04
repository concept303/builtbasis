import { afterEach, expect, test } from 'vitest';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
test('compiled production entrypoints run without tsx and serve a real health request', async () => {
  execFileSync(process.execPath, ['scripts/build-server.mjs'], { cwd: process.cwd() });
  expect(execFileSync(process.execPath, ['dist/server/runtime-check.mjs'], { encoding: 'utf8' })).toContain('runtime ok');
  const listener = createServer();
  await new Promise<void>((done) => listener.listen(0, '127.0.0.1', done));
  const address = listener.address();
  if (!address || typeof address === 'string') throw new Error('port_missing');
  const port = address.port;
  await new Promise<void>((done, reject) => listener.close(error => error ? reject(error) : done()));
  const root = mkdtempSync(join(tmpdir(), 'bb-production-')); roots.push(root);
  const child = spawn(process.execPath, [resolve('dist/server/main.mjs')], {
    cwd: root, stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production',
      BUILTBASIS_DATA_DIR: join(root, 'data'), PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
      PORT: String(port), HOST: '127.0.0.1', SHARE_LINK_KEY: 'a'.repeat(64),
      FILES_STORAGE_BUDGET_BYTES: '1000000000', FILES_FREE_RESERVE_BYTES: '1' },
  });
  const exited = new Promise<void>((done) => child.once('exit', () => done()));
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error('production_process_exited');
      try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); if (response.ok) { ready = true; break; } } catch { /* wait for listen */ }
      await new Promise(done => setTimeout(done, 50));
    }
    expect(ready).toBe(true);
  } finally { child.kill(); await exited; }
}, 15000);
