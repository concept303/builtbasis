import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { backupDatabase } from '../../src/server/db/backup';
import { blobPath } from '../../src/server/files/storage';
import { completedBackups, nightlyBackup, retainedBackups, withBackupLock } from '../../src/server/operations/backups';
import { beginExport, completeBundle, fingerprint, releaseExport, restoreBundle, verifyBundle } from '../../src/server/operations/bundles';

vi.mock('node:fs', async (original) => ({ ...await original<typeof import('node:fs')>() }));

const dirs: string[] = [];
const databases: Db[] = [];
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-02T01:00:00Z')); });
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const db of databases.splice(0)) if (db.open) db.close();
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

it('does not make an old snapshot fresh by re-exporting it after live writes', async () => {
  const f = fixture();
  const first = await beginExport(f.backups, f.files);
  await completeBundle(first.path, f.files);
  const firstReport = JSON.parse(fs.readFileSync(join(first.path, 'COMPLETE'), 'utf8'));
  expect(firstReport.sourceCreatedAt).toBe('2026-10-01T01:00:00.000Z');
  f.db.prepare('UPDATE projects SET name = ?').run('New live data not backed up');
  vi.setSystemTime(new Date('2026-10-04T01:00:00Z'));
  const repeated = await beginExport(f.backups, f.files);
  expect(repeated).toMatchObject({ sourceBackup: 'builtbasis-nightly-2026-10-01T01-00-00-000Z.db',
    sourceCreatedAt: '2026-10-01T01:00:00.000Z', exportedAt: '2026-10-04T01:00:00.000Z' });
  await expect(completeBundle(repeated.path, f.files)).rejects.toThrow('stale_source_backup');
  expect(fs.existsSync(join(repeated.path, 'COMPLETE'))).toBe(false);
  await expect(completeBundle(first.path, f.files)).rejects.toThrow('stale_source_backup');
  expect(JSON.parse(fs.readFileSync(join(first.path, 'COMPLETE'), 'utf8'))).toEqual(firstReport);
  // An earlier verified recovery point stays restorable even after its scheduling freshness expires.
  await restoreBundle(first.path, join(f.dir, 'restore-old'), true, f.files);
  const restored = openDatabase(join(f.dir, 'restore-old', 'builtbasis.db'));
  databases.push(restored);
  expect(restored.prepare('SELECT name FROM projects').pluck().get()).toBe('Synthetic drill');
});

it('records source and verification time separately and accepts unchanged recent backup bytes', async () => {
  const f = fixture();
  const original = join(f.backups, completedBackups(f.backups)[0]!);
  const recent = 'builtbasis-nightly-2026-10-02T00-00-00-000Z.db';
  fs.copyFileSync(original, join(f.backups, recent));
  const exported = await beginExport(f.backups, f.files);
  const manifest = JSON.parse(fs.readFileSync(join(exported.path, 'manifest.json'), 'utf8'));
  expect(manifest).toMatchObject({ sourceBackup: recent, sourceCreatedAt: '2026-10-02T00:00:00.000Z', exportedAt: '2026-10-02T01:00:00.000Z' });
  vi.setSystemTime(new Date('2026-10-02T02:00:00Z'));
  await completeBundle(exported.path, f.files);
  expect(JSON.parse(fs.readFileSync(join(exported.path, 'COMPLETE'), 'utf8'))).toEqual({
    sourceBackup: recent, sourceCreatedAt: '2026-10-02T00:00:00.000Z',
    exportedAt: '2026-10-02T01:00:00.000Z', verifiedAt: '2026-10-02T02:00:00.000Z',
  });
  expect(await fingerprint(join(exported.path, 'builtbasis.db'))).toEqual(await fingerprint(original));
});

it('rejects future source dates and configurable-age violations before completion', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  await expect(completeBundle(exported.path, f.files, { maxAgeHours: 12 })).rejects.toThrow('stale_source_backup');
  await expect(completeBundle(exported.path, f.files, { maxAgeHours: 0 })).rejects.toThrow('invalid_max_age_hours');
  await expect(completeBundle(exported.path, f.files, { maxAgeHours: Infinity })).rejects.toThrow('invalid_max_age_hours');
  await expect(completeBundle(exported.path, f.files, { maxAgeHours: 25 })).resolves.toMatchObject({ sourceCreatedAt: '2026-10-01T01:00:00.000Z' });
  const recent = join(f.backups, completedBackups(f.backups)[0]!);
  fs.copyFileSync(recent, join(f.backups, 'builtbasis-nightly-2026-10-03T00-00-00-000Z.db'));
  const future = await beginExport(f.backups, f.files);
  await expect(completeBundle(future.path, f.files)).rejects.toThrow('future_source_backup');
  expect(fs.existsSync(join(future.path, 'COMPLETE'))).toBe(false);
});

