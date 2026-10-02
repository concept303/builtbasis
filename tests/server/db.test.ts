import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { backupDatabase } from '../../src/server/db/backup';
import { openDatabase } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { MIGRATIONS } from '../../src/server/db/migrations';

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'builtbasis-db-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('database (design §11.3, §11.7)', () => {
  it('turns on foreign keys', () => {
    const db = openDatabase(':memory:');
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    db.close();
  });

  it('applies all migrations once, without a backup on an empty database', () => {
    const dir = tempDir();
    const backupsDir = join(dir, 'backups');
    const db = openDatabase(join(dir, 'builtbasis.db'));
    expect(migrate(db, { backupsDir })).toEqual(MIGRATIONS.map((migration) => migration.id));
    expect(migrate(db, { backupsDir })).toEqual([]);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").pluck().all();
    expect(tables).toEqual(
      expect.arrayContaining([
        'schema_migrations',
        'users',
        'sessions',
        'projects',
        'people',
        'trades',
        'zone_types',
        'tags',
        'location_nodes',
      ]),
    );
    db.close();
    expect(() => readdirSync(backupsDir)).toThrow();
  });

  it('backs up an existing database before applying new migrations', () => {
    const dir = tempDir();
    const backupsDir = join(dir, 'backups');
    const db = openDatabase(join(dir, 'builtbasis.db'));
    migrate(db, { backupsDir });
    const applied = migrate(db, {
      backupsDir,
      migrations: [...MIGRATIONS, { id: '9999_probe', sql: 'CREATE TABLE probe (id INTEGER PRIMARY KEY)' }],
    });
    expect(applied).toEqual(['9999_probe']);
    const backups = readdirSync(backupsDir);
    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatch(/^builtbasis-pre-migration-.*\.db$/);
    db.close();
  });

  it('gives a backup its final name only after the integrity check passes', () => {
    const dir = tempDir();
    const backupsDir = join(dir, 'backups');
    const db = openDatabase(join(dir, 'builtbasis.db'));
    migrate(db, { backupsDir });
    const path = backupDatabase(db, backupsDir, 'nightly', new Date('2026-10-03T02:00:00Z'));
    expect(path).toMatch(/builtbasis-nightly-2026-10-03T02-00-00-000Z\.db$/);
    expect(readdirSync(backupsDir).some((name) => name.endsWith('.tmp'))).toBe(false);
    const copy = openDatabase(path);
    expect(copy.prepare('SELECT COUNT(*) FROM schema_migrations').pluck().get()).toBe(MIGRATIONS.length);
    copy.close();
    db.close();
  });
});
