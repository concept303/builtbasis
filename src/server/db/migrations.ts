import { MIGRATION_0002_RECORDS } from './migration-0002-records';

export interface Migration {
  id: string;
  sql: string;
}

/** Forward-only migrations, applied in order (design §11.3). Never edit an applied migration; add a new one. */
export const MIGRATIONS: readonly Migration[] = [
  {
    id: '0001_init',
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE INDEX sessions_user ON sessions(user_id);

      CREATE TABLE projects (
        id INTEGER PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE people (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        company TEXT,
        role TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        UNIQUE (project_id, code)
      );

      CREATE TABLE trades (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        code TEXT NOT NULL,
        name_en TEXT NOT NULL DEFAULT '',
        name_el TEXT NOT NULL DEFAULT '',
        def_en TEXT NOT NULL DEFAULT '',
        def_el TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        UNIQUE (project_id, code),
        CHECK (name_en <> '' OR name_el <> '')
      );

      CREATE TABLE zone_types (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        name_en TEXT NOT NULL DEFAULT '',
        name_el TEXT NOT NULL DEFAULT '',
        CHECK (name_en <> '' OR name_el <> '')
      );

      CREATE TABLE tags (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        name_el TEXT NOT NULL DEFAULT '',
        name_en TEXT NOT NULL DEFAULT '',
        name_el_key TEXT,
        name_en_key TEXT,
        CHECK (name_el <> '' OR name_en <> '')
      );
      CREATE UNIQUE INDEX tags_el_unique ON tags(project_id, name_el_key) WHERE name_el_key IS NOT NULL;
      CREATE UNIQUE INDEX tags_en_unique ON tags(project_id, name_en_key) WHERE name_en_key IS NOT NULL;

      CREATE TABLE location_nodes (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        parent_id INTEGER REFERENCES location_nodes(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        zone_type_id INTEGER REFERENCES zone_types(id),
        name_en TEXT NOT NULL DEFAULT '',
        name_el TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        CHECK (name_en <> '' OR name_el <> '')
      );
      CREATE INDEX location_nodes_parent ON location_nodes(project_id, parent_id);
    `,
  },
  MIGRATION_0002_RECORDS,
];
