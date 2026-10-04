import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { MIGRATIONS } from '../../src/server/db/migrations';
import { createRecord } from '../../src/server/records/records';
import { createProject, deleteProject } from '../../src/server/lists/projects';

it('seeds the project sequence above existing IDs without changing projects or their locations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bb-project-migration-'));
  const db = openDatabase(':memory:');
  try {
    migrate(db, { backupsDir: dir, migrations: MIGRATIONS.filter(m => m.id < '0005') });
    db.prepare('INSERT INTO projects VALUES (?,?,?,?)').run(21, 'EXISTING', 'Existing project', '2026-01-01T00:00:00Z');
    db.prepare("INSERT INTO location_nodes (id,project_id,kind,name_en,sort_order) VALUES (1,21,'building','Villa',0)").run();
    db.prepare("INSERT INTO users (id, username, password_hash, created_at, updated_at, is_owner) VALUES (1,'migration-owner','invalid-test-hash','2026-01-01','2026-01-01',1)").run();
    db.prepare("INSERT INTO records (id,project_id,subtype,sequence,human_id,status,created_at,created_by,updated_at,updated_by) VALUES (70,21,'task',1,'T-0001','draft','2026-01-01',1,'2026-01-01',1)").run();
    db.prepare("INSERT INTO record_counters VALUES (21,'task',1)").run();
    migrate(db, { backupsDir: dir });
    expect(db.prepare('SELECT last_id FROM record_id_sequence').pluck().get()).toBe(70);
    expect(createRecord(db, 21, 1, { subtype: 'task' }).id).toBe(71);
    expect(db.prepare('SELECT name FROM projects WHERE id=21').pluck().get()).toBe('Existing project');
    expect(db.prepare('SELECT project_id FROM location_nodes WHERE id=1').pluck().get()).toBe(21);
    const next = createProject(db, { code: 'NEXT', name: 'Next project' });
    expect(next.id).toBe(22);
    deleteProject(db, next.id, next.name);
    expect(createProject(db, { code: 'AFTER', name: 'After deletion' }).id).toBe(23);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
