import type { Migration } from './migrations';

export const MIGRATION_0007_WORK_PACKAGES: Migration = {
  id: '0007_work_packages',
  sql: `
    CREATE TABLE work_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      name TEXT NOT NULL CHECK(length(trim(name)) > 0),
      name_key TEXT NOT NULL,
      description TEXT,
      responsible_id INTEGER REFERENCES people(id),
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'planned'
        CHECK(status IN ('planned','in_progress','on_hold','completed','cancelled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, name_key)
    );
    ALTER TABLE records ADD COLUMN work_package_id INTEGER REFERENCES work_packages(id);
    CREATE INDEX records_project_package ON records(project_id, work_package_id);
    CREATE INDEX work_packages_responsible ON work_packages(responsible_id);
  `,
};
