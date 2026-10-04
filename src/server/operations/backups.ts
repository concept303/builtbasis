import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from '../db/connection';
import { backupDatabase } from '../db/backup';
import { syncDirectory } from './durability';

export const NIGHTLY_NAME = /^builtbasis-nightly-(\d{4}-\d{2}-\d{2})T\d{2}-\d{2}-\d{2}-\d{3}Z\.db$/;

/** Export pinning and rotation use the same short filesystem lock. Never clear a live lock. */
export function withBackupLock<T>(dir: string, action: () => T): T {
  mkdirSync(dir, { recursive: true });
  const lock = join(dir, '.operations-lock');
  mkdirSync(lock);
  try { return action(); } finally { rmSync(lock, { recursive: true }); }
}
export function completedBackups(dir: string): string[] {
  return readdirSync(dir).filter((name) => NIGHTLY_NAME.test(name)).sort().reverse();
}

/** Latest backup for each UTC day; weekly buckets start Monday. Union retains at most 22 copies. */
export function retainedBackups(names: string[]): Set<string> {
  const keep = new Set<string>();
  const days = new Set<string>();
  const weeks = new Set<string>();
  for (const name of [...names].sort().reverse()) {
    const match = NIGHTLY_NAME.exec(name);
    if (!match) continue;
    const day = match[1]!;
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    const week = date.toISOString().slice(0, 10);
    if (days.size < 14 && !days.has(day)) { keep.add(name); days.add(day); }
    if (weeks.size < 8 && !weeks.has(week)) { keep.add(name); weeks.add(week); }
  }
  return keep;
}
export function nightlyBackup(db: Db, dir: string, now = new Date()): string {
  return withBackupLock(dir, () => {
    const result = backupDatabase(db, dir, 'nightly', now);
    const names = completedBackups(dir);
    const keep = retainedBackups(names);
    for (const name of names) if (!keep.has(name)) rmSync(join(dir, name));
    syncDirectory(dir);
    return result;
  });
}
