import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';

let db: Db;
beforeEach(() => {
  db = openDatabase(':memory:');
  migrate(db, { backupsDir: 'unused' });
});

afterEach(() => db.close());

describe('record tables (migration 0002)', () => {
  it('creates the record tables', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").pluck().all();
    expect(tables).toEqual(
      expect.arrayContaining([
        'activity',
        'decision_options',
        'log_entries',
        'measurement_rows',
        'measurement_sets',
        'record_counters',
        'record_locations',
        'record_precedence',
        'record_tags',
        'record_trades',
        'records',
        'verifications',
      ]),
    );
  });

  it('folds text in SQL the same way as in TypeScript', () => {
    expect(db.prepare("SELECT bb_fold('  Πόρτα  ΚΟΥΖΙΝΑΣ ')").pluck().get()).toBe('πορτα κουζινασ');
    expect(db.prepare('SELECT bb_fold(NULL)').pluck().get()).toBeNull();
  });

  it('refuses a record that precedes itself and a completion that is not a step of 10', () => {
    db.prepare("INSERT INTO users (username, password_hash, created_at, updated_at) VALUES ('u', 'h', 't', 't')").run();
    db.prepare("INSERT INTO projects (code, name, created_at) VALUES ('p', 'P', 't')").run();
    const insert = db.prepare(
      `INSERT INTO records (project_id, subtype, sequence, human_id, status, completion, created_at, created_by, updated_at, updated_by)
       VALUES (1, 'task', ?, ?, 'draft', ?, 't', 1, 't', 1)`,
    );
    insert.run(1, 'T-0001', 40);
    expect(() => insert.run(2, 'T-0002', 45)).toThrow(/CHECK constraint/);
    expect(() => insert.run(3, 'T-0001', null)).toThrow(/UNIQUE constraint/);
    expect(() => db.prepare('INSERT INTO record_precedence (earlier_id, later_id) VALUES (1, 1)').run()).toThrow(
      /CHECK constraint/,
    );
  });
});
