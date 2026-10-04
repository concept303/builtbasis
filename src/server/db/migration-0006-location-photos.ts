import type { Migration } from './migrations';

export const MIGRATION_0006_LOCATION_PHOTOS: Migration = {
  id: '0006_location_photos',
  sql: `
    ALTER TABLE records ADD COLUMN location_notes TEXT;

    -- Location photos share storage and access rules with evidence photos, but
    -- have no before/during/after phase. Preserve IDs, including deleted IDs.
    CREATE TEMP TABLE photo_sequence_before_migration AS
      SELECT seq FROM sqlite_sequence WHERE name = 'photos';
    CREATE TABLE photos_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT, record_id INTEGER NOT NULL REFERENCES records(id),
      original_hash TEXT NOT NULL REFERENCES blobs(hash), display_hash TEXT NOT NULL REFERENCES blobs(hash), thumbnail_hash TEXT NOT NULL REFERENCES blobs(hash),
      original_filename TEXT NOT NULL, purpose TEXT NOT NULL DEFAULT 'evidence' CHECK(purpose IN ('evidence','location')),
      phase TEXT, caption TEXT, taken_at TEXT,
      uploaded_by INTEGER NOT NULL REFERENCES users(id), uploaded_at TEXT NOT NULL,
      CHECK ((purpose = 'evidence' AND phase IS NOT NULL AND phase IN ('before','during','after')) OR (purpose = 'location' AND phase IS NULL))
    );
    INSERT INTO photos_new(id, record_id, original_hash, display_hash, thumbnail_hash, original_filename, phase, caption, taken_at, uploaded_by, uploaded_at)
      SELECT id, record_id, original_hash, display_hash, thumbnail_hash, original_filename, phase, caption, taken_at, uploaded_by, uploaded_at FROM photos;
    DROP TABLE photos;
    ALTER TABLE photos_new RENAME TO photos;
    CREATE INDEX photos_record ON photos(record_id);
    DELETE FROM sqlite_sequence WHERE name = 'photos';
    INSERT INTO sqlite_sequence(name, seq)
      SELECT 'photos', MAX(value) FROM (
        SELECT COALESCE(MAX(id), 0) AS value FROM photos
        UNION ALL SELECT seq FROM photo_sequence_before_migration
      );
    DROP TABLE photo_sequence_before_migration;
  `,
};
