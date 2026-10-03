# Plan 2 — Server Foundation Implementation Plan

> **Document type:** Implementation plan
> **Status:** Completed
> **Retention:** Historical — do not execute.
> **Implements:** `docs/designs/2026-10-02-v1-records-design.md` §3 (bilingual managed-list names), §9 (managed lists), §11.1–11.3 (stack, layout, data), §11.5 (owner login, sessions, request rules), §11.6 (hosting facts from the trial), §11.7 (backup function, pre-migration backup), §15 (seed data).
> **Depends on:** Plan 0 (GO, 2026-10-03), Plan 1 (merged, `2f5f860`).
> **Implemented by:** `d0e80fa..352b9bc` (first through last implementation commit, inclusive; documentation closeout follows).
> **Verified:** 2026-10-03 — `npm test`: 155 tests passed in 18 files; `npm run typecheck`: exit 0, no TypeScript diagnostics.
> **Merged to main:** 2026-10-03, in the merge commit containing this update.
> **Checklist note:** Preserved execution history. The checked steps record completion; historical snippets and expected failures are not current instructions.
> **Plan check:** 2026-10-03 — every file in this plan was materialised into a scratch clone of `main` with the Task 1 dependencies: `npm run typecheck` clean; `npm test` 18 files, 136 tests passed; every `git add` path stages without an ignore error; local server answered as in Task 10; the real seed produced the Task 11 output, and a second run refused with exit code 1. The clone and its seeded database were deleted.
> **Review:** 2026-10-03, second agent, on `6e259c3` — three findings, all reproduced and fixed: (1) the owner command now enforces the login form's username and password limits before writing anything, with the limits shared between both (Tasks 3, 5, 10); (2) `verifyPassword` accepts only hashes in exactly the stored format, so a malformed or altered hash never verifies (Task 3); (3) `.gitignore` un-ignores `.env.example` (Task 10 Step 5).
>
> **Historical execution instructions (do not execute):** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tick each box when its step is done.

**Goal:** A running Fastify/TypeScript server on SQLite with owner login, the managed-list APIs (projects, people, trades, zone types, tags, location tree) and a seed for Gennadi 822A — all test-first, runnable locally.

**Architecture:** `src/server` holds the HTTP app (`app.ts`), configuration, database access (better-sqlite3, migrations as TypeScript strings), owner authentication (scrypt passwords, hashed session tokens, login limiter) and one focused module per managed list (repository functions + routes). The managed-list input schemas (Zod) live in `src/domain/lists.ts`, so the browser can reuse them (design §11.2). Global hooks enforce the design's request rules: every state-changing request needs a matching `Origin` and a JSON body (multipart only where a route allows it), every `/api` route except health/login needs a session, and GET handlers never write. Tests drive the app in-process with Fastify `inject` against a temporary SQLite file.

**Tech Stack:** Node.js 24, TypeScript 5 (strict, ESM), Fastify 5, @fastify/cookie 11, better-sqlite3 13.0.3, Zod 4, Vitest 3, tsx 4 (dev runner), exceljs 4 (seed only).

**Hosting facts this plan must respect (Plan 0):**

- On Hetzner the app calls `server.listen()` **without arguments**; the platform supplies a Unix socket. Locally a `PORT` is used. (`src/server/main.ts`.)
- Requests arrive through Cloudflare. With `BEHIND_CLOUDFLARE=1` the visitor IP is read from `CF-Connecting-IP`. Because a request that bypasses Cloudflare could forge that header, the login limiter also applies a **global** cap.
- npm on the server runs install scripts only for packages listed in `allowScripts`; there is no C++ compiler. better-sqlite3 13 ships prebuilt binaries. Pin it exactly (`13.0.3`) to match the `allowScripts` key.
- Restart = stop the Node process; it restarts on the next request. `main.ts` handles `SIGTERM` by closing the server and the database.

**Closeout (2026-10-03):** No separate maintained Specification is warranted at this intermediate plan boundary. The roadmap assigns consolidated v1 specifications and Architecture reconciliation to Plan 6. The approved design remains the active implementation baseline through v1 delivery and reconciliation. Delivered behavior is evidenced by `src/server/`, `src/domain/lists.ts` and their tests; code and tests are not a normative Specification.

Task 10 verified local startup, health, request guards and SIGINT shutdown. Task 11 verified the real local seed: 19 people, 34 trades, 13 zone types, 25 tags and 93 locations; a repeat import refused with exit 1. No owner password was supplied. Production deployment remains Plan 6 work.

Final whole-branch review found no Critical or Important issues and judged the branch ready to merge. The controller independently confirmed 155 passing tests in 18 files, a clean typecheck and a CRLF-aware branch diff check. The branch remains unmerged.

**Nonblocking follow-ups from final review:**

- Before scheduled backups in Plan 6, make backup handle closing and temporary-file cleanup exception-safe. Add failure tests for backup verification and migration rollback.
- Optional test improvements cover exact configuration paths, blank tag names and final sigma through the API, and retired descendants and Greek names in location copies.
- Polish owner CLI cancellation so Ctrl+C at the password prompt exits without an uncaught `Cancelled` stack. Raw mode is already restored.
- Fix the CSV parser's dropped final single empty quoted field before reusing it beyond the known import sources. The specified multi-column inputs are unaffected.

The Task 1 audit reported four moderate development-dependency vulnerabilities across the Vitest/mocker and ExcelJS/uuid chains. They remain retained after review. The affected browser tooling is unused by these Node-only tests; ExcelJS uses uuid v4 without an output buffer, outside the affected v3/v5/v6 buffer paths. Reassess browser tooling in Plan 5. No dependency remediation is claimed.

**Decisions and deviations** (design §9.3 and §11.6 reconciled in Task 12):

1. **Input schemas live in `src/domain/lists.ts`** (design §11.2: shared Zod schemas). The server parses every request body with them.
2. **Tag names match ignoring accents and final sigma, as well as letter case.** Greek capitals drop their accents, so «ΠΕΤΡΑ» must match «Πέτρα». *Assumption — the owner may overrule.* Design §9.3 now records this rule.
3. **`CF-Connecting-IP` cannot be checked against Cloudflare's addresses inside the app**, because Hetzner's web server is the app's direct peer. The header is trusted when `BEHIND_CLOUDFLARE=1`, and the login limiter adds a global cap. Design §11.6 now records this behavior; restricting the origin to Cloudflare's address ranges is left to Plan 6.
4. **Projects are created only by seed scripts**, because §10 has no project screen.
5. **The location tree has a project root node** («Γεννάδι 822Α»), as §15 implies ("ticking the project root").
6. **A zone type can be deleted only while no location node uses it.** The design is silent on this.
7. **Greek names of zone types, villas, levels and spaces are proposals**, because the source sheets are English only. The owner can rename them in Lists (Plan 5). *Assumption.*
8. **Records arrive in Plan 3.** Until then, tag merge/delete and location delete have no record links to move or check; Plan 3 extends them (see "Hand-over to later plans").
9. **Owner creation/reset uses an immediate transaction.** Lookup, count and write are serialized across connections to preserve the approved one-owner invariant. Password hashing happens before the lock. This corrects the original Task 3 snippet's race.
10. **Content type uses exact normalized media-type comparison.** The guard rejects `application/json-extra`; the original prefix comparison accepted it. This enforces the design's JSON requirement.
11. **Logout requires a valid session.** The original Task 5 snippet exempted logout. Missing, invalid or expired sessions now return 401, consistent with design §11.5. Only login is exempt from the session rule for state-changing requests.

---

## File structure

| File | Responsibility |
|---|---|
| `src/domain/lists.ts` | Managed-list input schemas (Zod), the "at least one name" rule, the tag-name matching key |
| `src/server/config.ts` | Read environment: data folder, public origin, cookie security, Cloudflare mode, `PORT` |
| `src/server/errors.ts` | `HttpError` (status + stable error code) |
| `src/server/db/connection.ts` | Open SQLite with foreign keys and busy timeout |
| `src/server/db/migrations.ts` | Ordered migrations (SQL in TypeScript strings) |
| `src/server/db/migrate.ts` | Apply pending migrations; backup first when the database already has data |
| `src/server/db/backup.ts` | `VACUUM INTO` temp file → `integrity_check` → rename (shared with Plan 6 nightly backups) |
| `src/server/db/update.ts` | Update only the given columns of one project-scoped row |
| `src/server/db/sqlite-errors.ts` | Recognise unique-constraint violations |
| `src/server/auth/passwords.ts` | scrypt hash and verify |
| `src/server/auth/sessions.ts` | Create, find, delete sessions (token hash stored, 30-day absolute expiry) |
| `src/server/auth/users.ts` | Create the single owner or reset its password (reset ends all sessions) |
| `src/server/auth/login-limiter.ts` | Failed-login limits per address and globally |
| `src/server/http/client-ip.ts` | Visitor IP (Cloudflare-aware) |
| `src/server/http/params.ts` | Route parameter schemas |
| `src/server/http/guards.ts` | Origin/content-type hook, session hook, request typing |
| `src/server/routes/health.ts` | `GET /api/health` |
| `src/server/routes/auth.ts` | Login, logout, current user |
| `src/server/lists/projects.ts` | Projects (create for seed; list/get API; `requireProject`) |
| `src/server/lists/names.ts` | Server check of the "at least one name" rule (`name_required`) |
| `src/server/lists/people.ts` | People list |
| `src/server/lists/trades.ts` | Trades list |
| `src/server/lists/zone-types.ts` | Zone types |
| `src/server/lists/tags.ts` | Tags with rename / merge / delete rules |
| `src/server/lists/locations.ts` | Location tree: create, move, retire, delete subtree, copy branch |
| `src/server/app.ts` | Build the Fastify app: cookie plugin, guards, error handler, routes |
| `src/server/bootstrap.ts` | Load `.env` (local only); open the database and run migrations |
| `src/server/main.ts` | Entry point: config → database → migrations → app → listen; clean shutdown on SIGTERM |
| `src/server/seed/csv.ts` | Minimal CSV parser |
| `src/server/seed/gennadi-data.ts` | Static seed data (zone types, villa levels/spaces, tags) |
| `src/server/seed/gennadi.ts` | `seedGennadi`, people extraction, role mapping |
| `scripts/owner.ts` | CLI: create owner / reset password |
| `scripts/seed-gennadi.ts` | CLI: read the project's xlsx/CSV files and seed |
| `tests/server/helpers.ts` | Test context (temp data folder, app, login helper) |
| `tests/server/*.test.ts`, `tests/domain/lists.test.ts` | One test file per module/API |
| `.env.example` | Local development settings, copied to the git-ignored `.env` |

---

### Task 1: Dependencies and configuration

**Files:**

- Modify: `package.json` (dependencies, scripts, `allowScripts`)
- Replace: `tsconfig.json` (include `scripts/**/*.ts`)
- Create: `src/server/config.ts`
- Test: `tests/server/config.test.ts`

- [x] **Step 1: Install dependencies**

Run (repository root):

```bash
npm install fastify@5 @fastify/cookie@11 zod@4
npm install --save-exact better-sqlite3@13.0.3
npm install -D tsx@4 @types/better-sqlite3@7 exceljs@4
```

Expected: each command ends with `added N packages`; `package.json` lists `"better-sqlite3": "13.0.3"` (no caret).

- [x] **Step 2: Add scripts and allowScripts to package.json**

Add these entries to the existing `scripts` object, and add the top-level `allowScripts` object (keep everything else npm wrote):

```json
{
  "scripts": {
    "dev": "tsx watch src/server/main.ts",
    "start": "tsx src/server/main.ts",
    "owner": "tsx scripts/owner.ts",
    "seed:gennadi": "tsx scripts/seed-gennadi.ts"
  },
  "allowScripts": {
    "better-sqlite3@13.0.3": true
  }
}
```

- [x] **Step 3: Replace `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests", "scripts/**/*.ts", "vitest.config.ts"]
}
```

- [x] **Step 4: Write the failing test `tests/server/config.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/server/config';

describe('loadConfig (design §11.6)', () => {
  it('requires BUILTBASIS_DATA_DIR', () => {
    expect(() => loadConfig({})).toThrow('BUILTBASIS_DATA_DIR');
  });

  it('derives database and backup paths and local defaults', () => {
    const config = loadConfig({ BUILTBASIS_DATA_DIR: '/data' });
    expect(config.dbPath).toMatch(/builtbasis\.db$/);
    expect(config.backupsDir).toMatch(/backups$/);
    expect(config.publicOrigin).toBe('http://localhost:3000');
    expect(config.secureCookies).toBe(false);
    expect(config.behindCloudflare).toBe(false);
    expect(config.port).toBeNull();
  });

  it('uses the public origin, secure cookies and Cloudflare mode in production', () => {
    const config = loadConfig({
      BUILTBASIS_DATA_DIR: '/data',
      PUBLIC_BASE_URL: 'https://builtbasis.ktimanet.com/',
      BEHIND_CLOUDFLARE: '1',
      PORT: '3000',
    });
    expect(config.publicOrigin).toBe('https://builtbasis.ktimanet.com');
    expect(config.secureCookies).toBe(true);
    expect(config.behindCloudflare).toBe(true);
    expect(config.port).toBe('3000');
  });
});
```

- [x] **Step 5: Run to verify it fails**

Run: `npx vitest run tests/server/config.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/server/config"`.

- [x] **Step 6: Create `src/server/config.ts`**

```ts
import { join } from 'node:path';

export interface AppConfig {
  dataDir: string;
  dbPath: string;
  backupsDir: string;
  /** Scheme + host (+ port) that browsers send as Origin, e.g. https://builtbasis.ktimanet.com */
  publicOrigin: string;
  secureCookies: boolean;
  /** Read the visitor IP from CF-Connecting-IP (design §11.6). */
  behindCloudflare: boolean;
  /** PORT: a port number or a socket path. null = listen like Hetzner's example (no arguments). */
  port: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataDir = env.BUILTBASIS_DATA_DIR;
  if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');
  const publicOrigin = new URL(env.PUBLIC_BASE_URL ?? 'http://localhost:3000').origin;
  return {
    dataDir,
    dbPath: join(dataDir, 'builtbasis.db'),
    backupsDir: join(dataDir, 'backups'),
    publicOrigin,
    secureCookies: publicOrigin.startsWith('https://'),
    behindCloudflare: env.BEHIND_CLOUDFLARE === '1',
    port: env.PORT ?? null,
  };
}
```

- [x] **Step 7: Run to verify it passes**

Run: `npx vitest run tests/server/config.test.ts` → PASS (3 tests). Then `npm run typecheck` → no output.

