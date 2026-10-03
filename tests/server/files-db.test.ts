import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { MIGRATIONS } from '../../src/server/db/migrations';

function seed(db: Db) {
  db.exec("INSERT INTO users (id,username,password_hash,created_at,updated_at) VALUES (1,'u','h','t','t'); INSERT INTO projects VALUES (1,'p','P','t')");
  for (const n of [1, 2]) db.prepare("INSERT INTO records (project_id,subtype,sequence,human_id,status,created_at,created_by,updated_at,updated_by) VALUES (1,'task',?,?,'draft','t',1,'t',1)").run(n, `T-${n}`);
}

it('enforces occurrence ownership, cascade, retained blobs, nonreused ids and unique tokens', () => {
  const db = openDatabase(':memory:');
  try {
    migrate(db, { backupsDir: 'unused' }); seed(db);
    const hash = 'a'.repeat(64);
    expect(() => db.prepare('INSERT INTO blobs VALUES (NULL,1,?)').run('image/jpeg')).toThrow();
    db.prepare('INSERT INTO blobs VALUES (?,1,?)').run(hash, 'image/jpeg');
    db.exec("INSERT INTO log_entries (id,record_id,event_at,text,private,logged_by,logged_at) VALUES (1,1,'t','a',0,1,'t'),(2,2,'t','b',1,1,'t')");
    const insert = db.prepare("INSERT INTO attachments (record_id,blob_hash,original_filename,log_entry_id,uploaded_by,uploaded_at) VALUES (1,?,'a.jpg',?,1,'t')");
    expect(() => insert.run(hash, 2)).toThrow();
    const id = Number(insert.run(hash, 1).lastInsertRowid);
    db.exec('DELETE FROM log_entries WHERE id=1');
    expect(db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
    expect(db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(1);
    expect(Number(insert.run(hash, null).lastInsertRowid)).toBeGreaterThan(id);
    const photo = db.prepare("INSERT INTO photos(record_id,original_hash,display_hash,thumbnail_hash,original_filename,phase,uploaded_by,uploaded_at) VALUES (1,?,?,?,'a.jpg','before',1,'t')");
    const photoId = Number(photo.run(hash, hash, hash).lastInsertRowid);
    db.prepare('DELETE FROM photos WHERE id=?').run(photoId);
    expect(Number(photo.run(hash, hash, hash).lastInsertRowid)).toBeGreaterThan(photoId);
    const share = db.prepare("INSERT INTO share_links(record_id,label,token_hash,key_fingerprint,token_ciphertext,token_nonce,token_tag,created_by,created_at) VALUES (1,'x',?,'k',?,?,?,1,'t')");
    share.run(hash, Buffer.alloc(1), Buffer.alloc(12), Buffer.alloc(16));
    expect(() => share.run(hash, Buffer.alloc(1), Buffer.alloc(12), Buffer.alloc(16))).toThrow();
  } finally { db.close(); }
});

it('upgrades a populated Plan 3 database with a backup and is idempotent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bb-files-db-'));
  const db = openDatabase(join(dir, 'test.db'));
  try {
    migrate(db, { backupsDir: join(dir, 'backups'), migrations: MIGRATIONS.slice(0, 2) }); seed(db);
    migrate(db, { backupsDir: join(dir, 'backups') });
    expect(db.prepare('SELECT count(*) FROM records').pluck().get()).toBe(2);
    expect(db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(0);
    expect(readdirSync(join(dir, 'backups')).length).toBeGreaterThan(0);
    const before = db.prepare('SELECT total_changes()').pluck().get();
    migrate(db, { backupsDir: join(dir, 'backups') });
    expect(db.prepare('SELECT total_changes()').pluck().get()).toBe(before);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
