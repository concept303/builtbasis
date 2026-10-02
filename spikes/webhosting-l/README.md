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