it('rejects manifest source-time relabelling and unstructured completion markers', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  const manifestPath = join(exported.path, 'manifest.json');
  const original = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(original);
  manifest.sourceCreatedAt = '2026-10-02T01:00:00.000Z';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  await expect(completeBundle(exported.path, f.files)).rejects.toThrow('source_timestamp_mismatch');
  fs.writeFileSync(manifestPath, original);
  fs.writeFileSync(join(exported.path, 'COMPLETE'), 'old unstructured marker');
  await expect(restoreBundle(exported.path, join(f.dir, 'restored'), true, f.files)).rejects.toThrow();
  expect(fs.existsSync(join(f.dir, 'restored'))).toBe(false);
});
function fixture() {
  const dir = fs.mkdtempSync(join(tmpdir(), 'builtbasis-operations-'));
  dirs.push(dir);
  const backups = join(dir, 'backups');
  const files = join(dir, 'files');
  const db = openDatabase(join(dir, 'builtbasis.db'));
  databases.push(db);
  migrate(db, { backupsDir: backups });
  db.exec(`INSERT INTO users (id, username, password_hash, created_at, updated_at, is_owner) VALUES
    (1,'owner','owner-secret','2026','2026',1),(2,'contributor','old-secret','2026','2026',0);
    INSERT INTO projects VALUES (1,'p1','Synthetic drill','2026');
    INSERT INTO records (id,project_id,subtype,sequence,human_id,status,created_at,created_by,updated_at,updated_by)
      VALUES (1,1,'IN',1,'IN-1','open','2026',1,'2026',1);
    INSERT INTO sessions VALUES ('old-session',2,'2026','2099');
    INSERT INTO record_grants VALUES (1,2,1,1);
    INSERT INTO share_links (record_id,label,token_hash,key_fingerprint,token_ciphertext,token_nonce,token_tag,created_by,created_at)
      VALUES (1,'old link','token','fingerprint',X'01',X'02',X'03',1,'2026');`);
  const bytes = Buffer.from('synthetic retained evidence');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const path = blobPath(files, hash);
  fs.mkdirSync(dirname(path), { recursive: true });
  fs.writeFileSync(path, bytes);
  db.prepare('INSERT INTO blobs VALUES (?, ?, ?)').run(hash, bytes.length, 'text/plain');
  nightlyBackup(db, backups, new Date('2026-10-01T01:00:00Z'));
  return { dir, backups, files, db, path, hash };
}

it('drills restore from a separate offsite copy and resets all restored access before publication', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  const offsite = join(f.dir, 'offsite');
  fs.cpSync(exported.path, offsite, { recursive: true });
  fs.cpSync(f.files, join(offsite, 'files'), { recursive: true });
  releaseExport(f.backups, exported.id);
  await completeBundle(offsite);
  const destination = join(f.dir, 'restored');
  const result = await restoreBundle(offsite, destination, true);
  expect(result).toEqual({ event: 'restore_access_reset', reason: 'database_restore',
    deletedSessions: 1, revokedLinks: 1, disabledContributors: 1, deletedGrants: 1 });
  const restored = openDatabase(join(destination, 'builtbasis.db'));
  databases.push(restored);
  expect(restored.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(0);
  expect(restored.prepare('SELECT count(*) FROM record_grants').pluck().get()).toBe(0);
  expect(restored.prepare('SELECT count(*) FROM share_links WHERE revoked_at IS NULL').pluck().get()).toBe(0);
  expect(restored.prepare('SELECT is_active FROM users ORDER BY id').pluck().all()).toEqual([1, 0]);
  expect(restored.prepare('SELECT password_hash FROM users WHERE id=1').pluck().get()).toBe('owner-secret');
  expect(fs.readFileSync(blobPath(join(destination, 'files'), f.hash))).toEqual(fs.readFileSync(f.path));
  expect(f.db.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(1);
});

it('reports only newly reset access and does not disclose credentials or rewrite earlier revocations', async () => {
  const f = fixture();
  f.db.exec("UPDATE users SET is_active=0 WHERE is_owner=0; DELETE FROM sessions; DELETE FROM record_grants; UPDATE share_links SET revoked_at='2026-09-01T00:00:00.000Z'");
  nightlyBackup(f.db, f.backups, new Date('2026-10-02'));
  const exported = await beginExport(f.backups, f.files);
  await completeBundle(exported.path, f.files);
  const destination = join(f.dir, 'restored');
  expect(await restoreBundle(exported.path, destination, true, f.files)).toEqual({
    event: 'restore_access_reset', reason: 'database_restore', deletedSessions: 0,
    revokedLinks: 0, disabledContributors: 0, deletedGrants: 0,
  });
  const restored = openDatabase(join(destination, 'builtbasis.db'));
  databases.push(restored);
  expect(restored.prepare('SELECT revoked_at FROM share_links').pluck().get()).toBe('2026-09-01T00:00:00.000Z');
});

it('rejects missing and same-size corrupt blobs before completion or restore publication', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  await expect(completeBundle(exported.path)).rejects.toThrow();
  expect(fs.existsSync(join(exported.path, 'COMPLETE'))).toBe(false);
  await completeBundle(exported.path, f.files);
  fs.writeFileSync(f.path, Buffer.alloc(fs.statSync(f.path).size));
  await expect(restoreBundle(exported.path, join(f.dir, 'restored'), true, f.files)).rejects.toThrow('file_verification_failed');
  expect(fs.existsSync(join(f.dir, 'restored'))).toBe(false);
});

