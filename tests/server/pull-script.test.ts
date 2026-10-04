import { afterEach, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const roots: string[] = [];
afterEach(() => { roots.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'bb-pull-script-')); roots.push(root);
  const source = join(root, 'source'); mkdirSync(source);
  const repo = join(root, 'repo'); mkdirSync(join(repo, 'dist/server'), { recursive: true });
  mkdirSync(join(repo, 'scripts'));
  copyFileSync('scripts/pull-backup.ps1', join(repo, 'scripts/pull-backup.ps1'));
  writeFileSync(join(repo, 'dist/server/backup-export.mjs'), 'throw new Error("verifier must be mocked");');
  // The test mocks SSH, SFTP and the verifier process. Actual byte/freshness verification is covered by operations tests.
  writeFileSync(join(source, 'builtbasis.db'), 'synthetic metadata');
  const blobs = Array.from({ length: 128 }, (_, i) => {
    const data = Buffer.from(`blob-${i}`); const hash = createHash('sha256').update(data).digest('hex');
    writeFileSync(join(source, hash), data); return { hash, size: data.length };
  });
  writeFileSync(join(source, 'manifest.json'), JSON.stringify({ blobs }));
  return { root, source, blobs, repo };
}
function run(f: ReturnType<typeof fixture>, mode = 'success') {
  const destination = join(f.root, 'backup with spaces');
  const output = execFileSync('powershell.exe', ['-NoProfile', '-File', resolve('tests/operations/pull-harness.ps1'),
    '-Repo', f.repo, '-Fixture', f.source, '-Destination', destination, '-Mode', mode], { encoding: 'utf8' });
  return { report: JSON.parse(output.trim()), destination };
}
it.skipIf(process.platform !== 'win32')('uses two SFTP batches for 128 new blobs, metadata first, and skips existing blobs on the next pull', () => {
  const f = fixture(); const first = run(f);
  expect(first.report).toMatchObject({ batches: [2, 128], released: true, age: '24', failed: false, locked: false, notifications: 0 });
  expect(first.report.order.slice(0, 2)).toEqual(['builtbasis.db', 'manifest.json']);
  for (const b of f.blobs) expect(existsSync(join(first.destination, 'files', b.hash.slice(0, 2), b.hash))).toBe(true);
  const second = run(f);
  expect(second.report.batches).toEqual([2]);
}, 15000);
it.skipIf(process.platform !== 'win32').each(['setup', 'lock', 'ssh', 'sftp', 'integrity', 'stale', 'release', 'notification-failure'])('dispatches one local desktop failure notification for %s without hiding failure', mode => {
  const { report } = run(fixture(), mode);
  expect(report.failed).toBe(true);
  expect(report.notifications).toBe(1);
  expect(report.notificationTargets).toEqual(['fixture-operator']);
  if (mode === 'notification-failure') expect(report.deliveryWarnings).toBe(1);
  expect(report.locked).toBe(mode === 'lock');
}, 15000);
it.skipIf(process.platform !== 'win32')('fails an overdue-source verifier result, releases its pin and never publishes COMPLETE', () => {
  const { report, destination } = run(fixture(), 'stale');
  expect(report).toMatchObject({ failed: true, released: true, locked: false });
  expect(existsSync(join(destination, 'snapshots', 'a'.repeat(32), 'COMPLETE'))).toBe(false);
}, 15000);
it.skipIf(process.platform !== 'win32')('exits the scheduled PowerShell process nonzero after notifying of setup failure', () => {
  const f = fixture();
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-File', resolve('tests/operations/pull-harness.ps1'), '-Repo', f.repo,
      '-Fixture', f.source, '-Destination', join(f.root, 'backup'), '-Mode', 'setup', '-Uncaught'], { stdio: 'pipe' });
    throw new Error('Expected nonzero exit');
  } catch (error) { expect((error as { status?: number }).status).toBe(1); }
}, 15000);
