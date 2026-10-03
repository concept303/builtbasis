import type { Migration } from './migrations';

export const MIGRATION_0003_FILES_SHARING: Migration = {
  id: '0003_files_sharing',
  sql: `
    CREATE TABLE blobs (
      hash TEXT PRIMARY KEY NOT NULL CHECK(length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'),
      size INTEGER NOT NULL CHECK(size > 0), content_type TEXT NOT NULL
    );
    CREATE TABLE photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, record_id INTEGER NOT NULL REFERENCES records(id),
      original_hash TEXT NOT NULL REFERENCES blobs(hash), display_hash TEXT NOT NULL REFERENCES blobs(hash), thumbnail_hash TEXT NOT NULL REFERENCES blobs(hash),
      original_filename TEXT NOT NULL, phase TEXT NOT NULL CHECK(phase IN ('before','during','after')), caption TEXT, taken_at TEXT,
      uploaded_by INTEGER NOT NULL REFERENCES users(id), uploaded_at TEXT NOT NULL
    );
    CREATE INDEX photos_record ON photos(record_id);
    CREATE UNIQUE INDEX log_entries_id_record ON log_entries(id, record_id);
    CREATE TABLE attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, record_id INTEGER NOT NULL REFERENCES records(id), blob_hash TEXT NOT NULL REFERENCES blobs(hash),
      original_filename TEXT NOT NULL, title TEXT, log_entry_id INTEGER,
      uploaded_by INTEGER NOT NULL REFERENCES users(id), uploaded_at TEXT NOT NULL,
      FOREIGN KEY(log_entry_id, record_id) REFERENCES log_entries(id, record_id) ON DELETE CASCADE
    );
    CREATE INDEX attachments_record ON attachments(record_id);
    CREATE INDEX attachments_log ON attachments(log_entry_id);
    CREATE TABLE share_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT, record_id INTEGER NOT NULL REFERENCES records(id), label TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE, key_fingerprint TEXT NOT NULL, token_ciphertext BLOB NOT NULL, token_nonce BLOB NOT NULL, token_tag BLOB NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, expires_at TEXT, revoked_at TEXT, last_viewed_at TEXT,
      view_count INTEGER NOT NULL DEFAULT 0 CHECK(view_count >= 0)
    );
    CREATE INDEX share_links_record ON share_links(record_id);
    CREATE TABLE share_key_state (id INTEGER PRIMARY KEY CHECK(id=1), fingerprint TEXT NOT NULL);
  `,
};
