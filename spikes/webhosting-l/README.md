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

## Trial log

- **2026-10-03 — Task 2 done.** `builtbasis.ktimanet.com` added in konsoleH as an addon domain ("account; domain remains with previous provider") on the Webhosting L account `e7hi.your-vhost.de` — konsoleH accepted the subdomain. DNS for ktimanet.com is on Cloudflare: records `builtbasis` A `78.47.83.249` and AAAA `2a01:4f8:d0a:439e::2`, **Proxied**.
- **HTTPS — deviation from plan:** Let's Encrypt was not used (with external DNS konsoleH requires manual re-validation every 3 months). Instead, as for the owner's other sites: Cloudflare proxy (edge: Universal certificate `*.ktimanet.com`) + the existing Cloudflare Origin Certificate on Hetzner (`*.ktimanet.com, ktimanet.com`, expires 2039-11-10, verified with `openssl s_client` against 78.47.83.249). Cloudflare SSL/TLS mode confirmed by the owner: **Full (strict)**. `https://builtbasis.ktimanet.com/` → TLS verified, HTTP 404 (nothing deployed yet); `http://` → 301 to `https://`.
- **WordPress baseline:** `https://www.ktimanet.com/` → 200, title "Home - KtimaNet". Note: plain `curl` without a browser User-Agent gets 403 from the site's bot protection — use a browser User-Agent for checks.
- **2026-10-03 — SSH access.** Host `www555.your-server.de`, port 222, user `ktimana` (main FTP user); **IPv4 only** from the owner's network (`AddressFamily inet`). Keys must be added in konsoleH (hosting name → Public **SSH** Keys); konsoleH writes them to `~/.ssh/authorized_keys`. Dedicated key `~/.ssh/builtbasis_hetzner_ed25519`, alias `builtbasis-hetzner`. Server: Linux 6.1, Node v24.21.0 (`/usr/bin/node`), npm 11.19.0, `rsync` and `tar` present, **no C++ compiler**. Home `/usr/home/ktimana`; web root `/usr/www/users/ktimana` (separate).
- **2026-10-03 — Task 3 (check 2): pass.** Uploaded with tar over SSH to `~/builtbasis-spike`. `npm ci` → `added 51 packages`. npm 11.19 skips install scripts not listed in `allowScripts` (warning for `better-sqlite3@13.0.3`); approved on the server copy (`npm install-scripts approve better-sqlite3`, adds an entry to the server's `package.json`). better-sqlite3 13 ships prebuilt binaries (`prebuilds/linux-x64.node`), so no compilation is needed: `better-sqlite3 OK, sqlite 3.53.4`; `node:sqlite OK, sqlite 3.53.4`.
- **2026-10-03 — Task 4 (check 3): pass.** `~/builtbasis-data` → `/usr/home/ktimana/builtbasis-data` on `/dev/mapper/vg-usr`, **ext4**, local LVM volume (not a network filesystem). Mount options include `nobarrier` and user quotas — crash durability relies on Hetzner's hardware; mitigated by the designed nightly and off-site backups.
- **Plan 2 notes:** commit an `allowScripts` entry for any dependency with install scripts; avoid dependencies that need compiling (no compiler on the server). Behind Cloudflare, rate limiting and logging must use the visitor IP from `CF-Connecting-IP` (Fastify `trustProxy` restricted to Cloudflare ranges).

**Listen mechanism used by Hetzner:** Documented (docs.hetzner.com, konsoleH → Node.js, Hello World example): the app calls `server.listen()` **without arguments** and the platform routes requests; no port, host or socket is specified. `server.mjs` therefore listens without arguments when `PORT` is unset (verified locally 2026-10-02: OS-assigned port, `/health` OK). To confirm on the server in Task 5 Step 3.
**Node binary path for cron:** pending (Task 7)
**Go / no-go:** pending (Task 8)
