# BuiltBasis

Lightweight construction-control application: quality issues, detail clarifications and tasks — with measurements, decisions, photos and read-only sharing — in English and Greek.

**Status:** Plans 0–3 are complete. The server foundation and records API are implemented and merged to `main`. Plan 4 (files and sharing) is next (see roadmap).

## Local dependency installation

Use the locked dependencies and shipped SQLite binary:

```sh
npm ci --ignore-scripts
npm rebuild esbuild
```

On this Windows machine, ordinary `npm ci` with npm 11.6.2 and 11.19.0 incorrectly attempted a SQLite source build despite the package declaring `gypfile: false`. The commands above were verified with all 155 tests and typechecking. Reassess install scripts when dependencies change.

## Documentation

| Document | Purpose |
|---|---|
| [docs/VISION.md](docs/VISION.md) | What we are building and why |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System structure |
| [docs/adr/0001-v1-stack-and-hosting.md](docs/adr/0001-v1-stack-and-hosting.md) | Stack and hosting decision |
| [docs/designs/2026-10-02-v1-records-design.md](docs/designs/2026-10-02-v1-records-design.md) | **Full v1 design** — records, fields, value lists, rules, screens, operations. Basis for the spec and implementation plan. |
| [docs/plans/2026-10-02-v1-roadmap.md](docs/plans/2026-10-02-v1-roadmap.md) | Implementation roadmap: the sequence of v1 plans and their status |
| [docs/guides/share-key-management.md](docs/guides/share-key-management.md) | Proposed Plan 4 key setup, administrative revocation and Plan 5/6 handoff |
| [docs/research/2026-10-02-issue-and-clarification-tracking-research.md](docs/research/2026-10-02-issue-and-clarification-tracking-research.md) | Market and terminology research (non-authoritative input) |

Documentation follows `X:\1976KN\Dev\Code\DOCS-STANDARD.md` (v1.4).
## Share-link key setup

The proposed Plan 4 HTTP app requires `SHARE_LINK_KEY`, a dedicated random 32-byte key encoded as 64 hexadecimal characters. Store it in server configuration outside the repository, data directory and backups. Preserve it across deployments. Offline owner, seed and share-revocation commands permit an absent key.

After key loss or replacement, stop the application and run `npm run shares:revoke-all` against the intended data directory. Install a newly generated key in private configuration, restart, and issue replacement links. Startup also revokes unrevoked links when the key fingerprint changes. Never publish a key or put it in command logs.