- [x] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/server/config.ts tests/server/config.test.ts
git commit -m "feat(server): dependencies and configuration"
```

### Task 2: Database, migrations and backups

**Files:**

- Create: `src/server/db/connection.ts`, `src/server/db/migrations.ts`, `src/server/db/migrate.ts`, `src/server/db/backup.ts`, `src/server/db/update.ts`, `src/server/db/sqlite-errors.ts`
- Test: `tests/server/db.test.ts`

- [x] **Step 1: Write the failing test `tests/server/db.test.ts`**

```ts
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { backupDatabase } from '../../src/server/db/backup';
import { openDatabase } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { MIGRATIONS } from '../../src/server/db/migrations';

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'builtbasis-db-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('database (design §11.3, §11.7)', () => {
  it('turns on foreign keys', () => {
    const db = openDatabase(':memory:');
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    db.close();
  });

  it('applies all migrations once, without a backup on an empty database', () => {
    const dir = tempDir();
    const backupsDir = join(dir, 'backups');
    const db = openDatabase(join(dir, 'builtbasis.db'));
    expect(migrate(db, { backupsDir })).toEqual(MIGRATIONS.map((migration) => migration.id));
    expect(migrate(db, { backupsDir })).toEqual([]);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").pluck().all();
    expect(tables).toEqual(
      expect.arrayContaining([
        'schema_migrations',
        'users',
        'sessions',
        'projects',
        'people',
        'trades',
        'zone_types',
        'tags',
        'location_nodes',
      ]),
    );
    db.close();
    expect(() => readdirSync(backupsDir)).toThrow();
  });

  it('backs up an existing database before applying new migrations', () => {
    const dir = tempDir();
    const backupsDir = join(dir, 'backups');
    const db = openDatabase(join(dir, 'builtbasis.db'));
    migrate(db, { backupsDir });
    const applied = migrate(db, {
      backupsDir,
      migrations: [...MIGRATIONS, { id: '9999_probe', sql: 'CREATE TABLE probe (id INTEGER PRIMARY KEY)' }],
    });
    expect(applied).toEqual(['9999_probe']);
    const backups = readdirSync(backupsDir);
    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatch(/^builtbasis-pre-migration-.*\.db$/);
    db.close();
  });

  it('gives a backup its final name only after the integrity check passes', () => {
    const dir = tempDir();
    const backupsDir = join(dir, 'backups');
    const db = openDatabase(join(dir, 'builtbasis.db'));
    migrate(db, { backupsDir });
    const path = backupDatabase(db, backupsDir, 'nightly', new Date('2026-10-03T02:00:00Z'));
    expect(path).toMatch(/builtbasis-nightly-2026-10-03T02-00-00-000Z\.db$/);
    expect(readdirSync(backupsDir).some((name) => name.endsWith('.tmp'))).toBe(false);
    const copy = openDatabase(path);
    expect(copy.prepare('SELECT COUNT(*) FROM schema_migrations').pluck().get()).toBe(MIGRATIONS.length);
    copy.close();
    db.close();
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/db.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/server/db/backup"`.

- [x] **Step 3: Create `src/server/db/connection.ts`**

```ts
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = Database.Database;

/** Opens SQLite with foreign keys on. The default rollback journal is kept (single file, design §11.9). */
export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}
```

- [x] **Step 4: Create `src/server/db/migrations.ts`**

```ts
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
];
```

- [x] **Step 5: Create `src/server/db/backup.ts`**

```ts
import Database from 'better-sqlite3';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './connection';

/**
 * Consistent copy with VACUUM INTO, written under a temporary name and integrity-checked
 * before it gets its final name, so an interrupted or damaged backup never looks complete (design §11.7).
 */
export function backupDatabase(db: Db, backupsDir: string, label: string, now: Date = new Date()): string {
  mkdirSync(backupsDir, { recursive: true });
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const finalPath = join(backupsDir, `builtbasis-${label}-${stamp}.db`);
  const tmpPath = `${finalPath}.tmp`;
  db.prepare('VACUUM INTO ?').run(tmpPath);
  const check = new Database(tmpPath, { readonly: true });
  const result = check.pragma('integrity_check', { simple: true });
  check.close();
  if (result !== 'ok') {
    rmSync(tmpPath, { force: true });
    throw new Error(`Backup integrity check failed: ${String(result)}`);
  }
  renameSync(tmpPath, finalPath);
  return finalPath;
}
```

- [x] **Step 6: Create `src/server/db/migrate.ts`**

```ts
import { backupDatabase } from './backup';
import type { Db } from './connection';
import { MIGRATIONS, type Migration } from './migrations';

export interface MigrateOptions {
  backupsDir: string;
  migrations?: readonly Migration[];
  now?: Date;
}

/** Applies pending migrations, each in its own transaction; backs up first when the database already has data. */
export function migrate(db: Db, options: MigrateOptions): string[] {
  const migrations = options.migrations ?? MIGRATIONS;
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set(db.prepare('SELECT id FROM schema_migrations').pluck().all() as string[]);
  const pending = migrations.filter((migration) => !applied.has(migration.id));
  if (pending.length === 0) return [];

  const tablesWithData = db
    .prepare(
      "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name <> 'schema_migrations' AND name NOT LIKE 'sqlite_%'",
    )
    .pluck()
    .get() as number;
  if (tablesWithData > 0) backupDatabase(db, options.backupsDir, 'pre-migration', options.now);

  const appliedAt = (options.now ?? new Date()).toISOString();
  const record = db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
  for (const migration of pending) {
    db.transaction(() => {
      db.exec(migration.sql);
      record.run(migration.id, appliedAt);
    })();
  }
  return pending.map((migration) => migration.id);
}
```

- [x] **Step 7: Create `src/server/db/update.ts`**

```ts
import type { Db } from './connection';

/**
 * Updates the given columns of one row in a project-scoped table. Undefined values are left unchanged.
 * Table and column names come from code, never from request input.
 */
export function updateColumns(
  db: Db,
  table: string,
  projectId: number,
  id: number,
  values: Record<string, unknown>,
): void {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;
  const assignments = entries.map(([column]) => `${column} = ?`).join(', ');
  db.prepare(`UPDATE ${table} SET ${assignments} WHERE project_id = ? AND id = ?`).run(
    ...entries.map(([, value]) => value),
    projectId,
    id,
  );
}
```

- [x] **Step 8: Create `src/server/db/sqlite-errors.ts`**

```ts
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}
```

- [x] **Step 9: Run to verify it passes**

Run: `npx vitest run tests/server/db.test.ts` → PASS (4 tests). Then `npm run typecheck` → no output.

- [x] **Step 10: Commit**

```bash
git add src/server/db tests/server/db.test.ts
git commit -m "feat(server): SQLite connection, migrations and verified backups"
```

### Task 3: Passwords, sessions and the owner account

**Files:**

- Create: `src/server/auth/passwords.ts`, `src/server/auth/sessions.ts`, `src/server/auth/users.ts`
- Test: `tests/server/passwords.test.ts`, `tests/server/sessions.test.ts`

- [x] **Step 1: Write the failing test `tests/server/passwords.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { hashPassword, MAX_PASSWORD_LENGTH, verifyPassword } from '../../src/server/auth/passwords';

describe('passwords (design §11.5)', () => {
  it('hashes with scrypt and verifies', () => {
    const hash = hashPassword('a long enough password');
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(verifyPassword('a long enough password', hash)).toBe(true);
    expect(verifyPassword('the wrong password', hash)).toBe(false);
  });

  it('salts every hash', () => {
    expect(hashPassword('the same long password')).not.toBe(hashPassword('the same long password'));
  });

  it('accepts 12 to 200 characters, the same limit as the login form', () => {
    expect(() => hashPassword('short')).toThrow(RangeError);
    expect(() => hashPassword('x'.repeat(MAX_PASSWORD_LENGTH + 1))).toThrow(RangeError);
    const longest = 'x'.repeat(MAX_PASSWORD_LENGTH);
    expect(verifyPassword(longest, hashPassword(longest))).toBe(true);
  });

  it('never verifies against a malformed or altered stored hash', () => {
    const password = 'a long enough password';
    const good = hashPassword(password);
    const [, , , , salt = '', hash = ''] = good.split('$');
    for (const stored of [
      'not-a-hash',
      `scrypt$16384$8$1$${salt}$`, // no hash
      `scrypt$16384$8$1$${salt}$!!!!`, // decodes to zero bytes
      `scrypt$16384$8$1$${salt}$${hash.slice(0, 8)}`, // truncated hash
      `scrypt$16384$8$1$$${hash}`, // no salt
      `scrypt$16383$8$1$${salt}$${hash}`, // parameters scrypt rejects
      `scrypt$1024$8$1$${salt}$${hash}`, // other parameters
      `${good}$extra`,
    ]) {
      expect(verifyPassword(password, stored), stored).toBe(false);
    }
  });
});
```

- [x] **Step 2: Write the failing test `tests/server/sessions.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_PASSWORD_LENGTH, verifyPassword } from '../../src/server/auth/passwords';
import { createSession, deleteSession, findSessionUser, SESSION_TTL_MS } from '../../src/server/auth/sessions';
import { findUserByUsername, MAX_USERNAME_LENGTH, setOwnerPassword } from '../../src/server/auth/users';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';

let db: Db;
let userId: number;

beforeEach(() => {
  db = openDatabase(':memory:');
  migrate(db, { backupsDir: 'unused' });
  userId = setOwnerPassword(db, 'owner', 'correct horse battery').userId;
});

describe('sessions and the owner account (design §11.5)', () => {
  it('stores only a hash of the session token', () => {
    const { token } = createSession(db, userId);
    const stored = db.prepare('SELECT token_hash FROM sessions').pluck().all() as string[];
    expect(stored).toHaveLength(1);
    expect(stored[0]).not.toBe(token);
    expect(stored[0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('finds the user for a valid token and nothing for an unknown one', () => {
    const { token } = createSession(db, userId);
    expect(findSessionUser(db, token)).toEqual({ userId, username: 'owner' });
    expect(findSessionUser(db, 'not-a-token')).toBeNull();
  });

  it('expires a session 30 days after login', () => {
    const start = new Date('2026-10-03T00:00:00Z');
    const { token, expiresAt } = createSession(db, userId, start);
    expect(expiresAt.getTime() - start.getTime()).toBe(SESSION_TTL_MS);
    expect(findSessionUser(db, token, new Date(start.getTime() + SESSION_TTL_MS - 1))).not.toBeNull();
    expect(findSessionUser(db, token, expiresAt)).toBeNull();
  });

  it('logout deletes the session', () => {
    const { token } = createSession(db, userId);
    deleteSession(db, token);
    expect(findSessionUser(db, token)).toBeNull();
  });

  it('a password reset ends every session', () => {
    const first = createSession(db, userId);
    const second = createSession(db, userId);
    expect(setOwnerPassword(db, 'owner', 'another long password')).toEqual({
      userId,
      created: false,
      sessionsRemoved: 2,
    });
    expect(findSessionUser(db, first.token)).toBeNull();
    expect(findSessionUser(db, second.token)).toBeNull();
  });

  it('allows exactly one owner account', () => {
    expect(() => setOwnerPassword(db, 'someone-else', 'yet another long password')).toThrow('one account');
  });

  it('a rejected password reset keeps the previous password and sessions', () => {
    const session = createSession(db, userId);
    expect(() => setOwnerPassword(db, 'owner', 'x'.repeat(MAX_PASSWORD_LENGTH + 1))).toThrow(RangeError);
    expect(() => setOwnerPassword(db, 'owner', 'short')).toThrow(RangeError);
    expect(findSessionUser(db, session.token)).not.toBeNull();
    expect(verifyPassword('correct horse battery', findUserByUsername(db, 'owner')?.passwordHash ?? '')).toBe(true);
  });

  it('refuses a username the login form would not accept', () => {
    for (const username of ['', 'x'.repeat(MAX_USERNAME_LENGTH + 1)]) {
      expect(() => setOwnerPassword(db, username, 'a long enough password'), username).toThrow(RangeError);
    }
  });
});
```

- [x] **Step 3: Run to verify they fail**

Run: `npx vitest run tests/server/passwords.test.ts tests/server/sessions.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/server/auth/passwords"` (and `sessions`).

- [x] **Step 4: Create `src/server/auth/passwords.ts`**

```ts
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 12;
/** Also the login form's limit, so every password the owner command accepts can log in. */
export const MAX_PASSWORD_LENGTH = 200;

/** scrypt with a random salt, stored as scrypt$N$r$p$salt$hash (base64). */
export function hashPassword(password: string): string {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new RangeError(`Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters`);
  }
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$');
}

/** Canonical base64 of exactly `length` bytes, or null. */
function decodeExact(text: string | undefined, length: number): Buffer | null {
  if (text === undefined) return null;
  const bytes = Buffer.from(text, 'base64');
  return bytes.length === length && bytes.toString('base64') === text ? bytes : null;
}

/**
 * Verifies only hashes in exactly the format hashPassword writes: same parameters, salt and key lengths.
 * A malformed or altered stored value never verifies. Changing the parameters later therefore needs
 * a password reset (`npm run owner`).
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || parts.slice(1, 4).join('$') !== `${N}$${R}$${P}`) return false;
  const salt = decodeExact(parts[4], SALT_LENGTH);
  const expected = decodeExact(parts[5], KEY_LENGTH);
  if (salt === null || expected === null) return false;
  return timingSafeEqual(scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P }), expected);
}
```

- [x] **Step 5: Create `src/server/auth/sessions.ts`**

```ts
import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '../db/connection';

/** Absolute expiry: 30 days after login (design §11.5). */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  userId: number;
  username: string;
}

/** Only this hash is stored, so a database or backup never contains a usable session. */
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export function createSession(db: Db, userId: number, now: Date = new Date()): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    now.toISOString(),
    expiresAt.toISOString(),
  );
  return { token, expiresAt };
}

/** Read-only: used on every request, including GET, which must never write. */
export function findSessionUser(db: Db, token: string, now: Date = new Date()): SessionUser | null {
  const row = db
    .prepare(
      `SELECT u.id AS userId, u.username AS username, s.expires_at AS expiresAt
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as { userId: number; username: string; expiresAt: string } | undefined;
  if (!row || row.expiresAt <= now.toISOString()) return null;
  return { userId: row.userId, username: row.username };
}

export function deleteSession(db: Db, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function deleteUserSessions(db: Db, userId: number): number {
  return db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId).changes;
}

export function deleteExpiredSessions(db: Db, now: Date = new Date()): number {
  return db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString()).changes;
}
```

- [x] **Step 6: Create `src/server/auth/users.ts`**

```ts
import type { Db } from '../db/connection';
import { hashPassword } from './passwords';
import { deleteUserSessions } from './sessions';

/** Also the login form's limit, so every account the owner command creates can log in. */
export const MAX_USERNAME_LENGTH = 100;

export interface StoredUser {
  id: number;
  username: string;
  passwordHash: string;
}

export function findUserByUsername(db: Db, username: string): StoredUser | null {
  const row = db
    .prepare('SELECT id, username, password_hash AS passwordHash FROM users WHERE username = ?')
    .get(username) as StoredUser | undefined;
  return row ?? null;
}

/**
 * Creates the single owner account, or resets its password. A reset ends every session (design §11.5).
 * Used only by the server-side command `npm run owner` — there is no sign-up or reset screen.
 */
export function setOwnerPassword(
  db: Db,
  username: string,
  password: string,
  now: Date = new Date(),
): { userId: number; created: boolean; sessionsRemoved: number } {
  // Both checks run before anything is written, so a rejected reset changes nothing.
  if (username.length === 0 || username.length > MAX_USERNAME_LENGTH) {
    throw new RangeError(`Username must be 1 to ${MAX_USERNAME_LENGTH} characters`);
  }
  const passwordHash = hashPassword(password);
  // Reserve the write lock before checking ownership, including on first creation.
  return db.transaction(() => {
    const existing = findUserByUsername(db, username);
    if (existing) {
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
        passwordHash,
        now.toISOString(),
        existing.id,
      );
      return { userId: existing.id, created: false, sessionsRemoved: deleteUserSessions(db, existing.id) };
    }
    const users = db.prepare('SELECT COUNT(*) FROM users').pluck().get() as number;
    if (users > 0) throw new Error('An owner account already exists; v1 supports exactly one account');
    const info = db
      .prepare('INSERT INTO users (username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run(username, passwordHash, now.toISOString(), now.toISOString());
    return { userId: Number(info.lastInsertRowid), created: true, sessionsRemoved: 0 };
  }).immediate();
}
```

Review correction: Hash before acquiring the lock, then perform owner lookup, count, creation or reset in one immediate transaction. Tests also cover deterministic competing creation through two SQLite connections, expired-session cleanup and reset rollback.

- [x] **Step 7: Run to verify they pass**

Run: `npx vitest run tests/server/passwords.test.ts tests/server/sessions.test.ts` → PASS (4 + 11 tests). Then `npm run typecheck`.

- [x] **Step 8: Commit**

```bash
git add src/server/auth tests/server/passwords.test.ts tests/server/sessions.test.ts
git commit -m "feat(server): scrypt passwords, hashed sessions and the owner account"
```

### Task 4: Login limiter and visitor IP

**Files:**

- Create: `src/server/auth/login-limiter.ts`, `src/server/http/client-ip.ts`
- Test: `tests/server/login-limiter.test.ts`

- [x] **Step 1: Write the failing test `tests/server/login-limiter.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { LoginLimiter } from '../../src/server/auth/login-limiter';

const limits = { windowMs: 1000, maxPerKey: 3, maxGlobal: 5 };

