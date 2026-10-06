# BuiltBasis

Lightweight construction-control application for quality issues, detail clarifications and tasks, in English and Greek. It combines measurements, decisions, evidence files, named contributors and read-only share links.

**Status:** Plans 0–5 are implemented and merged to `main`. Plan 6 Tasks 1–3 are implemented and merged to `main`: A3 printing, Administration, backup/export/restore and release tools. Verification on 2026-10-04 passed builds, TypeScript, 503 unit/API tests across 71 files and 55 browser tests across 11 specs. Release 6247a9f is active on Hetzner. Scheduled server/PC backups, the populated off-site restore and the hosted recovery cutover/return rehearsal passed. Mobile viewer layout is corrected and verified live. Remaining release-acceptance items and documentation closeout are tracked in the release checklist.

## Local dependency installation

Use the locked dependencies and shipped SQLite binary:

```sh
npm ci --ignore-scripts
npm rebuild esbuild
```

On this Windows machine, ordinary `npm ci` with npm 11.6.2 and 11.19.0 incorrectly attempted a SQLite source build despite the package declaring `gypfile: false`. Reassess install scripts when dependencies change. Use each completed plan's verification record for current test counts.

## Run the browser locally

Use Node 22.13 or newer. Configure the local environment and accounts using the [web interface guide](docs/guides/web-interface.md).

```sh
npm run web:build
npm start
```

For development, run `npm run dev` and `npm run web:dev` in separate terminals with the matching browser origin described in the guide. Verification uses `npm run typecheck`, `npm test` and `npm run test:browser` after building. The guide covers browser installation and isolated test servers.

## Printing and Administration

Open Print / Save PDF from a record. Include QR link is off by default; Drafts can be printed without sharing. Administration always shows server backup and storage status. Other owner screens show only warnings. The remaining-file warning defaults to 5 GB (`FILES_WARNING_BELOW_BYTES`); the backup-age warning defaults to 36 hours (`BACKUP_MAX_AGE_HOURS`).

`npm run build` produces the web interface and compiled Node entrypoints under `dist`. See the [deployment guide](docs/guides/deployment.md), [backup guide](docs/guides/backup-restore.md) and [release checklist](docs/guides/release-checklist.md) for live operation and the remaining acceptance checks. The [proposed v1 specification](docs/specs/v1.md) awaits release reconciliation.

## Access and evidence contract

There is one owner and separately named contributor accounts. The owner grants access per record. Upload and Add Log are independent permissions. Contributors cannot edit record fields or either Notes field. Public Notes are visible to readers. Private Notes, commercial fields, private Log entries and their attachments remain owner-only. Both Notes fields are edited by the owner. Public share links remain read-only.

Plan 4 adds interactive administrative commands to create, reset, disable and enable contributors. It adds grant APIs and assigned-record APIs. The browser provides screens to display and select existing CLI-provisioned accounts, manage their record grants, and support contributor workflows. Account creation and password administration stay with the CLI. Display names identify contributors on visible evidence; login usernames are not public attribution.

Uploads have a **100,000,000-byte total multipart request-body limit**, including metadata, part headers and boundaries. A file or photo original shares that budget with the rest of the request. Browser-generated photo display and thumbnail copies have separate 5,000,000 and 500,000-byte limits. The 145-extension catalog is exported by `src/domain/files.ts` for server validation and browser file pickers. Office, CAD/BIM and archive files are stored for download.

Image, PDF, audio and video attachments have authorized native-view routes with download fallback. GET supports single byte ranges; HEAD returns headers without opening a file stream. Browser codec support still determines playback. The browser reads EML/MSG using authorized original bytes in a local worker. The server does not parse email.

## Documentation

| Document | Purpose |
|---|---|
| [docs/VISION.md](docs/VISION.md) | What we are building and why |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System structure |
| [Data model](docs/reference/data-model.md) | Conceptual relationships, logical model and SQLite schema |
| [Record UI and work packages — consolidated design](docs/designs/2026-10-06-record-ui-and-work-packages-design.md) | Current draft for review, including iteration 7 and accepted wording |
| [docs/adr/0001-v1-stack-and-hosting.md](docs/adr/0001-v1-stack-and-hosting.md) | Stack and hosting decision |
| [docs/designs/2026-10-02-v1-records-design.md](docs/designs/2026-10-02-v1-records-design.md) | Approved v1 design and reconciled scope decisions |
| [docs/plans/2026-10-02-v1-roadmap.md](docs/plans/2026-10-02-v1-roadmap.md) | Plan sequence and implementation status |
| [Plan 5 — Web interface](docs/plans/2026-10-04-plan-5-web-interface.md) | Historical execution plan, actual delivery evidence and separate planning replay |
| [Plan 6 — Print, PDF and operations](docs/plans/2026-10-04-plan-6-print-and-operations.md) | Active implementation/release plan; Tasks 1–3 complete locally, Tasks 4–6 pending |
| [docs/guides/share-key-management.md](docs/guides/share-key-management.md) | Key/account operations, access rules and Plan 6 handoff |
| [Web interface guide](docs/guides/web-interface.md) | Local build, development, browser checks and screen operation |
| [Server directory layout](docs/guides/deployment.md#server-directory-layout) | Server folders/files, deployment handling, retained recovery material and the PC backup layout |
| [Email viewer probe](docs/research/fixtures/2026-10-03-email-viewer-probe) | Synthetic browser-parser evidence for the Plan 5 EML/MSG reader |
| [docs/research/2026-10-02-issue-and-clarification-tracking-research.md](docs/research/2026-10-02-issue-and-clarification-tracking-research.md) | Market and terminology research |

Documentation follows `X:\1976KN\Dev\Code\DOCS-STANDARD.md` (v1.4).

## Share-key setup

Plan 4 requires `SHARE_LINK_KEY`, a dedicated random 32-byte key encoded as 64 hexadecimal characters. Store it in private server configuration outside the repository, data directory and backups. Preserve it across deployments. Offline owner, contributor, seed and share-revocation commands permit an absent key.

After key loss or replacement, stop the application and run `npm run shares:revoke-all` against the intended data directory. Install a newly generated key in private configuration, restart, and issue replacement links. Startup also revokes unrevoked links when the key fingerprint changes. Never publish a key or put it in command logs.

**Storage configuration for Plan 4:** HTTP startup requires explicit `FILES_STORAGE_BUDGET_BYTES` and `FILES_FREE_RESERVE_BYTES`. One upload-writing process enforces the total managed-file budget, concurrent reservations and the free-space reserve. No per-user quota or published-file deletion is added. Plan 6 chooses values against the actual hosting allowance and documents the capacity response.
