# Plan 0 — Webhosting L Trial Implementation Plan

> **Document type:** Implementation plan
> **Status:** Approved
> **Retention:** Active until the trial is completed and its results are recorded; historical afterwards.
> **Implements:** `docs/designs/2026-10-02-v1-records-design.md` §11.9 (test deployment), informing §11.6 and §11.8.
> **Implemented by:** Not implemented
> **Verified:** Not verified
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tasks 2–7 need the owner's Hetzner konsoleH access and SSH; an agent prepares commands and records results, the owner performs console actions.

**Goal:** Establish, with evidence, whether Hetzner Webhosting L can host BuiltBasis v1 as designed (Node app on `builtbasis.ktimanet.com`, SQLite on local disk, restart, memory, PDF, cron backups).

**Architecture:** A throwaway spike in `spikes/webhosting-l/`: a minimal Fastify server that writes to SQLite in a data folder outside the app folder, a Playwright PDF check, and a backup check using `VACUUM INTO` + `integrity_check` + rename. Results are recorded in the spike README and fed back into the design.

**Tech Stack:** Node.js (22 or 24, as offered by konsoleH), Fastify 5, better-sqlite3, Playwright (Chromium), Hetzner konsoleH, SSH, cron.

---

## File structure

| File | Responsibility |
|---|---|
| `spikes/webhosting-l/package.json` | Spike dependencies (fastify, better-sqlite3) and lockfile for `npm ci` |
| `spikes/webhosting-l/server.mjs` | `/health`: Node/SQLite versions, journal mode, write counter, memory |
| `spikes/webhosting-l/pdf-check.mjs` | Renders an A3 landscape PDF with Greek text via Playwright |
| `spikes/webhosting-l/backup-check.mjs` | `VACUUM INTO` temp file → `integrity_check` → rename |
| `spikes/webhosting-l/README.md` | How to run; **results table** (the deliverable) |

Server layout used by the trial (from design §11.6): application folder `~/builtbasis-spike/`, data folder `~/builtbasis-data/` (separate, never touched by uploads).

---

### Task 1: Prepare and run the spike locally

**Files:**

- Create: `spikes/webhosting-l/package.json`
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

Run (in `spikes/webhosting-l`): `npm install fastify@5 better-sqlite3@13`
Expected: `added N packages` and a new `package-lock.json`. No `gyp ERR!` lines.

- [ ] **Step 3: Create `spikes/webhosting-l/server.mjs`**

