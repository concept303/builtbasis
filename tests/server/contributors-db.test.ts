import { expect, it } from 'vitest';
import { openDatabase } from '../../src/server/db/connection';
import { MIGRATIONS } from '../../src/server/db/migrations';

it('upgrades the legacy owner and preserves existing Notes as private', () => {
  const db = openDatabase(':memory:');
  try {
    for (const migration of MIGRATIONS.slice(0, 3)) db.exec(migration.sql);
    db.exec(`INSERT INTO users VALUES (1,'legacy','hash','t','t');
      INSERT INTO projects VALUES (1,'p','Project','t');
      INSERT INTO records (id,project_id,subtype,sequence,human_id,status,notes,created_at,created_by,updated_at,updated_by)
      VALUES (1,1,'task',1,'T-1','draft','private legacy text','t',1,'t',1);`);
    for (const migration of MIGRATIONS.slice(3)) db.exec(migration.sql);
    expect(db.prepare('SELECT is_owner, is_active, display_name FROM users').get())
      .toEqual({ is_owner: 1, is_active: 1, display_name: 'Owner' });
    expect(db.prepare('SELECT notes, public_notes FROM records').get())
      .toEqual({ notes: 'private legacy text', public_notes: null });
    db.exec("INSERT INTO users (id,username,password_hash,created_at,updated_at) VALUES (2,'alex','hash','t','t')");
    db.exec('INSERT INTO record_grants VALUES (1,2,0,0)');
    expect(() => db.exec('INSERT INTO record_grants VALUES (1,2,1,1)')).toThrow();
    expect(() => db.exec('UPDATE record_grants SET can_upload = 2')).toThrow();
    expect(() => db.exec('UPDATE users SET is_owner = 1 WHERE id = 2')).toThrow();
  } finally { db.close(); }
});
