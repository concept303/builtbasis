# Architecture

> **Document type:** Architecture · **Status:** Current for implemented Plans 0–5, Plan 6 and the locally verified project/managed-list refresh (2026-10-04) · Kept deliberately short for the MVP; details in `docs/designs/2026-10-02-v1-records-design.md` §11.

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

Hosting target: Hetzner Webhosting L at `builtbasis.ktimanet.com` (addon domain, Node.js). See ADR 0001. Release `6247a9f` is active. Final Plan 6 acceptance remains in progress; see the [release checklist](guides/release-checklist.md).

## Parts

| Part | Responsibility |
|---|---|
| `src/domain` | Pure TypeScript shared by server and browser: schemas, value lists (EN/EL), status rules, measurement comparisons. No I/O. |
| `src/server` | API, named-user authentication, grants, share links, data access, file storage and compiled browser serving. |
| `src/web` | React entrypoint, English/Greek screens, photo preparation and protected viewers; Vite builds `dist/web`. |
| `scripts/` | Owner/contributor administration, seed import, share revocation, backup/export/restore, compiled releases and Windows transfer tools. Server cron and the Windows pull are installed and have completed scheduled acceptance runs. |

## Browser delivery

Fastify serves the built React entrypoint and hashed assets from `dist/web`. The shell uses no-store, noindex, no-referrer and a restrictive CSP. Only hashed assets receive long caching. Explicit browser routes cannot turn unknown API routes, missing assets or data-directory paths into SPA responses. Vite proxies `/api` during local development.

HEIC conversion and EML/MSG parsing use bundled local workers. PDF.js renders authorized PDF bytes to canvas with a local worker. Photo originals remain immutable. Shared media is fetched with bearer authorization; shared SVG is rasterized before display. Owner/contributor native media routes retain cookie authorization and range support. Unavailable previews retain original downloads. No third-party runtime resources are needed.

See the [web interface guide](guides/web-interface.md) for commands and browser limits. A3 printing uses a strict owner-only projection and desktop browser Save as PDF. QR is optional, off by default, and unavailable for Drafts. Administration shows full server-backup/storage status; other owner pages show warning-only notices.

Consistent SQLite snapshots are pinned before off-site transfer. Manifests preserve source backup time separately from transfer time; verification checks every referenced blob and source freshness. Offline restore creates a fresh directory and clears old access before publication. Compiled server/CLI entrypoints live in `dist/server`; deployment copies only built files and package manifests. The hosted release, scheduled transfers and populated offsite restore have been exercised. Remaining device, upstream logging and release acceptance details are tracked in the release checklist.

Project management uses owner-only API routes and monotonic numeric sequences for project and record IDs. Project deletion is a single database transaction; record grants and sharing end with the project while immutable blobs remain available to backups. Managed lists use compact tables; location administration uses a hierarchy and one selected-node editor.

## Boundaries

- Plans 0–5 are merged to main. Plan 5 browser delivery was merged at `a681e53`; final integration review passed.
- Owner screens use owner detail routes. Contributor screens use assigned-record public projections and independent Upload/Add Log grants. Anonymous shared screens use public projections and send the fragment token only as a bearer header. Account administration stays in the CLI.
- The owner alone edits record fields, Notes and existing content. Anonymous share links stay read-only. Both contributor and share responses exclude private content.
- Direct-origin requests are possible on the current host. `BEHIND_CLOUDFLARE=0` ignores untrusted visitor-IP headers; the global login failure limit remains enabled.
- The data folder (database, files, backups) is separate from the application folder and never touched by deployment.
- All database access sits in `src/server` data-access modules.

## Later (not v1)

Python specialist services for AI, document/drawing analysis, computer vision or analytics, called from the Node backend when a feature needs them. PostgreSQL if concurrency or multi-tenancy require it. Offline and mobile clients against the same API.
