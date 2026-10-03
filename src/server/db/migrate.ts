import { backupDatabase } from './backup';
import type { Db } from './connection';
import { MIGRATIONS, type Migration } from './migrations';

export interface MigrateOptions {
  backupsDir: string;
  migrations?: readonly Migration[];
  now?: Date;
}

/** Applies pending migrations, each in its own transaction; backs up first when the database already has data. */
export function migrate(db: Db, options: MigrateOptions): string[] {
  const migrations = options.migrations ?? MIGRATIONS;
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set(db.prepare('SELECT id FROM schema_migrations').pluck().all() as string[]);
  const pending = migrations.filter((migration) => !applied.has(migration.id));
  if (pending.length === 0) return [];

  const tablesWithData = db
    .prepare(
      "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name <> 'schema_migrations' AND name NOT LIKE 'sqlite_%'",
    )
    .pluck()
    .get() as number;
  if (tablesWithData > 0) backupDatabase(db, options.backupsDir, 'pre-migration', options.now);

  const appliedAt = (options.now ?? new Date()).toISOString();
  const record = db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
  for (const migration of pending) {
    db.transaction(() => {
      db.exec(migration.sql);
      record.run(migration.id, appliedAt);
    })();
  }
  return pending.map((migration) => migration.id);
}
