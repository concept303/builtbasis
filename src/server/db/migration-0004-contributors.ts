import type { Migration } from './migrations';

export const MIGRATION_0004_CONTRIBUTORS: Migration = {
  id: '0004_contributors',
  sql: `
    ALTER TABLE users ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0 CHECK (is_owner IN (0,1));
    ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1));
    ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT 'Contributor';
    UPDATE users SET is_owner = 1, display_name = 'Owner' WHERE id = (SELECT MIN(id) FROM users);
    CREATE UNIQUE INDEX single_owner ON users(is_owner) WHERE is_owner = 1;
    ALTER TABLE records ADD COLUMN public_notes TEXT;
    CREATE TABLE record_grants (
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      can_upload INTEGER NOT NULL CHECK (can_upload IN (0,1)),
      can_add_log INTEGER NOT NULL CHECK (can_add_log IN (0,1)),
      PRIMARY KEY (record_id, user_id)
    );
  `,
};