describe('login limiter (design §11.5)', () => {
  it('blocks an address after the per-address limit within the window', () => {
    const limiter = new LoginLimiter(limits);
    for (let i = 0; i < 3; i += 1) {
      expect(limiter.isBlocked('a', i)).toBe(false);
      limiter.recordFailure('a', i);
    }
    expect(limiter.isBlocked('a', 3)).toBe(true);
    expect(limiter.isBlocked('b', 3)).toBe(false);
  });

  it('forgets failures once the window has passed', () => {
    const limiter = new LoginLimiter(limits);
    for (let i = 0; i < 3; i += 1) limiter.recordFailure('a', 0);
    expect(limiter.isBlocked('a', 999)).toBe(true);
    expect(limiter.isBlocked('a', 1001)).toBe(false);
  });

  it('caps failures across all addresses', () => {
    const limiter = new LoginLimiter(limits);
    for (let i = 0; i < 5; i += 1) limiter.recordFailure(`address-${i}`, 0);
    expect(limiter.isBlocked('a-new-address', 1)).toBe(true);
  });

  it('a successful login clears that address', () => {
    const limiter = new LoginLimiter(limits);
    limiter.recordFailure('a', 0);
    limiter.recordFailure('a', 0);
    limiter.recordSuccess('a');
    limiter.recordFailure('a', 0);
    expect(limiter.isBlocked('a', 0)).toBe(false);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/login-limiter.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/server/auth/login-limiter"`.

- [x] **Step 3: Create `src/server/auth/login-limiter.ts`**

```ts
export interface LoginLimits {
  windowMs: number;
  maxPerKey: number;
  maxGlobal: number;
}

/** 5 failures per address and 20 overall per 15 minutes. The global cap defeats rotating forged addresses. */
export const DEFAULT_LOGIN_LIMITS: LoginLimits = { windowMs: 15 * 60 * 1000, maxPerKey: 5, maxGlobal: 20 };

/** In-memory failed-login limiter (single process; a restart resets it). */
export class LoginLimiter {
  private readonly failures = new Map<string, number[]>();
  private global: number[] = [];

  constructor(private readonly limits: LoginLimits) {}

  isBlocked(key: string, now: number): boolean {
    this.prune(now);
    return (this.failures.get(key)?.length ?? 0) >= this.limits.maxPerKey || this.global.length >= this.limits.maxGlobal;
  }

  recordFailure(key: string, now: number): void {
    this.prune(now);
    this.failures.set(key, [...(this.failures.get(key) ?? []), now]);
    this.global.push(now);
  }

  recordSuccess(key: string): void {
    this.failures.delete(key);
  }

  private prune(now: number): void {
    const since = now - this.limits.windowMs;
    this.global = this.global.filter((time) => time > since);
    for (const [key, times] of this.failures) {
      const kept = times.filter((time) => time > since);
      if (kept.length > 0) this.failures.set(key, kept);
      else this.failures.delete(key);
    }
  }
}
```

- [x] **Step 4: Create `src/server/http/client-ip.ts`**

```ts
import type { FastifyRequest } from 'fastify';
import type { AppConfig } from '../config';

/**
 * Visitor IP. Behind Cloudflare (design §11.6) it comes from CF-Connecting-IP. A request that bypasses
 * Cloudflare could forge that header, which is why the login limiter also has a global cap.
 */
export function clientIp(request: FastifyRequest, config: Pick<AppConfig, 'behindCloudflare'>): string {
  if (config.behindCloudflare) {
    const header = request.headers['cf-connecting-ip'];
    if (typeof header === 'string' && header.trim() !== '') return header.trim();
  }
  return request.ip;
}
```

- [x] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/server/login-limiter.test.ts` → PASS (4 tests). Then `npm run typecheck`.

- [x] **Step 6: Commit**

```bash
git add src/server/auth/login-limiter.ts src/server/http/client-ip.ts tests/server/login-limiter.test.ts
git commit -m "feat(server): login limiter and Cloudflare-aware visitor IP"
```

### Task 5: HTTP app, request rules and authentication API

Implementation refinement: logout requires a valid session, consistent with design §11.5. Only health and login are public. Content types are compared as exact normalized media types after removing parameters, so prefixes such as application/json-extra are rejected.

**Files:**

- Create: `src/server/errors.ts`, `src/server/http/params.ts`, `src/server/http/guards.ts`, `src/server/routes/health.ts`, `src/server/routes/auth.ts`, `src/server/lists/projects.ts`, `src/server/app.ts`
- Create: `tests/server/helpers.ts`
- Test: `tests/server/auth-api.test.ts`

- [x] **Step 1: Create the test helpers `tests/server/helpers.ts`**

```ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server/app';
import type { LoginLimiter } from '../../src/server/auth/login-limiter';
import { setOwnerPassword } from '../../src/server/auth/users';
import { loadConfig, type AppConfig } from '../../src/server/config';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { SESSION_COOKIE } from '../../src/server/http/guards';

export interface TestContext {
  app: FastifyInstance;
  db: Db;
  config: AppConfig;
  origin: string;
  close: () => Promise<void>;
}

export const OWNER = { username: 'owner', password: 'correct horse battery staple' } as const;

export async function makeContext(
  options: { publicBaseUrl?: string; behindCloudflare?: boolean; limiter?: LoginLimiter } = {},
): Promise<TestContext> {
  const dataDir = mkdtempSync(join(tmpdir(), 'builtbasis-test-'));
  const config = loadConfig({
    BUILTBASIS_DATA_DIR: dataDir,
    PUBLIC_BASE_URL: options.publicBaseUrl ?? 'http://localhost:3000',
    ...(options.behindCloudflare ? { BEHIND_CLOUDFLARE: '1' } : {}),
  });
  const db = openDatabase(config.dbPath);
  migrate(db, { backupsDir: config.backupsDir });
  const app = await buildApp({ config, db, limiter: options.limiter });
  return {
    app,
    db,
    config,
    origin: config.publicOrigin,
    close: async () => {
      await app.close();
      db.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

/** Creates the owner account, logs in and returns the Cookie header value. */
export async function loginAsOwner(ctx: TestContext): Promise<string> {
  setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { origin: ctx.origin },
    payload: { ...OWNER },
  });
  const cookie = res.cookies.find((candidate) => candidate.name === SESSION_COOKIE);
  if (!cookie) throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  return `${SESSION_COOKIE}=${cookie.value}`;
}

/** A state-changing owner request: matching Origin, session cookie, JSON body. */
export function send(ctx: TestContext, cookie: string, method: 'POST' | 'PATCH' | 'DELETE', url: string, payload: object = {}) {
  return ctx.app.inject({ method, url, headers: { origin: ctx.origin, cookie }, payload });
}

export function get(ctx: TestContext, cookie: string, url: string) {
  return ctx.app.inject({ method: 'GET', url, headers: { cookie } });
}
```

- [x] **Step 2: Write the failing test `tests/server/auth-api.test.ts`**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { setOwnerPassword } from '../../src/server/auth/users';
import { get, loginAsOwner, makeContext, OWNER, type TestContext } from './helpers';

let ctx: TestContext;
afterEach(async () => {
  await ctx.close();
});

function login(body: object, headers: Record<string, string> = {}) {
  return ctx.app.inject({ method: 'POST', url: '/api/auth/login', headers: { origin: ctx.origin, ...headers }, payload: body });
}
const wrong = { username: OWNER.username, password: 'not the right password' };

describe('authentication and request rules (design §11.5)', () => {
  it('health is public', async () => {
    ctx = await makeContext();
    const res = await ctx.app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('login sets a host-only, HttpOnly, SameSite=Lax session cookie', async () => {
    ctx = await makeContext();
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    const res = await login({ ...OWNER });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ username: 'owner' });
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/^bb_session=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Domain=');
    expect(cookie).not.toContain('Secure');
  });

  it('marks the cookie Secure when the public URL is https', async () => {
    ctx = await makeContext({ publicBaseUrl: 'https://builtbasis.example' });
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    expect(String((await login({ ...OWNER })).headers['set-cookie'])).toContain('Secure');
  });

  it('rejects a wrong password and an unknown user alike', async () => {
    ctx = await makeContext();
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    for (const body of [wrong, { username: 'nobody', password: OWNER.password }]) {
      const res = await login(body);
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'invalid_credentials' });
    }
  });

  it('blocks an address after 5 failed attempts, even with the right password', async () => {
    ctx = await makeContext();
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    for (let i = 0; i < 5; i += 1) await login(wrong);
    const res = await login({ ...OWNER });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: 'too_many_attempts' });
  });

  it('behind Cloudflare, counts failures per CF-Connecting-IP', async () => {
    ctx = await makeContext({ behindCloudflare: true });
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    for (let i = 0; i < 5; i += 1) await login(wrong, { 'cf-connecting-ip': '203.0.113.1' });
    expect((await login({ ...OWNER }, { 'cf-connecting-ip': '203.0.113.1' })).statusCode).toBe(429);
    expect((await login({ ...OWNER }, { 'cf-connecting-ip': '203.0.113.2' })).statusCode).toBe(200);
  });

  it('caps failed attempts globally, so rotating addresses does not help', async () => {
    ctx = await makeContext({ behindCloudflare: true });
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    for (let i = 0; i < 20; i += 1) await login(wrong, { 'cf-connecting-ip': `198.51.100.${i}` });
    expect((await login({ ...OWNER }, { 'cf-connecting-ip': '192.0.2.1' })).statusCode).toBe(429);
  });

  it('a valid login needs no existing session; logout ends the session', async () => {
    ctx = await makeContext();
    const cookie = await loginAsOwner(ctx);
    expect((await get(ctx, cookie, '/api/auth/me')).json()).toEqual({ username: 'owner' });
    const out = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: ctx.origin, cookie },
      payload: {},
    });
    expect(out.statusCode).toBe(200);
    expect((await get(ctx, cookie, '/api/auth/me')).statusCode).toBe(401);
  });

  it('rejects owner data changes without a session', async () => {
    ctx = await makeContext();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/projects/1/people',
      headers: { origin: ctx.origin },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('rejects state-changing requests with a wrong or missing Origin, including login', async () => {
    ctx = await makeContext();
    const cookie = await loginAsOwner(ctx);
    const wrongOrigin = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: 'https://evil.example', cookie },
      payload: {},
    });
    expect(wrongOrigin.statusCode).toBe(403);
    expect(wrongOrigin.json()).toEqual({ error: 'origin_rejected' });
    const noOrigin = await ctx.app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie }, payload: {} });
    expect(noOrigin.statusCode).toBe(403);
    const loginNoOrigin = await ctx.app.inject({ method: 'POST', url: '/api/auth/login', payload: { ...OWNER } });
    expect(loginNoOrigin.statusCode).toBe(403);
  });

  it('rejects state-changing requests that are not JSON', async () => {
    ctx = await makeContext();
    const cookie = await loginAsOwner(ctx);
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: ctx.origin, cookie, 'content-type': 'text/plain' },
      payload: 'logout',
    });
    expect(res.statusCode).toBe(415);
    expect(res.json()).toEqual({ error: 'unsupported_content_type' });
  });

  it('GET requests never change the database', async () => {
    ctx = await makeContext();
    const cookie = await loginAsOwner(ctx);
    const changes = () => ctx.db.prepare('SELECT total_changes()').pluck().get();
    const before = changes();
    await get(ctx, cookie, '/api/auth/me');
    await get(ctx, cookie, '/api/projects');
    await get(ctx, cookie, '/api/health');
    expect(changes()).toBe(before);
  });
});
```

- [x] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/server/auth-api.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/server/app"`.

- [x] **Step 4: Create `src/server/errors.ts`**

```ts
/** An error with an HTTP status and a stable, machine-readable code; sent as { error: code, details? }. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = 'HttpError';
  }
}
```

- [x] **Step 5: Create `src/server/http/params.ts`**

```ts
import { z } from 'zod';

export const ProjectParams = z.object({ projectId: z.coerce.number().int().positive() });
export const ItemParams = z.object({
  projectId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});
```

- [x] **Step 6: Create `src/server/http/guards.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { findSessionUser, type SessionUser } from '../auth/sessions';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';

export const SESSION_COOKIE = 'bb_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_API_ROUTES = new Set(['/api/health', '/api/auth/login']);

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
  interface FastifyContextConfig {
    /** Set on upload routes (Plan 4) to accept multipart/form-data instead of JSON. */
    multipart?: boolean;
  }
}

/**
 * Request rules (design §11.5):
 * - every state-changing request needs Origin = the public origin and a JSON body
 *   (multipart only on routes that allow it);
 * - every /api route except health and login needs a valid session;
 * - session lookup is read-only, so GET requests never write.
 */
export function registerGuards(app: FastifyInstance, config: AppConfig, db: Db): void {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request) => {
    if (SAFE_METHODS.has(request.method)) return;
    if (request.headers.origin !== config.publicOrigin) throw new HttpError(403, 'origin_rejected');
    const contentType = (request.headers['content-type']?.split(';', 1)[0] ?? '').trim().toLowerCase();
    const isJson = contentType === 'application/json';
    const isAllowedMultipart =
      contentType === 'multipart/form-data' && request.routeOptions.config?.multipart === true;
    if (!isJson && !isAllowedMultipart) throw new HttpError(415, 'unsupported_content_type');
  });

  app.addHook('preHandler', async (request) => {
    const token = request.cookies[SESSION_COOKIE];
    request.user = token ? findSessionUser(db, token) : null;
    const route = request.routeOptions.url ?? request.url;
    if (!route.startsWith('/api/') || PUBLIC_API_ROUTES.has(route)) return;
    if (request.user === null) throw new HttpError(401, 'unauthenticated');
  });
}
```

- [x] **Step 7: Create `src/server/routes/health.ts`**

```ts
import type { FastifyInstance } from 'fastify';

/** Public liveness check. Reveals nothing about versions or paths. */
export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/api/health', async () => ({ ok: true }));
}
```

- [x] **Step 8: Create `src/server/routes/auth.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { LoginLimiter } from '../auth/login-limiter';
import { hashPassword, MAX_PASSWORD_LENGTH, verifyPassword } from '../auth/passwords';
import { createSession, deleteExpiredSessions, deleteSession } from '../auth/sessions';
import { findUserByUsername, MAX_USERNAME_LENGTH } from '../auth/users';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { clientIp } from '../http/client-ip';
import { SESSION_COOKIE } from '../http/guards';

/** The same limits as the owner command, so every account it creates can log in. */
const LoginBody = z.strictObject({
  username: z.string().min(1).max(MAX_USERNAME_LENGTH),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

export function registerAuthRoutes(
  app: FastifyInstance,
  deps: { config: AppConfig; db: Db; limiter: LoginLimiter },
): void {
  const { config, db, limiter } = deps;
  // Verifying unknown users against a dummy hash keeps both failure cases equally slow.
  const dummyHash = hashPassword('builtbasis-dummy-password');

  app.post('/api/auth/login', async (request, reply) => {
    const ip = clientIp(request, config);
    const now = Date.now();
    if (limiter.isBlocked(ip, now)) throw new HttpError(429, 'too_many_attempts');
    const body = LoginBody.parse(request.body);
    const user = findUserByUsername(db, body.username);
    const passwordOk = verifyPassword(body.password, user?.passwordHash ?? dummyHash);
    if (user === null || !passwordOk) {
      limiter.recordFailure(ip, now);
      throw new HttpError(401, 'invalid_credentials');
    }
    limiter.recordSuccess(ip);
    deleteExpiredSessions(db);
    const session = createSession(db, user.id);
    reply.setCookie(SESSION_COOKIE, session.token, {
      path: '/',
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: 'lax',
      expires: session.expiresAt,
    });
    return { username: user.username };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) deleteSession(db, token);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (request) => {
    if (request.user === null) throw new HttpError(401, 'unauthenticated');
    return { username: request.user.username };
  });
}
```

- [x] **Step 9: Create `src/server/lists/projects.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ProjectParams } from '../http/params';

export interface Project {
  id: number;
  code: string;
  name: string;
  createdAt: string;
}

const SELECT = 'SELECT id, code, name, created_at AS createdAt FROM projects';

/** Projects are created by seed scripts only; v1 has no project screen (design §10). */
export function createProject(db: Db, input: { code: string; name: string }, now: Date = new Date()): Project {
  const info = db
    .prepare('INSERT INTO projects (code, name, created_at) VALUES (?, ?, ?)')
    .run(input.code, input.name, now.toISOString());
  return requireProject(db, Number(info.lastInsertRowid));
}

export function findProjectByCode(db: Db, code: string): Project | null {
  return (db.prepare(`${SELECT} WHERE code = ?`).get(code) as Project | undefined) ?? null;
}

export function listProjects(db: Db): Project[] {
  return db.prepare(`${SELECT} ORDER BY id`).all() as Project[];
}

export function requireProject(db: Db, projectId: number): Project {
  const project = db.prepare(`${SELECT} WHERE id = ?`).get(projectId) as Project | undefined;
  if (!project) throw new HttpError(404, 'project_not_found');
  return project;
}

export function registerProjectRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects', async () => listProjects(db));
  app.get('/api/projects/:projectId', async (request) =>
    requireProject(db, ProjectParams.parse(request.params).projectId),
  );
}
```

- [x] **Step 10: Create `src/server/app.ts`**

```ts
import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { DEFAULT_LOGIN_LIMITS, LoginLimiter } from './auth/login-limiter';
import type { AppConfig } from './config';
import type { Db } from './db/connection';
import { HttpError } from './errors';
import { registerGuards } from './http/guards';
import { registerProjectRoutes } from './lists/projects';
import { registerAuthRoutes } from './routes/auth';
import { registerHealthRoutes } from './routes/health';

export interface AppDeps {
  config: AppConfig;
  db: Db;
  /** Tests may pass their own limiter; the server uses the defaults. */
  limiter?: LoginLimiter;
  logger?: boolean;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { config, db } = deps;
  const app = Fastify({ logger: deps.logger ?? false, bodyLimit: 1024 * 1024 });
  await app.register(cookie);
  registerGuards(app, config, db);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply
        .status(error.statusCode)
        .send(error.details === undefined ? { error: error.code } : { error: error.code, details: error.details });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'invalid_input',
        details: error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message })),
      });
    }
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({ error: 'bad_request' });
    }
    request.log.error(error);
    return reply.status(500).send({ error: 'internal_error' });
  });
  app.setNotFoundHandler(async (_request, reply) => reply.status(404).send({ error: 'not_found' }));

  registerHealthRoutes(app);
  registerAuthRoutes(app, { config, db, limiter: deps.limiter ?? new LoginLimiter(DEFAULT_LOGIN_LIMITS) });
  registerProjectRoutes(app, db);
  return app;
}
```

- [x] **Step 11: Run to verify it passes**

Run: `npx vitest run tests/server/auth-api.test.ts`
Expected: PASS (12 tests). Then `npm test` → all files pass, and `npm run typecheck` → no output.

- [x] **Step 12: Commit**

```bash
git add src/server/errors.ts src/server/http src/server/routes src/server/lists/projects.ts src/server/app.ts tests/server/helpers.ts tests/server/auth-api.test.ts
git commit -m "feat(server): Fastify app with Origin/JSON/session rules and owner login"
```

### Task 6: Managed-list rules and input schemas (domain)

**Files:**

- Create: `src/domain/lists.ts`
- Modify: `src/domain/index.ts`
- Test: `tests/domain/lists.test.ts`

- [x] **Step 1: Write the failing test `tests/domain/lists.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { hasAName, LocationCreate, PersonCreate, PersonPatch, tagKey, TradeCreate } from '../../src/domain';

describe('managed-list names (design §3, §9)', () => {
  it('needs at least one of the English and Greek names', () => {
    expect(hasAName({ nameEn: 'Kitchen', nameEl: '' })).toBe(true);
    expect(hasAName({ nameEn: '', nameEl: 'Κουζίνα' })).toBe(true);
    expect(hasAName({ nameEn: '  ', nameEl: '' })).toBe(false);
  });

  it('matches tag names ignoring case, spacing, accents and final sigma (design §9.3)', () => {
    expect(tagKey('  Πέτρα ')).toBe(tagKey('ΠΕΤΡΑ'));
    expect(tagKey('Μόνωση  -  Στεγάνωση')).toBe(tagKey('ΜΟΝΩΣΗ - ΣΤΕΓΑΝΩΣΗ'));
    expect(tagKey('Γκαραζόπορτας')).toBe(tagKey('γκαραζοπορτασ'));
    expect(tagKey('Pool Deck')).toBe(tagKey('pool deck'));
    expect(tagKey('Πέτρα')).not.toBe(tagKey('Πέτρες'));
    expect(tagKey('   ')).toBeNull();
  });
});

describe('managed-list input schemas', () => {
  it('trims text and stores empty optional text as null', () => {
    expect(PersonCreate.parse({ code: ' ARCH-MK ', name: ' Architect ', role: 'architect', email: '' })).toEqual({
      code: 'ARCH-MK',
      name: 'Architect',
      role: 'architect',
      email: null,
    });
  });

  it('rejects unknown codes and unknown fields', () => {
    expect(PersonCreate.safeParse({ code: 'X', name: 'X', role: 'boss' }).success).toBe(false);
    expect(PersonCreate.safeParse({ code: 'X', name: 'X', role: 'other', salary: 1 }).success).toBe(false);
    expect(LocationCreate.safeParse({ kind: 'room', nameEn: 'Kitchen' }).success).toBe(false);
    expect(LocationCreate.safeParse({ kind: 'space', nameEn: 'Kitchen' }).success).toBe(true);
  });

  it('contains only the fields that were sent (no defaults that would overwrite on update)', () => {
    expect(PersonPatch.parse({ active: false })).toEqual({ active: false });
    expect(TradeCreate.parse({ code: 'TIL' })).toEqual({ code: 'TIL' });
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/domain/lists.test.ts`
Expected: FAIL — the new exports (`hasAName`, `tagKey`, schemas) do not exist yet.

- [x] **Step 3: Create `src/domain/lists.ts`**

Note: Zod 4 applies a `.default()` even inside an optional field, so these schemas use **no defaults** — a PATCH must never fill in values that were not sent. The server applies defaults when it creates a row.

```ts
import { z } from 'zod';
import { normalizeLabel } from './measurements';
import { isCode, type CodeOf, type ListKey } from './vocab';

/** Managed lists have an English and a Greek name; either may be empty, not both (design §3, §9). */
export function hasAName(names: { nameEn: string; nameEl: string }): boolean {
  return names.nameEn.trim() !== '' || names.nameEl.trim() !== '';
}

/**
 * Matching key for tag names (design §9.3: unique per language after trimming, ignoring letter case).
 * Greek capitals drop their accents («ΠΕΤΡΑ» = «Πέτρα»), so accents and final sigma are ignored too.
 * Returns null for an empty name.
 */
export function tagKey(name: string): string | null {
  const key = normalizeLabel(name).normalize('NFD').replace(/\p{M}/gu, '').replace(/ς/g, 'σ');
  return key === '' ? null : key;
}

const codeOf = <K extends ListKey>(key: K) =>
  z.custom<CodeOf<K>>((value) => isCode(key, value), `Unknown ${key} code`);
const id = z.number().int().positive();
const shortCode = z.string().trim().min(1).max(20);
const name = z.string().trim().max(200);
const definition = z.string().trim().max(2000);
/** Optional free text; an empty string is stored as null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === '' ? null : value));

export const PersonCreate = z.strictObject({
  code: shortCode,
  name: z.string().trim().min(1).max(200),
  role: codeOf('personRole'),
  company: optionalText(200).optional(),
  email: optionalText(200).optional(),
  phone: optionalText(50).optional(),
  active: z.boolean().optional(),
});
export const PersonPatch = PersonCreate.partial();

export const TradeCreate = z.strictObject({
  code: shortCode,
  nameEn: name.optional(),
  nameEl: name.optional(),
  defEn: definition.optional(),
  defEl: definition.optional(),
  active: z.boolean().optional(),
});
export const TradePatch = TradeCreate.partial();

/** Used for both create and rename. */
export const ZoneTypeBody = z.strictObject({ nameEn: name.optional(), nameEl: name.optional() });

/** Used for both create and rename. */
export const TagBody = z.strictObject({ nameEl: name.optional(), nameEn: name.optional() });
export const TagMergeBody = z.strictObject({ intoId: id });

export const LocationCreate = z.strictObject({
  parentId: id.nullable().optional(),
  kind: codeOf('locationNodeKind'),
  zoneTypeId: id.nullable().optional(),
  nameEn: name.optional(),
  nameEl: name.optional(),
  sortOrder: z.number().int().optional(),
});
export const LocationPatch = LocationCreate.partial().extend({ active: z.boolean().optional() });
export const LocationCopy = z.strictObject({
  parentId: id.nullable().optional(),
  nameEn: name.optional(),
  nameEl: name.optional(),
});

export type PersonCreateInput = z.output<typeof PersonCreate>;
export type PersonPatchInput = z.output<typeof PersonPatch>;
export type TradeCreateInput = z.output<typeof TradeCreate>;
export type TradePatchInput = z.output<typeof TradePatch>;
export type ZoneTypeInput = z.output<typeof ZoneTypeBody>;
export type TagInput = z.output<typeof TagBody>;
export type LocationCreateInput = z.output<typeof LocationCreate>;
export type LocationPatchInput = z.output<typeof LocationPatch>;
export type LocationCopyInput = z.output<typeof LocationCopy>;
```

- [x] **Step 4: Export it from `src/domain/index.ts`**

Add this line at the end of `src/domain/index.ts`:

```ts
export * from './lists';
```

- [x] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/domain` → PASS (8 files: Plan 1's 7 + `lists.test.ts` with 5 tests). Then `npm run typecheck`.

- [x] **Step 6: Commit**

```bash
git add src/domain/lists.ts src/domain/index.ts tests/domain/lists.test.ts
git commit -m "feat(domain): managed-list input schemas, name rule and tag matching key"
```

### Task 7: People, trades and zone types API

**Files:**

- Create: `src/server/lists/names.ts`, `src/server/lists/people.ts`, `src/server/lists/trades.ts`, `src/server/lists/zone-types.ts`
- Replace: `src/server/db/sqlite-errors.ts`
- Modify: `src/server/app.ts`
- Test: `tests/server/lists-api.test.ts`

All list routes live under `/api/projects/:projectId/...`, return camelCase JSON, answer `201` on create, and `404 <list>_not_found` for an item of another project.

- [x] **Step 1: Write the failing test `tests/server/lists-api.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../../src/server/lists/projects';
import { get, loginAsOwner, makeContext, send, type TestContext } from './helpers';

let ctx: TestContext;
let cookie: string;
let projectId: number;
let base: string;

beforeEach(async () => {
  ctx = await makeContext();
  cookie = await loginAsOwner(ctx);
  projectId = createProject(ctx.db, { code: 'p1', name: 'Project 1' }).id;
  base = `/api/projects/${projectId}`;
});
afterEach(async () => {
  await ctx.close();
});

describe('projects', () => {
  it('lists projects and answers 404 for an unknown project', async () => {
    expect((await get(ctx, cookie, '/api/projects')).json()).toEqual([
      expect.objectContaining({ id: projectId, code: 'p1', name: 'Project 1' }),
    ]);
    const res = await get(ctx, cookie, '/api/projects/999/people');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'project_not_found' });
  });
});

describe('people (design §9.1)', () => {
  it('creates, lists and updates a person', async () => {
    const created = await send(ctx, cookie, 'POST', `${base}/people`, {
      code: 'ARCH-MK',
      name: 'Test Architect',
      role: 'architect',
      email: 'arch@example.com',
    });
    expect(created.statusCode).toBe(201);
    const person = created.json();
    expect(person).toEqual({
      id: expect.any(Number),
      code: 'ARCH-MK',
      name: 'Test Architect',
      company: null,
      role: 'architect',
      email: 'arch@example.com',
      phone: null,
      active: true,
    });
    const updated = await send(ctx, cookie, 'PATCH', `${base}/people/${person.id}`, { active: false, company: 'Studio' });
    expect(updated.json()).toMatchObject({ active: false, company: 'Studio', email: 'arch@example.com' });
    expect((await get(ctx, cookie, `${base}/people`)).json()).toHaveLength(1);
  });

  it('rejects a duplicate code, an unknown role and unknown fields', async () => {
    await send(ctx, cookie, 'POST', `${base}/people`, { code: 'C-PB', name: 'Contractor', role: 'main_contractor' });
    const duplicate = await send(ctx, cookie, 'POST', `${base}/people`, { code: 'C-PB', name: 'Other', role: 'other' });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: 'code_taken' });
    const badRole = await send(ctx, cookie, 'POST', `${base}/people`, { code: 'X', name: 'X', role: 'boss' });
    expect(badRole.statusCode).toBe(400);
    expect(badRole.json().error).toBe('invalid_input');
    const extra = await send(ctx, cookie, 'POST', `${base}/people`, { code: 'Y', name: 'Y', role: 'other', salary: 1 });
    expect(extra.statusCode).toBe(400);
  });

  it('answers 404 for a person of another project', async () => {
    const other = createProject(ctx.db, { code: 'p2', name: 'Project 2' });
    const foreign = (
      await send(ctx, cookie, 'POST', `/api/projects/${other.id}/people`, { code: 'A', name: 'A', role: 'other' })
    ).json();
    const res = await send(ctx, cookie, 'PATCH', `${base}/people/${foreign.id}`, { name: 'B' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'person_not_found' });
  });
});

describe('trades (design §9.2)', () => {
  it('creates, renames and retires a trade', async () => {
    const created = await send(ctx, cookie, 'POST', `${base}/trades`, {
      code: 'TIL',
      nameEn: 'Tiling',
      nameEl: 'Πλακίδια',
      defEn: 'Tiles.',
      defEl: 'Πλακίδια.',
    });
    expect(created.statusCode).toBe(201);
    const trade = created.json();
    expect(trade).toEqual({
      id: expect.any(Number),
      code: 'TIL',
      nameEn: 'Tiling',
      nameEl: 'Πλακίδια',
      defEn: 'Tiles.',
      defEl: 'Πλακίδια.',
      active: true,
    });
    const retired = await send(ctx, cookie, 'PATCH', `${base}/trades/${trade.id}`, { nameEl: 'Πλακάκια', active: false });
    expect(retired.json()).toMatchObject({ nameEn: 'Tiling', nameEl: 'Πλακάκια', active: false });
    expect((await get(ctx, cookie, `${base}/trades`)).json()).toHaveLength(1);
  });

  it('requires at least one name, also after an update', async () => {
    const none = await send(ctx, cookie, 'POST', `${base}/trades`, { code: 'X', nameEn: ' ' });
    expect(none.statusCode).toBe(400);
    expect(none.json()).toEqual({ error: 'name_required' });
    const trade = (await send(ctx, cookie, 'POST', `${base}/trades`, { code: 'Y', nameEn: 'Only English' })).json();
    expect(trade.nameEl).toBe('');
    const cleared = await send(ctx, cookie, 'PATCH', `${base}/trades/${trade.id}`, { nameEn: '' });
    expect(cleared.statusCode).toBe(400);
    expect(cleared.json()).toEqual({ error: 'name_required' });
  });
});

describe('zone types (design §9.5)', () => {
  it('creates, renames and deletes an unused zone type', async () => {
    const zone = (await send(ctx, cookie, 'POST', `${base}/zone-types`, { nameEn: 'Kitchen' })).json();
    expect(zone).toEqual({ id: expect.any(Number), nameEn: 'Kitchen', nameEl: '' });
    const renamed = await send(ctx, cookie, 'PATCH', `${base}/zone-types/${zone.id}`, { nameEl: 'Κουζίνα' });
    expect(renamed.json()).toEqual({ id: zone.id, nameEn: 'Kitchen', nameEl: 'Κουζίνα' });
    expect((await send(ctx, cookie, 'DELETE', `${base}/zone-types/${zone.id}`)).statusCode).toBe(200);
    expect((await get(ctx, cookie, `${base}/zone-types`)).json()).toEqual([]);
  });

  it('refuses to delete a zone type that a location node uses', async () => {
    const zone = (await send(ctx, cookie, 'POST', `${base}/zone-types`, { nameEn: 'Kitchen' })).json();
    ctx.db
      .prepare('INSERT INTO location_nodes (project_id, kind, zone_type_id, name_en) VALUES (?, ?, ?, ?)')
      .run(projectId, 'space', zone.id, 'Kitchen');
    const res = await send(ctx, cookie, 'DELETE', `${base}/zone-types/${zone.id}`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'zone_type_in_use' });
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/lists-api.test.ts`
Expected: FAIL — the project test passes; the people, trades and zone-type tests fail with `404` (`not_found`), because those routes do not exist yet.

- [x] **Step 3: Replace `src/server/db/sqlite-errors.ts`**

```ts
import { HttpError } from '../errors';

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

/** Turns a unique-constraint violation into 409 with the given error code; rethrows anything else. */
export function rethrowUnique(error: unknown, code: string): never {
  if (isUniqueViolation(error)) throw new HttpError(409, code);
  throw error;
}
```

- [x] **Step 4: Create `src/server/lists/names.ts`**

```ts
import { hasAName } from '../../domain';
import { HttpError } from '../errors';

/** Server-side check of the "at least one name" rule (design §3, §9). */
export function assertHasAName(names: { nameEn: string; nameEl: string }): void {
  if (!hasAName(names)) throw new HttpError(400, 'name_required');
}
```

- [x] **Step 5: Create `src/server/lists/people.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { PersonCreate, PersonPatch, type PersonCreateInput, type PersonPatchInput, type PersonRole } from '../../domain';
import type { Db } from '../db/connection';
import { rethrowUnique } from '../db/sqlite-errors';
import { updateColumns } from '../db/update';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { requireProject } from './projects';

export interface Person {
  id: number;
  code: string;
  name: string;
  company: string | null;
  role: PersonRole;
  email: string | null;
  phone: string | null;
  /** Inactive people stay on existing records but are not offered for new selections (design §9.1). */
  active: boolean;
}

type PersonRow = Omit<Person, 'active'> & { active: number };
const SELECT = 'SELECT id, code, name, company, role, email, phone, active FROM people';
const toPerson = (row: PersonRow): Person => ({ ...row, active: row.active === 1 });

export function listPeople(db: Db, projectId: number): Person[] {
  return (db.prepare(`${SELECT} WHERE project_id = ? ORDER BY code`).all(projectId) as PersonRow[]).map(toPerson);
}

export function getPerson(db: Db, projectId: number, id: number): Person {
  const row = db.prepare(`${SELECT} WHERE project_id = ? AND id = ?`).get(projectId, id) as PersonRow | undefined;
  if (!row) throw new HttpError(404, 'person_not_found');
  return toPerson(row);
}

export function createPerson(db: Db, projectId: number, input: PersonCreateInput): Person {
  try {
    const info = db
      .prepare(
        'INSERT INTO people (project_id, code, name, company, role, email, phone, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        projectId,
        input.code,
        input.name,
        input.company ?? null,
        input.role,
        input.email ?? null,
        input.phone ?? null,
        input.active === false ? 0 : 1,
      );
    return getPerson(db, projectId, Number(info.lastInsertRowid));
  } catch (error) {
    return rethrowUnique(error, 'code_taken');
  }
}

export function updatePerson(db: Db, projectId: number, id: number, patch: PersonPatchInput): Person {
  getPerson(db, projectId, id);
  try {
    updateColumns(db, 'people', projectId, id, {
      code: patch.code,
      name: patch.name,
      company: patch.company,
      role: patch.role,
      email: patch.email,
      phone: patch.phone,
      active: patch.active === undefined ? undefined : Number(patch.active),
    });
  } catch (error) {
    rethrowUnique(error, 'code_taken');
  }
  return getPerson(db, projectId, id);
}

export function registerPeopleRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/people', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listPeople(db, projectId);
  });

  app.post('/api/projects/:projectId/people', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(createPerson(db, projectId, PersonCreate.parse(request.body)));
  });

  app.patch('/api/projects/:projectId/people/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return updatePerson(db, projectId, id, PersonPatch.parse(request.body));
  });
}
```

- [x] **Step 6: Create `src/server/lists/trades.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { TradeCreate, TradePatch, type TradeCreateInput, type TradePatchInput } from '../../domain';
import type { Db } from '../db/connection';
import { rethrowUnique } from '../db/sqlite-errors';
import { updateColumns } from '../db/update';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { assertHasAName } from './names';
import { requireProject } from './projects';

