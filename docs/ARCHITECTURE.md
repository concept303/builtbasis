# Architecture

> **Document type:** Architecture · **Status:** Current for v1 (2026-10-02) · Kept deliberately short for the MVP; details in `docs/designs/2026-10-02-v1-records-design.md` §11.

## System

```
Browser (React/Vite, desktop + phone)
        │  HTTPS, JSON under /api
        ▼
Fastify / TypeScript (Node.js) ── serves the built web app
        │
        ├── SQLite database file  (data folder)
        └── Stored files, by content hash (data folder)
```

Hosted on Hetzner Webhosting L at `builtbasis.ktimanet.com` (addon domain, Node.js). See ADR 0001.

## Parts

| Part | Responsibility |
|---|---|
| `src/domain` | Pure TypeScript shared by server and browser: schemas, value lists (EN/EL), status rules, measurement comparisons. No I/O. |
| `src/server` | API, owner authentication, share links, data access, file storage, PDF. |
| `src/web` | User interface. |
| `scripts/` | Seed, backup, deploy. |

## Boundaries

- Plan 4 is implemented on main: named-user authentication and per-record grants allow uploads and new public Log entries. Browser screens for these capabilities are Plan 5 work.
- The owner alone edits record fields, Notes and existing content. Anonymous share links stay read-only. Both contributor and share responses exclude private content.
- The data folder (database, files, backups) is separate from the application folder and never touched by deployment.
- All database access sits in `src/server` data-access modules.

## Later (not v1)

Python specialist services for AI, document/drawing analysis, computer vision or analytics, called from the Node backend when a feature needs them. PostgreSQL if concurrency or multi-tenancy require it. Offline and mobile clients against the same API.
