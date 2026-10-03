# Architecture

> **Document type:** Architecture · **Status:** Current for implemented Plans 0–5 (2026-10-04) · Kept deliberately short for the MVP; details in `docs/designs/2026-10-02-v1-records-design.md` §11.

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

Hosting target: Hetzner Webhosting L at `builtbasis.ktimanet.com` (addon domain, Node.js). See ADR 0001. Production deployment remains Plan 6 work.

## Parts

| Part | Responsibility |
|---|---|
| `src/domain` | Pure TypeScript shared by server and browser: schemas, value lists (EN/EL), status rules, measurement comparisons. No I/O. |
| `src/server` | API, named-user authentication, grants, share links, data access, file storage and compiled browser serving. |
| `src/web` | React entrypoint, English/Greek screens, photo preparation and protected viewers; Vite builds `dist/web`. |
| `scripts/` | Owner/contributor administration, seed import and share revocation. Backup and deployment remain Plan 6 work. |

## Browser delivery

Fastify serves the built React entrypoint and hashed assets from `dist/web`. The shell uses no-store, noindex, no-referrer and a restrictive CSP. Only hashed assets receive long caching. Explicit browser routes cannot turn unknown API routes, missing assets or data-directory paths into SPA responses. Vite proxies `/api` during local development.

HEIC conversion and EML/MSG parsing use bundled local workers. PDF.js renders authorized PDF bytes to canvas with a local worker. Photo originals remain immutable. Shared media is fetched with bearer authorization; shared SVG is rasterized before display. Owner/contributor native media routes retain cookie authorization and range support. Unavailable previews retain original downloads. No third-party runtime resources are needed.

See the [web interface guide](guides/web-interface.md) for commands and browser limits. A3 printing, release PDF output, backup/restore and deployment remain Plan 6 work.

## Boundaries

- Plans 0–4 are merged to main. Plan 5 browser delivery is implemented on `feat/plan-5-web-interface`, not merged; final integration review is pending.
- Owner screens use owner detail routes. Contributor screens use assigned-record public projections and independent Upload/Add Log grants. Anonymous shared screens use public projections and send the fragment token only as a bearer header. Account administration stays in the CLI.
- The owner alone edits record fields, Notes and existing content. Anonymous share links stay read-only. Both contributor and share responses exclude private content.
- The data folder (database, files, backups) is separate from the application folder and never touched by deployment.
- All database access sits in `src/server` data-access modules.

## Later (not v1)

Python specialist services for AI, document/drawing analysis, computer vision or analytics, called from the Node backend when a feature needs them. PostgreSQL if concurrency or multi-tenancy require it. Offline and mobile clients against the same API.