export interface Trade {
  id: number;
  code: string;
  nameEn: string;
  nameEl: string;
  defEn: string;
  defEl: string;
  /** Retired trades stay on existing records but are not offered for new selections (design §9.2). */
  active: boolean;
}

type TradeRow = Omit<Trade, 'active'> & { active: number };
const SELECT =
  'SELECT id, code, name_en AS nameEn, name_el AS nameEl, def_en AS defEn, def_el AS defEl, active FROM trades';
const toTrade = (row: TradeRow): Trade => ({ ...row, active: row.active === 1 });

export function listTrades(db: Db, projectId: number): Trade[] {
  return (db.prepare(`${SELECT} WHERE project_id = ? ORDER BY code`).all(projectId) as TradeRow[]).map(toTrade);
}

export function getTrade(db: Db, projectId: number, id: number): Trade {
  const row = db.prepare(`${SELECT} WHERE project_id = ? AND id = ?`).get(projectId, id) as TradeRow | undefined;
  if (!row) throw new HttpError(404, 'trade_not_found');
  return toTrade(row);
}

export function createTrade(db: Db, projectId: number, input: TradeCreateInput): Trade {
  const names = { nameEn: input.nameEn ?? '', nameEl: input.nameEl ?? '' };
  assertHasAName(names);
  try {
    const info = db
      .prepare(
        'INSERT INTO trades (project_id, code, name_en, name_el, def_en, def_el, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        projectId,
        input.code,
        names.nameEn,
        names.nameEl,
        input.defEn ?? '',
        input.defEl ?? '',
        input.active === false ? 0 : 1,
      );
    return getTrade(db, projectId, Number(info.lastInsertRowid));
  } catch (error) {
    return rethrowUnique(error, 'code_taken');
  }
}

