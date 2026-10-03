import Database from 'better-sqlite3';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './connection';

/**
 * Consistent copy with VACUUM INTO, written under a temporary name and integrity-checked
 * before it gets its final name, so an interrupted or damaged backup never looks complete (design §11.7).
 */
export function backupDatabase(db: Db, backupsDir: string, label: string, now: Date = new Date()): string {
  mkdirSync(backupsDir, { recursive: true });
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const finalPath = join(backupsDir, `builtbasis-${label}-${stamp}.db`);
  const tmpPath = `${finalPath}.tmp`;
  db.prepare('VACUUM INTO ?').run(tmpPath);
  const check = new Database(tmpPath, { readonly: true });
  const result = check.pragma('integrity_check', { simple: true });
  check.close();
  if (result !== 'ok') {
    rmSync(tmpPath, { force: true });
    throw new Error(`Backup integrity check failed: ${String(result)}`);
  }
  renameSync(tmpPath, finalPath);
  return finalPath;
}
