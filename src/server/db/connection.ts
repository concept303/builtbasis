import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { foldText } from '../../domain';

export type Db = Database.Database;

/** Opens SQLite with foreign keys on. The default rollback journal is kept (single file, design §11.9). */
export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  // Text search folds case and accents the same way in SQL as in TypeScript (bb_fold(NULL) is NULL).
  db.function('bb_fold', { deterministic: true }, (value: unknown) =>
    typeof value === 'string' ? foldText(value) : null,
  );
  return db;
}
