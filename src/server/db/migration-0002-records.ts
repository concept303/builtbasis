import type { Migration } from './migrations';

/** Records and everything recorded on them (design §4–§8, §11.3). Files and share links follow in Plan 4. */
export const MIGRATION_0002_RECORDS: Migration = {
  id: '0002_records',
  sql: `
    -- Human-ID sequences per project and subtype; never reused (design §4.2).
    CREATE TABLE record_counters (
      project_id INTEGER NOT NULL REFERENCES projects(id),
      subtype TEXT NOT NULL,
      last_sequence INTEGER NOT NULL,
      PRIMARY KEY (project_id, subtype)
    );

    CREATE TABLE records (
      id INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      subtype TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      human_id TEXT NOT NULL,
      status TEXT NOT NULL,
      status_before_hold TEXT,
      status_reason_code TEXT,
      status_reason_note TEXT,
      title TEXT,
      description TEXT,
      reference TEXT,
      notes TEXT,
      ball_in_court_id INTEGER REFERENCES people(id),
      responsible_id INTEGER REFERENCES people(id),
      severity TEXT,
      priority TEXT,
      due_date TEXT,
      completion INTEGER CHECK (completion IS NULL OR (completion BETWEEN 0 AND 100 AND completion % 10 = 0)),
      safety INTEGER NOT NULL DEFAULT 0 CHECK (safety IN (0, 1)),
      outside_scope INTEGER NOT NULL DEFAULT 0 CHECK (outside_scope IN (0, 1)),
      estimated_cost_cents INTEGER CHECK (estimated_cost_cents IS NULL OR estimated_cost_cents >= 0),
      problem_types TEXT NOT NULL DEFAULT '[]',
      stage TEXT,
      disposition TEXT,
      correction TEXT,
      question TEXT,
      route TEXT,
      issued_by_id INTEGER REFERENCES people(id),
      chosen_option_id INTEGER REFERENCES decision_options(id),
      decided_by_id INTEGER REFERENCES people(id),
      decided_on TEXT,
      instruction_text TEXT,
      created_at TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      updated_at TEXT NOT NULL,
      updated_by INTEGER NOT NULL REFERENCES users(id),
      UNIQUE (project_id, subtype, sequence),
      UNIQUE (project_id, human_id)
    );
    CREATE INDEX records_project_status ON records(project_id, status);

    CREATE TABLE record_trades (
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      trade_id INTEGER NOT NULL REFERENCES trades(id),
      PRIMARY KEY (record_id, trade_id)
    );
    CREATE INDEX record_trades_trade ON record_trades(trade_id);

    CREATE TABLE record_tags (
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (record_id, tag_id)
    );
    CREATE INDEX record_tags_tag ON record_tags(tag_id);

    CREATE TABLE record_locations (
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      location_id INTEGER NOT NULL REFERENCES location_nodes(id),
      PRIMARY KEY (record_id, location_id)
    );
    CREATE INDEX record_locations_location ON record_locations(location_id);

    -- "earlier must be done before later" (design §4.3).
    CREATE TABLE record_precedence (
      earlier_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      later_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      PRIMARY KEY (earlier_id, later_id),
      CHECK (earlier_id <> later_id)
    );
    CREATE INDEX record_precedence_later ON record_precedence(later_id);

    -- AUTOINCREMENT: an option id is never reused, so the activity log can never point to a different option.
    CREATE TABLE decision_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX decision_options_record ON decision_options(record_id);

    CREATE TABLE measurement_sets (
      id INTEGER PRIMARY KEY,
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      measured_by_id INTEGER REFERENCES people(id),
      phase TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX measurement_sets_record ON measurement_sets(record_id);

    CREATE TABLE measurement_rows (
      id INTEGER PRIMARY KEY,
      set_id INTEGER NOT NULL REFERENCES measurement_sets(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      item TEXT NOT NULL,
      quantity TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      note TEXT
    );
    CREATE INDEX measurement_rows_set ON measurement_rows(set_id);

    CREATE TABLE verifications (
      id INTEGER PRIMARY KEY,
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      checked_by_id INTEGER NOT NULL REFERENCES people(id),
      date TEXT NOT NULL,
      method TEXT NOT NULL,
      outcome TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id)
    );
    CREATE INDEX verifications_record ON verifications(record_id);

    CREATE TABLE log_entries (
      id INTEGER PRIMARY KEY,
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      event_at TEXT NOT NULL,
      text TEXT NOT NULL,
      private INTEGER NOT NULL DEFAULT 0 CHECK (private IN (0, 1)),
      logged_by INTEGER NOT NULL REFERENCES users(id),
      logged_at TEXT NOT NULL,
      edited_at TEXT
    );
    CREATE INDEX log_entries_record ON log_entries(record_id);

    -- Automatic, append-only (design §5.12). Values are JSON.
    CREATE TABLE activity (
      id INTEGER PRIMARY KEY,
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      at TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      field TEXT,
      old_value TEXT,
      new_value TEXT,
      detail TEXT
    );
    CREATE INDEX activity_record ON activity(record_id);
  `,
};