export function updateTrade(db: Db, projectId: number, id: number, patch: TradePatchInput): Trade {
  const current = getTrade(db, projectId, id);
  assertHasAName({ nameEn: patch.nameEn ?? current.nameEn, nameEl: patch.nameEl ?? current.nameEl });
  try {
    updateColumns(db, 'trades', projectId, id, {
      code: patch.code,
      name_en: patch.nameEn,
      name_el: patch.nameEl,
      def_en: patch.defEn,
      def_el: patch.defEl,
      active: patch.active === undefined ? undefined : Number(patch.active),
    });
  } catch (error) {
    rethrowUnique(error, 'code_taken');
  }
  return getTrade(db, projectId, id);
}

export function registerTradeRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/trades', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listTrades(db, projectId);
  });

  app.post('/api/projects/:projectId/trades', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(createTrade(db, projectId, TradeCreate.parse(request.body)));
  });

  app.patch('/api/projects/:projectId/trades/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateTrade(db, projectId, id, TradePatch.parse(request.body));
  });
}
```

- [x] **Step 7: Create `src/server/lists/zone-types.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { ZoneTypeBody, type ZoneTypeInput } from '../../domain';
import type { Db } from '../db/connection';
import { updateColumns } from '../db/update';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { assertHasAName } from './names';
import { requireProject } from './projects';

export interface ZoneType {
  id: number;
  nameEn: string;
  nameEl: string;
}

const SELECT = 'SELECT id, name_en AS nameEn, name_el AS nameEl FROM zone_types';

export function listZoneTypes(db: Db, projectId: number): ZoneType[] {
  return db.prepare(`${SELECT} WHERE project_id = ? ORDER BY id`).all(projectId) as ZoneType[];
}

export function getZoneType(db: Db, projectId: number, id: number): ZoneType {
  const zone = db.prepare(`${SELECT} WHERE project_id = ? AND id = ?`).get(projectId, id) as ZoneType | undefined;
  if (!zone) throw new HttpError(404, 'zone_type_not_found');
  return zone;
}

export function createZoneType(db: Db, projectId: number, input: ZoneTypeInput): ZoneType {
  const names = { nameEn: input.nameEn ?? '', nameEl: input.nameEl ?? '' };
  assertHasAName(names);
  const info = db
    .prepare('INSERT INTO zone_types (project_id, name_en, name_el) VALUES (?, ?, ?)')
    .run(projectId, names.nameEn, names.nameEl);
  return getZoneType(db, projectId, Number(info.lastInsertRowid));
}

export function updateZoneType(db: Db, projectId: number, id: number, patch: ZoneTypeInput): ZoneType {
  const current = getZoneType(db, projectId, id);
  assertHasAName({ nameEn: patch.nameEn ?? current.nameEn, nameEl: patch.nameEl ?? current.nameEl });
  updateColumns(db, 'zone_types', projectId, id, { name_en: patch.nameEn, name_el: patch.nameEl });
  return getZoneType(db, projectId, id);
}

/** Allowed only while no location node uses the zone type. */
export function deleteZoneType(db: Db, projectId: number, id: number): void {
  getZoneType(db, projectId, id);
  const used = db
    .prepare('SELECT COUNT(*) FROM location_nodes WHERE project_id = ? AND zone_type_id = ?')
    .pluck()
    .get(projectId, id) as number;
  if (used > 0) throw new HttpError(409, 'zone_type_in_use');
  db.prepare('DELETE FROM zone_types WHERE project_id = ? AND id = ?').run(projectId, id);
}

export function registerZoneTypeRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/zone-types', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listZoneTypes(db, projectId);
  });

  app.post('/api/projects/:projectId/zone-types', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(createZoneType(db, projectId, ZoneTypeBody.parse(request.body)));
  });

  app.patch('/api/projects/:projectId/zone-types/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateZoneType(db, projectId, id, ZoneTypeBody.parse(request.body));
  });

  app.delete('/api/projects/:projectId/zone-types/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteZoneType(db, projectId, id);
    return { ok: true };
  });
}
```

- [x] **Step 8: Register the routes in `src/server/app.ts`**

Add these imports below `import { registerProjectRoutes } from './lists/projects';`:

```ts
import { registerPeopleRoutes } from './lists/people';
import { registerTradeRoutes } from './lists/trades';
import { registerZoneTypeRoutes } from './lists/zone-types';
```

and these lines directly after `registerProjectRoutes(app, db);`:

```ts
  registerPeopleRoutes(app, db);
  registerTradeRoutes(app, db);
  registerZoneTypeRoutes(app, db);
```

- [x] **Step 9: Run to verify it passes**

Run: `npx vitest run tests/server/lists-api.test.ts` → PASS (8 tests). Then `npm test` and `npm run typecheck`.

- [x] **Step 10: Commit**

```bash
git add src/server/db/sqlite-errors.ts src/server/lists src/server/app.ts tests/server/lists-api.test.ts
git commit -m "feat(server): people, trades and zone types API"
```

### Task 8: Tags API with rename, merge and delete

**Files:**

- Create: `src/server/lists/tags.ts`
- Modify: `src/server/app.ts`
- Test: `tests/server/tags-api.test.ts`

Rules (design §9.3): names are unique per language (matching key from `tagKey`). Creating or renaming into **one** existing tag's name answers `409 tag_name_taken` with `details.existingTagId` — the browser then offers to use that tag (create) or to merge into it (rename). A rename whose names hit **two different** tags answers `409 tag_names_conflict`.

- [x] **Step 1: Write the failing test `tests/server/tags-api.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../../src/server/lists/projects';
import { get, loginAsOwner, makeContext, send, type TestContext } from './helpers';

let ctx: TestContext;
let cookie: string;
let base: string;

beforeEach(async () => {
  ctx = await makeContext();
  cookie = await loginAsOwner(ctx);
  base = `/api/projects/${createProject(ctx.db, { code: 'p1', name: 'Project 1' }).id}`;
});
afterEach(async () => {
  await ctx.close();
});

const createTag = (body: object) => send(ctx, cookie, 'POST', `${base}/tags`, body);

describe('tags (design §9.3)', () => {
  it('creates tags; a name only has to be unique within its own language', async () => {
    const stone = await createTag({ nameEl: 'Πέτρα', nameEn: 'Stone' });
    expect(stone.statusCode).toBe(201);
    expect(stone.json()).toEqual({ id: expect.any(Number), nameEl: 'Πέτρα', nameEn: 'Stone' });
    expect((await createTag({ nameEl: 'Stone' })).statusCode).toBe(201);
    expect((await get(ctx, cookie, `${base}/tags`)).json()).toHaveLength(2);
  });

  it('rejects a duplicate name ignoring case and accents, pointing to the existing tag', async () => {
    const stone = (await createTag({ nameEl: 'Πέτρα' })).json();
    const duplicate = await createTag({ nameEl: ' ΠΕΤΡΑ ', nameEn: 'Stone' });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: 'tag_name_taken', details: { existingTagId: stone.id } });
  });

  it('renames a tag, including a change of letter case only', async () => {
    const tag = (await createTag({ nameEl: 'πέτρα' })).json();
    const renamed = await send(ctx, cookie, 'PATCH', `${base}/tags/${tag.id}`, { nameEl: 'Πέτρα', nameEn: 'Stone' });
    expect(renamed.json()).toEqual({ id: tag.id, nameEl: 'Πέτρα', nameEn: 'Stone' });
  });

  it('offers a merge when a rename collides with exactly one tag; the target keeps its names', async () => {
    const target = (await createTag({ nameEl: 'Πέτρα', nameEn: 'Stone' })).json();
    const source = (await createTag({ nameEl: 'Πέτρες' })).json();
    const collision = await send(ctx, cookie, 'PATCH', `${base}/tags/${source.id}`, { nameEn: 'stone' });
    expect(collision.statusCode).toBe(409);
    expect(collision.json()).toEqual({ error: 'tag_name_taken', details: { existingTagId: target.id } });
    const merged = await send(ctx, cookie, 'POST', `${base}/tags/${source.id}/merge`, { intoId: target.id });
    expect(merged.json()).toEqual(target);
    expect((await get(ctx, cookie, `${base}/tags`)).json()).toEqual([target]);
  });

  it('rejects a rename whose names collide with two different tags', async () => {
    const a = (await createTag({ nameEl: 'Πέτρα' })).json();
    const b = (await createTag({ nameEn: 'Stone' })).json();
    const c = (await createTag({ nameEl: 'Μάρμαρο' })).json();
    const res = await send(ctx, cookie, 'PATCH', `${base}/tags/${c.id}`, { nameEl: 'πετρα', nameEn: 'STONE' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'tag_names_conflict', details: { tagIds: [a.id, b.id] } });
  });

  it("deletes a tag; refuses to merge a tag into itself or into another project's tag", async () => {
    const tag = (await createTag({ nameEl: 'Πισίνα' })).json();
    const self = await send(ctx, cookie, 'POST', `${base}/tags/${tag.id}/merge`, { intoId: tag.id });
    expect(self.statusCode).toBe(400);
    expect(self.json()).toEqual({ error: 'merge_into_self' });
    const other = createProject(ctx.db, { code: 'p2', name: 'Project 2' });
    const foreign = (await send(ctx, cookie, 'POST', `/api/projects/${other.id}/tags`, { nameEl: 'Πισίνα' })).json();
    const cross = await send(ctx, cookie, 'POST', `${base}/tags/${tag.id}/merge`, { intoId: foreign.id });
    expect(cross.statusCode).toBe(404);
    expect(cross.json()).toEqual({ error: 'tag_not_found' });
    expect((await send(ctx, cookie, 'DELETE', `${base}/tags/${tag.id}`)).statusCode).toBe(200);
    expect((await get(ctx, cookie, `${base}/tags`)).json()).toEqual([]);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/tags-api.test.ts`
Expected: FAIL — `404 not_found` (no tag routes yet).

- [x] **Step 3: Create `src/server/lists/tags.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { TagBody, TagMergeBody, tagKey, type TagInput } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { assertHasAName } from './names';
import { requireProject } from './projects';

export interface Tag {
  id: number;
  nameEl: string;
  nameEn: string;
}

const SELECT = 'SELECT id, name_el AS nameEl, name_en AS nameEn FROM tags';

export function listTags(db: Db, projectId: number): Tag[] {
  return db.prepare(`${SELECT} WHERE project_id = ? ORDER BY id`).all(projectId) as Tag[];
}

export function getTag(db: Db, projectId: number, id: number): Tag {
  const tag = db.prepare(`${SELECT} WHERE project_id = ? AND id = ?`).get(projectId, id) as Tag | undefined;
  if (!tag) throw new HttpError(404, 'tag_not_found');
  return tag;
}

/** Other tags of the project whose Greek or English name matches the given names. */
function collidingTagIds(db: Db, projectId: number, names: { nameEl: string; nameEn: string }, exceptId: number | null): number[] {
  return db
    .prepare('SELECT id FROM tags WHERE project_id = ? AND id IS NOT ? AND (name_el_key = ? OR name_en_key = ?) ORDER BY id')
    .pluck()
    .all(projectId, exceptId, tagKey(names.nameEl), tagKey(names.nameEn)) as number[];
}

/** One colliding tag: offer it (use it, or merge into it). Two different tags: the names contradict each other. */
function rejectCollisions(ids: number[]): void {
  const [first] = ids;
  if (first === undefined) return;
  if (ids.length > 1) throw new HttpError(409, 'tag_names_conflict', { tagIds: ids });
  throw new HttpError(409, 'tag_name_taken', { existingTagId: first });
}

export function createTag(db: Db, projectId: number, input: TagInput): Tag {
  const names = { nameEl: input.nameEl ?? '', nameEn: input.nameEn ?? '' };
  assertHasAName(names);
  rejectCollisions(collidingTagIds(db, projectId, names, null));
  const info = db
    .prepare('INSERT INTO tags (project_id, name_el, name_en, name_el_key, name_en_key) VALUES (?, ?, ?, ?, ?)')
    .run(projectId, names.nameEl, names.nameEn, tagKey(names.nameEl), tagKey(names.nameEn));
  return getTag(db, projectId, Number(info.lastInsertRowid));
}

/** Records reference the tag by id, so a rename applies to every record carrying it (design §9.3). */
export function renameTag(db: Db, projectId: number, id: number, patch: TagInput): Tag {
  const current = getTag(db, projectId, id);
  const names = { nameEl: patch.nameEl ?? current.nameEl, nameEn: patch.nameEn ?? current.nameEn };
  assertHasAName(names);
  rejectCollisions(collidingTagIds(db, projectId, names, id));
  db.prepare(
    'UPDATE tags SET name_el = ?, name_en = ?, name_el_key = ?, name_en_key = ? WHERE project_id = ? AND id = ?',
  ).run(names.nameEl, names.nameEn, tagKey(names.nameEl), tagKey(names.nameEn), projectId, id);
  return getTag(db, projectId, id);
}

/**
 * Merges a tag into another, which keeps its own names (design §9.3).
 * Plan 3 adds: move the source tag's record links to the target (in this transaction) before the delete.
 */
export function mergeTag(db: Db, projectId: number, sourceId: number, intoId: number): Tag {
  if (sourceId === intoId) throw new HttpError(400, 'merge_into_self');
  getTag(db, projectId, sourceId);
  const target = getTag(db, projectId, intoId);
  db.transaction(() => {
    db.prepare('DELETE FROM tags WHERE project_id = ? AND id = ?').run(projectId, sourceId);
  })();
  return target;
}

/** Plan 3 adds: the number of affected records, shown to the owner before confirming (design §9.3). */
export function deleteTag(db: Db, projectId: number, id: number): void {
  getTag(db, projectId, id);
  db.prepare('DELETE FROM tags WHERE project_id = ? AND id = ?').run(projectId, id);
}

export function registerTagRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/tags', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listTags(db, projectId);
  });

  app.post('/api/projects/:projectId/tags', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(createTag(db, projectId, TagBody.parse(request.body)));
  });

  app.patch('/api/projects/:projectId/tags/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return renameTag(db, projectId, id, TagBody.parse(request.body));
  });

  app.post('/api/projects/:projectId/tags/:id/merge', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return mergeTag(db, projectId, id, TagMergeBody.parse(request.body).intoId);
  });

  app.delete('/api/projects/:projectId/tags/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteTag(db, projectId, id);
    return { ok: true };
  });
}
```

- [x] **Step 4: Register the routes in `src/server/app.ts`**

Add `import { registerTagRoutes } from './lists/tags';` below the other `./lists/...` imports, and `registerTagRoutes(app, db);` after `registerZoneTypeRoutes(app, db);`.

- [x] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/server/tags-api.test.ts` → PASS (6 tests). Then `npm test` and `npm run typecheck`.

- [x] **Step 6: Commit**

```bash
git add src/server/lists/tags.ts src/server/app.ts tests/server/tags-api.test.ts
git commit -m "feat(server): tags API with rename, merge and delete rules"
```

### Task 9: Location tree API with move and copy branch

**Files:**

- Create: `src/server/lists/locations.ts`
- Modify: `src/server/app.ts`
- Test: `tests/server/locations-api.test.ts`

The API returns the tree as a **flat list** ordered by `sortOrder`, then `id`; the browser builds the tree from `parentId`. A new node without `sortOrder` goes last among its siblings.

