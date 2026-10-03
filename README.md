# BuiltBasis

Lightweight construction-control application: quality issues, detail clarifications and tasks — with measurements, decisions, photos and read-only sharing — in English and Greek.

**Status:** Plans 0–2 are complete. The server foundation runs locally; Plan 3 (records) is next. Plan 2 is merged to `main` (see roadmap).

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
| [docs/research/2026-10-02-issue-and-clarification-tracking-research.md](docs/research/2026-10-02-issue-and-clarification-tracking-research.md) | Market and terminology research (non-authoritative input) |

Documentation follows `X:\1976KN\Dev\Code\DOCS-STANDARD.md` (v1.4).
