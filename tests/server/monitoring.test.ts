import { afterEach, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { get, loginAsOwner, makeContext, OWNER, type TestContext } from './helpers';
import { createContributor } from '../../src/server/auth/contributors';
import { createSession } from '../../src/server/auth/sessions';
import { loadConfig } from '../../src/server/config';
vi.mock('node:fs/promises', async original => ({ ...await original<typeof import('node:fs/promises')>() }));
let ctx: TestContext;
afterEach(async () => { vi.restoreAllMocks(); if (ctx) await ctx.close(); });
it('exposes read-only status only to the owner without paths or secrets', async () => {
  ctx = await makeContext(); const cookie = await loginAsOwner(ctx);
  expect((await ctx.app.inject('/api/operations/status')).statusCode).toBe(401);
  const contributor = createContributor(ctx.db, 'status-reader', 'Reader', OWNER.password);
  const token = createSession(ctx.db, contributor).token;
  expect((await get(ctx, `bb_session=${token}`, '/api/operations/status')).statusCode).toBe(403);
  const result = await get(ctx, cookie, '/api/operations/status');
  expect(result.statusCode).toBe(200);
  expect(result.headers['cache-control']).toContain('no-store');
  expect(result.json().backup.state).toBe('missing');
  expect(result.body).not.toContain(ctx.config.dataDir);
  expect(result.body).not.toContain(ctx.config.shareKey!.toString('hex'));
});
it('uses nightly source timestamps, rejects future dates, and shows read failures as unavailable', async () => {
  ctx = await makeContext(); const cookie = await loginAsOwner(ctx);
  await fs.mkdir(ctx.config.backupsDir);
  const stamp = (date: Date) => `builtbasis-nightly-${date.toISOString().replace(/[:.]/g, '-')}.db`;
  await fs.writeFile(join(ctx.config.backupsDir, stamp(new Date(Date.now() - 40 * 3600000))), 'fixture');
  await fs.writeFile(join(ctx.config.backupsDir, 'builtbasis-nightly-ignore.db.tmp'), 'partial');
  expect((await get(ctx, cookie, '/api/operations/status')).json().backup.state).toBe('overdue');
  await fs.writeFile(join(ctx.config.backupsDir, stamp(new Date())), 'fixture');
  expect((await get(ctx, cookie, '/api/operations/status')).json().backup.state).toBe('ok');
  await fs.writeFile(join(ctx.config.backupsDir, stamp(new Date(Date.now() + 3600000))), 'fixture');
  expect((await get(ctx, cookie, '/api/operations/status')).json().backup.state).toBe('unavailable');
  vi.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('private path'));
  expect((await get(ctx, cookie, '/api/operations/status')).json().backup.state).toBe('unavailable');
  vi.spyOn(fs, 'statfs').mockRejectedValueOnce(new Error('private disk path'));
  expect((await get(ctx, cookie, '/api/operations/status')).json().storage.state).toBe('unavailable');
});
it('accepts only a positive finite backup warning age', () => {
  expect(loadConfig({ BUILTBASIS_DATA_DIR: '.', BACKUP_MAX_AGE_HOURS: '12.5' }).backupMaxAgeHours).toBe(12.5);
  for (const value of ['0', '-1', 'Infinity', 'no']) expect(() => loadConfig({ BUILTBASIS_DATA_DIR: '.', BACKUP_MAX_AGE_HOURS: value })).toThrow();
});
it('warns below the configured file allowance threshold', async () => {
  ctx = await makeContext(); const cookie = await loginAsOwner(ctx);
  const read = async () => (await get(ctx, cookie, '/api/operations/status')).json().storage;
  expect(await read()).toMatchObject({ state: 'warning', managedHeadroomBytes: '1000000000', warningBelowBytes: '5000000000' });
  ctx.config.filesWarningBelowBytes = 1000000000;
  expect((await read()).state).toBe('ok'); // At the threshold is not below it.
  ctx.config.filesWarningBelowBytes = 1000000001;
  expect((await read()).state).toBe('warning');
  ctx.config.filesWarningBelowBytes = 999999999;
  expect((await read()).state).toBe('ok');
});
it('defaults the file allowance warning to 5 GB and rejects invalid thresholds', () => {
  expect(loadConfig({ BUILTBASIS_DATA_DIR: '.' }).filesWarningBelowBytes).toBe(5000000000);
  expect(loadConfig({ BUILTBASIS_DATA_DIR: '.', FILES_WARNING_BELOW_BYTES: '2000000000' }).filesWarningBelowBytes).toBe(2000000000);
  for (const value of ['', '0', '-1', '1.5', 'Infinity', 'no', '9007199254740992']) {
    expect(() => loadConfig({ BUILTBASIS_DATA_DIR: '.', FILES_WARNING_BELOW_BYTES: value })).toThrow();
  }
});