```js
import Fastify from 'fastify';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = process.env.BUILTBASIS_DATA_DIR;
if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');
mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'spike.db'));
db.exec('CREATE TABLE IF NOT EXISTS hits (id INTEGER PRIMARY KEY, at TEXT NOT NULL)');

const app = Fastify({ logger: true });

app.get('/health', async () => {
  db.prepare('INSERT INTO hits (at) VALUES (?)').run(new Date().toISOString());
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM hits').get();
  return {
    ok: true,
    node: process.version,
    sqlite: db.prepare('SELECT sqlite_version() AS v').get().v,
    journalMode: db.pragma('journal_mode', { simple: true }),
    hits: n,
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
import Database from 'better-sqlite3';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = process.env.BUILTBASIS_DATA_DIR;
if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');

const backupsDir = join(dataDir, 'backups');
mkdirSync(backupsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const tmp = join(backupsDir, `spike-${stamp}.db.tmp`);
const final = join(backupsDir, `spike-${stamp}.db`);

const db = new Database(join(dataDir, 'spike.db'));
db.prepare('VACUUM INTO ?').run(tmp);
db.close();

const check = new Database(tmp, { readonly: true });
const result = check.pragma('integrity_check', { simple: true });
check.close();
if (result !== 'ok') {
  rmSync(tmp);
  throw new Error(`integrity_check failed: ${result}`);
}
renameSync(tmp, final);
console.log(`backup ok: ${final}`);
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
| 2 | `npm ci` installs better-sqlite3 on the server | | |
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
Expected: JSON with `"ok":true`, a `node` version, an `sqlite` version, `"journalMode":"delete"`, `"hits":1`.
Then stop the server and run `BUILTBASIS_DATA_DIR=./data node backup-check.mjs`
Expected: `backup ok: data/backups/spike-<timestamp>.db`

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

Expected: the listing shows `README.md backup-check.mjs package-lock.json package.json pdf-check.mjs server.mjs`. Also record whether `rsync` exists on the server (`ssh USER@HOST 'command -v rsync'`) — Plan 6 chooses the deploy transfer method from this.

- [ ] **Step 2: Install on the server**

```bash
ssh USER@HOST 'cd builtbasis-spike && node --version && npm ci'
```

Expected: a Node version (v22.x or v24.x) and `added N packages`, with no `gyp ERR!`. Record the outcome as check 2. If `better-sqlite3` fails to build, record the error; the design's fallback is Node's built-in `node:sqlite`.

### Task 4: Check the data folder's filesystem (check 3)

- [ ] **Step 1:**

```bash
ssh USER@HOST 'mkdir -p builtbasis-data && df -T builtbasis-data && stat -f -c %T builtbasis-data'
```

Expected: a local filesystem type (e.g. `ext4`, `xfs`). **If the type is `nfs`, `nfs4`, `cifs`, `smb`, `fuse` or similar network filesystem, check 3 fails** → production does not go live on Webhosting L (design §11.9). Record the exact output.

### Task 5: Run the app; verify domain isolation, restart and memory (checks 1, 4, 5)

- [ ] **Step 1:** Read the Node.js examples on Hetzner's page _Node.js Configuration_ (docs.hetzner.com → konsoleH → Node.js) and note how the app must listen (port environment variable, fixed port, or socket). If it differs from `server.mjs` (PORT env, `0.0.0.0`), adjust `server.mjs`, re-upload (Task 3 Step 1) and record the mechanism in the README.
- [ ] **Step 2:** In konsoleH → domain **builtbasis.ktimanet.com** → Services → Node.js configuration: script path `builtbasis-spike/server.mjs`, working directory `builtbasis-spike/`, log file `builtbasis-spike/log.txt`, memory limit = **the highest value offered** (record it as check 5), version = 24 (or 22), environment variable `BUILTBASIS_DATA_DIR` = absolute path of `~/builtbasis-data`. Activate.
- [ ] **Step 3: Verify**

```bash
curl -s https://builtbasis.ktimanet.com/health
curl -s -o /dev/null -w "%{http_code}\n" https://ktimanet.com
```

Expected: JSON with `"ok":true` (record `node`, `sqlite`, `journalMode`, `rssMb`); WordPress returns `200`. Both together = check 1 passed.

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
Expected: `backup ok: …` and a `spike-<timestamp>.db` file, no `.tmp` left. Record as check 7. Then delete the cron job.

### Task 8: Record results and decide

**Files:**

- Modify: `spikes/webhosting-l/README.md` (results table)
- Modify: `docs/designs/2026-10-02-v1-records-design.md` (§11.9, §16)
- Modify: `docs/plans/2026-10-02-plan-0-webhosting-trial.md` (metadata)

- [ ] **Step 1:** Fill every row of the README results table with result (pass/fail) and evidence (command output excerpt), plus listen mechanism, Node path and memory limit.
- [ ] **Step 2: Go / no-go.** **Go** requires checks 1, 2, 3, 4, 7 to pass. Check 5 is informational. Check 6 only selects the PDF path (§11.8). **No-go** (any required check fails): stop and report to the owner; alternative hosting is the owner's decision (§11.9).
- [ ] **Step 3:** Update the design: in §11.9 add "Trial completed YYYY-MM-DD — see `spikes/webhosting-l/README.md`"; in §16 resolve items 3 (restart, memory) and 4 (PDF path) with the findings.
- [ ] **Step 4:** Update this plan's metadata (`Status: Completed`, `Verified:` date and evidence) and commit:

```bash
git add spikes/webhosting-l/README.md docs/designs/2026-10-02-v1-records-design.md docs/plans/2026-10-02-plan-0-webhosting-trial.md
git commit -m "docs: record Webhosting L trial results"
```

- [ ] **Step 5:** Clean up the server spike after Plan 6 go-live preparation: deactivate the spike app, delete `~/builtbasis-spike` and `~/builtbasis-data/spike.db`, `pdf-check.pdf`, `backup-check.log`, `backups/spike-*`.