- [x] **Step 1: Write the failing test `tests/server/locations-api.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../../src/server/lists/projects';
import { get, loginAsOwner, makeContext, send, type TestContext } from './helpers';

interface NodeJson {
  id: number;
  parentId: number | null;
  kind: string;
  zoneTypeId: number | null;
  nameEn: string;
  nameEl: string;
  sortOrder: number;
  active: boolean;
}

let ctx: TestContext;
let cookie: string;
let base: string;

beforeEach(async () => {
  ctx = await makeContext();
  cookie = await loginAsOwner(ctx);
  base = `/api/projects/${createProject(ctx.db, { code: 'p1', name: 'Project 1' }).id}`;
});
afterEach(async () => {
  await ctx.close();
});

async function addNode(body: object): Promise<NodeJson> {
  const res = await send(ctx, cookie, 'POST', `${base}/locations`, body);
  expect(res.statusCode).toBe(201);
  return res.json();
}
const list = async (): Promise<NodeJson[]> => (await get(ctx, cookie, `${base}/locations`)).json();

describe('location tree (design §9.4)', () => {
  it('builds a tree; siblings get increasing sort order', async () => {
    const villa = await addNode({ kind: 'building', nameEn: 'Villa 1', nameEl: 'Βίλα 1' });
    const ground = await addNode({ parentId: villa.id, kind: 'level', nameEn: 'Ground' });
    const upper = await addNode({ parentId: villa.id, kind: 'level', nameEn: 'Upper' });
    expect(await list()).toEqual([
      { id: villa.id, parentId: null, kind: 'building', zoneTypeId: null, nameEn: 'Villa 1', nameEl: 'Βίλα 1', sortOrder: 1, active: true },
      { id: ground.id, parentId: villa.id, kind: 'level', zoneTypeId: null, nameEn: 'Ground', nameEl: '', sortOrder: 1, active: true },
      { id: upper.id, parentId: villa.id, kind: 'level', zoneTypeId: null, nameEn: 'Upper', nameEl: '', sortOrder: 2, active: true },
    ]);
  });

  it('validates kind, names, parent and zone type', async () => {
    const other = createProject(ctx.db, { code: 'p2', name: 'Project 2' });
    const foreignNode = (
      await send(ctx, cookie, 'POST', `/api/projects/${other.id}/locations`, { kind: 'building', nameEn: 'Elsewhere' })
    ).json();
    const foreignZone = (
      await send(ctx, cookie, 'POST', `/api/projects/${other.id}/zone-types`, { nameEn: 'Kitchen' })
    ).json();
    const post = (body: object) => send(ctx, cookie, 'POST', `${base}/locations`, body);
    expect((await post({ kind: 'room', nameEn: 'X' })).statusCode).toBe(400);
    expect((await post({ kind: 'space' })).json()).toEqual({ error: 'name_required' });
    expect((await post({ kind: 'space', nameEn: 'X', parentId: foreignNode.id })).json()).toEqual({
      error: 'invalid_parent',
    });
    expect((await post({ kind: 'space', nameEn: 'X', zoneTypeId: foreignZone.id })).json()).toEqual({
      error: 'invalid_zone_type',
    });
  });

  it('moves a node, but never under itself or one of its descendants', async () => {
    const villa1 = await addNode({ kind: 'building', nameEn: 'Villa 1' });
    const villa2 = await addNode({ kind: 'building', nameEn: 'Villa 2' });
    const ground = await addNode({ parentId: villa1.id, kind: 'level', nameEn: 'Ground' });
    const kitchen = await addNode({ parentId: ground.id, kind: 'space', nameEn: 'Kitchen' });
    const moved = await send(ctx, cookie, 'PATCH', `${base}/locations/${ground.id}`, { parentId: villa2.id });
    expect(moved.json()).toMatchObject({ id: ground.id, parentId: villa2.id });
    for (const parentId of [ground.id, kitchen.id]) {
      const res = await send(ctx, cookie, 'PATCH', `${base}/locations/${ground.id}`, { parentId });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'location_cycle' });
    }
    const top = await send(ctx, cookie, 'PATCH', `${base}/locations/${ground.id}`, { parentId: null });
    expect(top.json()).toMatchObject({ parentId: null });
  });

  it('retires a node: it stays in the tree, marked inactive', async () => {
    const node = await addNode({ kind: 'building', nameEn: 'Old wing' });
    const res = await send(ctx, cookie, 'PATCH', `${base}/locations/${node.id}`, { active: false });
    expect(res.json()).toMatchObject({ id: node.id, active: false });
    expect(await list()).toHaveLength(1);
  });

  it('deletes a node together with its descendants', async () => {
    const villa = await addNode({ kind: 'building', nameEn: 'Villa 1' });
    const ground = await addNode({ parentId: villa.id, kind: 'level', nameEn: 'Ground' });
    await addNode({ parentId: ground.id, kind: 'space', nameEn: 'Kitchen' });
    const keep = await addNode({ kind: 'building', nameEn: 'Site' });
    expect((await send(ctx, cookie, 'DELETE', `${base}/locations/${villa.id}`)).statusCode).toBe(200);
    expect((await list()).map((node) => node.id)).toEqual([keep.id]);
  });

  it('copies a branch with all its descendants under a new name', async () => {
    const kitchenType = (await send(ctx, cookie, 'POST', `${base}/zone-types`, { nameEn: 'Kitchen' })).json();
    const root = await addNode({ kind: 'other', nameEn: 'Project' });
    const villa1 = await addNode({ parentId: root.id, kind: 'building', nameEn: 'Villa 1', nameEl: 'Βίλα 1' });
    const ground = await addNode({ parentId: villa1.id, kind: 'level', nameEn: 'Ground' });
    await addNode({ parentId: ground.id, kind: 'space', nameEn: 'Kitchen', zoneTypeId: kitchenType.id });
    await addNode({ parentId: ground.id, kind: 'space', nameEn: 'Hall' });

    const res = await send(ctx, cookie, 'POST', `${base}/locations/${villa1.id}/copy`, { nameEn: 'Villa 2', nameEl: 'Βίλα 2' });
    expect(res.statusCode).toBe(201);
    const villa2: NodeJson = res.json();
    expect(villa2).toMatchObject({ parentId: root.id, kind: 'building', nameEn: 'Villa 2', nameEl: 'Βίλα 2', sortOrder: 2 });

    const nodes = await list();
    const childrenOf = (id: number) => nodes.filter((node) => node.parentId === id);
    const [ground2] = childrenOf(villa2.id);
    expect(ground2).toMatchObject({ kind: 'level', nameEn: 'Ground' });
    expect(
      childrenOf(ground2!.id).map(({ nameEn, zoneTypeId, sortOrder }) => ({ nameEn, zoneTypeId, sortOrder })),
    ).toEqual([
      { nameEn: 'Kitchen', zoneTypeId: kitchenType.id, sortOrder: 1 },
      { nameEn: 'Hall', zoneTypeId: null, sortOrder: 2 },
    ]);
    expect(nodes).toHaveLength(9);
    expect(childrenOf(villa1.id)).toHaveLength(1);
  });

  it('refuses to copy a branch into itself', async () => {
    const villa = await addNode({ kind: 'building', nameEn: 'Villa 1' });
    const ground = await addNode({ parentId: villa.id, kind: 'level', nameEn: 'Ground' });
    const res = await send(ctx, cookie, 'POST', `${base}/locations/${villa.id}/copy`, { nameEn: 'Villa 1b', parentId: ground.id });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'copy_into_own_branch' });
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/locations-api.test.ts`
Expected: FAIL — `expected 404 to be 201` (no location routes yet).

- [x] **Step 3: Create `src/server/lists/locations.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import {
  LocationCopy,
  LocationCreate,
  LocationPatch,
  type LocationCopyInput,
  type LocationCreateInput,
  type LocationNodeKind,
  type LocationPatchInput,
} from '../../domain';
import type { Db } from '../db/connection';
import { updateColumns } from '../db/update';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { assertHasAName } from './names';
import { requireProject } from './projects';

export interface LocationNode {
  id: number;
  parentId: number | null;
  kind: LocationNodeKind;
  zoneTypeId: number | null;
  nameEn: string;
  nameEl: string;
  sortOrder: number;
  /** Retired nodes stay on existing records but are not offered for new selections (design §9.4). */
  active: boolean;
}

type LocationRow = Omit<LocationNode, 'active'> & { active: number };
const COLUMNS =
  'id, parent_id AS parentId, kind, zone_type_id AS zoneTypeId, name_en AS nameEn, name_el AS nameEl, sort_order AS sortOrder, active';
const toNode = (row: LocationRow): LocationNode => ({ ...row, active: row.active === 1 });

export function listLocations(db: Db, projectId: number): LocationNode[] {
  return (
    db.prepare(`SELECT ${COLUMNS} FROM location_nodes WHERE project_id = ? ORDER BY sort_order, id`).all(projectId) as LocationRow[]
  ).map(toNode);
}

export function getLocation(db: Db, projectId: number, id: number): LocationNode {
  const row = db.prepare(`SELECT ${COLUMNS} FROM location_nodes WHERE project_id = ? AND id = ?`).get(projectId, id) as
    | LocationRow
    | undefined;
  if (!row) throw new HttpError(404, 'location_not_found');
  return toNode(row);
}

/** The node and every node inside it. Plan 3 also uses this for location filters (design §5.5). */
export function subtreeIds(db: Db, projectId: number, rootId: number): number[] {
  return db
    .prepare(
      `WITH RECURSIVE subtree(id) AS (
         SELECT id FROM location_nodes WHERE project_id = ? AND id = ?
         UNION ALL
         SELECT n.id FROM location_nodes n JOIN subtree s ON n.parent_id = s.id
       )
       SELECT id FROM subtree`,
    )
    .pluck()
    .all(projectId, rootId) as number[];
}

function checkParent(db: Db, projectId: number, parentId: number | null | undefined): number | null {
  if (parentId === undefined || parentId === null) return null;
  const found = db.prepare('SELECT 1 FROM location_nodes WHERE project_id = ? AND id = ?').get(projectId, parentId);
  if (found === undefined) throw new HttpError(400, 'invalid_parent');
  return parentId;
}

function checkZoneType(db: Db, projectId: number, zoneTypeId: number | null | undefined): number | null {
  if (zoneTypeId === undefined || zoneTypeId === null) return null;
  const found = db.prepare('SELECT 1 FROM zone_types WHERE project_id = ? AND id = ?').get(projectId, zoneTypeId);
  if (found === undefined) throw new HttpError(400, 'invalid_zone_type');
  return zoneTypeId;
}

function nextSortOrder(db: Db, projectId: number, parentId: number | null): number {
  return db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM location_nodes WHERE project_id = ? AND parent_id IS ?')
    .pluck()
    .get(projectId, parentId) as number;
}

export function createLocation(db: Db, projectId: number, input: LocationCreateInput): LocationNode {
  const names = { nameEn: input.nameEn ?? '', nameEl: input.nameEl ?? '' };
  assertHasAName(names);
  const parentId = checkParent(db, projectId, input.parentId);
  const zoneTypeId = checkZoneType(db, projectId, input.zoneTypeId);
  const info = db
    .prepare(
      'INSERT INTO location_nodes (project_id, parent_id, kind, zone_type_id, name_en, name_el, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      projectId,
      parentId,
      input.kind,
      zoneTypeId,
      names.nameEn,
      names.nameEl,
      input.sortOrder ?? nextSortOrder(db, projectId, parentId),
    );
  return getLocation(db, projectId, Number(info.lastInsertRowid));
}

/** Rename, change kind or zone type, reorder, retire (active: false) or move (parentId). */
export function updateLocation(db: Db, projectId: number, id: number, patch: LocationPatchInput): LocationNode {
  const current = getLocation(db, projectId, id);
  assertHasAName({ nameEn: patch.nameEn ?? current.nameEn, nameEl: patch.nameEl ?? current.nameEl });
  let parentId: number | null | undefined;
  if (patch.parentId !== undefined) {
    parentId = checkParent(db, projectId, patch.parentId);
    if (parentId !== null && subtreeIds(db, projectId, id).includes(parentId)) {
      throw new HttpError(409, 'location_cycle');
    }
  }
  const zoneTypeId = patch.zoneTypeId === undefined ? undefined : checkZoneType(db, projectId, patch.zoneTypeId);
  updateColumns(db, 'location_nodes', projectId, id, {
    parent_id: parentId,
    kind: patch.kind,
    zone_type_id: zoneTypeId,
    name_en: patch.nameEn,
    name_el: patch.nameEl,
    sort_order: patch.sortOrder,
    active: patch.active === undefined ? undefined : Number(patch.active),
  });
  return getLocation(db, projectId, id);
}

/**
 * Deletes the node and everything inside it.
 * Plan 3 adds: only when no record uses any of them; otherwise 409 and the owner retires the node instead (design §9.4).
 */
export function deleteLocation(db: Db, projectId: number, id: number): void {
  getLocation(db, projectId, id);
  const ids = subtreeIds(db, projectId, id);
  db.prepare(`DELETE FROM location_nodes WHERE project_id = ? AND id IN (${ids.map(() => '?').join(', ')})`).run(
    projectId,
    ...ids,
  );
}

/** Duplicates a node with all its descendants; the copy's root gets the new names (design §9.4). */
export function copyBranch(db: Db, projectId: number, sourceId: number, input: LocationCopyInput): LocationNode {
  const source = getLocation(db, projectId, sourceId);
  const names = { nameEn: input.nameEn ?? '', nameEl: input.nameEl ?? '' };
  assertHasAName(names);
  const parentId = input.parentId === undefined ? source.parentId : checkParent(db, projectId, input.parentId);
  if (parentId !== null && subtreeIds(db, projectId, sourceId).includes(parentId)) {
    throw new HttpError(409, 'copy_into_own_branch');
  }
  // Parents before children, so every child's new parent already exists when it is inserted.
  const rows = db
    .prepare(
      `WITH RECURSIVE subtree(id, depth) AS (
         SELECT id, 0 FROM location_nodes WHERE project_id = ? AND id = ?
         UNION ALL
         SELECT n.id, s.depth + 1 FROM location_nodes n JOIN subtree s ON n.parent_id = s.id
       )
       SELECT ${COLUMNS.split(', ').map((column) => `n.${column}`).join(', ')}
       FROM subtree s JOIN location_nodes n ON n.id = s.id
       ORDER BY s.depth, n.sort_order, n.id`,
    )
    .all(projectId, sourceId) as LocationRow[];
  const insert = db.prepare(
    'INSERT INTO location_nodes (project_id, parent_id, kind, zone_type_id, name_en, name_el, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const newRootId = db.transaction((): number => {
    const newIds = new Map<number, number>();
    for (const row of rows) {
      const isRoot = row.id === sourceId;
      const newParentId = isRoot ? parentId : newIds.get(row.parentId ?? -1);
      if (newParentId === undefined) throw new Error(`Copy order broken at location node ${row.id}`);
      const info = insert.run(
        projectId,
        newParentId,
        row.kind,
        row.zoneTypeId,
        isRoot ? names.nameEn : row.nameEn,
        isRoot ? names.nameEl : row.nameEl,
        isRoot ? nextSortOrder(db, projectId, parentId) : row.sortOrder,
        row.active,
      );
      newIds.set(row.id, Number(info.lastInsertRowid));
    }
    const rootId = newIds.get(sourceId);
    if (rootId === undefined) throw new Error('Copy produced no root');
    return rootId;
  })();
  return getLocation(db, projectId, newRootId);
}

export function registerLocationRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/locations', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listLocations(db, projectId);
  });

  app.post('/api/projects/:projectId/locations', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(createLocation(db, projectId, LocationCreate.parse(request.body)));
  });

  app.patch('/api/projects/:projectId/locations/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateLocation(db, projectId, id, LocationPatch.parse(request.body));
  });

  app.delete('/api/projects/:projectId/locations/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteLocation(db, projectId, id);
    return { ok: true };
  });

  app.post('/api/projects/:projectId/locations/:id/copy', async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(copyBranch(db, projectId, id, LocationCopy.parse(request.body)));
  });
}
```

- [x] **Step 4: Register the routes in `src/server/app.ts`**

Add `import { registerLocationRoutes } from './lists/locations';` below the other `./lists/...` imports, and `registerLocationRoutes(app, db);` after `registerTagRoutes(app, db);`.

- [x] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/server/locations-api.test.ts` → PASS (7 tests). Then `npm test` and `npm run typecheck`.

- [x] **Step 6: Commit**

```bash
git add src/server/lists/locations.ts src/server/app.ts tests/server/locations-api.test.ts
git commit -m "feat(server): location tree API with move, retire, delete and copy branch"
```

### Task 10: Entry point, owner command and local run

**Files:**

- Create: `src/server/bootstrap.ts`, `src/server/main.ts`, `scripts/owner.ts`, `.env.example`
- Modify: `.gitignore`

- [x] **Step 1: Create `src/server/bootstrap.ts`**

```ts
import { existsSync } from 'node:fs';
import type { AppConfig } from './config';
import { openDatabase, type Db } from './db/connection';
import { migrate } from './db/migrate';

/** Loads ./.env when it exists (local development). On Hetzner the variables are set in konsoleH. */
export function loadEnvFile(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}

/** Opens the database and applies pending migrations (backing up first when it already has data). */
export function openMigratedDatabase(config: AppConfig): { db: Db; applied: string[] } {
  const db = openDatabase(config.dbPath);
  return { db, applied: migrate(db, { backupsDir: config.backupsDir }) };
}
```

- [x] **Step 2: Create `src/server/main.ts`**

```ts
import { buildApp } from './app';
import { loadEnvFile, openMigratedDatabase } from './bootstrap';
import { loadConfig } from './config';

loadEnvFile();
const config = loadConfig();
const { db, applied } = openMigratedDatabase(config);
const app = await buildApp({ config, db, logger: true });
if (applied.length > 0) app.log.info({ applied }, 'migrations applied');

let closing = false;
async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  app.log.info(`${signal} received, closing`);
  await app.close();
  db.close();
  process.exit(0);
}
// Deployment restarts the app by stopping the process (design §11.6).
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

if (config.port !== null) {
  // Local development: a port number, or a socket path.
  await app.listen(
    /^\d+$/.test(config.port)
      ? { port: Number(config.port), host: process.env.HOST ?? '127.0.0.1' }
      : { path: config.port },
  );
} else {
  // Hetzner: listen() without arguments; the platform supplies the socket (Plan 0).
  await app.ready();
  app.server.listen(() => app.log.info({ address: app.server.address() }, 'listening on the platform socket'));
}
```

- [x] **Step 3: Create `scripts/owner.ts`**

```ts
import { stdin, stdout } from 'node:process';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../src/server/auth/passwords';
import { setOwnerPassword } from '../src/server/auth/users';
import { loadEnvFile, openMigratedDatabase } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';

