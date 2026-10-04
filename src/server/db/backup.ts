import Database from 'better-sqlite3';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { syncDirectory, syncFile } from '../operations/durability';
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
  if (existsSync(finalPath) || existsSync(tmpPath)) throw new Error('backup_name_exists');
  try {
    db.prepare('VACUUM INTO ?').run(tmpPath);
    const check = new Database(tmpPath, { readonly: true });
    try {
      const result = check.pragma('integrity_check', { simple: true });
      if (result !== 'ok') throw new Error('backup_integrity_failed');
    } finally { check.close(); }
    syncFile(tmpPath);
    renameSync(tmpPath, finalPath);
    syncDirectory(backupsDir);
    return finalPath;
  } catch (error) {
    rmSync(tmpPath, { force: true });
    throw error;
  }
}
