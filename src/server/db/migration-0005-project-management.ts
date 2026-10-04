import type { Migration } from './migrations';

/** Keep project and contributor record URLs distinct after permanent deletion, including in-flight requests. */
export const MIGRATION_0005_PROJECT_MANAGEMENT: Migration = {
  id: '0005_project_management',
  sql: `
    CREATE TABLE project_id_sequence (
      singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
      last_id INTEGER NOT NULL CHECK(last_id >= 0)
    );
    INSERT INTO project_id_sequence VALUES (1, (SELECT COALESCE(MAX(id), 0) FROM projects));
    CREATE TABLE record_id_sequence (
      singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
      last_id INTEGER NOT NULL CHECK(last_id >= 0)
    );
    INSERT INTO record_id_sequence VALUES (1, (SELECT COALESCE(MAX(id), 0) FROM records));
  `,
};
