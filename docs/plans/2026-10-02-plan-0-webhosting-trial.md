# Plan 0 — Webhosting L Trial Implementation Plan

> **Document type:** Implementation plan
> **Status:** Completed
> **Retention:** Historical — do not execute. Remaining action: Task 8 Step 5 (server clean-up) during Plan 6 go-live preparation.
> **Implements:** `docs/designs/2026-10-02-v1-records-design.md` §11.9 (test deployment), informing §11.6 and §11.8.
> **Implemented by:** Branch `feat/plan-0-webhosting-trial`: `f3ccc78` (spike), `801b2f5` (listen like Hetzner), `7afbd3c`..`5bc1376` (trial log), plus the results commit
> **Verified:** 2026-10-03 on Webhosting L — GO: checks 1, 2, 3, 4, 7 pass; 6 fails (browser-print fallback); memory limit 384 MB. Evidence: `spikes/webhosting-l/README.md`.
> **Checklist note:** checkboxes are preserved history; the trial log in the spike README is the record of what was done.
> **Deviations:** HTTPS via Cloudflare proxy + existing Cloudflare Origin Certificate instead of Let's Encrypt (Task 2); SSH key added through konsoleH (Public SSH Keys) and IPv4 forced; better-sqlite3 install script approved via npm `allowScripts`; cron created at hosting-account level with Freetext `* * * * *` and a 705 wrapper script.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tasks 2–7 need the owner's Hetzner konsoleH access and SSH; an agent prepares commands and records results, the owner performs console actions.

**Goal:** Establish, with evidence, whether Hetzner Webhosting L can host BuiltBasis v1 as designed (Node app on `builtbasis.ktimanet.com`, SQLite on local disk, restart, memory, PDF, cron backups).

**Architecture:** A throwaway spike in `spikes/webhosting-l/`: a minimal Fastify server that writes to SQLite in a data folder outside the app folder, a Playwright PDF check, and a backup check using `VACUUM INTO` + `integrity_check` + rename. Results are recorded in the spike README and fed back into the design.