it('refuses incomplete and corrupt database bundles', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  await expect(restoreBundle(exported.path, join(f.dir, 'restored'), true, f.files)).rejects.toThrow('incomplete_bundle');
  fs.writeFileSync(join(exported.path, 'builtbasis.db'), 'not sqlite');
  await expect(verifyBundle(exported.path, f.files)).rejects.toThrow('file_verification_failed');
  expect(() => withBackupLock(f.backups, () => withBackupLock(f.backups, () => null))).toThrow();
});

it.each(['older', 'future'])('rejects a %s schema even when its manifest hash matches', async version => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  const path = join(exported.path, 'builtbasis.db');
  const db = openDatabase(path);
  if (version === 'future') db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run('9999_future', '2026');
  else db.prepare("DELETE FROM schema_migrations WHERE id = '0007_work_packages'").run();
  db.close();
  const manifestPath = join(exported.path, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.database = await fingerprint(path);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  await expect(completeBundle(exported.path, f.files)).rejects.toThrow('incompatible_schema');
  expect(fs.existsSync(join(exported.path, 'COMPLETE'))).toBe(false);
});

it('keeps a pin readable after nightly rotation and ignores migration backups and partial files', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  fs.writeFileSync(join(f.backups, 'unrelated.tmp'), 'partial');
  backupDatabase(f.db, f.backups, 'pre-migration');
  // Seed historical names from a validated immutable snapshot; exercise real VACUUM/rotation once.
  const validated = join(f.backups, completedBackups(f.backups)[0]!);
  for (let day = 2; day < 75; day++) {
    const stamp = new Date(Date.UTC(2026, 9, day)).toISOString().replace(/[:.]/g, '-');
    fs.linkSync(validated, join(f.backups, `builtbasis-nightly-${stamp}.db`));
  }
  nightlyBackup(f.db, f.backups, new Date(Date.UTC(2026, 9, 75)));
  expect(completedBackups(f.backups).length).toBeLessThanOrEqual(22);
  expect(completedBackups(f.backups).some((name) => name.includes('2026-10-01'))).toBe(false);
  await expect(verifyBundle(exported.path, f.files)).resolves.toBeDefined();
  expect(fs.existsSync(join(f.backups, 'unrelated.tmp'))).toBe(true);
  expect(fs.readdirSync(f.backups).some((name) => name.includes('pre-migration'))).toBe(true);
  expect(() => releaseExport(f.backups, '../files')).toThrow('invalid_export_id');
});

it('keeps the latest copy for each retained UTC day and Monday-based week', () => {
  const names = Array.from({ length: 70 }, (_, i) => `builtbasis-nightly-${new Date(Date.UTC(2026, 0, i + 1)).toISOString().replace(/[:.]/g, '-')}.db`);
  const retained = retainedBackups(names);
  for (const name of names.slice(-14)) expect(retained.has(name)).toBe(true);
  expect(retained.has(names[0]!)).toBe(false);
  expect(retained.size).toBe(19);
});

it('removes failed restore candidates and never overwrites an existing destination', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  await completeBundle(exported.path, f.files);
  const target = join(f.dir, 'restored');
  await expect(restoreBundle(exported.path, target, false, f.files)).rejects.toThrow('offline_confirmation_required');
  const copy = vi.spyOn(fs, 'copyFileSync').mockImplementation(() => { throw new Error('disk full'); });
  await expect(restoreBundle(exported.path, target, true, f.files)).rejects.toThrow('disk full');
  copy.mockRestore();
  expect(fs.readdirSync(f.dir).some((name) => name.includes('.candidate-'))).toBe(false);
  fs.mkdirSync(target);
  await expect(restoreBundle(exported.path, target, true, f.files)).rejects.toThrow('destination_exists');
});

it('cleans failed backup temp files and preserves completed backups on name collision', () => {
  const f = fixture();
  const now = new Date('2026-10-01T01:00:00Z');
  expect(() => backupDatabase(f.db, f.backups, 'nightly', now)).toThrow('backup_name_exists');
  const rename = vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('publish failed'); });
  expect(() => backupDatabase(f.db, f.backups, 'nightly', new Date('2026-10-02'))).toThrow('publish failed');
  rename.mockRestore();
  expect(fs.readdirSync(f.backups).some((name) => name.endsWith('.tmp'))).toBe(false);
});

it('closes a failed integrity-check connection and never publishes the bad backup', () => {
  const f = fixture();
  const pragma = vi.spyOn(Database.prototype, 'pragma').mockReturnValueOnce('corrupt');
  expect(() => backupDatabase(f.db, f.backups, 'nightly', new Date('2026-10-03'))).toThrow('backup_integrity_failed');
  pragma.mockRestore();
  expect(completedBackups(f.backups)).toHaveLength(1);
  expect(fs.readdirSync(f.backups).some((name) => name.endsWith('.tmp'))).toBe(false);
});
