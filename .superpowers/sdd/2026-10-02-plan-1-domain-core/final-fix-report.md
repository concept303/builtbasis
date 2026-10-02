# Plan 1 final fix report

Completed on 2026-10-03 (Australia/Sydney), from base `4c56699` on `feat/plan-1-domain-core`.

## Changes

- `src/domain/measurements.ts`: encode normalized item, normalized quantity and unit with `JSON.stringify` instead of NUL separators.
- `tests/domain/measurements.test.ts`: one regression checks that the two distinct NUL-containing label pairs remain unique and that neither over-time series includes the other row.
- `docs/plans/2026-10-02-plan-1-domain-core.md`: synchronize the affected code/test examples, test counts and verification metadata; record the fix and later-plan caller contract. Preserve Node >=22.12.0 and the Vitest advisory follow-up.
- This report records verification and self-review evidence.

## Verification

Commands ran in `X:/1976KN/Dev/Code/builtbasis/.worktrees/plan-1-domain-core` with scoped subprocess escalation.

RED, before changing production code:

`npx vitest run tests/domain/measurements.test.ts -t 'keeps distinct row identities'`

Exit 1. One test failed and eight were skipped. All three soft assertions failed. Duplicate detection returned `['a\u0000b\u0000c\u0000cm']` instead of `[]`. Each over-time query returned both set 10 and set 11 instead of its single matching set. The second query also incorrectly assigned a change of 1 instead of a first-point null. This demonstrates the collision's effects on both consumers.

GREEN, after the final code/test changes:

`npx vitest run tests/domain/measurements.test.ts`

Exit 0. One file passed; all 9 tests passed.

`npm test`

Exit 0. All 7 files and 69 tests passed: vocabulary 23, IDs 3, statuses 4, record rules 9, transitions 20, measurements 9, public exports 1.

`npm run typecheck`

Exit 0. `tsc --noEmit` reported no errors.

## Self-review and deviations

The production diff changes only row-key encoding. Normalization, unit isolation, ordering and precision remain covered by the existing measurement tests. JSON tuple encoding preserves boundaries even when labels contain NUL. The new regression uses real helpers and literal expected series, and fails under the original delimiter implementation. There are no persisted keys or external key consumers to migrate.

The dispatch assumed an existing literal diagnostic-key assertion. The base had only `toHaveLength(1)`. Per the controller's correction, that assertion is preserved rather than pinning serialization in another test. No other scope deviations. Plan 0 and other product behavior were not changed.

The existing Vitest advisory remains a documented follow-up before enabling its affected browser/dev-server mocker integration. No additional tooling changes were made.
