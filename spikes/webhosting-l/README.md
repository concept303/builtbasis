# Webhosting L spike (throwaway)

Evidence for design §11.9. Not production code.

## Run locally

```bash
npm ci
BUILTBASIS_DATA_DIR=./data PORT=3000 node server.mjs
curl http://127.0.0.1:3000/health
BUILTBASIS_DATA_DIR=./data node backup-check.mjs
```

## Results (Plan 0, 2026-10-03)

**Verdict: GO.** All required checks (1, 2, 3, 4, 7) pass. Check 6 fails, so the design's PDF fallback (browser print, §11.8) applies. Check 5 is informational.

| # | Check (design §11.9) | Result | Evidence |
|---|---|---|---|
| 1 | Node active on builtbasis.ktimanet.com; ktimanet.com WordPress unaffected | **Pass** | `GET https://builtbasis.ktimanet.com/health` → 200 `{"ok":true,"node":"v24.21.0","driver":"better-sqlite3",…,"rssMb":77}`; `https://www.ktimanet.com/` → 200 at the same time |
| 2 | SQLite works on the server (driver from /health: better-sqlite3, or fallback node:sqlite) | **Pass — better-sqlite3** | Prebuilt `linux-x64` binary loads, SQLite 3.53.4; `node:sqlite` also works (3.53.4). Plan 2 keeps `better-sqlite3`. |
| 3 | Data folder on local disk (filesystem type) | **Pass** | `/usr/home/ktimana/builtbasis-data` on `/dev/mapper/vg-usr`, ext4 (local LVM), not a network filesystem |
| 4 | Restart mechanism after deployment | **Pass** | Stopping the process (`kill <pid>`) is enough: the platform starts the app on the next request with the new code (`restartCheck` appeared, `hits` continued 1→2, cold start ≈ 1.3 s). No konsoleH action needed. |
| 5 | Maximum memory limit for the Node process | **384 MB** (shown in konsoleH; owner to confirm whether a higher value is accepted) | App RSS ≈ 77–78 MB |
| 6 | Playwright/Chromium runs | **Fail** | `error while loading shared libraries: libatk-bridge-2.0.so.0`; also missing `libgbm.so.1`, `libxkbcommon.so.0`, `libatspi.so.0`. No root, so they cannot be installed. Chromium download removed. |
| 7 | Cron can run `node` (backup check) | **Pass** | konsoleH cron (hosting account level, Freetext `* * * * *`, direct call of `backup-cron.sh`, mode 705) → `backup ok (better-sqlite3): …/spike-2026-10-02T17-10-01-989Z.db`, no `.tmp` left |

## Trial log

- **2026-10-03 — Task 2 done.** `builtbasis.ktimanet.com` added in konsoleH as an addon domain ("account; domain remains with previous provider") on the Webhosting L account `e7hi.your-vhost.de` — konsoleH accepted the subdomain. DNS for ktimanet.com is on Cloudflare: records `builtbasis` A `78.47.83.249` and AAAA `2a01:4f8:d0a:439e::2`, **Proxied**.
- **HTTPS — deviation from plan:** Let's Encrypt was not used (with external DNS konsoleH requires manual re-validation every 3 months). Instead, as for the owner's other sites: Cloudflare proxy (edge: Universal certificate `*.ktimanet.com`) + the existing Cloudflare Origin Certificate on Hetzner (`*.ktimanet.com, ktimanet.com`, expires 2039-11-10, verified with `openssl s_client` against 78.47.83.249). Cloudflare SSL/TLS mode confirmed by the owner: **Full (strict)**. `https://builtbasis.ktimanet.com/` → TLS verified, HTTP 404 (nothing deployed yet); `http://` → 301 to `https://`.
- **WordPress baseline:** `https://www.ktimanet.com/` → 200, title "Home - KtimaNet". Note: plain `curl` without a browser User-Agent gets 403 from the site's bot protection — use a browser User-Agent for checks.
- **2026-10-03 — SSH access.** Host `www555.your-server.de`, port 222, user `ktimana` (main FTP user); **IPv4 only** from the owner's network (`AddressFamily inet`). Keys must be added in konsoleH (hosting name → Public **SSH** Keys); konsoleH writes them to `~/.ssh/authorized_keys`. Dedicated key `~/.ssh/builtbasis_hetzner_ed25519`, alias `builtbasis-hetzner`. Server: Linux 6.1, Node v24.21.0 (`/usr/bin/node`), npm 11.19.0, `rsync` and `tar` present, **no C++ compiler**. Home `/usr/home/ktimana`; web root `/usr/www/users/ktimana` (separate).
- **2026-10-03 — Task 3 (check 2): pass.** Uploaded with tar over SSH to `~/builtbasis-spike`. `npm ci` → `added 51 packages`. npm 11.19 skips install scripts not listed in `allowScripts` (warning for `better-sqlite3@13.0.3`); approved on the server copy (`npm install-scripts approve better-sqlite3`, adds an entry to the server's `package.json`). better-sqlite3 13 ships prebuilt binaries (`prebuilds/linux-x64.node`), so no compilation is needed: `better-sqlite3 OK, sqlite 3.53.4`; `node:sqlite OK, sqlite 3.53.4`.
- **2026-10-03 — Task 4 (check 3): pass.** `~/builtbasis-data` → `/usr/home/ktimana/builtbasis-data` on `/dev/mapper/vg-usr`, **ext4**, local LVM volume (not a network filesystem). Mount options include `nobarrier` and user quotas — crash durability relies on Hetzner's hardware; mitigated by the designed nightly and off-site backups.
- **Plan 2 notes:** commit an `allowScripts` entry for any dependency with install scripts; avoid dependencies that need compiling (no compiler on the server). Behind Cloudflare, rate limiting and logging must use the visitor IP from `CF-Connecting-IP` (Fastify `trustProxy` restricted to Cloudflare ranges).

- **2026-10-03 — Task 5 (checks 1, 4, 5).** konsoleH → builtbasis.ktimanet.com → Node.js Configuration: script `server.mjs`, working directory `builtbasis-spike/`, log `builtbasis-spike/log.txt`, memory 384 MB, version 24, env `BUILTBASIS_DATA_DIR=/usr/home/ktimana/builtbasis-data`. The app runs as `/usr/local/nodejs/24/bin/node server.mjs`, is started on demand at the first request, and logs `platform listener: "/hosnodejssocket"`. Restart test: `kill 2354` → next request served by PID 5008 with the changed code.
- **2026-10-03 — Task 6 (check 6): fail.** `npm install --no-save playwright@1` + `npx playwright install chromium` (headless shell 153, 114 MB download) → launch fails on missing system libraries (see table). Cache (658 MB) and Playwright removed afterwards.
- **2026-10-03 — Task 7 (check 7): pass.** konsoleH offers the Cron Job Manager only at hosting-account level (`e7hi.your-vhost.de`); interval presets start at hourly, Freetext accepts `* * * * *`. Script `/usr/home/ktimana/builtbasis-spike/backup-cron.sh` (mode 705, absolute paths, calls `/usr/local/nodejs/24/bin/node`) also verified beforehand with an empty environment (`env -i`). The test cron job is deleted after the check.

**Listen mechanism used by Hetzner:** confirmed — the app calls `server.listen()` **without arguments**; the platform supplies a Unix socket (`/hosnodejssocket`) and routes requests to it. Listening on a fixed port is not used.
**Node binary path for cron:** `/usr/local/nodejs/24/bin/node` (the binary konsoleH runs; `/usr/bin/node` is a small wrapper).
**Go / no-go:** **GO** (2026-10-03).