/** Reads a line from the terminal without echoing it. */
function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (): void => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    const onData = (chunk: string): void => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          finish();
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          finish();
          reject(new Error('Cancelled'));
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    stdout.write(prompt);
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

const username = process.argv[2];
if (!username) {
  console.error('Usage: npm run owner -- <username>');
  process.exit(2);
}
if (!stdin.isTTY) {
  console.error('Run this command in an interactive terminal: the password is typed, never piped or passed as an argument.');
  process.exit(2);
}

const password = await readHidden(
  `New password for "${username}" (${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters): `,
);
if ((await readHidden('Repeat the password: ')) !== password) {
  console.error('The passwords differ. Nothing was changed.');
  process.exit(1);
}

loadEnvFile();
const { db } = openMigratedDatabase(loadConfig());
try {
  const result = setOwnerPassword(db, username, password);
  console.log(
    result.created
      ? `Owner account "${username}" created.`
      : `Password for "${username}" reset; ${result.sessionsRemoved} session(s) ended.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  db.close();
}
```

- [x] **Step 4: Create `.env.example`**

```bash
# Local development settings. Copy to .env (git-ignored); never commit .env.
BUILTBASIS_DATA_DIR=./data
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000
# Production only (set in konsoleH, not here):
# PUBLIC_BASE_URL=https://builtbasis.ktimanet.com
# BEHIND_CLOUDFLARE=1
```

- [x] **Step 5: Let git track `.env.example`**

The existing `.env.*` rule in `.gitignore` also matches `.env.example`. Directly below the line `.env.*`, add:

```text
!.env.example
```

Check: `git check-ignore .env.example` prints nothing (exit code 1), and `git check-ignore .env` still prints `.env`.

- [x] **Step 6: Typecheck and check the owner command refuses piped input**

Run: `npm run typecheck` → no output.
Run: `npm run owner -- owner < /dev/null` (PowerShell: `$null | npm run owner -- owner`)
Expected: `Run this command in an interactive terminal: …`, exit code 2, and no database change.

- [x] **Step 7: Run the server locally**

Run: `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`), then `npm start`.
Expected log lines include `Server listening at http://127.0.0.1:3000`; `data/builtbasis.db` now exists.

In a second terminal:

```bash
curl -s http://127.0.0.1:3000/api/health
# {"ok":true}
curl -s -X POST http://127.0.0.1:3000/api/auth/logout -H 'content-type: application/json' -d '{}'
# {"error":"origin_rejected"}
curl -s http://127.0.0.1:3000/api/projects
# {"error":"unauthenticated"}
```

Stop the server with Ctrl+C. Expected log line: `SIGINT received, closing`.

- [x] **Step 8: Commit**

```bash
git add .gitignore src/server/bootstrap.ts src/server/main.ts scripts/owner.ts .env.example
git commit -m "feat(server): entry point, owner account command and local settings"
```

### Task 11: Seed data for Gennadi 822A

**Files:**

- Create: `src/server/seed/csv.ts`, `src/server/seed/gennadi-data.ts`, `src/server/seed/gennadi.ts`, `scripts/seed-gennadi.ts`
- Test: `tests/server/seed.test.ts`

Source layouts (checked 2026-10-03):

- **References CSV** (UTF-8 with BOM, comma-separated). Two people tables side by side that **do not line up row by row**: `Owner Initials` + `Owner Full Name`, and `Full Name` + `Initials` + `Email` + `Phone`. Each contains codes the other lacks, so people are merged **by code**: contact table first (name, email, phone), then codes found only in the owner table (name from `Owner Full Name`, no contact details). The `Thematic Group` column is not read; the tag list comes from design §15.
- **Project Fields Lookups.xlsx**, sheet `Trades`: header `code_en, english_one_word, english_description, greek_one_word, greek_description, notes`; 34 trades.
- Sheets `Location` and `Zone` are reproduced in `gennadi-data.ts` (24 spaces in 5 levels), with the Greek names added (see Decisions §7).

**Contact details never enter the repository** (design §15): the tests use made-up names and `example.com` addresses; the real files are read only when the seed command runs.

- [x] **Step 1: Write the failing test `tests/server/seed.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { listLocations } from '../../src/server/lists/locations';
import { listPeople } from '../../src/server/lists/people';
import { listTrades } from '../../src/server/lists/trades';
import { listZoneTypes } from '../../src/server/lists/zone-types';
import { parseCsv } from '../../src/server/seed/csv';
import { extractPeople, roleForCode, seedGennadi, tradesFromRows } from '../../src/server/seed/gennadi';

// Same layout as the real References CSV; made-up people, no real contact details.
const REFERENCES_CSV = [
  'Thematic Group,,Status,,Priority,,Completion %,,Owner Initials,Owner Full Name,,Full Name,Initials,Email,Phone',
  'Group A,,Proposed,,None,,0%,,OWN,Owner short,,Owner Person,OWN,own@example.com,+30 210 0000000',
  'Group B,,Issued,,Low,,10%,,ARCH-XY,Architect short,,Architect Person,ARCH-XY,arch@example.com,',
  'Group C,,,,,,,,C-PB,Main short,,Main Contractor Ltd,C-PB,,',
  'Group D,,,,,,,,C-AB,"Sub, owner list only",,Sub Contact,C-CD,sub@example.com,',
  'Group E,,,,,,,,SUP,Supplier,,Project Supplier,SUP,,',
  'Group F,,,,,,,,O3P,Other 3rd Party,,Third Party,O3P,,',
  'Group G,,,,,,,,,,,,,,',
].join('\r\n');

const TRADE_ROWS = [
  ['code_en', 'english_one_word', 'english_description', 'greek_one_word', 'greek_description', 'notes'],
  ['CAR', 'Carpentry', 'Interior carpentry.', 'Ξυλουργικά', 'Εσωτερικά ξυλουργικά.', ''],
  ['LVS', 'Low Voltage', 'Low-voltage systems.', 'Ασθενή', 'Ασθενή ρεύματα, δίκτυα.', 'a note'],
  ['', '', '', '', '', ''],
];

let db: Db;
beforeEach(() => {
  db = openDatabase(':memory:');
  migrate(db, { backupsDir: 'unused' });
});

const sources = () => ({ people: extractPeople(parseCsv(REFERENCES_CSV)), trades: tradesFromRows(TRADE_ROWS) });

describe('seed sources', () => {
  it('parses quoted CSV fields, CRLF line ends and a byte-order mark', () => {
    expect(parseCsv('\uFEFFa,"b, c","d ""e"""\r\n1,,3\r\n')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '', '3'],
    ]);
  });

  it('merges the contact table and the owner table of the References CSV by code', () => {
    expect(extractPeople(parseCsv(REFERENCES_CSV))).toEqual([
      { code: 'OWN', name: 'Owner Person', email: 'own@example.com', phone: '+30 210 0000000' },
      { code: 'ARCH-XY', name: 'Architect Person', email: 'arch@example.com', phone: null },
      { code: 'C-PB', name: 'Main Contractor Ltd', email: null, phone: null },
      { code: 'C-CD', name: 'Sub Contact', email: 'sub@example.com', phone: null },
      { code: 'SUP', name: 'Project Supplier', email: null, phone: null },
      { code: 'O3P', name: 'Third Party', email: null, phone: null },
      { code: 'C-AB', name: 'Sub, owner list only', email: null, phone: null },
    ]);
  });

  it('maps roles from code prefixes and reads trades by column name', () => {
    expect(['ARCH-XY', 'C-PB', 'C-CD', 'SUP', 'O3P', 'OWN'].map(roleForCode)).toEqual([
      'architect',
      'main_contractor',
      'subcontractor',
      'supplier',
      'other',
      null,
    ]);
    expect(tradesFromRows(TRADE_ROWS)).toEqual([
      { code: 'CAR', nameEn: 'Carpentry', nameEl: 'Ξυλουργικά', defEn: 'Interior carpentry.', defEl: 'Εσωτερικά ξυλουργικά.' },
      { code: 'LVS', nameEn: 'Low Voltage', nameEl: 'Ασθενή', defEn: 'Low-voltage systems.', defEl: 'Ασθενή ρεύματα, δίκτυα.' },
    ]);
  });
});

describe('seedGennadi (design §15)', () => {
  it('loads people, trades, zone types, tags and the location tree', () => {
    const summary = seedGennadi(db, sources());
    expect(summary).toEqual({
      projectId: expect.any(Number),
      projectCode: 'cbg2401',
      people: 7,
      trades: 2,
      zoneTypes: 13,
      tags: 25,
      locations: 93,
      peopleWithoutRole: ['OWN'],
    });
    const people = listPeople(db, summary.projectId);
    expect(people.find((person) => person.code === 'OWN')).toMatchObject({ role: 'other', email: 'own@example.com' });
    expect(people.find((person) => person.code === 'C-AB')).toMatchObject({ role: 'subcontractor', email: null });
    expect(listTrades(db, summary.projectId).find((trade) => trade.code === 'LVS')?.nameEl).toBe('Ασθενή ρεύματα');
  });

  it('builds Villa 1 once and copies it to Villas 2 and 3', () => {
    const { projectId } = seedGennadi(db, sources());
    const nodes = listLocations(db, projectId);
    const childrenOf = (id: number | null) => nodes.filter((node) => node.parentId === id);
    const roots = childrenOf(null);
    expect(roots.map((node) => node.nameEl)).toEqual(['Γεννάδι 822Α']);
    const top = childrenOf(roots[0]!.id);
    expect(top.map((node) => node.nameEn)).toEqual([
      'Villa 1',
      'Villa 2',
      'Villa 3',
      'Site — shared infrastructure',
      'Off-site — supplier fabrication',
    ]);
    const shape = (villaId: number) =>
      childrenOf(villaId).map((level) => ({
        level: level.nameEn,
        spaces: childrenOf(level.id).map((space) => `${space.nameEn}:${space.zoneTypeId}`),
      }));
    expect(shape(top[0]!.id).map((level) => level.level)).toEqual(['Basement', 'Ground', 'Upper', 'Roof', 'External']);
    expect(shape(top[1]!.id)).toEqual(shape(top[0]!.id));
    expect(shape(top[2]!.id)).toEqual(shape(top[0]!.id));
    const kitchen = listZoneTypes(db, projectId).find((zone) => zone.nameEn === 'Kitchen');
    expect(nodes.filter((node) => node.zoneTypeId === kitchen?.id)).toHaveLength(3);
  });

  it('runs only once and leaves nothing behind when it fails', () => {
    seedGennadi(db, sources());
    expect(() => seedGennadi(db, sources())).toThrow('already exists');

    const fresh = openDatabase(':memory:');
    migrate(fresh, { backupsDir: 'unused' });
    const broken = {
      ...sources(),
      trades: [...tradesFromRows(TRADE_ROWS), { code: 'CAR', nameEn: 'Duplicate', nameEl: '', defEn: '', defEl: '' }],
    };
    expect(() => seedGennadi(fresh, broken)).toThrow();
    expect(fresh.prepare('SELECT COUNT(*) FROM projects').pluck().get()).toBe(0);
    fresh.close();
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/seed.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/server/seed/csv"`.

- [x] **Step 3: Create `src/server/seed/csv.ts`**

```ts
/** Parses RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF line ends, an optional byte-order mark. */
export function parseCsv(text: string): string[][] {
  const input = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input.charAt(i);
    if (inQuotes) {
      if (char !== '"') field += char;
      else if (input.charAt(i + 1) === '"') {
        field += '"';
        i += 1;
      } else inQuotes = false;
    } else if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && input.charAt(i + 1) === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
```

- [x] **Step 4: Create `src/server/seed/gennadi-data.ts`**

```ts
/**
 * Static seed data for Gennadi 822A (design §15). The source sheets are English only;
 * the Greek names of zone types, villas, levels and spaces are proposals the owner can rename in Lists.
 */
export const GENNADI_PROJECT = { code: 'cbg2401', name: 'Γεννάδι 822Α' } as const;

/** Ticking the root means the whole project, including Site and Off-site (design §15). */
export const PROJECT_ROOT = { nameEn: 'Gennadi 822A', nameEl: 'Γεννάδι 822Α' } as const;

export const VILLA_NAMES = [
  { nameEn: 'Villa 1', nameEl: 'Βίλα 1' },
  { nameEn: 'Villa 2', nameEl: 'Βίλα 2' },
  { nameEn: 'Villa 3', nameEl: 'Βίλα 3' },
] as const;

export const OTHER_TOP_LEVEL = [
  { nameEn: 'Site — shared infrastructure', nameEl: 'Κοινόχρηστες υποδομές' },
  { nameEn: 'Off-site — supplier fabrication', nameEl: 'Εκτός έργου' },
] as const;

export const ZONE_TYPES = [
  { key: 'living', nameEn: 'Living area', nameEl: 'Καθιστικό' },
  { key: 'kitchen', nameEn: 'Kitchen', nameEl: 'Κουζίνα' },
  { key: 'bedroom', nameEn: 'Bedroom', nameEl: 'Υπνοδωμάτιο' },
  { key: 'bathroom', nameEn: 'Bathroom', nameEl: 'Μπάνιο' },
  { key: 'hall', nameEn: 'Hall', nameEl: 'Χολ' },
  { key: 'stairs', nameEn: 'Stairs', nameEl: 'Σκάλα' },
  { key: 'machine_store', nameEn: 'Machine / store room', nameEl: 'Μηχανοστάσιο / αποθήκη' },
  { key: 'balcony', nameEn: 'Balcony', nameEl: 'Μπαλκόνι' },
  { key: 'pergola', nameEn: 'Pergola', nameEl: 'Πέργκολα' },
  { key: 'terrace', nameEn: 'Terrace', nameEl: 'Ταράτσα' },
  { key: 'pool_area', nameEn: 'Pool area', nameEl: 'Χώρος πισίνας' },
  { key: 'garden', nameEn: 'Garden', nameEl: 'Κήπος' },
  { key: 'entrance', nameEn: 'Entrance', nameEl: 'Είσοδος' },
] as const;
export type ZoneKey = (typeof ZONE_TYPES)[number]['key'];

interface SpaceSeed {
  nameEn: string;
  nameEl: string;
  zone: ZoneKey;
}
interface LevelSeed {
  nameEn: string;
  nameEl: string;
  spaces: readonly SpaceSeed[];
}

/** One villa, from the Zone sheet of Project Fields Lookups.xlsx ("Level - Space" rows, 24 spaces). */
export const VILLA_LEVELS: readonly LevelSeed[] = [
  {
    nameEn: 'Basement',
    nameEl: 'Υπόγειο',
    spaces: [
      { nameEn: 'Machine / store room', nameEl: 'Μηχανοστάσιο / αποθήκη', zone: 'machine_store' },
      { nameEn: 'Bedroom', nameEl: 'Υπνοδωμάτιο', zone: 'bedroom' },
      { nameEn: 'Bathroom', nameEl: 'Μπάνιο', zone: 'bathroom' },
      { nameEn: 'Hall', nameEl: 'Χολ', zone: 'hall' },
      { nameEn: 'Stairs', nameEl: 'Σκάλα', zone: 'stairs' },
    ],
  },
  {
    nameEn: 'Ground',
    nameEl: 'Ισόγειο',
    spaces: [
      { nameEn: 'Living area', nameEl: 'Καθιστικό', zone: 'living' },
      { nameEn: 'Kitchen', nameEl: 'Κουζίνα', zone: 'kitchen' },
      { nameEn: 'Bedroom', nameEl: 'Υπνοδωμάτιο', zone: 'bedroom' },
      { nameEn: 'Bathroom', nameEl: 'Μπάνιο', zone: 'bathroom' },
      { nameEn: 'Hall', nameEl: 'Χολ', zone: 'hall' },
      { nameEn: 'Stairs', nameEl: 'Σκάλα', zone: 'stairs' },
    ],
  },
  {
    nameEn: 'Upper',
    nameEl: 'Όροφος',
    spaces: [
      { nameEn: 'Bedroom', nameEl: 'Υπνοδωμάτιο', zone: 'bedroom' },
      { nameEn: 'Bathroom', nameEl: 'Μπάνιο', zone: 'bathroom' },
      { nameEn: 'Hall', nameEl: 'Χολ', zone: 'hall' },
      { nameEn: 'Balcony', nameEl: 'Μπαλκόνι', zone: 'balcony' },
      { nameEn: 'Pergola', nameEl: 'Πέργκολα', zone: 'pergola' },
    ],
  },
  {
    nameEn: 'Roof',
    nameEl: 'Δώμα',
    spaces: [{ nameEn: 'Terrace', nameEl: 'Ταράτσα', zone: 'terrace' }],
  },
  {
    nameEn: 'External',
    nameEl: 'Εξωτερικός χώρος',
    spaces: [
      { nameEn: 'Pergola East', nameEl: 'Πέργκολα ανατολική', zone: 'pergola' },
      { nameEn: 'Pergola West', nameEl: 'Πέργκολα δυτική', zone: 'pergola' },
      { nameEn: 'Pergola South', nameEl: 'Πέργκολα νότια', zone: 'pergola' },
      { nameEn: 'Pergola Barbecue', nameEl: 'Πέργκολα μπάρμπεκιου', zone: 'pergola' },
      { nameEn: 'Pool area', nameEl: 'Χώρος πισίνας', zone: 'pool_area' },
      { nameEn: 'Garden', nameEl: 'Κήπος', zone: 'garden' },
      { nameEn: 'Entrance', nameEl: 'Είσοδος', zone: 'entrance' },
    ],
  },
];

/** The 25 thematic groups of the References CSV, as tags (design §15). */
export const TAGS: readonly { nameEl: string; nameEn: string }[] = [
  { nameEl: 'Πλακάκια - Μάρμαρα', nameEn: 'Tiles - Marble' },
  { nameEl: 'Φωτιστικά Σώματα', nameEn: 'Light fittings' },
  { nameEl: 'Είδη Υγιεινής', nameEn: 'Sanitaryware' },
  { nameEl: 'Ηλεκτρικές Συσκευές', nameEn: 'Electrical appliances' },
  { nameEl: 'Λοιπός Κινητός Εξοπλισμός', nameEn: 'Other movable equipment' },
  { nameEl: 'Internet - Συναγερμός', nameEn: 'Internet - Alarm' },
  { nameEl: 'Ξυλουργικά - Πάγκοι', nameEn: 'Carpentry - Worktops' },
  { nameEl: 'Υδραυλικά', nameEn: 'Plumbing' },
  { nameEl: 'Ηλεκτρολογικά', nameEn: 'Electrical' },
  { nameEl: 'Κλιματισμός A/C', nameEn: 'Air conditioning' },
  { nameEl: 'Μόνωση - Στεγάνωση', nameEn: 'Insulation - Waterproofing' },
  { nameEl: 'Πέτρα', nameEn: 'Stone' },
  { nameEl: 'Λοιπά Κατασκευαστικά', nameEn: 'Other construction' },
  { nameEl: 'Σκάλα', nameEn: 'Stairs' },
  { nameEl: 'Κουφώματα', nameEn: 'Windows and doors' },
  { nameEl: 'Γυάλινα Στηθαία', nameEn: 'Glass balustrades' },
  { nameEl: 'Πισίνα', nameEn: 'Pool' },
  { nameEl: 'Πέργκολες', nameEn: 'Pergolas' },
  { nameEl: 'Περίφραξη', nameEn: 'Fencing' },
  { nameEl: 'Ντεκ Πισίνας', nameEn: 'Pool deck' },
  { nameEl: 'Διαμόρφωση περιβάλλοντος χώρου', nameEn: 'Landscaping' },
  { nameEl: 'Λοιπός Εξωτερικός Χώρος', nameEn: 'Other external areas' },
  { nameEl: 'Γκαραζόπορτα', nameEn: 'Garage door' },
  { nameEl: 'Τελικές εργασίες και έλεγχοι', nameEn: 'Fit-out and checks' },
  { nameEl: 'Διαχείριση', nameEn: 'Management' },
];

/** Imported verbatim except these corrections (design §15). */
export const TRADE_OVERRIDES: Readonly<Record<string, { nameEl?: string }>> = {
  LVS: { nameEl: 'Ασθενή ρεύματα' },
};
```

- [x] **Step 5: Create `src/server/seed/gennadi.ts`**

```ts
import type { PersonRole } from '../../domain';
import type { Db } from '../db/connection';
import { copyBranch, createLocation } from '../lists/locations';
import { createPerson } from '../lists/people';
import { createProject, findProjectByCode } from '../lists/projects';
import { createTag } from '../lists/tags';
import { createTrade } from '../lists/trades';
import { createZoneType } from '../lists/zone-types';
import {
  GENNADI_PROJECT,
  OTHER_TOP_LEVEL,
  PROJECT_ROOT,
  TAGS,
  TRADE_OVERRIDES,
  VILLA_LEVELS,
  VILLA_NAMES,
  ZONE_TYPES,
  type ZoneKey,
} from './gennadi-data';

export interface SeedPerson {
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface SeedTrade {
  code: string;
  nameEn: string;
  nameEl: string;
  defEn: string;
  defEl: string;
}

export interface SeedSummary {
  projectId: number;
  projectCode: string;
  people: number;
  trades: number;
  zoneTypes: number;
  tags: number;
  locations: number;
  /** Codes no prefix rule matched: stored as "other"; the owner sets owner / owner's representative by hand. */
  peopleWithoutRole: string[];
}

const cell = (row: readonly string[], index: number): string => (row[index] ?? '').trim();

function columnFinder(header: readonly string[], source: string): (name: string) => number {
  return (name) => {
    const index = header.findIndex((value) => value.trim() === name);
    if (index < 0) throw new Error(`${source}: column "${name}" not found`);
    return index;
  };
}

/** Role from the code prefix (design §15); null when no rule applies. */
export function roleForCode(code: string): PersonRole | null {
  if (code.startsWith('ARCH')) return 'architect';
  if (code === 'C-PB') return 'main_contractor';
  if (code.startsWith('C-')) return 'subcontractor';
  if (code.startsWith('SUP')) return 'supplier';
  if (code.startsWith('O3P')) return 'other';
  return null;
}

/**
 * People from the References CSV. Its contact table (Full Name, Initials, Email, Phone) and owner table
 * (Owner Initials, Owner Full Name) do not line up row by row, so they are merged by code.
 */
export function extractPeople(rows: readonly (readonly string[])[]): SeedPerson[] {
  const column = columnFinder(rows[0] ?? [], 'References CSV');
  const initials = column('Initials');
  const fullName = column('Full Name');
  const email = column('Email');
  const phone = column('Phone');
  const ownerCode = column('Owner Initials');
  const ownerName = column('Owner Full Name');
  const people = new Map<string, SeedPerson>();
  for (const row of rows.slice(1)) {
    const code = cell(row, initials);
    if (code !== '' && !people.has(code)) {
      people.set(code, {
        code,
        name: cell(row, fullName) || code,
        email: cell(row, email) || null,
        phone: cell(row, phone) || null,
      });
    }
  }
  for (const row of rows.slice(1)) {
    const code = cell(row, ownerCode);
    if (code !== '' && !people.has(code)) {
      people.set(code, { code, name: cell(row, ownerName) || code, email: null, phone: null });
    }
  }
  return [...people.values()];
}

/** Trades from the Trades sheet, read by column name; rows without a code are skipped. */
export function tradesFromRows(rows: readonly (readonly string[])[]): SeedTrade[] {
  const column = columnFinder(rows[0] ?? [], 'Trades sheet');
  const code = column('code_en');
  const nameEn = column('english_one_word');
  const defEn = column('english_description');
  const nameEl = column('greek_one_word');
  const defEl = column('greek_description');
  return rows
    .slice(1)
    .map((row) => ({
      code: cell(row, code),
      nameEn: cell(row, nameEn),
      nameEl: cell(row, nameEl),
      defEn: cell(row, defEn),
      defEl: cell(row, defEl),
    }))
    .filter((trade) => trade.code !== '');
}

/** Creates the Gennadi 822A project with its managed lists in one transaction; refuses to run twice. */
export function seedGennadi(
  db: Db,
  sources: { people: readonly SeedPerson[]; trades: readonly SeedTrade[] },
): SeedSummary {
  return db.transaction((): SeedSummary => {
    if (findProjectByCode(db, GENNADI_PROJECT.code)) {
      throw new Error(`Project ${GENNADI_PROJECT.code} already exists; the seed runs only once`);
    }
    const project = createProject(db, GENNADI_PROJECT);

    const peopleWithoutRole: string[] = [];
    for (const person of sources.people) {
      const role = roleForCode(person.code);
      if (role === null) peopleWithoutRole.push(person.code);
      createPerson(db, project.id, { ...person, role: role ?? 'other' });
    }
    for (const trade of sources.trades) createTrade(db, project.id, { ...trade, ...TRADE_OVERRIDES[trade.code] });

    const zoneIds = new Map<ZoneKey, number>();
    for (const zone of ZONE_TYPES) {
      zoneIds.set(zone.key, createZoneType(db, project.id, { nameEn: zone.nameEn, nameEl: zone.nameEl }).id);
    }
    for (const tag of TAGS) createTag(db, project.id, tag);

    // Build Villa 1 once, then copy it (design §15).
    const root = createLocation(db, project.id, { kind: 'other', ...PROJECT_ROOT });
    const [firstVilla, ...otherVillas] = VILLA_NAMES;
    const villa = createLocation(db, project.id, { parentId: root.id, kind: 'building', ...firstVilla });
    for (const level of VILLA_LEVELS) {
      const levelNode = createLocation(db, project.id, {
        parentId: villa.id,
        kind: 'level',
        nameEn: level.nameEn,
        nameEl: level.nameEl,
      });
      for (const space of level.spaces) {
        createLocation(db, project.id, {
          parentId: levelNode.id,
          kind: 'space',
          zoneTypeId: zoneIds.get(space.zone),
          nameEn: space.nameEn,
          nameEl: space.nameEl,
        });
      }
    }
    for (const names of otherVillas) copyBranch(db, project.id, villa.id, names);
    for (const names of OTHER_TOP_LEVEL) createLocation(db, project.id, { parentId: root.id, kind: 'building', ...names });

    const count = (table: string): number =>
      db.prepare(`SELECT COUNT(*) FROM ${table} WHERE project_id = ?`).pluck().get(project.id) as number;
    return {
      projectId: project.id,
      projectCode: project.code,
      people: count('people'),
      trades: count('trades'),
      zoneTypes: count('zone_types'),
      tags: count('tags'),
      locations: count('location_nodes'),
      peopleWithoutRole,
    };
  })();
}
```

- [x] **Step 6: Run to verify it passes**

Run: `npx vitest run tests/server/seed.test.ts` → PASS (6 tests). Then `npm run typecheck`.

- [x] **Step 7: Create `scripts/seed-gennadi.ts`**

```ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { loadEnvFile, openMigratedDatabase } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';
import { parseCsv } from '../src/server/seed/csv';
import { extractPeople, seedGennadi, tradesFromRows } from '../src/server/seed/gennadi';

// exceljs is CommonJS and its named exports are not detectable from ESM, so load it with require.
const ExcelJS = createRequire(import.meta.url)('exceljs') as typeof import('exceljs');
const EXPECTED_TRADES = 34;

const { values } = parseArgs({ options: { references: { type: 'string' }, lookups: { type: 'string' } } });
if (!values.references || !values.lookups) {
  console.error(
    'Usage: npm run seed:gennadi -- --references "<…Εκκρεμότητες v3-References.csv>" --lookups "<…Project Fields Lookups.xlsx>"',
  );
  process.exit(2);
}

const people = extractPeople(parseCsv(readFileSync(values.references, 'utf8')));

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(values.lookups);
const sheet = workbook.getWorksheet('Trades');
if (!sheet) throw new Error('Sheet "Trades" not found');
const tradeRows: string[][] = [];
sheet.eachRow({ includeEmpty: false }, (row) => {
  const cells: string[] = [];
  for (let column = 1; column <= 6; column += 1) cells.push(row.getCell(column).text);
  tradeRows.push(cells);
});
const trades = tradesFromRows(tradeRows);
if (trades.length !== EXPECTED_TRADES) {
  throw new Error(`Expected ${EXPECTED_TRADES} trades in the Trades sheet, found ${trades.length}`);
}

loadEnvFile();
const { db } = openMigratedDatabase(loadConfig());
try {
  const summary = seedGennadi(db, { people, trades });
  console.log(
    `Seeded ${summary.projectCode} (project id ${summary.projectId}): ${summary.people} people, ${summary.trades} trades, ` +
      `${summary.zoneTypes} zone types, ${summary.tags} tags, ${summary.locations} locations.`,
  );
  console.log(`Set the role by hand (owner / owner's representative) for: ${summary.peopleWithoutRole.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  db.close();
}
```

- [x] **Step 8: Seed the local development database from the real files**

The local database lives in the git-ignored `data/` folder; contact details stay out of the repository. Run (one line):

```bash
npm run seed:gennadi -- --references "X:/CBG/Prj/Internal projects/cbg2401 - Κατασκευή Γεννάδι 822Α/Παρακολούθηση Έργου/Γεννάδι 822Α - Εκκρεμότητες v3-References.csv" --lookups "X:/CBG/Prj/Internal projects/cbg2401 - Κατασκευή Γεννάδι 822Α/Project Tracking/Project Fields Lookups.xlsx"
```

Expected:

```text
Seeded cbg2401 (project id 1): 19 people, 34 trades, 13 zone types, 25 tags, 93 locations.
Set the role by hand (owner / owner's representative) for: KAN, KAN2, MAN, RG, GP
```

Running it a second time must print `Project cbg2401 already exists; the seed runs only once` and exit with code 1. Then run `git status --short` and confirm nothing under `data/` or `.env` is listed.

- [x] **Step 9: Commit**

```bash
git add src/server/seed scripts/seed-gennadi.ts tests/server/seed.test.ts
git commit -m "feat(server): seed import for Gennadi 822A"
```

### Task 12: Verify, record and close Plan 2

**Files:**

- Modify: `docs/designs/2026-10-02-v1-records-design.md` (§9.3, §11.6)
- Modify: `docs/plans/2026-10-03-plan-2-server-foundation.md` (metadata), `docs/plans/2026-10-02-v1-roadmap.md` (Plan 2 status)

- [x] **Step 1: Run the full suite and the type check**

Run: `npm test`
Verified at closeout: `Test Files  18 passed (18)` and `Tests  155 passed (155)` (Plan 1: 69; Plan 2: config 3, db 4, passwords 4, sessions 11, login limiter 10, auth API 16, domain lists 5, lists API 14, tags 6, locations 7, seed 6). The original 136-test forecast was superseded by added regression coverage; the preflight result above remains historical.
Verified: `npm run typecheck` exited 0 with no TypeScript diagnostics.

- [x] **Step 2: Update design §9.3 (tag matching, Decision 2)**

Replace:

```text
Fields: **name EL**, **name EN**. At least one name is required. Names are **unique within each language** after trimming and ignoring letter case.
```

with:

```text
Fields: **name EL**, **name EN**. At least one name is required. Names are **unique within each language** after trimming and ignoring letter case — and, because Greek capitals drop their accents, ignoring accents and final sigma too («ΠΕΤΡΑ» = «Πέτρα»).
```

- [x] **Step 3: Update design §11.6 (visitor IP, Decision 3)**

Replace:

```text
The server must therefore take the visitor IP from `CF-Connecting-IP`, trusting it only from Cloudflare (login rate limiting, logs).
```

with:

```text
The server takes the visitor IP from `CF-Connecting-IP` when `BEHIND_CLOUDFLARE=1` (login rate limiting, logs). The application cannot check that a request really came through Cloudflare — Hetzner's web server is its direct peer — so the login limiter also caps failed logins globally. Restricting the origin to Cloudflare's address ranges is decided in Plan 6.
```

- [x] **Step 4: Update this plan's metadata**

Set `> **Status:** Completed`, `> **Retention:** Historical — do not execute.`, `> **Implemented by:**` the Plan 2 commit range (first..last hash), and `> **Verified:**` with the date and the two results of Step 1.

- [x] **Step 5: Update the roadmap**

In `docs/plans/2026-10-02-v1-roadmap.md`, change the Plan 2 row's status from `Written` to `Completed`.

- [x] **Step 6: Commit**

```bash
git add docs/designs/2026-10-02-v1-records-design.md docs/plans/2026-10-03-plan-2-server-foundation.md docs/plans/2026-10-02-v1-roadmap.md
git commit -m "docs: record Plan 2 completion; design §9.3 and §11.6 clarified"
```

---

## Hand-over to later plans

- **Plan 3 (records):**
  - When the record–tag link table exists, `mergeTag` must move the source tag's links to the target inside its transaction, dropping links the target already has.
  - `deleteTag` must report how many records are affected, and the confirmation needs that count.
  - `deleteLocation` must refuse (`409`) when any record uses the node or its descendants, so the owner retires it instead.
  - Location filters use `subtreeIds`.
  - People, trades and location nodes with `active = false` stay valid on existing records but are refused for new selections.
- **Plan 4 (files and sharing):**
  - Upload routes set `config: { multipart: true }` (see `guards.ts`).
  - Share tokens in URLs must be removed from request logs: replace Fastify's `req` log serializer so the raw token never reaches a log (design §11.5).
- **Plan 5 (web):**
  - The Vite dev server must proxy `/api`, so the browser's `Origin` equals `PUBLIC_BASE_URL`.
  - Every state-changing request sends `content-type: application/json` with a JSON body, even DELETE (send `{}`).
- **Plan 6 (operations):**
  - Production cannot run TypeScript through `tsx`, which is a dev dependency. Add a build step and point konsoleH's script path at the built entry point.
  - Set these variables in konsoleH: `BUILTBASIS_DATA_DIR`, `PUBLIC_BASE_URL=https://builtbasis.ktimanet.com`, `BEHIND_CLOUDFLARE=1`.
  - Decide how the production database gets its seed. Either seed a fresh database file locally and upload it before first start, or upload the two source files temporarily.
  - Nightly backups reuse `backupDatabase(db, backupsDir, 'nightly')` and add rotation.
  - Decide whether to restrict the origin to Cloudflare's address ranges (Decision 3).
  - Create the owner account on the server with `npm run owner -- <username>` over SSH.