**Tech Stack:** Node.js (22 or 24, as offered by konsoleH), Fastify 5, better-sqlite3 (fallback: Node's built-in `node:sqlite`), Playwright (Chromium), Hetzner konsoleH, SSH, cron.

---

## File structure

| File | Responsibility |
|---|---|
| `spikes/webhosting-l/package.json` | Spike dependencies (fastify; better-sqlite3 as an optional dependency) and lockfile for `npm ci` |
| `spikes/webhosting-l/db.mjs` | Opens SQLite with better-sqlite3, falling back to Node's built-in `node:sqlite` |
| `spikes/webhosting-l/server.mjs` | `/health`: Node/SQLite versions, journal mode, write counter, memory |
| `spikes/webhosting-l/pdf-check.mjs` | Renders an A3 landscape PDF with Greek text via Playwright |
| `spikes/webhosting-l/backup-check.mjs` | `VACUUM INTO` temp file → `integrity_check` → rename |
| `spikes/webhosting-l/README.md` | How to run; **results table** (the deliverable) |

Server layout used by the trial (from design §11.6): application folder `~/builtbasis-spike/`, data folder `~/builtbasis-data/` (separate, never touched by uploads).

---

### Task 1: Prepare and run the spike locally

**Files:**

- Create: `spikes/webhosting-l/package.json`
- Create: `spikes/webhosting-l/db.mjs`
- Create: `spikes/webhosting-l/server.mjs`
- Create: `spikes/webhosting-l/pdf-check.mjs`
- Create: `spikes/webhosting-l/backup-check.mjs`
- Create: `spikes/webhosting-l/README.md`

- [ ] **Step 1: Create `spikes/webhosting-l/package.json`**

```json
{
  "name": "builtbasis-webhosting-spike",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.mjs"
  }
}
```

- [ ] **Step 2: Install the runtime dependencies (creates `package-lock.json`)**

Run (in `spikes/webhosting-l`): `npm install fastify@5` then `npm install --save-optional better-sqlite3@13`
Expected: `added N packages` each time and a new `package-lock.json`. `better-sqlite3` is listed under `optionalDependencies`, so a failed native build on the server will not abort `npm ci`.

- [ ] **Step 2b: Create `spikes/webhosting-l/db.mjs`** (same interface for both SQLite drivers)

```js
// Opens SQLite with better-sqlite3, or with Node's built-in node:sqlite as the fallback.
// SQLITE_DRIVER=node forces the fallback; SQLITE_DRIVER=better-sqlite3 forbids it.
function wrap(driver, db) {
  return {
    driver,
    exec: (sql) => db.exec(sql),
    run: (sql, ...params) => db.prepare(sql).run(...params),
    get: (sql, ...params) => db.prepare(sql).get(...params),
    close: () => db.close(),
  };
}

export async function openDatabase(path, { readonly = false } = {}) {
  if (process.env.SQLITE_DRIVER !== 'node') {
    try {
      const { default: Database } = await import('better-sqlite3');
      return wrap('better-sqlite3', new Database(path, { readonly }));
    } catch (error) {
      if (process.env.SQLITE_DRIVER === 'better-sqlite3') throw error;
      console.warn(`better-sqlite3 unavailable (${error.message}); using node:sqlite`);
    }
  }
  const { DatabaseSync } = await import('node:sqlite');
  return wrap('node:sqlite', new DatabaseSync(path, { readOnly: readonly }));
}
```

- [ ] **Step 3: Create `spikes/webhosting-l/server.mjs`**

```js
import Fastify from 'fastify';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from './db.mjs';

const dataDir = process.env.BUILTBASIS_DATA_DIR;
if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');
mkdirSync(dataDir, { recursive: true });

const db = await openDatabase(join(dataDir, 'spike.db'));
db.exec('CREATE TABLE IF NOT EXISTS hits (id INTEGER PRIMARY KEY, at TEXT NOT NULL)');

const app = Fastify({ logger: true });

app.get('/health', async () => {
  db.run('INSERT INTO hits (at) VALUES (?)', new Date().toISOString());
  return {
    ok: true,
    node: process.version,
    driver: db.driver,
    sqlite: db.get('SELECT sqlite_version() AS v').v,
    journalMode: db.get('PRAGMA journal_mode').journal_mode,
    hits: db.get('SELECT COUNT(*) AS n FROM hits').n,
    rssMb: Math.round(process.memoryUsage().rss / 1048576),
    dataDir,
  };
});

// Hetzner's Node.js examples decide how the app must listen (Task 5, Step 1).
// Default: PORT environment variable, all interfaces.
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
await app.listen({ port, host });
```

- [ ] **Step 4: Create `spikes/webhosting-l/pdf-check.mjs`**

```js
import { chromium } from 'playwright';
import { join } from 'node:path';

const dataDir = process.env.BUILTBASIS_DATA_DIR ?? '.';
const out = join(dataDir, 'pdf-check.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<h1>BuiltBasis PDF check</h1><p>Ελληνικό κείμενο: Ζήτημα ποιότητας, Τεχνική διευκρίνιση.</p>');
await page.pdf({ path: out, format: 'A3', landscape: true });
await browser.close();
console.log(`PDF written: ${out}`);
```

- [ ] **Step 5: Create `spikes/webhosting-l/backup-check.mjs`**

```js
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from './db.mjs';

const dataDir = process.env.BUILTBASIS_DATA_DIR;
if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');

const backupsDir = join(dataDir, 'backups');
mkdirSync(backupsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const tmp = join(backupsDir, `spike-${stamp}.db.tmp`);
const final = join(backupsDir, `spike-${stamp}.db`);

const db = await openDatabase(join(dataDir, 'spike.db'));
db.run('VACUUM INTO ?', tmp);
db.close();

const check = await openDatabase(tmp, { readonly: true });
const result = check.get('PRAGMA integrity_check').integrity_check;
check.close();
if (result !== 'ok') {
  rmSync(tmp);
  throw new Error(`integrity_check failed: ${result}`);
}
renameSync(tmp, final);
console.log(`backup ok (${db.driver}): ${final}`);
```

- [ ] **Step 6: Create `spikes/webhosting-l/README.md`**

````markdown
# Webhosting L spike (throwaway)

Evidence for design §11.9. Not production code.

## Run locally

```bash
npm ci
BUILTBASIS_DATA_DIR=./data PORT=3000 node server.mjs
curl http://127.0.0.1:3000/health
BUILTBASIS_DATA_DIR=./data node backup-check.mjs
```

## Results (fill in during Plan 0)

| # | Check (design §11.9) | Result | Evidence |
|---|---|---|---|
| 1 | Node active on builtbasis.ktimanet.com; ktimanet.com WordPress unaffected | | |
| 2 | SQLite works on the server (driver from /health: better-sqlite3, or fallback node:sqlite) | | |
| 3 | Data folder on local disk (filesystem type) | | |
| 4 | Restart mechanism after deployment | | |
| 5 | Maximum memory limit for the Node process | | |
| 6 | Playwright/Chromium runs | | |
| 7 | Cron can run `node` (backup check) | | |

**Listen mechanism used by Hetzner:** 
**Node binary path for cron:** 
**Go / no-go:** 
````

- [ ] **Step 7: Run locally and verify**

Run (in `spikes/webhosting-l`, Git Bash): `BUILTBASIS_DATA_DIR=./data PORT=3000 node server.mjs` and, in a second terminal, `curl http://127.0.0.1:3000/health`
Expected: JSON with `"ok":true`, `"driver":"better-sqlite3"`, a `node` version, an `sqlite` version, `"journalMode":"delete"`, `"hits":1`.
Then stop the server and run `BUILTBASIS_DATA_DIR=./data node backup-check.mjs`
Expected: `backup ok (better-sqlite3): data/backups/spike-<timestamp>.db`
Repeat both commands prefixed with `SQLITE_DRIVER=node` to prove the fallback (Node 24): expected `"driver":"node:sqlite"`, `"hits":2` and `backup ok (node:sqlite): …`. A Node `ExperimentalWarning` about SQLite is expected.

- [ ] **Step 8: Commit** (the `data/` folder is git-ignored)

```bash
git add spikes/webhosting-l
git commit -m "chore(spike): Webhosting L trial spike"
```

### Task 2: Create the addon domain and enable Node.js (owner, konsoleH)

- [ ] **Step 1:** In konsoleH, add **`builtbasis.ktimanet.com`** as an **addon domain** (separate domain entry, not a subdomain folder of ktimanet.com). Point its DNS as konsoleH instructs.
- [ ] **Step 2:** Confirm HTTPS (Let's Encrypt) is enabled for the addon domain.
- [ ] **Step 3:** Do **not** activate Node.js yet. Open `https://ktimanet.com` and confirm WordPress loads (baseline).

### Task 3: Upload the spike and install dependencies (check 2)

- [ ] **Step 1: Upload over SSH** (from the repo root, Git Bash, which includes `tar` and `ssh`; replace `USER@HOST` with the konsoleH SSH login)

```bash
tar --exclude=node_modules --exclude=data -czf - -C spikes/webhosting-l . | ssh USER@HOST 'mkdir -p builtbasis-spike && tar -xzf - -C builtbasis-spike && ls builtbasis-spike'
```

Expected: the listing shows `README.md backup-check.mjs db.mjs package-lock.json package.json pdf-check.mjs server.mjs`. Also record whether `rsync` exists on the server (`ssh USER@HOST 'command -v rsync'`) — Plan 6 chooses the deploy transfer method from this.

- [ ] **Step 2: Install on the server**

```bash
ssh USER@HOST 'cd builtbasis-spike && node --version && npm ci'
```

Expected: a Node version (prefer v24.x, where `node:sqlite` needs no flag) and `added N packages`. If the optional `better-sqlite3` build fails, `npm ci` still succeeds with a warning: record the warning. The app then uses `node:sqlite` automatically; check 2 is judged in Task 5 from the `driver` reported by `/health`.

### Task 4: Check the data folder's filesystem (check 3)

- [ ] **Step 1:**

```bash
ssh USER@HOST 'mkdir -p builtbasis-data && df -T builtbasis-data && stat -f -c %T builtbasis-data'
```

Expected: a local filesystem type (e.g. `ext4`, `xfs`). **If the type is `nfs`, `nfs4`, `cifs`, `smb`, `fuse` or similar network filesystem, check 3 fails** → production does not go live on Webhosting L (design §11.9). Record the exact output.

### Task 5: Run the app; verify domain isolation, restart and memory (checks 1, 4, 5)

- [x] **Step 1 (done 2026-10-02):** Hetzner's Hello World example calls `server.listen()` without arguments; `server.mjs` was adapted to do the same when `PORT` is unset (see spike README). Original instruction: read the Node.js examples on Hetzner's page _Node.js Configuration_ (docs.hetzner.com → konsoleH → Node.js) and note how the app must listen (port environment variable, fixed port, or socket). If it differs from `server.mjs` (PORT env, `0.0.0.0`), adjust `server.mjs`, re-upload (Task 3 Step 1) and record the mechanism in the README.
- [ ] **Step 2:** In konsoleH → domain **builtbasis.ktimanet.com** → Services → Node.js configuration: script path `server.mjs` (relative to the working directory), working directory `builtbasis-spike/`, log file `builtbasis-spike/log.txt`, memory limit = **the highest value offered** (record it as check 5), version = 24 (preferred; with 22, `node:sqlite` needs 22.13 or later), environment variable `BUILTBASIS_DATA_DIR` = absolute path of `~/builtbasis-data`. Activate.
- [ ] **Step 3: Verify**

```bash
curl -s https://builtbasis.ktimanet.com/health
curl -s -o /dev/null -w "%{http_code}\n" https://ktimanet.com
```

Expected: JSON with `"ok":true` (record `driver`, `node`, `sqlite`, `journalMode`, `rssMb`; any working `driver` passes check 2); WordPress returns `200`. Both together = check 1 passed.

- [ ] **Step 4: Restart test (check 4).** Change `server.mjs` to add `restartCheck: 1` to the `/health` response, upload (Task 3 Step 1), then restart the app using konsoleH (try deactivate/activate, or any restart control offered). Run `curl -s https://builtbasis.ktimanet.com/health` and confirm `restartCheck` appears and `hits` continued counting (data survived). Record the exact restart procedure.

### Task 6: Playwright / Chromium (check 6)

- [ ] **Step 1:**

```bash
ssh USER@HOST 'cd builtbasis-spike && npm install --no-save playwright@1 && npx playwright install chromium && BUILTBASIS_DATA_DIR=$HOME/builtbasis-data node pdf-check.mjs'
```

Expected (pass): `PDF written: …/builtbasis-data/pdf-check.pdf`. Download it (`scp USER@HOST:builtbasis-data/pdf-check.pdf .`) and confirm the Greek text renders.
Fail cases to record verbatim: missing shared libraries (e.g. `libnss3.so`), sandbox errors, or memory kills. A failure means the design's fallback applies (browser print, §11.8).

### Task 7: Cron runs Node (check 7)

- [ ] **Step 1:** `ssh USER@HOST 'which node'` — record the absolute path (cron does not load the shell profile).
- [ ] **Step 2:** In konsoleH → cron jobs, add a job running every hour (or the shortest interval offered):

```bash
cd $HOME/builtbasis-spike && BUILTBASIS_DATA_DIR=$HOME/builtbasis-data /ABSOLUTE/PATH/TO/node backup-check.mjs >> $HOME/builtbasis-data/backup-check.log 2>&1
```

- [ ] **Step 3:** After the next run: `ssh USER@HOST 'tail -n 5 builtbasis-data/backup-check.log && ls -l builtbasis-data/backups'`
Expected: `backup ok (<driver>): …` and a `spike-<timestamp>.db` file, no `.tmp` left. Record as check 7. Then delete the cron job.

### Task 8: Record results and decide

**Files:**

- Modify: `spikes/webhosting-l/README.md` (results table)
- Modify: `docs/designs/2026-10-02-v1-records-design.md` (§11.9, §16)
- Modify: `docs/plans/2026-10-02-plan-0-webhosting-trial.md` (metadata)

- [ ] **Step 1:** Fill every row of the README results table with result (pass/fail) and evidence (command output excerpt), plus listen mechanism, Node path and memory limit.
- [ ] **Step 2: Go / no-go.** **Go** requires checks 1, 2, 3, 4, 7 to pass. Check 2 passes with either driver; if it is `node:sqlite`, record that Plan 2 must use `node:sqlite` instead of `better-sqlite3` and update ADR 0001 and design §11.9 accordingly. Check 5 is informational. Check 6 only selects the PDF path (§11.8). **No-go** (any required check fails): stop and report to the owner; alternative hosting is the owner's decision (§11.9).
- [ ] **Step 3:** Update the design: in §11.9 add "Trial completed YYYY-MM-DD — see `spikes/webhosting-l/README.md`"; in §16 resolve items 3 (restart, memory) and 4 (PDF path) with the findings.
- [ ] **Step 4:** Update this plan's metadata (`Status: Completed`, `Verified:` date and evidence) and commit:

```bash
git add spikes/webhosting-l/README.md docs/designs/2026-10-02-v1-records-design.md docs/plans/2026-10-02-plan-0-webhosting-trial.md
git commit -m "docs: record Webhosting L trial results"
```

- [ ] **Step 5:** Clean up the server spike after Plan 6 go-live preparation: deactivate the spike app, delete `~/builtbasis-spike` and `~/builtbasis-data/spike.db`, `pdf-check.pdf`, `backup-check.log`, `backups/spike-*`.
