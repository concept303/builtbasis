import Database from 'better-sqlite3';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { MIGRATIONS } from '../db/migrations';
import { blobPath } from '../files/storage';
import { completedBackups, withBackupLock } from './backups';
import { syncDirectory, syncFile } from './durability';

interface Fingerprint { hash: string; size: number }
interface SourceMetadata { sourceBackup: string; sourceCreatedAt: string; exportedAt: string }
interface Manifest extends SourceMetadata { version: 1; database: Fingerprint; blobs: Fingerprint[] }
export interface CompletionReport extends SourceMetadata { verifiedAt: string }
export const DEFAULT_MAX_AGE_HOURS = 36;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

function timestamp(value: string): number {
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) throw new Error('invalid_backup_timestamp');
  return time;
}
function sourceTimestamp(name: string): string {
  const match = /^builtbasis-nightly-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.db$/.exec(name);
  if (!match) throw new Error('invalid_source_backup');
  const value = `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
  timestamp(value);
  return value;
}
function sourceMetadata(manifest: Manifest): SourceMetadata {
  if (sourceTimestamp(manifest.sourceBackup) !== manifest.sourceCreatedAt) throw new Error('source_timestamp_mismatch');
  timestamp(manifest.exportedAt);
  return { sourceBackup: manifest.sourceBackup, sourceCreatedAt: manifest.sourceCreatedAt, exportedAt: manifest.exportedAt };
}
function completionReport(bundle: string, manifest: Manifest): CompletionReport {
  const report = JSON.parse(readFileSync(join(bundle, 'COMPLETE'), 'utf8')) as CompletionReport;
  if (report.sourceBackup !== manifest.sourceBackup || report.sourceCreatedAt !== manifest.sourceCreatedAt ||
      report.exportedAt !== manifest.exportedAt) throw new Error('completion_metadata_mismatch');
  timestamp(report.verifiedAt);
  return report;
}
export async function fingerprint(path: string): Promise<Fingerprint> {
  const hash = createHash('sha256');
  let size = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); size += chunk.length; }
  return { hash: hash.digest('hex'), size };
}
export function inspectDatabase(path: string): Fingerprint[] {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    if (db.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('database_integrity_failed');
    if ((db.pragma('foreign_key_check') as unknown[]).length) throw new Error('database_foreign_keys_failed');
    const ids = db.prepare('SELECT id FROM schema_migrations ORDER BY id').pluck().all();
    if (JSON.stringify(ids) !== JSON.stringify(MIGRATIONS.map((m) => m.id))) throw new Error('incompatible_schema');
    return db.prepare('SELECT hash, size FROM blobs ORDER BY hash').all() as Fingerprint[];
  } finally { db.close(); }
}
async function checkFile(path: string, expected: Fingerprint): Promise<void> {
  const actual = await fingerprint(path);
  if (actual.hash !== expected.hash || actual.size !== expected.size) throw new Error('file_verification_failed');
}
function writeDurable(path: string, text: string): void {
  writeFileSync(path, text, { flag: 'wx', mode: 0o600 });
  syncFile(path);
  syncDirectory(dirname(path));
}
function copyDurable(source: string, target: string): void {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  syncFile(target);
  syncDirectory(dirname(target));
}

export async function beginExport(backupsDir: string, filesDir: string): Promise<{ id: string; path: string; filesPath: string } & SourceMetadata> {
  const id = randomBytes(16).toString('hex');
  const path = join(backupsDir, '.exports', id);
  const source = withBackupLock(backupsDir, () => {
    const name = completedBackups(backupsDir)[0];
    if (!name) throw new Error('no_completed_backup');
    const sourceCreatedAt = sourceTimestamp(name);
    mkdirSync(path, { recursive: true, mode: 0o700 });
    // Hard link pins the completed inode even if rotation subsequently removes its original name.
    linkSync(join(backupsDir, name), join(path, 'builtbasis.db'));
    syncDirectory(path);
    return { sourceBackup: name, sourceCreatedAt };
  });
  try {
    const blobs = inspectDatabase(join(path, 'builtbasis.db'));
    for (const blob of blobs) {
      await checkFile(blobPath(filesDir, blob.hash), blob);
    }
    const metadata = { ...source, exportedAt: new Date().toISOString() };
    const manifest: Manifest = { version: 1, ...metadata, database: await fingerprint(join(path, 'builtbasis.db')), blobs };
    writeDurable(join(path, 'manifest.json'), JSON.stringify(manifest));
    syncDirectory(join(backupsDir, '.exports'));
    return { id, path: resolve(path), filesPath: resolve(filesDir), ...metadata };
  } catch (error) { rmSync(path, { recursive: true, force: true }); throw error; }
}
export function releaseExport(backupsDir: string, id: string): void {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('invalid_export_id');
  rmSync(join(backupsDir, '.exports', id), { recursive: true, force: true });
}

export async function verifyBundle(bundle: string, filesDir = join(bundle, 'files')): Promise<Manifest> {
  const manifest = JSON.parse(readFileSync(join(bundle, 'manifest.json'), 'utf8')) as Manifest;
  if (manifest.version !== 1) throw new Error('unsupported_bundle');
  sourceMetadata(manifest);
  await checkFile(join(bundle, 'builtbasis.db'), manifest.database);
  const blobs = inspectDatabase(join(bundle, 'builtbasis.db'));
  if (JSON.stringify(blobs) !== JSON.stringify(manifest.blobs)) throw new Error('manifest_reference_mismatch');
  for (const blob of blobs) await checkFile(blobPath(filesDir, blob.hash), blob);
  return manifest;
}
export async function completeBundle(bundle: string, filesDir = join(bundle, 'files'),
  options: { maxAgeHours?: number } = {}): Promise<CompletionReport> {
  const maxAgeHours = options.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS;
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0 || !Number.isFinite(maxAgeHours * 3600000)) throw new Error('invalid_max_age_hours');
  const manifest = await verifyBundle(bundle, filesDir);
  const now = new Date();
  const sourceAge = now.getTime() - timestamp(manifest.sourceCreatedAt);
  if (sourceAge < -CLOCK_SKEW_MS) throw new Error('future_source_backup');
  if (timestamp(manifest.exportedAt) > now.getTime() + CLOCK_SKEW_MS) throw new Error('future_export');
  if (sourceAge > maxAgeHours * 3600000) throw new Error('stale_source_backup');
  const marker = join(bundle, 'COMPLETE');
  if (existsSync(marker)) return completionReport(bundle, manifest);
  const report = { ...sourceMetadata(manifest), verifiedAt: now.toISOString() };
  writeDurable(marker, JSON.stringify(report));
  return report;
}

export interface RestoreResult {
  event: 'restore_access_reset';
  reason: 'database_restore';
  deletedSessions: number;
  revokedLinks: number;
  disabledContributors: number;
  deletedGrants: number;
}

/** Operator must stop HTTP and scheduled jobs before invoking, and keep them stopped through cutover. */
export async function restoreBundle(bundle: string, destination: string, offlineConfirmed: boolean, filesDir = join(bundle, 'files')): Promise<RestoreResult> {
  if (!offlineConfirmed) throw new Error('offline_confirmation_required');
  if (!existsSync(join(bundle, 'COMPLETE'))) throw new Error('incomplete_bundle');
  if (existsSync(destination)) throw new Error('destination_exists');
  const manifest = await verifyBundle(bundle, filesDir);
  completionReport(bundle, manifest);
  const candidate = `${resolve(destination)}.candidate-${randomBytes(16).toString('hex')}`;
  mkdirSync(candidate, { mode: 0o700 });
  try {
    copyDurable(join(bundle, 'builtbasis.db'), join(candidate, 'builtbasis.db'));
    for (const blob of manifest.blobs) copyDurable(blobPath(filesDir, blob.hash), blobPath(join(candidate, 'files'), blob.hash));
    mkdirSync(join(candidate, 'files'), { recursive: true });
    // Verify candidate bytes too: failures during copy cannot produce a published restore.
    await checkFile(join(candidate, 'builtbasis.db'), manifest.database);
    for (const blob of manifest.blobs) await checkFile(blobPath(join(candidate, 'files'), blob.hash), blob);
    const db = new Database(join(candidate, 'builtbasis.db'));
    let result: RestoreResult;
    try {
      db.pragma('foreign_keys = ON');
      result = db.transaction((): RestoreResult => {
        const deletedSessions = db.prepare('DELETE FROM sessions').run().changes;
        const deletedGrants = db.prepare('DELETE FROM record_grants').run().changes;
        const disabledContributors = db.prepare('UPDATE users SET is_active = 0 WHERE is_owner = 0 AND is_active = 1').run().changes;
        const revokedLinks = db.prepare('UPDATE share_links SET revoked_at = ? WHERE revoked_at IS NULL').run(new Date().toISOString()).changes;
        return { event: 'restore_access_reset', reason: 'database_restore', deletedSessions, revokedLinks, disabledContributors, deletedGrants };
      })();
    } finally { db.close(); }
    inspectDatabase(join(candidate, 'builtbasis.db'));
    syncFile(join(candidate, 'builtbasis.db'));
    syncDirectory(join(candidate, 'files'));
    syncDirectory(candidate);
    if (existsSync(destination)) throw new Error('destination_exists');
    renameSync(candidate, destination);
    syncDirectory(dirname(resolve(destination)));
    return result;
  } catch (error) { rmSync(candidate, { recursive: true, force: true }); throw error; }
}
