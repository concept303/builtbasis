import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { MIGRATIONS } from '../../src/server/db/migrations';

it('upgrades a populated 0006 database without changing existing rows and prevents package ID reuse or dangling membership', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bb-package-migration-'));
  const db = openDatabase(join(dir, 'builtbasis.db'));
  try {
    migrate(db, { backupsDir: join(dir, 'backups'), migrations: MIGRATIONS.filter(m => m.id <= '0006_location_photos') });
    db.exec(`INSERT INTO users(id,username,password_hash,created_at,updated_at,display_name) VALUES(1,'owner','hash','now','now','Owner');
      INSERT INTO projects VALUES(1,'p','Project','now');
      INSERT INTO people(id,project_id,code,name,role) VALUES(1,1,'p','Checker','other');
      INSERT INTO records(id,project_id,subtype,sequence,human_id,status,created_at,created_by,updated_at,updated_by,location_notes)
        VALUES(1,1,'task',1,'T-0001','draft','now',1,'now',1,'Precise location'),
              (2,1,'quality_issue',1,'QI-0001','open','now',1,'now',1,NULL),
              (3,1,'detail_clarification',1,'DC-0001','draft','now',1,'now',1,NULL);
      INSERT INTO decision_options VALUES(1,2,'Repair','Exact description',0,'now');
      UPDATE records SET chosen_option_id=1 WHERE id=2;
      INSERT INTO record_precedence VALUES(1,2);
      INSERT INTO measurement_sets VALUES(1,2,'2026-10-06',1,'before','Measured note','now');
      INSERT INTO measurement_rows VALUES(1,1,0,'Wall','Height',1.2345,'m','Precise');
      INSERT INTO verifications VALUES(1,2,1,'2026-10-05','visual','failed','Failed note','now',1),(2,2,1,'2026-10-06','visual','passed','Passed note','now',1);
      INSERT INTO log_entries VALUES(1,2,'now','Private log',1,1,'now',NULL),(2,2,'now','Public log',0,1,'now',NULL);`);
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> 'schema_migrations'").pluck().all() as string[]);
    const hash = 'a'.repeat(64);
    db.prepare('INSERT INTO blobs VALUES(?,10,?)').run(hash, 'image/jpeg');
    for (const [purpose, phase] of [['evidence', 'before'], ['location', null]]) {
      db.prepare('INSERT INTO photos(record_id,original_hash,display_hash,thumbnail_hash,original_filename,purpose,phase,uploaded_by,uploaded_at) VALUES(2,?,?,?,?,?,?,1,?)').run(hash, hash, hash, 'photo.jpg', purpose, phase, 'now');
    }
    for (const logId of [1, 2]) db.prepare('INSERT INTO attachments(record_id,blob_hash,original_filename,log_entry_id,uploaded_by,uploaded_at) VALUES(2,?,?,?,1,?)').run(hash, 'photo.jpg', logId, 'now');
    db.exec("INSERT INTO record_grants VALUES(2,1,1,1); INSERT INTO share_links(record_id,label,token_hash,key_fingerprint,token_ciphertext,token_nonce,token_tag,created_by,created_at) VALUES(2,'Test','hash','key',X'01',X'02',X'03',1,'now');");
    const sequenceBefore = db.prepare('SELECT * FROM sqlite_sequence').all();
    const snapshots = new Map(tables.map(t => [t, db.prepare(`SELECT * FROM ${t}`).all()]));
    expect(migrate(db, { backupsDir: join(dir, 'backups') })).toEqual(['0007_work_packages']);
    expect(readdirSync(join(dir, 'backups'))).toHaveLength(1);
    for (const table of tables) {
      const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      if (table === 'records') for (const row of rows) { expect(row.work_package_id).toBeNull(); delete row.work_package_id; }
      expect(rows).toEqual(snapshots.get(table));
    }
    expect(db.prepare('SELECT * FROM work_packages').all()).toEqual([]);
    expect(db.prepare('SELECT * FROM sqlite_sequence').all()).toEqual(sequenceBefore);
    expect(migrate(db, { backupsDir: join(dir, 'backups') })).toEqual([]);
    const insert = db.prepare("INSERT INTO work_packages(project_id,name,name_key,created_at,updated_at) VALUES(1,'Tiles','tiles','now','now')");
    const first = Number(insert.run().lastInsertRowid);
    db.prepare('DELETE FROM work_packages WHERE id=?').run(first);
    const next = Number(insert.run().lastInsertRowid);
    expect(next).toBeGreaterThan(first);
    db.prepare('UPDATE records SET work_package_id=? WHERE id=1').run(next);
    expect(() => db.prepare('DELETE FROM work_packages WHERE id=?').run(next)).toThrow(/FOREIGN KEY/);
    expect(db.pragma('foreign_key_check')).toEqual([]);
    expect(db.pragma('integrity_check', { simple: true })).toBe('ok');
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
