# Plan 3 — Records API Implementation Plan

> **Document type:** Implementation plan
> **Status:** In progress — execution approved
> **Retention:** Active until executed; historical afterwards.
> **Implements:** `docs/designs/2026-10-02-v1-records-design.md` §4 (record model, human IDs, must be done before), §5 (shared fields, decision, measurements, verification, Log, activity), §6 (subtype fields), §8 (status rules), §9.3–§9.4 (tag and location operations that involve records), §10.2 (list filters, sorting, totals) — data and API only.
> **Not in this plan:** photos, attachments, files and share links (Plan 4); screens (Plan 5); print view and PDF (Plan 6).
> **Depends on:** Plan 2 (server foundation), merged to `main` at `48c50ef` (18 test files, 155 tests). Task 0 checks the starting point.
> **Implemented by:** Not implemented
> **Verified:** Not verified
> **Plan check:** 2026-10-03 — checked against the merged Plan 2 on `main` (`48c50ef`, 155 tests). Every step of this plan was replayed in order in a fresh clone of `main`: each "verify it fails" step failed as stated, each "verify it passes" step passed, `npm run typecheck` was clean after every task, and every commit staged its files with nothing left over. Final `npm test`: 29 files, 229 tests passed. The clones were deleted.
> **Review:** 2026-10-03, second agent, on `a88af6f` — five findings, all reproduced and fixed: (1) the choice history kept only option ids, which SQLite could reuse after a delete — option ids are now never reused, and each choice entry keeps the option's label and description (Tasks 2, 3, 5); (2) a zone-type filter also matched differently typed nodes inside a typed node — it now matches only nodes carrying the type (Task 8); (3) tag merge and delete changed records without marking them updated — they now do, in the same transaction (Task 9); (4) the starting-point and final counts used Plan 2's planned 136 tests instead of the merged 155 (Tasks 0, 11); (5) the sort-by-update test could depend on timing — every record now gets its own update time (Task 8).
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tick each box when its step is done.

**Goal:** The owner can create, read, update and list records of all three subtypes through the API, with every rule of design §4–§8 enforced by the server: required fields, subtype fields, status transitions with reasons and verification, decision options, measurements, Log, activity, must-be-done-before links, and the list's filters, search, sorting and totals.

**Architecture:** `src/server/records/` holds one module per part of a record: the record itself (`records.ts`), status changes (`transitions.ts`), decision options, measurements, the Log, the activity log and the list. Each module has its repository functions and its routes, like the Plan 2 list modules; `routes.ts` registers them all. Shared helpers read rows (`store.ts`), check managed-list references (`references.ts`) and maintain join tables and must-be-done-before links (`links.ts`). The input schemas live in `src/domain/records.ts`, so the browser can reuse them (design §11.2). The rules themselves are Plan 1's domain functions (`validateSave`, `checkTransition`, `duplicateRowKeys`, `orderSets`). Every write runs in one SQLite transaction, so a rejected request changes nothing. `GET /records/:id` returns the record with its links and allowed transitions; options, measurements, verifications, Log and activity have their own routes, one per record tab (design §10.4).

**Tech Stack:** as Plan 2 — Node.js 24, TypeScript 5 (strict, ESM), Fastify 5, better-sqlite3 13.0.3, Zod 4, Vitest 3. No new dependencies.

**Decisions** (they fill gaps in the design; none contradicts it):

1. **Records are created as Draft** (design §10.3). A save never changes the status; status changes go only through `POST …/transitions`.
2. **Records cannot be deleted in v1.** A record created by mistake is cancelled with the reason _Raised in error_. The design describes no deletion. *Assumption — the owner may overrule.* Task 11 adds this to design §14.
3. **Text is stored exactly as typed** (design §3): nothing is trimmed or rewritten. Optional text that is empty or only spaces is stored as empty (`null`); required text must contain more than spaces.
4. **Fields a subtype does not have are rejected** (`400 field_not_applicable`), not silently ignored.
5. **Retired people, trades and locations** stay valid on records that already have them but cannot be newly selected (design §9.1, §9.2, §9.4). The rule applies to every person field, including the verifier and the measurer.
6. **Activity log** (design §5.12): one `created` entry; one entry per change of a tracked field, with old and new value; one entry per status change, carrying its reason, note and verification. Values are stored as codes and ids; the browser shows the labels. A change of the chosen option also keeps the label and description of both options, because an option can later be edited or deleted; option ids are never reused. None of the tracked fields is private, so no activity entry is private yet; Plan 4 adds the share-link entries.
7. **Status notes:** the _Superseded_ note names the replacing record, so it stays on the record as its status note; the _Reopen_ note is kept in the activity entry.
8. **A verification sent with any other transition is ignored** (design §5.10: no other transition creates a verification entry).
9. **Estimated cost:** the owner API returns the stored value even while _Outside contract scope_ is unticked; the browser hides it (design §5.4); list totals exclude it.
10. **Measurement comparisons and label suggestions are computed in the browser** from the sets, with the shared domain functions (`compareItems`, `compareOverTime`, `normalizeLabel`). The API has no comparison routes.
11. **List filters:** `before=X` = records that must be done before X; `after=X` = records that require X first; `blocking=true` = unfinished records that must be done before at least one unfinished record (unfinished = not Closed, Cancelled or Superseded). A location filter includes the nodes inside the selected ones (design §5.5); a zone-type filter matches only nodes that carry the type (design §9.5). Text search covers title, description and human ID, ignoring case and accents. The list returns every match without paging: a project has hundreds of records, not thousands.
13. **Tag operations count as changes to the records they affect:** a merge or delete marks each record whose tags change as updated (time and user). A rename changes no record: records refer to the tag, not to its name.
12. **Concurrent edits: the last save wins.** There is one owner; edit-conflict detection is not built in v1. *Assumption.* Task 11 adds this to design §14.

---

## File structure

| File | Responsibility |
|---|---|
| `src/domain/text.ts` | `foldText`: the case-, space- and accent-insensitive matching key (shared by tag names and text search) |
| `src/domain/records.ts` | Record input schemas (create, save, transition, option, measurement set, Log entry) and the fields of each subtype |
| `src/server/db/migration-0002-records.ts` | Tables for records, their links, options, measurements, verifications, Log and activity |
| `src/server/db/connection.ts` | (modified) registers `bb_fold` so SQL search folds text like TypeScript |
| `src/server/http/params.ts` | (modified) adds `RecordItemParams` for `/records/:id/<collection>/:itemId` |
| `src/server/http/user.ts` | `requireUserId`: the logged-in owner's id |
| `src/server/records/store.ts` | Read a record row; map it to the domain's `RecordState`; mark a record updated |
| `src/server/records/references.ts` | Check people, trades, tags, locations and options chosen for a record |
| `src/server/records/links.ts` | Trades, tags, locations and must-be-done-before links (with cycle check) |
| `src/server/records/activity.ts` | Append and list activity entries |
| `src/server/records/records.ts` | Create, read and save a record; the save rules |
| `src/server/records/transitions.ts` | Status changes, verifications |
| `src/server/records/options.ts` | Options considered for the decision |
| `src/server/records/measurements.ts` | Measurement sets and rows |
| `src/server/records/log.ts` | Log entries |
| `src/server/records/list.ts` | Record list: filters, search, sorting, totals |
| `src/server/records/routes.ts` | Registers every records route |
| `src/server/lists/tags.ts`, `locations.ts` | (modified) tag merge/usage/delete and location delete now account for records |
| `tests/server/record-fixture.ts` | A logged-in owner with one project and small managed lists |

**API added by this plan** (all under `/api/projects/:projectId`, owner session required; changes need the matching `Origin` and a JSON body, as in Plan 2):

| Method and path | Purpose |
|---|---|
| `GET /records` | List with filters, search, sorting and totals (query parameters in Task 8) |
| `POST /records` | Create a Draft (quick capture) |
| `GET /records/:id`, `PATCH /records/:id` | Read or save a record (core fields, links, allowed transitions) |
| `POST /records/:id/transitions` | Change the status |
| `GET /records/:id/verifications`, `GET /records/:id/activity` | Verification entries; activity log |
| `GET`/`POST /records/:id/options`, `PATCH`/`DELETE …/options/:itemId` | Options considered |
| `GET`/`POST /records/:id/measurement-sets`, `PATCH`/`DELETE …/measurement-sets/:itemId` | Measurement sets (`rows` replaces all rows) |
| `GET`/`POST /records/:id/log`, `PATCH`/`DELETE …/log/:itemId` | Log entries |
| `GET /tags/:id/usage` | How many records carry a tag (shown before a delete) |

**Error codes added** (body `{ "error": code, "details"?: … }`):

| Status | Codes |
|---|---|
| 400 | `field_not_applicable`, `invalid_reference`, `inactive_selection`, `precedes_itself` (and Plan 2's `invalid_input`) |
| 404 | `record_not_found`, `option_not_found`, `measurement_set_not_found`, `log_entry_not_found` |
| 409 | `precedence_cycle`, `option_is_chosen`, `location_in_use` |
| 422 | `rule_violation` (save rules), `transition_rejected` (status rules), `estimated_cost_requires_outside_scope`, `duplicate_measurement_rows` |

The `details.errors` of `rule_violation` and `transition_rejected` are Plan 1's `RuleError` codes, e.g. `required:title`, `disposition_required`, `reason_note_required`.

---

### Task 0: Check the starting point

This plan edits Plan 2's code. Check first that the code you start from is the merged Plan 2 that this plan was checked against.

- [x] **Step 1: Confirm Plan 2 is merged and green**

Run: `git log --oneline -15` — the Plan 2 commits (`feat(server): …`, `docs: record Plan 2 completion …`) are on the branch you start from.
Run: `npm test` → `Test Files  18 passed (18)` and `Tests  155 passed (155)`. Run: `npm run typecheck` → no output.

- [x] **Step 2: Confirm the text this plan replaces exists**

Run:

```bash
grep -c "Plan 3 adds" src/server/lists/tags.ts src/server/lists/locations.ts
grep -c "export \* from './lists';" src/domain/index.ts
grep -c "normalizeLabel(name).normalize('NFD')" src/domain/lists.ts
```

Expected: `src/server/lists/tags.ts:2`, `src/server/lists/locations.ts:1`, then `1`, then `1`.

If any result differs, or Step 1 fails: **stop and report**. The code differs from what this plan was checked against, and the plan must be adjusted first.

### Task 1: Record input schemas and text folding (domain)

**Files:**

- Create: `src/domain/text.ts`, `src/domain/records.ts`
- Modify: `src/domain/lists.ts` (`tagKey` uses `foldText`), `src/domain/index.ts`
- Test: `tests/domain/records.test.ts`

- [x] **Step 1: Write the failing test `tests/domain/records.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  fieldsNotApplicable,
  foldText,
  hasDecision,
  LogEntryBody,
  MeasurementSetBody,
  RecordCreate,
  RecordPatch,
  tagKey,
  TransitionBody,
} from '../../src/domain';

describe('record input schemas (design §5, §6)', () => {
  it('stores typed text exactly as typed; empty text becomes null', () => {
    expect(RecordPatch.parse({ title: '  Door frame ', description: '', instructionText: '   ' })).toEqual({
      title: '  Door frame ',
      description: null,
      instructionText: null,
    });
  });

  it('contains only the fields that were sent', () => {
    expect(RecordPatch.parse({ safety: true })).toEqual({ safety: true });
    expect(RecordCreate.parse({ subtype: 'task' })).toEqual({ subtype: 'task' });
  });

  it('checks codes, dates, completion steps and euro amounts', () => {
    const invalid = [
      { severity: 'huge' },
      { dueDate: '2026-13-01' },
      { completion: 55 },
      { completion: 110 },
      { estimatedCost: 10.005 },
      { estimatedCost: -1 },
      { problemTypes: ['defect', 'leak'] },
      { title: 'x'.repeat(201) },
    ];
    for (const patch of invalid) expect(RecordPatch.safeParse(patch).success, JSON.stringify(patch)).toBe(false);
    expect(RecordPatch.parse({ completion: 60, estimatedCost: 1250.5, dueDate: '2026-11-30' })).toEqual({
      completion: 60,
      estimatedCost: 1250.5,
      dueDate: '2026-11-30',
    });
  });

  it('drops duplicate ids and problem types', () => {
    expect(RecordPatch.parse({ tagIds: [3, 1, 3], problemTypes: ['defect', 'defect'] })).toEqual({
      tagIds: [3, 1],
      problemTypes: ['defect'],
    });
  });

  it('rejects unknown fields, status and a missing or unknown subtype', () => {
    expect(RecordPatch.safeParse({ status: 'closed' }).success).toBe(false);
    expect(RecordPatch.safeParse({ colour: 'red' }).success).toBe(false);
    expect(RecordCreate.safeParse({ title: 'No subtype' }).success).toBe(false);
    expect(RecordCreate.safeParse({ subtype: 'snag' }).success).toBe(false);
    expect(RecordCreate.safeParse({ subtype: 'task', colour: 'red' }).success).toBe(false);
  });
});

describe('fields per subtype (design §5.6, §6)', () => {
  it('knows which fields each subtype has', () => {
    const fields = ['title', 'problemTypes', 'question', 'issuedById', 'decidedById', 'instructionText'];
    expect(fieldsNotApplicable('quality_issue', fields)).toEqual(['question', 'issuedById']);
    expect(fieldsNotApplicable('detail_clarification', fields)).toEqual(['problemTypes']);
    expect(fieldsNotApplicable('task', fields)).toEqual([
      'problemTypes',
      'question',
      'issuedById',
      'decidedById',
      'instructionText',
    ]);
    expect(['quality_issue', 'detail_clarification', 'task'].map((s) => hasDecision(s as never))).toEqual([
      true,
      true,
      false,
    ]);
  });
});

describe('other record bodies', () => {
  it('accepts a transition with a verification and rejects unknown statuses', () => {
    const body = { to: 'closed', verification: { checkedById: 4, date: '2026-10-03', method: 'visual' } };
    expect(TransitionBody.parse(body)).toEqual(body);
    expect(TransitionBody.safeParse({ to: 'finished' }).success).toBe(false);
  });

  it('requires measurement labels with more than whitespace, and a unit code', () => {
    const set = { date: '2026-09-14', phase: 'before', rows: [{ item: 'Left', quantity: 'Width', value: 18, unit: 'mm' }] };
    expect(MeasurementSetBody.parse(set)).toEqual(set);
    expect(MeasurementSetBody.safeParse({ ...set, rows: [{ ...set.rows[0], item: '  ' }] }).success).toBe(false);
    expect(MeasurementSetBody.safeParse({ ...set, rows: [{ ...set.rows[0], unit: 'inch' }] }).success).toBe(false);
  });

  it('accepts log times with an offset and requires the entry text', () => {
    expect(LogEntryBody.parse({ eventAt: '2026-05-01T09:30:00+03:00', text: 'Architect sent plans' })).toEqual({
      eventAt: '2026-05-01T09:30:00+03:00',
      text: 'Architect sent plans',
    });
    expect(LogEntryBody.safeParse({ text: '' }).success).toBe(false);
    expect(LogEntryBody.safeParse({ eventAt: '2026-05-01', text: 'x' }).success).toBe(false);
  });
});

describe('text folding', () => {
  it('ignores case, spacing, accents and final sigma; tag keys use the same folding', () => {
    expect(foldText('  Πόρτα  ΚΟΥΖΙΝΑΣ ')).toBe('πορτα κουζινασ');
    expect(foldText('Πόρτα κουζίνας')).toBe(foldText('ΠΟΡΤΑ ΚΟΥΖΙΝΑΣ'));
    expect(tagKey('Πέτρα')).toBe(foldText('ΠΕΤΡΑ'));
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/domain/records.test.ts`
Expected: FAIL — all 10 tests fail with `TypeError: Cannot read properties of undefined (reading 'parse')`: the new exports do not exist yet.

- [x] **Step 3: Create `src/domain/text.ts`**

```ts
import { normalizeLabel } from './measurements';

/**
 * Text folded for matching: trimmed, single-spaced, lower case, without accents, final sigma as σ.
 * Greek capitals drop their accents («ΠΕΤΡΑ» = «Πέτρα»), so matching must ignore them.
 */
export function foldText(text: string): string {
  return normalizeLabel(text).normalize('NFD').replace(/\p{M}/gu, '').replace(/ς/g, 'σ');
}
```

- [x] **Step 4: Create `src/domain/records.ts`**

Note: as in Plan 2, the schemas have **no defaults**, so a save never fills in fields that were not sent.

```ts
import { z } from 'zod';
import { isCode, type CodeOf, type ListKey, type Subtype } from './vocab';

const codeOf = <K extends ListKey>(key: K) =>
  z.custom<CodeOf<K>>((value) => isCode(key, value), `Unknown ${key} code`);
const id = z.number().int().positive();
/** A list of ids; duplicates are dropped. */
const ids = z
  .array(id)
  .max(500)
  .transform((values) => [...new Set(values)]);
const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime({ offset: true });

/**
 * Optional free text, stored exactly as typed (design §3); empty or whitespace-only text is stored as null.
 * Text is never trimmed or rewritten.
 */
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .transform((value) => (value === null || value.trim() === '' ? null : value));
/** Required free text, stored exactly as typed; must contain more than whitespace. */
const requiredText = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value.trim() !== '', 'Required');

/** Euros with at most two decimals (design §5.4). */
const euros = z
  .number()
  .min(0)
  .max(100_000_000)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'At most 2 decimals');

/** Every editable record field (design §5, §6). Status changes go through transitions, never through a save. */
export const RecordPatch = z.strictObject({
  title: optionalText(200).optional(),
  description: optionalText(20_000).optional(),
  reference: optionalText(2_000).optional(),
  notes: optionalText(20_000).optional(),
  ballInCourtId: id.nullable().optional(),
  responsibleId: id.nullable().optional(),
  tradeIds: ids.optional(),
  severity: codeOf('severity').nullable().optional(),
  priority: codeOf('priority').nullable().optional(),
  dueDate: isoDate.nullable().optional(),
  completion: z.number().int().min(0).max(100).multipleOf(10).nullable().optional(),
  safety: z.boolean().optional(),
  tagIds: ids.optional(),
  mustBeDoneBeforeIds: ids.optional(),
  locationIds: ids.optional(),
  outsideScope: z.boolean().optional(),
  estimatedCost: euros.nullable().optional(),
  problemTypes: z
    .array(codeOf('problemType'))
    .max(10)
    .transform((values) => [...new Set(values)])
    .optional(),
  stage: codeOf('stage').nullable().optional(),
  disposition: codeOf('disposition').nullable().optional(),
  correction: optionalText(20_000).optional(),
  question: optionalText(20_000).optional(),
  route: codeOf('route').nullable().optional(),
  issuedById: id.nullable().optional(),
  chosenOptionId: id.nullable().optional(),
  decidedById: id.nullable().optional(),
  decidedOn: isoDate.nullable().optional(),
  instructionText: optionalText(20_000).optional(),
});

/** Quick capture (design §10.3): a subtype and any fields; the record starts as Draft. */
export const RecordCreate = RecordPatch.extend({ subtype: codeOf('subtype') });

export type RecordPatchInput = z.output<typeof RecordPatch>;
export type RecordCreateInput = z.output<typeof RecordCreate>;
export type RecordField = keyof RecordPatchInput;

const QUALITY_ISSUE_FIELDS: readonly RecordField[] = ['problemTypes', 'stage', 'disposition', 'correction'];
const DETAIL_CLARIFICATION_FIELDS: readonly RecordField[] = ['question', 'route', 'issuedById'];
/** Decision and instruction (design §5.6): Quality Issues and Detail Clarifications, not Tasks. */
const DECISION_FIELDS: readonly RecordField[] = ['chosenOptionId', 'decidedById', 'decidedOn', 'instructionText'];

/** Whether the subtype has the decision fields and options (design §5.6). */
export function hasDecision(subtype: Subtype): boolean {
  return subtype !== 'task';
}

/** The given fields that the subtype does not have (design §5.6, §6). */
export function fieldsNotApplicable(subtype: Subtype, fields: readonly string[]): string[] {
  const has = (list: readonly RecordField[], field: string): boolean => (list as readonly string[]).includes(field);
  return fields.filter(
    (field) =>
      (has(QUALITY_ISSUE_FIELDS, field) && subtype !== 'quality_issue') ||
      (has(DETAIL_CLARIFICATION_FIELDS, field) && subtype !== 'detail_clarification') ||
      (has(DECISION_FIELDS, field) && !hasDecision(subtype)),
  );
}

/** A status change (design §8.1). The domain rules in checkTransition decide what is required. */
export const TransitionBody = z.strictObject({
  to: codeOf('status'),
  reasonCode: z.string().max(50).nullable().optional(),
  reasonNote: optionalText(2_000).optional(),
  note: optionalText(2_000).optional(),
  verification: z
    .strictObject({
      checkedById: id.nullable(),
      date: isoDate.nullable(),
      method: z.string().max(50).nullable(),
      note: optionalText(2_000).optional(),
    })
    .nullable()
    .optional(),
});
export type TransitionBodyInput = z.output<typeof TransitionBody>;

/** An option considered for the decision (design §5.6). */
export const OptionBody = z.strictObject({
  label: requiredText(200),
  description: optionalText(20_000).optional(),
});
export const OptionPatch = OptionBody.partial();
export type OptionInput = z.output<typeof OptionBody>;
export type OptionPatchInput = z.output<typeof OptionPatch>;

/** One measured value (design §5.7). Labels are stored as typed and matched after normalising. */
export const MeasurementRowBody = z.strictObject({
  item: requiredText(200),
  quantity: requiredText(200),
  value: z.number(),
  unit: codeOf('unit'),
  note: optionalText(2_000).optional(),
});
export const MeasurementSetBody = z.strictObject({
  date: isoDate,
  measuredById: id.nullable().optional(),
  phase: codeOf('measurementPhase'),
  note: optionalText(2_000).optional(),
  rows: z.array(MeasurementRowBody).max(500).optional(),
});
/** `rows`, when given, replaces all of the set's rows. */
export const MeasurementSetPatch = MeasurementSetBody.partial();
export type MeasurementRowInput = z.output<typeof MeasurementRowBody>;
export type MeasurementSetInput = z.output<typeof MeasurementSetBody>;
export type MeasurementSetPatchInput = z.output<typeof MeasurementSetPatch>;

/** A Log entry (design §5.11). The event time defaults to now. */
export const LogEntryBody = z.strictObject({
  eventAt: isoDateTime.optional(),
  text: requiredText(20_000),
  private: z.boolean().optional(),
});
export const LogEntryPatch = LogEntryBody.partial();
export type LogEntryInput = z.output<typeof LogEntryBody>;
export type LogEntryPatchInput = z.output<typeof LogEntryPatch>;
```

- [x] **Step 5: Modify `src/domain/lists.ts`**

`tagKey` keeps its behaviour and now uses the shared folding. Replace:

```ts
import { normalizeLabel } from './measurements';
```

with:

```ts
import { foldText } from './text';
```

Replace:

```ts
  const key = normalizeLabel(name).normalize('NFD').replace(/\p{M}/gu, '').replace(/ς/g, 'σ');
```

with:

```ts
  const key = foldText(name);
```

- [x] **Step 6: Modify `src/domain/index.ts`**

Replace:

```ts
export * from './lists';
```

with:

```ts
export * from './lists';
export * from './text';
export * from './records';
```

- [x] **Step 7: Run to verify it passes**

Run: `npx vitest run tests/domain` → PASS (9 files, 84 tests: Plans 1–2 plus `records.test.ts` with 10). Then `npm run typecheck` → no output.

- [x] **Step 8: Commit**

```bash
git add src/domain/text.ts src/domain/records.ts src/domain/lists.ts src/domain/index.ts tests/domain/records.test.ts
git commit -m "feat(domain): record input schemas, subtype fields and shared text folding"
```

### Task 2: Record tables and text folding in SQL

**Files:**

- Create: `src/server/db/migration-0002-records.ts`
- Modify: `src/server/db/migrations.ts`
- Replace: `src/server/db/connection.ts`
- Test: `tests/server/records-db.test.ts`

Money is stored as whole cents (`estimated_cost_cents`) so that sums are exact. Problem types are a JSON list of codes on the record (design §11.3). Join tables hold trades, tags, locations and must-be-done-before links.

- [x] **Step 1: Write the failing test `tests/server/records-db.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';

let db: Db;
beforeEach(() => {
  db = openDatabase(':memory:');
  migrate(db, { backupsDir: 'unused' });
});

describe('record tables (migration 0002)', () => {
  it('creates the record tables', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").pluck().all();
    expect(tables).toEqual(
      expect.arrayContaining([
        'activity',
        'decision_options',
        'log_entries',
        'measurement_rows',
        'measurement_sets',
        'record_counters',
        'record_locations',
        'record_precedence',
        'record_tags',
        'record_trades',
        'records',
        'verifications',
      ]),
    );
  });

  it('folds text in SQL the same way as in TypeScript', () => {
    expect(db.prepare("SELECT bb_fold('  Πόρτα  ΚΟΥΖΙΝΑΣ ')").pluck().get()).toBe('πορτα κουζινασ');
    expect(db.prepare('SELECT bb_fold(NULL)').pluck().get()).toBeNull();
  });

  it('refuses a record that precedes itself and a completion that is not a step of 10', () => {
    db.prepare("INSERT INTO users (username, password_hash, created_at, updated_at) VALUES ('u', 'h', 't', 't')").run();
    db.prepare("INSERT INTO projects (code, name, created_at) VALUES ('p', 'P', 't')").run();
    const insert = db.prepare(
      `INSERT INTO records (project_id, subtype, sequence, human_id, status, completion, created_at, created_by, updated_at, updated_by)
       VALUES (1, 'task', ?, ?, 'draft', ?, 't', 1, 't', 1)`,
    );
    insert.run(1, 'T-0001', 40);
    expect(() => insert.run(2, 'T-0002', 45)).toThrow(/CHECK constraint/);
    expect(() => insert.run(3, 'T-0001', null)).toThrow(/UNIQUE constraint/);
    expect(() => db.prepare('INSERT INTO record_precedence (earlier_id, later_id) VALUES (1, 1)').run()).toThrow(
      /CHECK constraint/,
    );
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/records-db.test.ts`
Expected: FAIL — all 3 tests fail: the record tables do not exist (`no such table: records`) and SQL has no `bb_fold` (`no such function: bb_fold`).

- [x] **Step 3: Create `src/server/db/migration-0002-records.ts`**

```ts
import type { Migration } from './migrations';

/** Records and everything recorded on them (design §4–§8, §11.3). Files and share links follow in Plan 4. */
export const MIGRATION_0002_RECORDS: Migration = {
  id: '0002_records',
  sql: `
    -- Human-ID sequences per project and subtype; never reused (design §4.2).
    CREATE TABLE record_counters (
      project_id INTEGER NOT NULL REFERENCES projects(id),
      subtype TEXT NOT NULL,
      last_sequence INTEGER NOT NULL,
      PRIMARY KEY (project_id, subtype)
    );

    CREATE TABLE records (
      id INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      subtype TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      human_id TEXT NOT NULL,
      status TEXT NOT NULL,
      status_before_hold TEXT,
      status_reason_code TEXT,
      status_reason_note TEXT,
      title TEXT,
      description TEXT,
      reference TEXT,
      notes TEXT,
      ball_in_court_id INTEGER REFERENCES people(id),
      responsible_id INTEGER REFERENCES people(id),
      severity TEXT,
      priority TEXT,
      due_date TEXT,
      completion INTEGER CHECK (completion IS NULL OR (completion BETWEEN 0 AND 100 AND completion % 10 = 0)),
      safety INTEGER NOT NULL DEFAULT 0 CHECK (safety IN (0, 1)),
      outside_scope INTEGER NOT NULL DEFAULT 0 CHECK (outside_scope IN (0, 1)),
      estimated_cost_cents INTEGER CHECK (estimated_cost_cents IS NULL OR estimated_cost_cents >= 0),
      problem_types TEXT NOT NULL DEFAULT '[]',
      stage TEXT,
      disposition TEXT,
      correction TEXT,
      question TEXT,
      route TEXT,
      issued_by_id INTEGER REFERENCES people(id),
      chosen_option_id INTEGER REFERENCES decision_options(id),
      decided_by_id INTEGER REFERENCES people(id),
      decided_on TEXT,
      instruction_text TEXT,
      created_at TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      updated_at TEXT NOT NULL,
      updated_by INTEGER NOT NULL REFERENCES users(id),
      UNIQUE (project_id, subtype, sequence),
      UNIQUE (project_id, human_id)
    );
    CREATE INDEX records_project_status ON records(project_id, status);

    CREATE TABLE record_trades (
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      trade_id INTEGER NOT NULL REFERENCES trades(id),
      PRIMARY KEY (record_id, trade_id)
    );
    CREATE INDEX record_trades_trade ON record_trades(trade_id);

    CREATE TABLE record_tags (
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (record_id, tag_id)
    );
    CREATE INDEX record_tags_tag ON record_tags(tag_id);

    CREATE TABLE record_locations (
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      location_id INTEGER NOT NULL REFERENCES location_nodes(id),
      PRIMARY KEY (record_id, location_id)
    );
    CREATE INDEX record_locations_location ON record_locations(location_id);

    -- "earlier must be done before later" (design §4.3).
    CREATE TABLE record_precedence (
      earlier_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      later_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      PRIMARY KEY (earlier_id, later_id),
      CHECK (earlier_id <> later_id)
    );
    CREATE INDEX record_precedence_later ON record_precedence(later_id);

    -- AUTOINCREMENT: an option id is never reused, so the activity log can never point to a different option.
    CREATE TABLE decision_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX decision_options_record ON decision_options(record_id);

    CREATE TABLE measurement_sets (
      id INTEGER PRIMARY KEY,
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      measured_by_id INTEGER REFERENCES people(id),
      phase TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX measurement_sets_record ON measurement_sets(record_id);

    CREATE TABLE measurement_rows (
      id INTEGER PRIMARY KEY,
      set_id INTEGER NOT NULL REFERENCES measurement_sets(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      item TEXT NOT NULL,
      quantity TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      note TEXT
    );
    CREATE INDEX measurement_rows_set ON measurement_rows(set_id);

    CREATE TABLE verifications (
      id INTEGER PRIMARY KEY,
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      checked_by_id INTEGER NOT NULL REFERENCES people(id),
      date TEXT NOT NULL,
      method TEXT NOT NULL,
      outcome TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id)
    );
    CREATE INDEX verifications_record ON verifications(record_id);

    CREATE TABLE log_entries (
      id INTEGER PRIMARY KEY,
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      event_at TEXT NOT NULL,
      text TEXT NOT NULL,
      private INTEGER NOT NULL DEFAULT 0 CHECK (private IN (0, 1)),
      logged_by INTEGER NOT NULL REFERENCES users(id),
      logged_at TEXT NOT NULL,
      edited_at TEXT
    );
    CREATE INDEX log_entries_record ON log_entries(record_id);

    -- Automatic, append-only (design §5.12). Values are JSON.
    CREATE TABLE activity (
      id INTEGER PRIMARY KEY,
      record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      at TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      field TEXT,
      old_value TEXT,
      new_value TEXT,
      detail TEXT
    );
    CREATE INDEX activity_record ON activity(record_id);
  `,
};
```

- [x] **Step 4: Modify `src/server/db/migrations.ts`**

Add the import as the first line of the file:

Replace:

```ts
export interface Migration {
```

with:

```ts
import { MIGRATION_0002_RECORDS } from './migration-0002-records';

export interface Migration {
```

Then append the migration to the list. Replace the last two lines of the file:

```ts
  },
];
```

with:

```ts
  },
  MIGRATION_0002_RECORDS,
];
```

(The import is type-only in the other direction, so there is no circular import at run time.)

- [x] **Step 5: Replace `src/server/db/connection.ts`**

```ts
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { foldText } from '../../domain';

export type Db = Database.Database;

/** Opens SQLite with foreign keys on. The default rollback journal is kept (single file, design §11.9). */
export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  // Text search folds case and accents the same way in SQL as in TypeScript (bb_fold(NULL) is NULL).
  db.function('bb_fold', { deterministic: true }, (value: unknown) =>
    typeof value === 'string' ? foldText(value) : null,
  );
  return db;
}
```

- [x] **Step 6: Run to verify it passes**

Run: `npx vitest run tests/server/records-db.test.ts` → PASS (3). Then `npm test` → all pass (Plan 2's database test now applies both migrations), and `npm run typecheck`.

- [x] **Step 7: Commit**

```bash
git add src/server/db/migration-0002-records.ts src/server/db/migrations.ts src/server/db/connection.ts tests/server/records-db.test.ts
git commit -m "feat(server): record tables (migration 0002) and accent-insensitive text folding in SQL"
```

### Task 3: Create, read and save records

**Files:**

- Create: `src/server/http/user.ts`, `src/server/records/store.ts`, `src/server/records/activity.ts`, `src/server/records/references.ts`, `src/server/records/links.ts`, `src/server/records/records.ts`, `src/server/records/routes.ts`
- Modify: `src/server/app.ts`
- Test: `tests/server/record-fixture.ts`, `tests/server/records-api.test.ts`, `tests/server/record-links.test.ts`

How a save works (`applyPatch` in `records.ts`), all inside one transaction:

1. Reject fields the subtype does not have.
2. Check every person, trade, tag, location and chosen option: it must belong to the project (or the record), and a newly selected one must be active.
3. Apply the commercial rule (an estimate needs _Outside contract scope_).
4. Write the columns and the links; must-be-done-before links are checked for cycles.
5. Run Plan 1's `validateSave` on the **resulting** record (required fields, disposition and decision rules for its current status).
6. Write an activity entry for each tracked field that changed.

Any failure throws, and the transaction rolls everything back.

- [x] **Step 1: Create the test helpers `tests/server/record-fixture.ts`**

```ts
import type { RecordDetail } from '../../src/server/records/records';
import { createLocation, updateLocation } from '../../src/server/lists/locations';
import { createPerson } from '../../src/server/lists/people';
import { createProject } from '../../src/server/lists/projects';
import { createTag } from '../../src/server/lists/tags';
import { createTrade } from '../../src/server/lists/trades';
import { createZoneType } from '../../src/server/lists/zone-types';
import { get, loginAsOwner, makeContext, send, type TestContext } from './helpers';

/** A logged-in owner and one project with small managed lists. Names are made up. */
export interface Fixture {
  ctx: TestContext;
  cookie: string;
  projectId: number;
  /** `/api/projects/<projectId>` */
  base: string;
  people: { architect: number; contractor: number; retired: number };
  trades: { tiling: number; masonry: number; retired: number };
  tags: { stone: number; windows: number };
  zones: { kitchen: number };
  /** Villa 1 › Ground › Kitchen, Villa 2 › Ground › Kitchen, and a retired top-level node. */
  locations: {
    villa1: number;
    v1Ground: number;
    v1Kitchen: number;
    villa2: number;
    v2Ground: number;
    v2Kitchen: number;
    retired: number;
  };
}

export async function makeFixture(): Promise<Fixture> {
  const ctx = await makeContext();
  const cookie = await loginAsOwner(ctx);
  const { db } = ctx;
  const projectId = createProject(db, { code: 'p1', name: 'Project 1' }).id;
  const person = (code: string, active = true) =>
    createPerson(db, projectId, { code, name: `Person ${code}`, role: 'other', active }).id;
  const trade = (code: string, active = true) => createTrade(db, projectId, { code, nameEn: code, active }).id;
  const kitchen = createZoneType(db, projectId, { nameEn: 'Kitchen' }).id;
  const node = (nameEn: string, kind: 'building' | 'level' | 'space', parentId?: number, zoneTypeId?: number) =>
    createLocation(db, projectId, { nameEn, kind, parentId, zoneTypeId }).id;

  const villa1 = node('Villa 1', 'building');
  const v1Ground = node('Ground', 'level', villa1);
  const villa2 = node('Villa 2', 'building');
  const v2Ground = node('Ground', 'level', villa2);
  const retired = node('Old wing', 'building');
  updateLocation(db, projectId, retired, { active: false });

  return {
    ctx,
    cookie,
    projectId,
    base: `/api/projects/${projectId}`,
    people: { architect: person('ARCH'), contractor: person('C-PB'), retired: person('OLD', false) },
    trades: { tiling: trade('TIL'), masonry: trade('MAS'), retired: trade('OLD', false) },
    tags: {
      stone: createTag(db, projectId, { nameEl: 'Πέτρα', nameEn: 'Stone' }).id,
      windows: createTag(db, projectId, { nameEl: 'Κουφώματα', nameEn: 'Windows' }).id,
    },
    zones: { kitchen },
    locations: {
      villa1,
      v1Ground,
      v1Kitchen: node('Kitchen', 'space', v1Ground, kitchen),
      villa2,
      v2Ground,
      v2Kitchen: node('Kitchen', 'space', v2Ground, kitchen),
      retired,
    },
  };
}

export const recordUrl = (f: Fixture, id: number, suffix = ''): string => `${f.base}/records/${id}${suffix}`;

/** Creates a record through the API; fails the test unless it is created. */
export async function postRecord(f: Fixture, body: object): Promise<RecordDetail> {
  const res = await send(f.ctx, f.cookie, 'POST', `${f.base}/records`, body);
  if (res.statusCode !== 201) throw new Error(`create failed: ${res.statusCode} ${res.body}`);
  return res.json();
}

export function patchRecord(f: Fixture, id: number, body: object) {
  return send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id), body);
}

export async function getRecord(f: Fixture, id: number): Promise<RecordDetail> {
  return (await get(f.ctx, f.cookie, recordUrl(f, id))).json();
}

/** Test set-up only: puts a record straight into a status, bypassing the transition rules. */
export function forceStatus(f: Fixture, id: number, status: string): void {
  f.ctx.db.prepare('UPDATE records SET status = ? WHERE id = ?').run(status, id);
}
```

- [x] **Step 2: Write the failing test `tests/server/records-api.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../../src/server/lists/projects';
import { updateTrade } from '../../src/server/lists/trades';
import { get, send } from './helpers';
import { forceStatus, getRecord, makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

describe('creating records (design §4.2, §10.3)', () => {
  it('creates Drafts with the next human ID per project and subtype', async () => {
    const ids = [];
    for (const subtype of ['quality_issue', 'quality_issue', 'detail_clarification', 'task']) {
      ids.push((await postRecord(f, { subtype })).humanId);
    }
    expect(ids).toEqual(['QI-0001', 'QI-0002', 'DC-0001', 'T-0001']);

    const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
    const res = await send(f.ctx, f.cookie, 'POST', `/api/projects/${other.id}/records`, { subtype: 'quality_issue' });
    expect(res.json().humanId).toBe('QI-0001');
  });

  it('returns the full record, starting as Draft', async () => {
    const record = await postRecord(f, {
      subtype: 'quality_issue',
      title: 'West door jamb',
      locationIds: [f.locations.v1Kitchen],
    });
    expect(record).toMatchObject({
      humanId: 'QI-0001',
      subtype: 'quality_issue',
      status: 'draft',
      statusReason: null,
      title: 'West door jamb',
      locationIds: [f.locations.v1Kitchen],
      tradeIds: [],
      problemTypes: [],
      safety: false,
      outsideScope: false,
      estimatedCost: null,
      mustBeDoneBefore: [],
      requiresFirst: [],
      allowedTransitions: ['open', 'cancelled'],
    });
    expect(await getRecord(f, record.id)).toEqual(record);
  });

  it('rejects unknown fields, a status, and a record of another project', async () => {
    const extra = await send(f.ctx, f.cookie, 'POST', `${f.base}/records`, { subtype: 'task', status: 'closed' });
    expect(extra.statusCode).toBe(400);
    expect(extra.json().error).toBe('invalid_input');
    const record = await postRecord(f, { subtype: 'task' });
    const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
    const res = await get(f.ctx, f.cookie, `/api/projects/${other.id}/records/${record.id}`);
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'record_not_found' });
  });
});

describe('updating records (design §5, §6, §8.2)', () => {
  it('saves fields and returns the record', async () => {
    const record = await postRecord(f, { subtype: 'quality_issue' });
    const res = await patchRecord(f, record.id, {
      description: 'Stone thickness differs left and right.',
      severity: 'major',
      priority: 'high',
      dueDate: '2026-11-15',
      completion: 30,
      safety: true,
      problemTypes: ['defect', 'nonconformance'],
      stage: 'construction',
      notes: 'Ask about cost.',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      description: 'Stone thickness differs left and right.',
      severity: 'major',
      priority: 'high',
      dueDate: '2026-11-15',
      completion: 30,
      safety: true,
      problemTypes: ['defect', 'nonconformance'],
      stage: 'construction',
      notes: 'Ask about cost.',
    });
  });

  it('rejects fields that the subtype does not have', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const res = await patchRecord(f, task.id, { disposition: 'rework', instructionText: 'x' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'field_not_applicable', details: { fields: ['disposition', 'instructionText'] } });
    const dc = await postRecord(f, { subtype: 'detail_clarification' });
    expect((await patchRecord(f, dc.id, { problemTypes: ['defect'] })).statusCode).toBe(400);
    expect((await patchRecord(f, dc.id, { question: 'Which stone?', instructionText: 'Use 3 cm' })).statusCode).toBe(200);
  });

  it('rejects people outside the project and newly selected inactive entries', async () => {
    const record = await postRecord(f, { subtype: 'task' });
    const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
    const foreign = (
      await send(f.ctx, f.cookie, 'POST', `/api/projects/${other.id}/people`, { code: 'X', name: 'X', role: 'other' })
    ).json();
    const outside = await patchRecord(f, record.id, { ballInCourtId: foreign.id });
    expect(outside.statusCode).toBe(400);
    expect(outside.json()).toEqual({ error: 'invalid_reference', details: { field: 'ballInCourtId', ids: [foreign.id] } });
    const inactive = await patchRecord(f, record.id, { responsibleId: f.people.retired });
    expect(inactive.statusCode).toBe(400);
    expect(inactive.json()).toEqual({
      error: 'inactive_selection',
      details: { field: 'responsibleId', ids: [f.people.retired] },
    });
    const retiredTrade = await patchRecord(f, record.id, { tradeIds: [f.trades.retired] });
    expect(retiredTrade.json().error).toBe('inactive_selection');
    const retiredNode = await patchRecord(f, record.id, { locationIds: [f.locations.retired] });
    expect(retiredNode.json().error).toBe('inactive_selection');
  });

  it('keeps an entry that was retired after it was selected (design §9.1, §9.2)', async () => {
    const record = await postRecord(f, { subtype: 'task', tradeIds: [f.trades.tiling] });
    updateTrade(f.ctx.db, f.projectId, f.trades.tiling, { active: false });
    const res = await patchRecord(f, record.id, { tradeIds: [f.trades.tiling, f.trades.masonry], title: 'Still valid' });
    expect(res.statusCode).toBe(200);
    expect(res.json().tradeIds).toEqual([f.trades.tiling, f.trades.masonry].sort((a, b) => a - b));
  });

  it('applies the save rules of the current status; a rejected save changes nothing', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue', title: 'Jamb', problemTypes: ['defect'] });
    forceStatus(f, qi.id, 'open');
    const noTitle = await patchRecord(f, qi.id, { title: '', description: 'changed' });
    expect(noTitle.statusCode).toBe(422);
    expect(noTitle.json()).toEqual({ error: 'rule_violation', details: { errors: ['required:title'] } });
    const undecided = await patchRecord(f, qi.id, { disposition: 'repair' });
    expect(undecided.json()).toEqual({ error: 'rule_violation', details: { errors: ['decision_required'] } });
    const decided = await patchRecord(f, qi.id, {
      disposition: 'repair',
      decidedById: f.people.architect,
      decidedOn: '2026-10-01',
    });
    expect(decided.statusCode).toBe(200);
    const after = await getRecord(f, qi.id);
    expect(after).toMatchObject({ title: 'Jamb', description: null, disposition: 'repair' });
  });

  it('allows incomplete records while Draft', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue', title: 'Jamb' });
    expect((await patchRecord(f, qi.id, { title: null, disposition: 'accept_as_is' })).statusCode).toBe(200);
  });

  it('takes an estimated cost only while Outside contract scope is ticked; unticking keeps it (design §5.4)', async () => {
    const record = await postRecord(f, { subtype: 'task' });
    const refused = await patchRecord(f, record.id, { estimatedCost: 100 });
    expect(refused.statusCode).toBe(422);
    expect(refused.json()).toEqual({ error: 'estimated_cost_requires_outside_scope' });
    const ticked = await patchRecord(f, record.id, { outsideScope: true, estimatedCost: 1250.5 });
    expect(ticked.json()).toMatchObject({ outsideScope: true, estimatedCost: 1250.5 });
    const unticked = await patchRecord(f, record.id, { outsideScope: false });
    expect(unticked.json()).toMatchObject({ outsideScope: false, estimatedCost: 1250.5 });
    expect((await patchRecord(f, record.id, { estimatedCost: 900 })).statusCode).toBe(422);
    expect((await patchRecord(f, record.id, { estimatedCost: null })).json().estimatedCost).toBeNull();
  });
});

describe('activity log (design §5.12)', () => {
  it('logs creation and every change to the tracked fields, newest first', async () => {
    const dc = await postRecord(f, { subtype: 'detail_clarification', ballInCourtId: f.people.architect });
    await patchRecord(f, dc.id, { title: 'Not tracked', ballInCourtId: f.people.contractor });
    await patchRecord(f, dc.id, { instructionText: 'Use 3 cm stone' });
    await patchRecord(f, dc.id, { instructionText: 'Use 2 cm stone' });
    const activity = (await get(f.ctx, f.cookie, recordUrl(f, dc.id, '/activity'))).json();
    expect(
      activity.map(({ action, field, from, to, by }: Record<string, unknown>) => ({ action, field, from, to, by })),
    ).toEqual([
      { action: 'field_changed', field: 'instructionText', from: 'Use 3 cm stone', to: 'Use 2 cm stone', by: 'owner' },
      { action: 'field_changed', field: 'instructionText', from: null, to: 'Use 3 cm stone', by: 'owner' },
      {
        action: 'field_changed',
        field: 'ballInCourtId',
        from: f.people.architect,
        to: f.people.contractor,
        by: 'owner',
      },
      { action: 'field_changed', field: 'ballInCourtId', from: null, to: f.people.architect, by: 'owner' },
      { action: 'created', field: null, from: null, to: 'draft', by: 'owner' },
    ]);
  });

  it('writes nothing when a save is rejected', async () => {
    const record = await postRecord(f, { subtype: 'task', title: 'Before' });
    const res = await patchRecord(f, record.id, { title: 'After', ballInCourtId: f.people.retired });
    expect(res.statusCode).toBe(400);
    expect((await getRecord(f, record.id)).title).toBe('Before');
    expect((await get(f.ctx, f.cookie, recordUrl(f, record.id, '/activity'))).json()).toHaveLength(1);
  });
});
```

- [x] **Step 3: Write the failing test `tests/server/record-links.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../../src/server/lists/projects';
import { send } from './helpers';
import { getRecord, makeFixture, patchRecord, postRecord, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

describe('trades, tags and locations on a record (design §5.2, §5.3, §5.5)', () => {
  it('sets and replaces the selections', async () => {
    const record = await postRecord(f, {
      subtype: 'task',
      tradeIds: [f.trades.masonry, f.trades.tiling],
      tagIds: [f.tags.stone],
      locationIds: [f.locations.v1Kitchen, f.locations.villa2],
    });
    expect(record).toMatchObject({
      tradeIds: [f.trades.tiling, f.trades.masonry].sort((a, b) => a - b),
      tagIds: [f.tags.stone],
      locationIds: [f.locations.villa2, f.locations.v1Kitchen].sort((a, b) => a - b),
    });
    const res = await patchRecord(f, record.id, { tagIds: [f.tags.windows], locationIds: [] });
    expect(res.json()).toMatchObject({ tagIds: [f.tags.windows], locationIds: [], tradeIds: record.tradeIds });
  });

  it("rejects another project's tag", async () => {
    const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
    const tag = (await send(f.ctx, f.cookie, 'POST', `/api/projects/${other.id}/tags`, { nameEl: 'Ξένη' })).json();
    const record = await postRecord(f, { subtype: 'task' });
    const res = await patchRecord(f, record.id, { tagIds: [f.tags.stone, tag.id] });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_reference', details: { field: 'tagIds', ids: [tag.id] } });
  });
});

describe('must be done before (design §4.3)', () => {
  it('shows the link on both records', async () => {
    const basement = await postRecord(f, { subtype: 'task', title: 'Basement tiling' });
    const leak = await postRecord(f, { subtype: 'quality_issue', title: 'Wall leak', mustBeDoneBeforeIds: [basement.id] });
    expect(leak.mustBeDoneBefore).toEqual([{ id: basement.id, humanId: 'T-0001', title: 'Basement tiling', status: 'draft' }]);
    expect((await getRecord(f, basement.id)).requiresFirst).toEqual([
      { id: leak.id, humanId: 'QI-0001', title: 'Wall leak', status: 'draft' },
    ]);
  });

  it('rejects the record itself and records of another project', async () => {
    const record = await postRecord(f, { subtype: 'task' });
    const self = await patchRecord(f, record.id, { mustBeDoneBeforeIds: [record.id] });
    expect(self.statusCode).toBe(400);
    expect(self.json()).toEqual({ error: 'precedes_itself' });
    const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
    const foreign = (await send(f.ctx, f.cookie, 'POST', `/api/projects/${other.id}/records`, { subtype: 'task' })).json();
    const res = await patchRecord(f, record.id, { mustBeDoneBeforeIds: [foreign.id] });
    expect(res.json()).toEqual({ error: 'invalid_reference', details: { field: 'mustBeDoneBeforeIds', ids: [foreign.id] } });
  });

  it('rejects a link that closes a cycle and keeps the existing links', async () => {
    const a = await postRecord(f, { subtype: 'task', title: 'A' });
    const b = await postRecord(f, { subtype: 'task', title: 'B' });
    const c = await postRecord(f, { subtype: 'task', title: 'C', mustBeDoneBeforeIds: [] });
    await patchRecord(f, a.id, { mustBeDoneBeforeIds: [b.id] });
    await patchRecord(f, b.id, { mustBeDoneBeforeIds: [c.id] });
    const direct = await patchRecord(f, b.id, { mustBeDoneBeforeIds: [c.id, a.id] });
    expect(direct.statusCode).toBe(409);
    expect(direct.json()).toEqual({ error: 'precedence_cycle' });
    const indirect = await patchRecord(f, c.id, { mustBeDoneBeforeIds: [a.id] });
    expect(indirect.statusCode).toBe(409);
    expect((await getRecord(f, b.id)).mustBeDoneBefore.map((ref) => ref.id)).toEqual([c.id]);
    expect((await getRecord(f, c.id)).mustBeDoneBefore).toEqual([]);
  });

  it('clears the links with an empty list', async () => {
    const a = await postRecord(f, { subtype: 'task' });
    const b = await postRecord(f, { subtype: 'task', mustBeDoneBeforeIds: [a.id] });
    expect((await patchRecord(f, b.id, { mustBeDoneBeforeIds: [] })).json().mustBeDoneBefore).toEqual([]);
    expect((await getRecord(f, a.id)).requiresFirst).toEqual([]);
  });
});
```

- [x] **Step 4: Run to verify they fail**

Run: `npx vitest run tests/server/records-api.test.ts tests/server/record-links.test.ts`
Expected: FAIL — all 18 tests fail with `create failed: 404 {"error":"not_found"}`: there are no records routes yet.

- [x] **Step 5: Create `src/server/http/user.ts`**

```ts
import type { FastifyRequest } from 'fastify';
import { HttpError } from '../errors';

/** The logged-in owner's user id; the guards have already rejected requests without a session. */
export function requireUserId(request: FastifyRequest): number {
  if (request.user === null) throw new HttpError(401, 'unauthenticated');
  return request.user.userId;
}
```

- [x] **Step 6: Create `src/server/records/store.ts`**

```ts
import type {
  Disposition,
  Priority,
  ProblemType,
  RecordState,
  Route,
  Severity,
  Stage,
  Status,
  Subtype,
} from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';

/** One row of `records`, with camelCase names. */
export interface RecordRow {
  id: number;
  projectId: number;
  subtype: Subtype;
  sequence: number;
  humanId: string;
  status: Status;
  statusBeforeHold: Status | null;
  statusReasonCode: string | null;
  statusReasonNote: string | null;
  title: string | null;
  description: string | null;
  reference: string | null;
  notes: string | null;
  ballInCourtId: number | null;
  responsibleId: number | null;
  severity: Severity | null;
  priority: Priority | null;
  dueDate: string | null;
  completion: number | null;
  safety: number;
  outsideScope: number;
  estimatedCostCents: number | null;
  /** JSON array of problem-type codes. */
  problemTypes: string;
  stage: Stage | null;
  disposition: Disposition | null;
  correction: string | null;
  question: string | null;
  route: Route | null;
  issuedById: number | null;
  chosenOptionId: number | null;
  decidedById: number | null;
  decidedOn: string | null;
  instructionText: string | null;
  createdAt: string;
  createdBy: number;
  updatedAt: string;
  updatedBy: number;
}

/** Field name → column name. Column names come from this map only, never from request input. */
export const RECORD_COLUMNS = {
  id: 'id',
  projectId: 'project_id',
  subtype: 'subtype',
  sequence: 'sequence',
  humanId: 'human_id',
  status: 'status',
  statusBeforeHold: 'status_before_hold',
  statusReasonCode: 'status_reason_code',
  statusReasonNote: 'status_reason_note',
  title: 'title',
  description: 'description',
  reference: 'reference',
  notes: 'notes',
  ballInCourtId: 'ball_in_court_id',
  responsibleId: 'responsible_id',
  severity: 'severity',
  priority: 'priority',
  dueDate: 'due_date',
  completion: 'completion',
  safety: 'safety',
  outsideScope: 'outside_scope',
  estimatedCostCents: 'estimated_cost_cents',
  problemTypes: 'problem_types',
  stage: 'stage',
  disposition: 'disposition',
  correction: 'correction',
  question: 'question',
  route: 'route',
  issuedById: 'issued_by_id',
  chosenOptionId: 'chosen_option_id',
  decidedById: 'decided_by_id',
  decidedOn: 'decided_on',
  instructionText: 'instruction_text',
  createdAt: 'created_at',
  createdBy: 'created_by',
  updatedAt: 'updated_at',
  updatedBy: 'updated_by',
} as const satisfies Record<keyof RecordRow, string>;

const SELECT = `SELECT ${Object.entries(RECORD_COLUMNS)
  .map(([field, column]) => `${column} AS ${field}`)
  .join(', ')} FROM records`;

export function requireRecord(db: Db, projectId: number, recordId: number): RecordRow {
  const row = db.prepare(`${SELECT} WHERE project_id = ? AND id = ?`).get(projectId, recordId) as RecordRow | undefined;
  if (!row) throw new HttpError(404, 'record_not_found');
  return row;
}

export function problemTypesOf(row: Pick<RecordRow, 'problemTypes'>): ProblemType[] {
  return JSON.parse(row.problemTypes) as ProblemType[];
}

/** The fields the domain rules need (design §5–§8). */
export function toRecordState(row: RecordRow): RecordState {
  return {
    subtype: row.subtype,
    status: row.status,
    statusBeforeHold: row.statusBeforeHold,
    title: row.title,
    problemTypes: problemTypesOf(row),
    question: row.question,
    disposition: row.disposition,
    decidedById: row.decidedById,
    decidedOn: row.decidedOn,
  };
}

/** Marks the record as changed; every change to a record or anything on it updates this. */
export function touchRecord(db: Db, recordId: number, userId: number, at: string): void {
  db.prepare('UPDATE records SET updated_at = ?, updated_by = ? WHERE id = ?').run(at, userId, recordId);
}
```

- [x] **Step 7: Create `src/server/records/activity.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { ItemParams } from '../http/params';
import { requireProject } from '../lists/projects';
import { requireRecord } from './store';

export type ActivityAction = 'created' | 'field_changed' | 'status_changed';

export interface ActivityInput {
  recordId: number;
  userId: number;
  at: string;
  action: ActivityAction;
  field?: string;
  from?: unknown;
  to?: unknown;
  detail?: Record<string, unknown>;
}

export interface ActivityEntry {
  id: number;
  at: string;
  by: string;
  action: ActivityAction;
  field: string | null;
  from: unknown;
  to: unknown;
  detail: Record<string, unknown> | null;
}

const toJson = (value: unknown): string | null => (value === undefined ? null : JSON.stringify(value));
const fromJson = (value: string | null): unknown => (value === null ? null : JSON.parse(value));

/** Appends one entry to the record's activity log (design §5.12). Entries are never changed or deleted. */
export function recordActivity(db: Db, entry: ActivityInput): void {
  db.prepare(
    'INSERT INTO activity (record_id, at, user_id, action, field, old_value, new_value, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    entry.recordId,
    entry.at,
    entry.userId,
    entry.action,
    entry.field ?? null,
    toJson(entry.from),
    toJson(entry.to),
    toJson(entry.detail),
  );
}

/** Newest first. */
export function listActivity(db: Db, recordId: number): ActivityEntry[] {
  const rows = db
    .prepare(
      `SELECT a.id, a.at, u.username, a.action, a.field, a.old_value AS oldValue, a.new_value AS newValue, a.detail
       FROM activity a JOIN users u ON u.id = a.user_id
       WHERE a.record_id = ? ORDER BY a.at DESC, a.id DESC`,
    )
    .all(recordId) as {
    id: number;
    at: string;
    username: string;
    action: ActivityAction;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
    detail: string | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    at: row.at,
    by: row.username,
    action: row.action,
    field: row.field,
    from: fromJson(row.oldValue),
    to: fromJson(row.newValue),
    detail: fromJson(row.detail) as Record<string, unknown> | null,
  }));
}

export function registerActivityRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/activity', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listActivity(db, id);
  });
}
```

- [x] **Step 8: Create `src/server/records/references.ts`**

```ts
import type { Db } from '../db/connection';
import { HttpError } from '../errors';

type ListTable = 'people' | 'trades' | 'tags' | 'location_nodes';

/** Tags have no active flag (design §9.3). */
const HAS_ACTIVE: Record<ListTable, boolean> = { people: true, trades: true, tags: false, location_nodes: true };

/**
 * Checks managed-list entries chosen for a record field. Every id must belong to the project;
 * a newly selected entry must also be active. Inactive entries already on the record stay valid
 * (design §9.1, §9.2, §9.4).
 */
export function checkSelection(
  db: Db,
  projectId: number,
  table: ListTable,
  field: string,
  ids: readonly number[],
  current: readonly number[] = [],
): void {
  const added = ids.filter((id) => !current.includes(id));
  if (added.length === 0) return;
  const active = HAS_ACTIVE[table] ? 'active' : '1 AS active';
  const rows = db
    .prepare(`SELECT id, ${active} FROM ${table} WHERE project_id = ? AND id IN (${added.map(() => '?').join(', ')})`)
    .all(projectId, ...added) as { id: number; active: number }[];
  const activeById = new Map(rows.map((row) => [row.id, row.active]));
  const missing = added.filter((id) => !activeById.has(id));
  if (missing.length > 0) throw new HttpError(400, 'invalid_reference', { field, ids: missing });
  const inactive = added.filter((id) => activeById.get(id) !== 1);
  if (inactive.length > 0) throw new HttpError(400, 'inactive_selection', { field, ids: inactive });
}

/** One person field (ball in court, responsible, issued by, decided by, measured by, checked by). */
export function checkPerson(
  db: Db,
  projectId: number,
  field: string,
  personId: number | null | undefined,
  current: number | null = null,
): void {
  if (personId === undefined || personId === null) return;
  checkSelection(db, projectId, 'people', field, [personId], current === null ? [] : [current]);
}

/** The chosen option must be one of the record's own options (design §5.6). */
export function checkOption(db: Db, recordId: number, optionId: number | null | undefined): void {
  if (optionId === undefined || optionId === null) return;
  const found = db.prepare('SELECT 1 FROM decision_options WHERE record_id = ? AND id = ?').get(recordId, optionId);
  if (found === undefined) throw new HttpError(400, 'invalid_reference', { field: 'chosenOptionId', ids: [optionId] });
}
```

- [x] **Step 9: Create `src/server/records/links.ts`**

```ts
import type { Status } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';

/** Multi-value references to managed lists live in join tables (design §11.3). */
const LINK_TABLES = {
  tradeIds: { table: 'record_trades', column: 'trade_id' },
  tagIds: { table: 'record_tags', column: 'tag_id' },
  locationIds: { table: 'record_locations', column: 'location_id' },
} as const;
export type LinkField = keyof typeof LINK_TABLES;
export const LINK_FIELDS = Object.keys(LINK_TABLES) as LinkField[];

/** Another record, as shown in "must be done before" and "requires first". */
export interface RecordRef {
  id: number;
  humanId: string;
  title: string | null;
  status: Status;
}

export function readLinkIds(db: Db, recordId: number, field: LinkField): number[] {
  const { table, column } = LINK_TABLES[field];
  return db.prepare(`SELECT ${column} FROM ${table} WHERE record_id = ? ORDER BY ${column}`).pluck().all(recordId) as number[];
}

export function replaceLinks(db: Db, recordId: number, field: LinkField, ids: readonly number[]): void {
  const { table, column } = LINK_TABLES[field];
  db.prepare(`DELETE FROM ${table} WHERE record_id = ?`).run(recordId);
  const insert = db.prepare(`INSERT INTO ${table} (record_id, ${column}) VALUES (?, ?)`);
  for (const id of ids) insert.run(recordId, id);
}

const REF_COLUMNS = 'r.id, r.human_id AS humanId, r.title, r.status';

/** Records this record must be done before (design §4.3). */
export function readMustBeDoneBefore(db: Db, recordId: number): RecordRef[] {
  return db
    .prepare(
      `SELECT ${REF_COLUMNS} FROM record_precedence p JOIN records r ON r.id = p.later_id
       WHERE p.earlier_id = ? ORDER BY r.human_id`,
    )
    .all(recordId) as RecordRef[];
}

/** Records that must be done before this one: the reverse view, "requires first" (design §4.3). */
export function readRequiresFirst(db: Db, recordId: number): RecordRef[] {
  return db
    .prepare(
      `SELECT ${REF_COLUMNS} FROM record_precedence p JOIN records r ON r.id = p.earlier_id
       WHERE p.later_id = ? ORDER BY r.human_id`,
    )
    .all(recordId) as RecordRef[];
}

/**
 * Replaces the records this record must be done before. Each must be another record of the same project,
 * and no link may close a cycle (design §4.3). Runs inside the caller's transaction.
 */
export function replaceMustBeDoneBefore(db: Db, projectId: number, recordId: number, laterIds: readonly number[]): void {
  if (laterIds.includes(recordId)) throw new HttpError(400, 'precedes_itself');
  if (laterIds.length > 0) {
    const placeholders = laterIds.map(() => '?').join(', ');
    const found = db
      .prepare(`SELECT id FROM records WHERE project_id = ? AND id IN (${placeholders})`)
      .pluck()
      .all(projectId, ...laterIds) as number[];
    const missing = laterIds.filter((id) => !found.includes(id));
    if (missing.length > 0) throw new HttpError(400, 'invalid_reference', { field: 'mustBeDoneBeforeIds', ids: missing });
  }
  db.prepare('DELETE FROM record_precedence WHERE earlier_id = ?').run(recordId);
  if (laterIds.length === 0) return;
  // A cycle appears if this record already has to wait for one of the new later records.
  const placeholders = laterIds.map(() => '?').join(', ');
  const cycle = db
    .prepare(
      `WITH RECURSIVE downstream(id) AS (
         SELECT later_id FROM record_precedence WHERE earlier_id IN (${placeholders})
         UNION
         SELECT p.later_id FROM record_precedence p JOIN downstream d ON p.earlier_id = d.id
       )
       SELECT 1 FROM downstream WHERE id = ? LIMIT 1`,
    )
    .get(...laterIds, recordId);
  if (cycle !== undefined) throw new HttpError(409, 'precedence_cycle');
  const insert = db.prepare('INSERT INTO record_precedence (earlier_id, later_id) VALUES (?, ?)');
  for (const laterId of laterIds) insert.run(recordId, laterId);
}
```

- [x] **Step 10: Create `src/server/records/records.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import {
  allowedTargets,
  fieldsNotApplicable,
  formatHumanId,
  RecordCreate,
  RecordPatch,
  validateSave,
  type Disposition,
  type Priority,
  type ProblemType,
  type RecordCreateInput,
  type RecordPatchInput,
  type Route,
  type Severity,
  type Stage,
  type Status,
  type Subtype,
} from '../../domain';
import type { Db } from '../db/connection';
import { updateColumns } from '../db/update';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { recordActivity } from './activity';
import {
  LINK_FIELDS,
  readLinkIds,
  readMustBeDoneBefore,
  readRequiresFirst,
  replaceLinks,
  replaceMustBeDoneBefore,
  type RecordRef,
} from './links';
import { checkOption, checkPerson, checkSelection } from './references';
import { problemTypesOf, requireRecord, toRecordState, type RecordRow } from './store';

/** A record as the owner sees it. Sub-collections (options, measurements, verifications, Log, activity) have their own routes. */
export interface RecordDetail {
  id: number;
  projectId: number;
  humanId: string;
  subtype: Subtype;
  status: Status;
  statusBeforeHold: Status | null;
  statusReason: { code: string | null; note: string | null } | null;
  title: string | null;
  description: string | null;
  reference: string | null;
  notes: string | null;
  ballInCourtId: number | null;
  responsibleId: number | null;
  tradeIds: number[];
  severity: Severity | null;
  priority: Priority | null;
  dueDate: string | null;
  completion: number | null;
  safety: boolean;
  tagIds: number[];
  locationIds: number[];
  mustBeDoneBefore: RecordRef[];
  requiresFirst: RecordRef[];
  outsideScope: boolean;
  estimatedCost: number | null;
  problemTypes: ProblemType[];
  stage: Stage | null;
  disposition: Disposition | null;
  correction: string | null;
  question: string | null;
  route: Route | null;
  issuedById: number | null;
  chosenOptionId: number | null;
  decidedById: number | null;
  decidedOn: string | null;
  instructionText: string | null;
  /** Statuses offered in the status dialog; the server still checks every condition on the change (design §10.5). */
  allowedTransitions: Status[];
  createdAt: string;
  updatedAt: string;
}

/** Changes to these fields are written to the activity log (design §5.12). */
const TRACKED_FIELDS = [
  'ballInCourtId',
  'responsibleId',
  'severity',
  'priority',
  'dueDate',
  'disposition',
  'chosenOptionId',
  'decidedById',
  'decidedOn',
  'instructionText',
] as const satisfies readonly (keyof RecordRow)[];

const PERSON_FIELDS = ['ballInCourtId', 'responsibleId', 'issuedById', 'decidedById'] as const;

const toFlag = (value: boolean | undefined): number | undefined => (value === undefined ? undefined : Number(value));

/** The option as it was when chosen or unchosen, so the history stays readable after the option changes or is deleted. */
function optionSnapshot(db: Db, optionId: number | null): { label: string; description: string | null } | null {
  if (optionId === null) return null;
  return (
    (db.prepare('SELECT label, description FROM decision_options WHERE id = ?').get(optionId) as
      | { label: string; description: string | null }
      | undefined) ?? null
  );
}

export function getRecordDetail(db: Db, projectId: number, recordId: number): RecordDetail {
  const row = requireRecord(db, projectId, recordId);
  const hasReason = row.statusReasonCode !== null || row.statusReasonNote !== null;
  return {
    id: row.id,
    projectId: row.projectId,
    humanId: row.humanId,
    subtype: row.subtype,
    status: row.status,
    statusBeforeHold: row.statusBeforeHold,
    statusReason: hasReason ? { code: row.statusReasonCode, note: row.statusReasonNote } : null,
    title: row.title,
    description: row.description,
    reference: row.reference,
    notes: row.notes,
    ballInCourtId: row.ballInCourtId,
    responsibleId: row.responsibleId,
    tradeIds: readLinkIds(db, recordId, 'tradeIds'),
    severity: row.severity,
    priority: row.priority,
    dueDate: row.dueDate,
    completion: row.completion,
    safety: row.safety === 1,
    tagIds: readLinkIds(db, recordId, 'tagIds'),
    locationIds: readLinkIds(db, recordId, 'locationIds'),
    mustBeDoneBefore: readMustBeDoneBefore(db, recordId),
    requiresFirst: readRequiresFirst(db, recordId),
    outsideScope: row.outsideScope === 1,
    estimatedCost: row.estimatedCostCents === null ? null : row.estimatedCostCents / 100,
    problemTypes: problemTypesOf(row),
    stage: row.stage,
    disposition: row.disposition,
    correction: row.correction,
    question: row.question,
    route: row.route,
    issuedById: row.issuedById,
    chosenOptionId: row.chosenOptionId,
    decidedById: row.decidedById,
    decidedOn: row.decidedOn,
    instructionText: row.instructionText,
    allowedTransitions: allowedTargets(toRecordState(row)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Applies a save to a record: subtype fields, references, links, the commercial rule, then the save rules on
 * the result (design §8.2), then the activity entries. Runs inside the caller's transaction, so any rejection
 * leaves the record unchanged.
 */
function applyPatch(db: Db, current: RecordRow, userId: number, patch: RecordPatchInput, at: string): void {
  const { projectId, id: recordId } = current;
  const sent = Object.entries(patch)
    .filter(([, value]) => value !== undefined)
    .map(([field]) => field);
  const notApplicable = fieldsNotApplicable(current.subtype, sent);
  if (notApplicable.length > 0) throw new HttpError(400, 'field_not_applicable', { fields: notApplicable });

  for (const field of PERSON_FIELDS) checkPerson(db, projectId, field, patch[field], current[field]);
  if (patch.tradeIds) checkSelection(db, projectId, 'trades', 'tradeIds', patch.tradeIds, readLinkIds(db, recordId, 'tradeIds'));
  if (patch.tagIds) checkSelection(db, projectId, 'tags', 'tagIds', patch.tagIds, readLinkIds(db, recordId, 'tagIds'));
  if (patch.locationIds) {
    checkSelection(db, projectId, 'location_nodes', 'locationIds', patch.locationIds, readLinkIds(db, recordId, 'locationIds'));
  }
  checkOption(db, recordId, patch.chosenOptionId);

  // An estimate is entered only while Outside contract scope is ticked; unticking keeps it (design §5.4).
  const outsideScope = patch.outsideScope ?? current.outsideScope === 1;
  if (patch.estimatedCost !== undefined && patch.estimatedCost !== null && !outsideScope) {
    throw new HttpError(422, 'estimated_cost_requires_outside_scope');
  }

  updateColumns(db, 'records', projectId, recordId, {
    title: patch.title,
    description: patch.description,
    reference: patch.reference,
    notes: patch.notes,
    ball_in_court_id: patch.ballInCourtId,
    responsible_id: patch.responsibleId,
    severity: patch.severity,
    priority: patch.priority,
    due_date: patch.dueDate,
    completion: patch.completion,
    safety: toFlag(patch.safety),
    outside_scope: toFlag(patch.outsideScope),
    estimated_cost_cents:
      patch.estimatedCost === undefined || patch.estimatedCost === null
        ? patch.estimatedCost
        : Math.round(patch.estimatedCost * 100),
    problem_types: patch.problemTypes === undefined ? undefined : JSON.stringify(patch.problemTypes),
    stage: patch.stage,
    disposition: patch.disposition,
    correction: patch.correction,
    question: patch.question,
    route: patch.route,
    issued_by_id: patch.issuedById,
    chosen_option_id: patch.chosenOptionId,
    decided_by_id: patch.decidedById,
    decided_on: patch.decidedOn,
    instruction_text: patch.instructionText,
    updated_at: at,
    updated_by: userId,
  });
  for (const field of LINK_FIELDS) {
    const ids = patch[field];
    if (ids) replaceLinks(db, recordId, field, ids);
  }
  if (patch.mustBeDoneBeforeIds) replaceMustBeDoneBefore(db, projectId, recordId, patch.mustBeDoneBeforeIds);

  const updated = requireRecord(db, projectId, recordId);
  const errors = validateSave(toRecordState(updated));
  if (errors.length > 0) throw new HttpError(422, 'rule_violation', { errors });

  for (const field of TRACKED_FIELDS) {
    if (current[field] === updated[field]) continue;
    const detail =
      field === 'chosenOptionId'
        ? { fromOption: optionSnapshot(db, current.chosenOptionId), toOption: optionSnapshot(db, updated.chosenOptionId) }
        : undefined;
    recordActivity(db, { recordId, userId, at, action: 'field_changed', field, from: current[field], to: updated[field], detail });
  }
}

/** Creates a Draft record with the next human ID of its subtype (design §4.2, §10.3). */
export function createRecord(
  db: Db,
  projectId: number,
  userId: number,
  input: RecordCreateInput,
  now: Date = new Date(),
): RecordDetail {
  const { subtype, ...patch } = input;
  const at = now.toISOString();
  return db.transaction((): RecordDetail => {
    const sequence = db
      .prepare(
        `INSERT INTO record_counters (project_id, subtype, last_sequence) VALUES (?, ?, 1)
         ON CONFLICT (project_id, subtype) DO UPDATE SET last_sequence = last_sequence + 1
         RETURNING last_sequence`,
      )
      .pluck()
      .get(projectId, subtype) as number;
    const info = db
      .prepare(
        `INSERT INTO records (project_id, subtype, sequence, human_id, status, created_at, created_by, updated_at, updated_by)
         VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      )
      .run(projectId, subtype, sequence, formatHumanId(subtype, sequence), at, userId, at, userId);
    const recordId = Number(info.lastInsertRowid);
    recordActivity(db, { recordId, userId, at, action: 'created', to: 'draft' });
    applyPatch(db, requireRecord(db, projectId, recordId), userId, patch, at);
    return getRecordDetail(db, projectId, recordId);
  })();
}

export function updateRecord(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  patch: RecordPatchInput,
  now: Date = new Date(),
): RecordDetail {
  return db.transaction((): RecordDetail => {
    applyPatch(db, requireRecord(db, projectId, recordId), userId, patch, now.toISOString());
    return getRecordDetail(db, projectId, recordId);
  })();
}

export function registerRecordCoreRoutes(app: FastifyInstance, db: Db): void {
  app.post('/api/projects/:projectId/records', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    const record = createRecord(db, projectId, requireUserId(request), RecordCreate.parse(request.body));
    return reply.status(201).send(record);
  });

  app.get('/api/projects/:projectId/records/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return getRecordDetail(db, projectId, id);
  });

  app.patch('/api/projects/:projectId/records/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateRecord(db, projectId, id, requireUserId(request), RecordPatch.parse(request.body));
  });
}
```

- [x] **Step 11: Create `src/server/records/routes.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { registerActivityRoutes } from './activity';
import { registerRecordCoreRoutes } from './records';

/** Every records route (Plan 3). */
export function registerRecordRoutes(app: FastifyInstance, db: Db): void {
  registerRecordCoreRoutes(app, db);
  registerActivityRoutes(app, db);
}
```

- [x] **Step 12: Modify `src/server/app.ts`**

Replace:

```ts
import { registerLocationRoutes } from './lists/locations';
```

with:

```ts
import { registerLocationRoutes } from './lists/locations';
import { registerRecordRoutes } from './records/routes';
```

Replace:

```ts
  registerLocationRoutes(app, db);
```

with:

```ts
  registerLocationRoutes(app, db);
  registerRecordRoutes(app, db);
```

- [x] **Step 13: Run to verify they pass**

Run: `npx vitest run tests/server/records-api.test.ts tests/server/record-links.test.ts` → PASS (12 + 6 tests). Then `npm test` and `npm run typecheck`.

- [x] **Step 14: Commit**

```bash
git add src/server/http/user.ts src/server/records src/server/app.ts tests/server/record-fixture.ts tests/server/records-api.test.ts tests/server/record-links.test.ts
git commit -m "feat(server): create, read and save records with references, links and activity"
```

### Task 4: Status changes and verification

**Files:**

- Create: `src/server/records/transitions.ts`
- Replace: `src/server/records/routes.ts`
- Test: `tests/server/transitions-api.test.ts`

Plan 1's `checkTransition` decides whether a change is allowed and what it needs. This task writes the result: the status, the status before a hold, the reason, the verification entry and the activity entry, in one transaction (design §8.2). The atomicity test makes the last write fail on purpose, using a temporary SQLite trigger.

- [x] **Step 1: Write the failing test `tests/server/transitions-api.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get, send } from './helpers';
import { getRecord, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

const move = (id: number, body: object) => send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/transitions'), body);

async function moveOk(id: number, body: object): Promise<void> {
  const res = await move(id, body);
  if (res.statusCode !== 200) throw new Error(`transition failed: ${res.statusCode} ${res.body}`);
}

/** A Quality Issue taken to Ready for verification. */
async function qiReadyForVerification(): Promise<number> {
  const qi = await postRecord(f, { subtype: 'quality_issue', title: 'Jamb', problemTypes: ['defect'], disposition: 'rework' });
  for (const to of ['open', 'issued', 'in_progress', 'ready_for_verification']) await moveOk(qi.id, { to });
  return qi.id;
}

const verification = () => ({ checkedById: f.people.architect, date: '2026-10-03', method: 'measurement' });

describe('status changes (design §8)', () => {
  it('opens a Draft only when its required fields are complete', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const res = await move(qi.id, { to: 'open' });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({
      error: 'transition_rejected',
      details: { errors: ['required:title', 'required:problemTypes'] },
    });
    await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, qi.id), { title: 'Jamb', problemTypes: ['defect'] });
    const opened = await move(qi.id, { to: 'open' });
    expect(opened.json()).toMatchObject({ status: 'open' });
  });

  it('refuses a transition that is not allowed', async () => {
    const task = await postRecord(f, { subtype: 'task', title: 'Paint' });
    const res = await move(task.id, { to: 'closed' });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'transition_rejected', details: { errors: ['transition_not_allowed'] } });
  });

  it('puts a record on hold with a reason and resumes it to the previous status', async () => {
    const task = await postRecord(f, { subtype: 'task', title: 'Paint' });
    await moveOk(task.id, { to: 'open' });
    await moveOk(task.id, { to: 'in_progress' });
    expect((await move(task.id, { to: 'on_hold' })).json()).toEqual({
      error: 'transition_rejected',
      details: { errors: ['reason_required'] },
    });
    const held = (await move(task.id, { to: 'on_hold', reasonCode: 'waiting_material', reasonNote: 'Paint ordered' })).json();
    expect(held).toMatchObject({
      status: 'on_hold',
      statusBeforeHold: 'in_progress',
      statusReason: { code: 'waiting_material', note: 'Paint ordered' },
      allowedTransitions: ['in_progress'],
    });
    const resumed = (await move(task.id, { to: 'in_progress' })).json();
    expect(resumed).toMatchObject({ status: 'in_progress', statusBeforeHold: null, statusReason: null });
  });

  it('records a passed verification when closing from Ready for verification', async () => {
    const id = await qiReadyForVerification();
    expect((await move(id, { to: 'closed' })).json()).toEqual({
      error: 'transition_rejected',
      details: { errors: ['verification_required'] },
    });
    const closed = await move(id, { to: 'closed', verification: { ...verification(), note: 'Both sides 18 mm' } });
    expect(closed.json()).toMatchObject({ status: 'closed', allowedTransitions: ['open'] });
    const entries = (await get(f.ctx, f.cookie, recordUrl(f, id, '/verifications'))).json();
    expect(entries).toEqual([
      {
        id: expect.any(Number),
        checkedById: f.people.architect,
        date: '2026-10-03',
        method: 'measurement',
        outcome: 'passed',
        note: 'Both sides 18 mm',
        createdAt: expect.any(String),
      },
    ]);
  });

  it('records a failed verification when sending the work back', async () => {
    const id = await qiReadyForVerification();
    await moveOk(id, { to: 'in_progress', verification: verification() });
    await moveOk(id, { to: 'ready_for_verification' });
    await moveOk(id, { to: 'closed', verification: verification() });
    const outcomes = (await get(f.ctx, f.cookie, recordUrl(f, id, '/verifications'))).json();
    expect(outcomes.map((entry: { outcome: string }) => entry.outcome)).toEqual(['passed', 'failed']);
  });

  it('creates no verification on other transitions, even when one is sent', async () => {
    const dc = await postRecord(f, { subtype: 'detail_clarification', title: 'Stone', question: 'Thickness?' });
    await moveOk(dc.id, { to: 'open' });
    await moveOk(dc.id, { to: 'issued', verification: verification() });
    const superseded = (await move(dc.id, { to: 'superseded', note: 'Replaced by DC-0002' })).json();
    expect(superseded).toMatchObject({ status: 'superseded', statusReason: { code: null, note: 'Replaced by DC-0002' } });
    expect((await get(f.ctx, f.cookie, recordUrl(f, dc.id, '/verifications'))).json()).toEqual([]);
  });

  it('rejects a verifier outside the project or no longer active', async () => {
    const id = await qiReadyForVerification();
    const res = await move(id, { to: 'closed', verification: { ...verification(), checkedById: f.people.retired } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: 'inactive_selection',
      details: { field: 'verification.checkedById', ids: [f.people.retired] },
    });
    expect((await getRecord(f, id)).status).toBe('ready_for_verification');
  });

  it('cancels with a reason; Cancelled is final', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    expect((await move(task.id, { to: 'cancelled', reasonCode: 'replaced' })).json().details.errors).toEqual([
      'reason_note_required',
    ]);
    await moveOk(task.id, { to: 'cancelled', reasonCode: 'raised_in_error' });
    expect((await getRecord(f, task.id)).allowedTransitions).toEqual([]);
  });

  it('logs every status change with its reason and verification', async () => {
    const id = await qiReadyForVerification();
    await moveOk(id, { to: 'closed', verification: verification() });
    await moveOk(id, { to: 'open', note: 'Crack reappeared' });
    const activity = (await get(f.ctx, f.cookie, recordUrl(f, id, '/activity'))).json();
    const changes = activity.filter((entry: { action: string }) => entry.action === 'status_changed');
    expect(changes.map(({ from, to }: { from: string; to: string }) => `${from}→${to}`)).toEqual([
      'closed→open',
      'ready_for_verification→closed',
      'in_progress→ready_for_verification',
      'issued→in_progress',
      'open→issued',
      'draft→open',
    ]);
    expect(changes[0].detail).toEqual({ note: 'Crack reappeared' });
    expect(changes[1].detail).toEqual({
      verification: {
        id: expect.any(Number),
        outcome: 'passed',
        method: 'measurement',
        checkedById: f.people.architect,
        date: '2026-10-03',
      },
    });
  });

  it('is atomic: a failure while writing leaves status, verification and activity unchanged (design §8.2)', async () => {
    const id = await qiReadyForVerification();
    const activityBefore = (await get(f.ctx, f.cookie, recordUrl(f, id, '/activity'))).json().length;
    // Make the last write of the transaction (the activity entry) fail.
    f.ctx.db.exec("CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT, 'simulated failure'); END");
    const res = await move(id, { to: 'closed', verification: verification() });
    expect(res.statusCode).toBe(500);
    f.ctx.db.exec('DROP TRIGGER fail_activity');
    expect((await getRecord(f, id)).status).toBe('ready_for_verification');
    expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/verifications'))).json()).toEqual([]);
    expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/activity'))).json()).toHaveLength(activityBefore);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/transitions-api.test.ts`
Expected: FAIL — all 10 tests fail with `404` from `POST …/transitions`, which does not exist yet.

- [x] **Step 3: Create `src/server/records/transitions.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import {
  checkTransition,
  TransitionBody,
  type TransitionBodyInput,
  type VerificationMethod,
  type VerificationOutcome,
} from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { recordActivity } from './activity';
import { getRecordDetail, type RecordDetail } from './records';
import { checkPerson } from './references';
import { requireRecord, toRecordState } from './store';

export interface Verification {
  id: number;
  checkedById: number;
  date: string;
  method: VerificationMethod;
  outcome: VerificationOutcome;
  note: string | null;
  createdAt: string;
}

/** Newest first. */
export function listVerifications(db: Db, recordId: number): Verification[] {
  return db
    .prepare(
      `SELECT id, checked_by_id AS checkedById, date, method, outcome, note, created_at AS createdAt
       FROM verifications WHERE record_id = ? ORDER BY date DESC, id DESC`,
    )
    .all(recordId) as Verification[];
}

/**
 * Changes a record's status (design §8). The new status, its reason, any verification entry and the
 * activity entry are written in one transaction, or not at all (design §8.2).
 */
export function changeStatus(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  input: TransitionBodyInput,
  now: Date = new Date(),
): RecordDetail {
  return db.transaction((): RecordDetail => {
    const current = requireRecord(db, projectId, recordId);
    const result = checkTransition(toRecordState(current), input);
    if (!result.ok) throw new HttpError(422, 'transition_rejected', { errors: result.errors });

    const { to } = input;
    const at = now.toISOString();
    const withReason = to === 'on_hold' || to === 'cancelled';
    const reasonCode = withReason ? (input.reasonCode ?? null) : null;
    // The superseding note names the replacing record, so it stays visible on the record (design §8.1).
    const reasonNote = withReason ? (input.reasonNote ?? null) : to === 'superseded' ? (input.note ?? null) : null;
    db.prepare(
      `UPDATE records SET status = ?, status_before_hold = ?, status_reason_code = ?, status_reason_note = ?,
         updated_at = ?, updated_by = ?
       WHERE id = ?`,
    ).run(to, to === 'on_hold' ? current.status : null, reasonCode, reasonNote, at, userId, recordId);

    const detail: Record<string, unknown> = {};
    if (reasonCode !== null) detail.reasonCode = reasonCode;
    if (withReason && input.reasonNote) detail.reasonNote = input.reasonNote;
    if (input.note) detail.note = input.note;

    const verification = input.verification;
    if (result.verificationOutcome !== null && verification) {
      checkPerson(db, projectId, 'verification.checkedById', verification.checkedById);
      const info = db
        .prepare(
          `INSERT INTO verifications (record_id, checked_by_id, date, method, outcome, note, created_at, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          recordId,
          verification.checkedById,
          verification.date,
          verification.method,
          result.verificationOutcome,
          verification.note ?? null,
          at,
          userId,
        );
      detail.verification = {
        id: Number(info.lastInsertRowid),
        outcome: result.verificationOutcome,
        method: verification.method,
        checkedById: verification.checkedById,
        date: verification.date,
      };
    }

    recordActivity(db, {
      recordId,
      userId,
      at,
      action: 'status_changed',
      field: 'status',
      from: current.status,
      to,
      detail,
    });
    return getRecordDetail(db, projectId, recordId);
  })();
}

export function registerTransitionRoutes(app: FastifyInstance, db: Db): void {
  app.post('/api/projects/:projectId/records/:id/transitions', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return changeStatus(db, projectId, id, requireUserId(request), TransitionBody.parse(request.body));
  });

  app.get('/api/projects/:projectId/records/:id/verifications', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listVerifications(db, id);
  });
}
```

- [x] **Step 4: Replace `src/server/records/routes.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { registerActivityRoutes } from './activity';
import { registerRecordCoreRoutes } from './records';
import { registerTransitionRoutes } from './transitions';

/** Every records route (Plan 3). */
export function registerRecordRoutes(app: FastifyInstance, db: Db): void {
  registerRecordCoreRoutes(app, db);
  registerActivityRoutes(app, db);
  registerTransitionRoutes(app, db);
}
```

- [x] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/server/transitions-api.test.ts` → PASS (10 tests). Then `npm test` and `npm run typecheck`.

- [x] **Step 6: Commit**

```bash
git add src/server/records/transitions.ts src/server/records/routes.ts tests/server/transitions-api.test.ts
git commit -m "feat(server): atomic status changes with reasons, verification and activity"
```

### Task 5: Options considered for the decision

**Files:**

- Create: `src/server/records/options.ts`
- Replace: `src/server/http/params.ts`, `src/server/records/routes.ts`
- Test: `tests/server/options-api.test.ts`

The chosen option is a record field (`chosenOptionId`, saved through `PATCH /records/:id` and logged in the activity log). This task adds the options themselves.

- [x] **Step 1: Write the failing test `tests/server/options-api.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get, send } from './helpers';
import { getRecord, makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

const optionsUrl = (recordId: number, optionId?: number) =>
  recordUrl(f, recordId, optionId === undefined ? '/options' : `/options/${optionId}`);

describe('options considered (design §5.6)', () => {
  it('adds, edits and lists options in the order they were added', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const grind = await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'Grind the stone' });
    expect(grind.statusCode).toBe(201);
    expect(grind.json()).toEqual({ id: expect.any(Number), label: 'Grind the stone', description: null });
    await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'Rebuild', description: 'Remove and reset' });
    const edited = await send(f.ctx, f.cookie, 'PATCH', optionsUrl(qi.id, grind.json().id), {
      description: 'Grind 3 mm off the left side',
    });
    expect(edited.json()).toEqual({
      id: grind.json().id,
      label: 'Grind the stone',
      description: 'Grind 3 mm off the left side',
    });
    const list = (await get(f.ctx, f.cookie, optionsUrl(qi.id))).json();
    expect(list.map((option: { label: string }) => option.label)).toEqual(['Grind the stone', 'Rebuild']);
  });

  it('chooses one of the record’s own options and logs the choice', async () => {
    const dc = await postRecord(f, { subtype: 'detail_clarification' });
    const other = await postRecord(f, { subtype: 'detail_clarification' });
    const option = (await send(f.ctx, f.cookie, 'POST', optionsUrl(dc.id), { label: '3 cm stone' })).json();
    const foreign = (await send(f.ctx, f.cookie, 'POST', optionsUrl(other.id), { label: 'Other' })).json();
    const wrong = await patchRecord(f, dc.id, { chosenOptionId: foreign.id });
    expect(wrong.statusCode).toBe(400);
    expect(wrong.json()).toEqual({ error: 'invalid_reference', details: { field: 'chosenOptionId', ids: [foreign.id] } });
    expect((await patchRecord(f, dc.id, { chosenOptionId: option.id })).json().chosenOptionId).toBe(option.id);
    const activity = (await get(f.ctx, f.cookie, recordUrl(f, dc.id, '/activity'))).json();
    expect(activity[0]).toMatchObject({ field: 'chosenOptionId', from: null, to: option.id });
  });

  it('keeps the choice history readable after the option is deleted, and never reuses option ids', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const grind = (
      await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'Grind', description: 'Grind 3 mm off' })
    ).json();
    await patchRecord(f, qi.id, { chosenOptionId: grind.id });
    await patchRecord(f, qi.id, { chosenOptionId: null });
    expect((await send(f.ctx, f.cookie, 'DELETE', optionsUrl(qi.id, grind.id))).statusCode).toBe(200);
    const rebuild = (await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'Rebuild' })).json();
    expect(rebuild.id).not.toBe(grind.id);
    const activity = (await get(f.ctx, f.cookie, recordUrl(f, qi.id, '/activity'))).json();
    const choices = activity.filter((entry: { field: string }) => entry.field === 'chosenOptionId');
    const snapshot = { label: 'Grind', description: 'Grind 3 mm off' };
    expect(choices.map(({ from, to, detail }: Record<string, unknown>) => ({ from, to, detail }))).toEqual([
      { from: grind.id, to: null, detail: { fromOption: snapshot, toOption: null } },
      { from: null, to: grind.id, detail: { fromOption: null, toOption: snapshot } },
    ]);
  });

  it('refuses to delete the chosen option; deletes others', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const a = (await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'A' })).json();
    const b = (await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'B' })).json();
    await patchRecord(f, qi.id, { chosenOptionId: a.id });
    const chosen = await send(f.ctx, f.cookie, 'DELETE', optionsUrl(qi.id, a.id));
    expect(chosen.statusCode).toBe(409);
    expect(chosen.json()).toEqual({ error: 'option_is_chosen' });
    expect((await send(f.ctx, f.cookie, 'DELETE', optionsUrl(qi.id, b.id))).statusCode).toBe(200);
    expect((await get(f.ctx, f.cookie, optionsUrl(qi.id))).json()).toEqual([a]);
  });

  it('rejects options on a Task, an empty label, and an option of another record', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const onTask = await send(f.ctx, f.cookie, 'POST', optionsUrl(task.id), { label: 'A' });
    expect(onTask.statusCode).toBe(400);
    expect(onTask.json()).toEqual({ error: 'field_not_applicable', details: { fields: ['options'] } });
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    expect((await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: '  ' })).statusCode).toBe(400);
    const other = await postRecord(f, { subtype: 'quality_issue' });
    const option = (await send(f.ctx, f.cookie, 'POST', optionsUrl(other.id), { label: 'A' })).json();
    const res = await send(f.ctx, f.cookie, 'PATCH', optionsUrl(qi.id, option.id), { label: 'B' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'option_not_found' });
  });

  it('marks the record as updated', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    f.ctx.db.prepare("UPDATE records SET updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?").run(qi.id);
    await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'A' });
    expect((await getRecord(f, qi.id)).updatedAt > '2000-01-01T00:00:00.000Z').toBe(true);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/options-api.test.ts`
Expected: FAIL — all 6 tests fail with `404` (there are no option routes yet) or, for the choice test, `200` where `400` is expected (no option of another record can be checked yet).

- [x] **Step 3: Replace `src/server/http/params.ts`**

`ProjectParams` and `ItemParams` keep their shape; `RecordItemParams` is new.

```ts
import { z } from 'zod';

const positiveId = z.coerce.number().int().positive();

export const ProjectParams = z.object({ projectId: positiveId });
export const ItemParams = z.object({ projectId: positiveId, id: positiveId });
/** An item inside a record, e.g. one of its options: /records/:id/options/:itemId */
export const RecordItemParams = z.object({ projectId: positiveId, id: positiveId, itemId: positiveId });
```

- [x] **Step 4: Create `src/server/records/options.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { hasDecision, OptionBody, OptionPatch, type OptionInput, type OptionPatchInput } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { requireRecord, touchRecord, type RecordRow } from './store';

/** An option considered for the decision; kept even when rejected (design §5.6). */
export interface DecisionOption {
  id: number;
  label: string;
  description: string | null;
}

const SELECT = 'SELECT id, label, description FROM decision_options';

export function listOptions(db: Db, recordId: number): DecisionOption[] {
  return db.prepare(`${SELECT} WHERE record_id = ? ORDER BY sort_order, id`).all(recordId) as DecisionOption[];
}

function requireOption(db: Db, recordId: number, optionId: number): DecisionOption {
  const option = db.prepare(`${SELECT} WHERE record_id = ? AND id = ?`).get(recordId, optionId) as
    | DecisionOption
    | undefined;
  if (!option) throw new HttpError(404, 'option_not_found');
  return option;
}

/** Tasks have no decision (design §5.6). */
function requireDecisionRecord(db: Db, projectId: number, recordId: number): RecordRow {
  const record = requireRecord(db, projectId, recordId);
  if (!hasDecision(record.subtype)) throw new HttpError(400, 'field_not_applicable', { fields: ['options'] });
  return record;
}

export function addOption(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  input: OptionInput,
  now: Date = new Date(),
): DecisionOption {
  return db.transaction((): DecisionOption => {
    requireDecisionRecord(db, projectId, recordId);
    const at = now.toISOString();
    const info = db
      .prepare(
        `INSERT INTO decision_options (record_id, label, description, sort_order, created_at)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM decision_options WHERE record_id = ?), ?)`,
      )
      .run(recordId, input.label, input.description ?? null, recordId, at);
    touchRecord(db, recordId, userId, at);
    return requireOption(db, recordId, Number(info.lastInsertRowid));
  })();
}

export function updateOption(
  db: Db,
  projectId: number,
  recordId: number,
  optionId: number,
  userId: number,
  patch: OptionPatchInput,
  now: Date = new Date(),
): DecisionOption {
  return db.transaction((): DecisionOption => {
    requireDecisionRecord(db, projectId, recordId);
    const current = requireOption(db, recordId, optionId);
    db.prepare('UPDATE decision_options SET label = ?, description = ? WHERE id = ?').run(
      patch.label ?? current.label,
      patch.description === undefined ? current.description : patch.description,
      optionId,
    );
    touchRecord(db, recordId, userId, now.toISOString());
    return requireOption(db, recordId, optionId);
  })();
}

/** The chosen option cannot be deleted; choose another (or none) first. */
export function deleteOption(
  db: Db,
  projectId: number,
  recordId: number,
  optionId: number,
  userId: number,
  now: Date = new Date(),
): void {
  db.transaction(() => {
    const record = requireDecisionRecord(db, projectId, recordId);
    requireOption(db, recordId, optionId);
    if (record.chosenOptionId === optionId) throw new HttpError(409, 'option_is_chosen');
    db.prepare('DELETE FROM decision_options WHERE id = ?').run(optionId);
    touchRecord(db, recordId, userId, now.toISOString());
  })();
}

export function registerOptionRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/options', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listOptions(db, id);
  });

  app.post('/api/projects/:projectId/records/:id/options', async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    const option = addOption(db, projectId, id, requireUserId(request), OptionBody.parse(request.body));
    return reply.status(201).send(option);
  });

  app.patch('/api/projects/:projectId/records/:id/options/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateOption(db, projectId, id, itemId, requireUserId(request), OptionPatch.parse(request.body));
  });

  app.delete('/api/projects/:projectId/records/:id/options/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteOption(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
}
```

- [x] **Step 5: Replace `src/server/records/routes.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { registerActivityRoutes } from './activity';
import { registerOptionRoutes } from './options';
import { registerRecordCoreRoutes } from './records';
import { registerTransitionRoutes } from './transitions';

/** Every records route (Plan 3). */
export function registerRecordRoutes(app: FastifyInstance, db: Db): void {
  registerRecordCoreRoutes(app, db);
  registerActivityRoutes(app, db);
  registerTransitionRoutes(app, db);
  registerOptionRoutes(app, db);
}
```

- [x] **Step 6: Run to verify it passes**

Run: `npx vitest run tests/server/options-api.test.ts` → PASS (6 tests). Then `npm test` and `npm run typecheck`.

- [x] **Step 7: Commit**

```bash
git add src/server/http/params.ts src/server/records/options.ts src/server/records/routes.ts tests/server/options-api.test.ts
git commit -m "feat(server): decision options with protection of the chosen option"
```

### Task 6: Measurements

**Files:**

- Create: `src/server/records/measurements.ts`
- Replace: `src/server/records/routes.ts`
- Test: `tests/server/measurements-api.test.ts`

The test also feeds the API's output to Plan 1's comparison functions, to prove the browser can build both comparison views from it (Decision 10).

- [x] **Step 1: Write the failing test `tests/server/measurements-api.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compareItems, compareOverTime, type MeasurementSet } from '../../src/domain';
import { get, send } from './helpers';
import { makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

const setsUrl = (recordId: number, setId?: number) =>
  recordUrl(f, recordId, setId === undefined ? '/measurement-sets' : `/measurement-sets/${setId}`);

const row = (item: string, value: number, quantity = 'Stone thickness') => ({ item, quantity, value, unit: 'mm' });

describe('measurements (design §5.7)', () => {
  it('stores sets with their rows in entry order, and lists sets by date then creation', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const after = await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-10-02',
      phase: 'after',
      measuredById: f.people.contractor,
      rows: [row('Left', 18), row('Right', 18.2)],
    });
    expect(after.statusCode).toBe(201);
    expect(after.json()).toEqual({
      id: expect.any(Number),
      date: '2026-10-02',
      measuredById: f.people.contractor,
      phase: 'after',
      note: null,
      rows: [
        { item: 'Left', quantity: 'Stone thickness', value: 18, unit: 'mm', note: null },
        { item: 'Right', quantity: 'Stone thickness', value: 18.2, unit: 'mm', note: null },
      ],
    });
    await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14',
      phase: 'before',
      rows: [row('left ', 18), row('Right', 15.3), row('Top', 20)],
    });
    const sets = (await get(f.ctx, f.cookie, setsUrl(qi.id))).json();
    expect(sets.map((set: { date: string }) => set.date)).toEqual(['2026-09-14', '2026-10-02']);
  });

  it('feeds the shared comparison functions (between items, before vs after)', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14',
      phase: 'before',
      rows: [row('Left', 18), row('Right', 15.3)],
    });
    await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), { date: '2026-10-02', phase: 'after', rows: [row('right', 18)] });
    const sets: MeasurementSet[] = (await get(f.ctx, f.cookie, setsUrl(qi.id))).json();
    expect(compareItems(sets[0]!, 'Stone thickness', 'mm').map((entry) => entry.item)).toEqual(['Left', 'Right']);
    const series = compareOverTime(sets, 'Right', 'stone thickness', 'mm');
    expect(series.map((point) => point.value)).toEqual([15.3, 18]);
    expect(series[1]!.changeFromPrevious).toBeCloseTo(2.7);
  });

  it('rejects duplicate Item + Quantity + Unit within a set, after normalising labels', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const res = await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14',
      phase: 'before',
      rows: [row('Left side', 18), row('  LEFT   side', 19), { ...row('Left side', 1.8), unit: 'cm' }],
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({
      error: 'duplicate_measurement_rows',
      details: { keys: [JSON.stringify(['left side', 'stone thickness', 'mm'])] },
    });
    expect((await get(f.ctx, f.cookie, setsUrl(qi.id))).json()).toEqual([]);
  });

  it('edits a set, replacing its rows when rows are sent, and deletes it', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const set = (
      await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), { date: '2026-09-14', phase: 'before', rows: [row('Left', 18)] })
    ).json();
    const noteOnly = await send(f.ctx, f.cookie, 'PATCH', setsUrl(qi.id, set.id), { note: 'Laser meter' });
    expect(noteOnly.json()).toMatchObject({ note: 'Laser meter', rows: [row('Left', 18)] });
    const newRows = await send(f.ctx, f.cookie, 'PATCH', setsUrl(qi.id, set.id), { rows: [row('Top', 20), row('Left', 17)] });
    expect(newRows.json().rows.map((r: { item: string }) => r.item)).toEqual(['Top', 'Left']);
    expect((await send(f.ctx, f.cookie, 'DELETE', setsUrl(qi.id, set.id))).statusCode).toBe(200);
    expect((await get(f.ctx, f.cookie, setsUrl(qi.id))).json()).toEqual([]);
  });

  it('rejects an inactive measurer and a set of another record', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const inactive = await send(f.ctx, f.cookie, 'POST', setsUrl(qi.id), {
      date: '2026-09-14',
      phase: 'before',
      measuredById: f.people.retired,
    });
    expect(inactive.json().error).toBe('inactive_selection');
    const other = await postRecord(f, { subtype: 'quality_issue' });
    const set = (await send(f.ctx, f.cookie, 'POST', setsUrl(other.id), { date: '2026-09-14', phase: 'before' })).json();
    const res = await send(f.ctx, f.cookie, 'DELETE', setsUrl(qi.id, set.id));
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'measurement_set_not_found' });
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/measurements-api.test.ts`
Expected: FAIL — all 5 tests fail with `404`: there are no measurement routes yet.

- [x] **Step 3: Create `src/server/records/measurements.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import {
  duplicateRowKeys,
  MeasurementSetBody,
  MeasurementSetPatch,
  orderSets,
  type MeasurementPhase,
  type MeasurementRowInput,
  type MeasurementSetInput,
  type MeasurementSetPatchInput,
  type Unit,
} from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { checkPerson } from './references';
import { requireRecord, touchRecord } from './store';

export interface MeasurementRowOut {
  item: string;
  quantity: string;
  value: number;
  unit: Unit;
  note: string | null;
}

/** Rows keep the order they were entered in; the browser computes the comparisons with the shared domain functions. */
export interface MeasurementSetOut {
  id: number;
  date: string;
  measuredById: number | null;
  phase: MeasurementPhase;
  note: string | null;
  rows: MeasurementRowOut[];
}

type SetRow = Omit<MeasurementSetOut, 'rows'>;
const SET_COLUMNS = 'id, date, measured_by_id AS measuredById, phase, note';

function rowsOf(db: Db, setId: number): MeasurementRowOut[] {
  return db
    .prepare('SELECT item, quantity, value, unit, note FROM measurement_rows WHERE set_id = ? ORDER BY position')
    .all(setId) as MeasurementRowOut[];
}

/** Sets in set order: measurement date, then creation order (design §5.7). */
export function listMeasurementSets(db: Db, recordId: number): MeasurementSetOut[] {
  const sets = db.prepare(`SELECT ${SET_COLUMNS} FROM measurement_sets WHERE record_id = ?`).all(recordId) as SetRow[];
  return orderSets(sets).map((set) => ({ ...set, rows: rowsOf(db, set.id) }));
}

function requireSet(db: Db, recordId: number, setId: number): MeasurementSetOut {
  const set = db.prepare(`SELECT ${SET_COLUMNS} FROM measurement_sets WHERE record_id = ? AND id = ?`).get(recordId, setId) as
    | SetRow
    | undefined;
  if (!set) throw new HttpError(404, 'measurement_set_not_found');
  return { ...set, rows: rowsOf(db, setId) };
}

/** Item + Quantity + Unit must be unique within a set after normalising the labels (design §5.7). */
function replaceRows(db: Db, setId: number, rows: readonly MeasurementRowInput[]): void {
  const duplicates = duplicateRowKeys(rows);
  if (duplicates.length > 0) throw new HttpError(422, 'duplicate_measurement_rows', { keys: duplicates });
  db.prepare('DELETE FROM measurement_rows WHERE set_id = ?').run(setId);
  const insert = db.prepare(
    'INSERT INTO measurement_rows (set_id, position, item, quantity, value, unit, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  rows.forEach((row, index) => insert.run(setId, index + 1, row.item, row.quantity, row.value, row.unit, row.note ?? null));
}

export function addMeasurementSet(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  input: MeasurementSetInput,
  now: Date = new Date(),
): MeasurementSetOut {
  return db.transaction((): MeasurementSetOut => {
    requireRecord(db, projectId, recordId);
    checkPerson(db, projectId, 'measuredById', input.measuredById);
    const at = now.toISOString();
    const info = db
      .prepare(
        'INSERT INTO measurement_sets (record_id, date, measured_by_id, phase, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(recordId, input.date, input.measuredById ?? null, input.phase, input.note ?? null, at);
    const setId = Number(info.lastInsertRowid);
    replaceRows(db, setId, input.rows ?? []);
    touchRecord(db, recordId, userId, at);
    return requireSet(db, recordId, setId);
  })();
}

export function updateMeasurementSet(
  db: Db,
  projectId: number,
  recordId: number,
  setId: number,
  userId: number,
  patch: MeasurementSetPatchInput,
  now: Date = new Date(),
): MeasurementSetOut {
  return db.transaction((): MeasurementSetOut => {
    requireRecord(db, projectId, recordId);
    const current = requireSet(db, recordId, setId);
    checkPerson(db, projectId, 'measuredById', patch.measuredById, current.measuredById);
    db.prepare('UPDATE measurement_sets SET date = ?, measured_by_id = ?, phase = ?, note = ? WHERE id = ?').run(
      patch.date ?? current.date,
      patch.measuredById === undefined ? current.measuredById : patch.measuredById,
      patch.phase ?? current.phase,
      patch.note === undefined ? current.note : patch.note,
      setId,
    );
    if (patch.rows) replaceRows(db, setId, patch.rows);
    touchRecord(db, recordId, userId, now.toISOString());
    return requireSet(db, recordId, setId);
  })();
}

export function deleteMeasurementSet(
  db: Db,
  projectId: number,
  recordId: number,
  setId: number,
  userId: number,
  now: Date = new Date(),
): void {
  db.transaction(() => {
    requireRecord(db, projectId, recordId);
    requireSet(db, recordId, setId);
    db.prepare('DELETE FROM measurement_sets WHERE id = ?').run(setId);
    touchRecord(db, recordId, userId, now.toISOString());
  })();
}

export function registerMeasurementRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/measurement-sets', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listMeasurementSets(db, id);
  });

  app.post('/api/projects/:projectId/records/:id/measurement-sets', async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    const set = addMeasurementSet(db, projectId, id, requireUserId(request), MeasurementSetBody.parse(request.body));
    return reply.status(201).send(set);
  });

  app.patch('/api/projects/:projectId/records/:id/measurement-sets/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    const patch = MeasurementSetPatch.parse(request.body);
    return updateMeasurementSet(db, projectId, id, itemId, requireUserId(request), patch);
  });

  app.delete('/api/projects/:projectId/records/:id/measurement-sets/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteMeasurementSet(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
}
```

- [x] **Step 4: Replace `src/server/records/routes.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { registerActivityRoutes } from './activity';
import { registerMeasurementRoutes } from './measurements';
import { registerOptionRoutes } from './options';
import { registerRecordCoreRoutes } from './records';
import { registerTransitionRoutes } from './transitions';

/** Every records route (Plan 3). */
export function registerRecordRoutes(app: FastifyInstance, db: Db): void {
  registerRecordCoreRoutes(app, db);
  registerActivityRoutes(app, db);
  registerTransitionRoutes(app, db);
  registerOptionRoutes(app, db);
  registerMeasurementRoutes(app, db);
}
```

- [x] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/server/measurements-api.test.ts` → PASS (5 tests). Then `npm test` and `npm run typecheck`.

- [x] **Step 6: Commit**

```bash
git add src/server/records/measurements.ts src/server/records/routes.ts tests/server/measurements-api.test.ts
git commit -m "feat(server): measurement sets with unique normalised rows"
```

### Task 7: The Log

**Files:**

- Create: `src/server/records/log.ts`
- Replace: `src/server/records/routes.ts`
- Test: `tests/server/log-api.test.ts`

Attachments on Log entries arrive with files in Plan 4.

- [x] **Step 1: Write the failing test `tests/server/log-api.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get, send } from './helpers';
import { makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

const logUrl = (recordId: number, entryId?: number) => recordUrl(f, recordId, entryId === undefined ? '/log' : `/log/${entryId}`);

describe('Log (design §5.11)', () => {
  it('stores entries with the event time, who logged them and when', async () => {
    const dc = await postRecord(f, { subtype: 'detail_clarification' });
    const res = await send(f.ctx, f.cookie, 'POST', logUrl(dc.id), {
      eventAt: '2026-05-01T09:30:00+03:00',
      text: 'Architect sent plans',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      id: expect.any(Number),
      eventAt: '2026-05-01T06:30:00.000Z',
      text: 'Architect sent plans',
      private: false,
      loggedBy: 'owner',
      loggedAt: expect.any(String),
      editedAt: null,
    });
  });

  it('defaults the event time to now', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const res = await send(f.ctx, f.cookie, 'POST', logUrl(task.id), { text: 'Called the plumber' });
    expect(res.statusCode).toBe(201);
    expect(res.json().eventAt).toBe(res.json().loggedAt);
  });

  it('lists newest first by event time, then by logged-at', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const add = (eventAt: string, text: string) => send(f.ctx, f.cookie, 'POST', logUrl(task.id), { eventAt, text });
    await add('2026-05-02T10:00:00Z', 'Contractor confirmed receipt');
    await add('2026-05-01T10:00:00Z', 'Architect sent plans');
    await add('2026-05-02T10:00:00Z', 'Same time, logged later');
    const texts = (await get(f.ctx, f.cookie, logUrl(task.id))).json().map((entry: { text: string }) => entry.text);
    expect(texts).toEqual(['Same time, logged later', 'Contractor confirmed receipt', 'Architect sent plans']);
  });

  it('edits text, event time and the private marker; logged-at never changes', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const entry = (await send(f.ctx, f.cookie, 'POST', logUrl(task.id), { text: 'Draft note' })).json();
    const edited = await send(f.ctx, f.cookie, 'PATCH', logUrl(task.id, entry.id), {
      text: 'Final note',
      private: true,
      eventAt: '2026-04-30T08:00:00Z',
    });
    expect(edited.json()).toEqual({
      ...entry,
      text: 'Final note',
      private: true,
      eventAt: '2026-04-30T08:00:00.000Z',
      editedAt: expect.any(String),
    });
  });

  it('deletes an entry; rejects an entry of another record and an empty text', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const other = await postRecord(f, { subtype: 'task' });
    const entry = (await send(f.ctx, f.cookie, 'POST', logUrl(other.id), { text: 'Elsewhere' })).json();
    const wrong = await send(f.ctx, f.cookie, 'DELETE', logUrl(task.id, entry.id));
    expect(wrong.statusCode).toBe(404);
    expect(wrong.json()).toEqual({ error: 'log_entry_not_found' });
    expect((await send(f.ctx, f.cookie, 'POST', logUrl(task.id), { text: ' ' })).statusCode).toBe(400);
    expect((await send(f.ctx, f.cookie, 'DELETE', logUrl(other.id, entry.id))).statusCode).toBe(200);
    expect((await get(f.ctx, f.cookie, logUrl(other.id))).json()).toEqual([]);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/log-api.test.ts`
Expected: FAIL — all 5 tests fail with `404`: there are no Log routes yet.

- [x] **Step 3: Create `src/server/records/log.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { LogEntryBody, LogEntryPatch, type LogEntryInput, type LogEntryPatchInput } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { requireRecord, touchRecord } from './store';

/** A Log entry (design §5.11). `loggedAt` and `editedAt` are stored for the record but not shown in the UI. */
export interface LogEntry {
  id: number;
  eventAt: string;
  text: string;
  private: boolean;
  loggedBy: string;
  loggedAt: string;
  editedAt: string | null;
}

type LogRow = Omit<LogEntry, 'private'> & { private: number };
const SELECT = `SELECT l.id, l.event_at AS eventAt, l.text, l.private, u.username AS loggedBy,
  l.logged_at AS loggedAt, l.edited_at AS editedAt
  FROM log_entries l JOIN users u ON u.id = l.logged_by`;
const toEntry = (row: LogRow): LogEntry => ({ ...row, private: row.private === 1 });

/** Event times are stored in UTC so that they sort correctly whatever offset the browser sent. */
const toUtc = (value: string): string => new Date(value).toISOString();

/** Newest first: by event time, then by logged-at (design §5.11). */
export function listLog(db: Db, recordId: number): LogEntry[] {
  return (
    db.prepare(`${SELECT} WHERE l.record_id = ? ORDER BY l.event_at DESC, l.logged_at DESC, l.id DESC`).all(recordId) as LogRow[]
  ).map(toEntry);
}

function requireEntry(db: Db, recordId: number, entryId: number): LogEntry {
  const row = db.prepare(`${SELECT} WHERE l.record_id = ? AND l.id = ?`).get(recordId, entryId) as LogRow | undefined;
  if (!row) throw new HttpError(404, 'log_entry_not_found');
  return toEntry(row);
}

export function addLogEntry(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  input: LogEntryInput,
  now: Date = new Date(),
): LogEntry {
  return db.transaction((): LogEntry => {
    requireRecord(db, projectId, recordId);
    const at = now.toISOString();
    const info = db
      .prepare(
        'INSERT INTO log_entries (record_id, event_at, text, private, logged_by, logged_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(recordId, input.eventAt ? toUtc(input.eventAt) : at, input.text, input.private ? 1 : 0, userId, at);
    touchRecord(db, recordId, userId, at);
    return requireEntry(db, recordId, Number(info.lastInsertRowid));
  })();
}

/** Event time, text and the private marker can change; logged-at and logged-by never do. */
export function updateLogEntry(
  db: Db,
  projectId: number,
  recordId: number,
  entryId: number,
  userId: number,
  patch: LogEntryPatchInput,
  now: Date = new Date(),
): LogEntry {
  return db.transaction((): LogEntry => {
    requireRecord(db, projectId, recordId);
    const current = requireEntry(db, recordId, entryId);
    const at = now.toISOString();
    db.prepare('UPDATE log_entries SET event_at = ?, text = ?, private = ?, edited_at = ? WHERE id = ?').run(
      patch.eventAt ? toUtc(patch.eventAt) : current.eventAt,
      patch.text ?? current.text,
      (patch.private ?? current.private) ? 1 : 0,
      at,
      entryId,
    );
    touchRecord(db, recordId, userId, at);
    return requireEntry(db, recordId, entryId);
  })();
}

/** Plan 4 adds: delete the entry's attachment occurrences in this same transaction (design §5.11). */
export function deleteLogEntry(
  db: Db,
  projectId: number,
  recordId: number,
  entryId: number,
  userId: number,
  now: Date = new Date(),
): void {
  db.transaction(() => {
    requireRecord(db, projectId, recordId);
    requireEntry(db, recordId, entryId);
    db.prepare('DELETE FROM log_entries WHERE id = ?').run(entryId);
    touchRecord(db, recordId, userId, now.toISOString());
  })();
}

export function registerLogRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/log', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listLog(db, id);
  });

  app.post('/api/projects/:projectId/records/:id/log', async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    const entry = addLogEntry(db, projectId, id, requireUserId(request), LogEntryBody.parse(request.body));
    return reply.status(201).send(entry);
  });

  app.patch('/api/projects/:projectId/records/:id/log/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateLogEntry(db, projectId, id, itemId, requireUserId(request), LogEntryPatch.parse(request.body));
  });

  app.delete('/api/projects/:projectId/records/:id/log/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteLogEntry(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
}
```

- [x] **Step 4: Replace `src/server/records/routes.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { registerActivityRoutes } from './activity';
import { registerLogRoutes } from './log';
import { registerMeasurementRoutes } from './measurements';
import { registerOptionRoutes } from './options';
import { registerRecordCoreRoutes } from './records';
import { registerTransitionRoutes } from './transitions';

/** Every records route (Plan 3). */
export function registerRecordRoutes(app: FastifyInstance, db: Db): void {
  registerRecordCoreRoutes(app, db);
  registerActivityRoutes(app, db);
  registerTransitionRoutes(app, db);
  registerOptionRoutes(app, db);
  registerMeasurementRoutes(app, db);
  registerLogRoutes(app, db);
}
```

- [x] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/server/log-api.test.ts` → PASS (5 tests). Then `npm test` and `npm run typecheck`.

- [x] **Step 6: Commit**

```bash
git add src/server/records/log.ts src/server/records/routes.ts tests/server/log-api.test.ts
git commit -m "feat(server): Log entries with event time, private marker and edit time"
```

### Task 8: The record list

**Files:**

- Create: `src/server/records/list.ts`
- Replace: `src/server/records/routes.ts`
- Test: `tests/server/records-list.test.ts`

Query parameters of `GET /records` (all optional; several values of one filter are comma-separated and combine with OR; different filters combine with AND):

| Parameter | Meaning |
|---|---|
| `subtype`, `status`, `severity`, `priority`, `stage`, `problemType` | Codes |
| `locationId` | Location nodes; includes everything inside them (design §5.5) |
| `zoneTypeId` | Zone types; records on a node that carries the type (design §9.5). Unlike `locationId`, nodes inside it count only if they carry the type themselves. |
| `tradeId`, `tagId`, `ballInCourtId`, `responsibleId` | Ids |
| `safety`, `outsideScope` | `true` or `false` |
| `before`, `after`, `blocking` | Must-be-done-before filters (Decision 11) |
| `dueFrom`, `dueTo` | Due-date range, `YYYY-MM-DD`, inclusive |
| `q` | Text search in title, description and human ID |
| `sort` | `id` (default), `due`, `priority`, `severity`, `updated` |
| `dir` | `asc` or `desc`; default `asc`, except `updated` (`desc`). Empty values sort last either way. |

- [ ] **Step 1: Write the failing test `tests/server/records-list.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLocation } from '../../src/server/lists/locations';
import { createZoneType } from '../../src/server/lists/zone-types';
import { get } from './helpers';
import { forceStatus, makeFixture, patchRecord, postRecord, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

/** Human IDs of the listed records, and the totals. */
async function list(query = ''): Promise<{ ids: string[]; count: number; estimatedCost: number }> {
  const res = await get(f.ctx, f.cookie, `${f.base}/records${query === '' ? '' : `?${query}`}`);
  if (res.statusCode !== 200) throw new Error(`list failed: ${res.statusCode} ${res.body}`);
  const body = res.json();
  return { ids: body.records.map((record: { humanId: string }) => record.humanId), ...body.totals };
}

describe('record list filters (design §5.5, §10.2)', () => {
  it('filters on a location including everything inside it, listing and counting each record once', async () => {
    await postRecord(f, { subtype: 'task', locationIds: [f.locations.villa1, f.locations.v1Kitchen] });
    await postRecord(f, { subtype: 'task', locationIds: [f.locations.v2Kitchen] });
    await postRecord(f, { subtype: 'task' });
    expect(await list(`locationId=${f.locations.villa1}`)).toMatchObject({ ids: ['T-0001'], count: 1 });
    expect(await list(`locationId=${f.locations.villa1},${f.locations.villa2}`)).toMatchObject({
      ids: ['T-0001', 'T-0002'],
      count: 2,
    });
    expect(await list(`locationId=${f.locations.v1Ground}`)).toMatchObject({ ids: ['T-0001'] });
  });

  it('matches a zone type only on nodes that carry it, not on differently typed nodes inside them', async () => {
    const bathroom = createZoneType(f.ctx.db, f.projectId, { nameEn: 'Bathroom' }).id;
    const wc = createLocation(f.ctx.db, f.projectId, {
      kind: 'space',
      nameEn: 'WC',
      parentId: f.locations.v1Kitchen,
      zoneTypeId: bathroom,
    }).id;
    await postRecord(f, { subtype: 'task', locationIds: [wc] });
    expect((await list(`zoneTypeId=${f.zones.kitchen}`)).ids).toEqual([]);
    expect((await list(`zoneTypeId=${bathroom}`)).ids).toEqual(['T-0001']);
    expect((await list(`locationId=${f.locations.v1Kitchen}`)).ids).toEqual(['T-0001']);
  });

  it('filters on a zone type across buildings', async () => {
    await postRecord(f, { subtype: 'task', locationIds: [f.locations.v1Kitchen] });
    await postRecord(f, { subtype: 'task', locationIds: [f.locations.v2Kitchen] });
    await postRecord(f, { subtype: 'task', locationIds: [f.locations.villa1] });
    expect((await list(`zoneTypeId=${f.zones.kitchen}`)).ids).toEqual(['T-0001', 'T-0002']);
  });

  it('combines filters with AND and the values of one filter with OR', async () => {
    await postRecord(f, { subtype: 'quality_issue', severity: 'major', problemTypes: ['defect'], safety: true });
    await postRecord(f, { subtype: 'quality_issue', severity: 'minor', problemTypes: ['damage', 'incomplete'] });
    await postRecord(f, { subtype: 'task', severity: 'major', tradeIds: [f.trades.tiling], tagIds: [f.tags.stone] });
    await postRecord(f, { subtype: 'detail_clarification', ballInCourtId: f.people.architect });
    expect((await list('severity=major')).ids).toEqual(['QI-0001', 'T-0001']);
    expect((await list('severity=major,minor&subtype=quality_issue')).ids).toEqual(['QI-0001', 'QI-0002']);
    expect((await list('problemType=incomplete,nonconformance')).ids).toEqual(['QI-0002']);
    expect((await list('safety=true')).ids).toEqual(['QI-0001']);
    expect((await list(`tradeId=${f.trades.tiling}`)).ids).toEqual(['T-0001']);
    expect((await list(`tagId=${f.tags.stone},${f.tags.windows}`)).ids).toEqual(['T-0001']);
    expect((await list(`ballInCourtId=${f.people.architect}`)).ids).toEqual(['DC-0001']);
    expect((await list('status=draft')).count).toBe(4);
  });

  it('filters on due dates and on must-be-done-before links', async () => {
    const tiling = await postRecord(f, { subtype: 'task', title: 'Tiling', dueDate: '2026-11-30' });
    const leak = await postRecord(f, { subtype: 'quality_issue', dueDate: '2026-10-15', mustBeDoneBeforeIds: [tiling.id] });
    const done = await postRecord(f, { subtype: 'task', mustBeDoneBeforeIds: [tiling.id] });
    forceStatus(f, done.id, 'closed');
    expect((await list('dueFrom=2026-11-01&dueTo=2026-11-30')).ids).toEqual(['T-0001']);
    expect((await list(`before=${tiling.id}`)).ids).toEqual(['QI-0001', 'T-0002']);
    expect((await list(`after=${leak.id}`)).ids).toEqual(['T-0001']);
    expect((await list('blocking=true')).ids).toEqual(['QI-0001']);
  });

  it('searches title, description and ID, ignoring case and accents', async () => {
    await postRecord(f, { subtype: 'quality_issue', title: 'Πόρτα κουζίνας' });
    await postRecord(f, { subtype: 'task', title: 'Paint', description: 'Second coat, 100% coverage' });
    await postRecord(f, { subtype: 'task', title: 'Other' });
    expect((await list(`q=${encodeURIComponent('ΚΟΥΖΙΝΑΣ')}`)).ids).toEqual(['QI-0001']);
    expect((await list('q=second%20COAT')).ids).toEqual(['T-0001']);
    expect((await list('q=t-0002')).ids).toEqual(['T-0002']);
    expect((await list('q=100%25')).ids).toEqual(['T-0001']);
    expect((await list('q=0%25')).ids).toEqual(['T-0001']);
  });
});

describe('record list order and totals (design §10.2)', () => {
  it('sorts by priority, due date or update time; empty values last', async () => {
    await postRecord(f, { subtype: 'task', priority: 'low', dueDate: '2026-12-01' });
    await postRecord(f, { subtype: 'task', dueDate: '2026-10-01' });
    await postRecord(f, { subtype: 'task', priority: 'urgent' });
    expect((await list()).ids).toEqual(['T-0001', 'T-0002', 'T-0003']);
    expect((await list('sort=priority')).ids).toEqual(['T-0003', 'T-0001', 'T-0002']);
    expect((await list('sort=priority&dir=desc')).ids).toEqual(['T-0001', 'T-0003', 'T-0002']);
    expect((await list('sort=due')).ids).toEqual(['T-0002', 'T-0001', 'T-0003']);
    const setUpdated = f.ctx.db.prepare('UPDATE records SET updated_at = ? WHERE human_id = ?');
    setUpdated.run('2026-01-02T00:00:00.000Z', 'T-0001');
    setUpdated.run('2026-01-03T00:00:00.000Z', 'T-0002');
    setUpdated.run('2026-01-01T00:00:00.000Z', 'T-0003');
    expect((await list('sort=updated')).ids).toEqual(['T-0002', 'T-0001', 'T-0003']);
  });

  it('totals the estimated cost of the filtered records that are Outside contract scope only', async () => {
    const a = await postRecord(f, { subtype: 'task', outsideScope: true, estimatedCost: 1000.5, tagIds: [f.tags.stone] });
    await postRecord(f, { subtype: 'task', outsideScope: true, estimatedCost: 250 });
    await postRecord(f, { subtype: 'task', outsideScope: true, estimatedCost: 99.5, tagIds: [f.tags.stone] });
    await patchRecord(f, a.id, { outsideScope: false });
    expect(await list()).toMatchObject({ count: 3, estimatedCost: 349.5 });
    expect(await list(`tagId=${f.tags.stone}`)).toMatchObject({ count: 2, estimatedCost: 99.5 });
    expect(await list('outsideScope=false')).toMatchObject({ ids: ['T-0001'], estimatedCost: 0 });
  });

  it('returns the list columns', async () => {
    await postRecord(f, { subtype: 'task', title: 'Paint', completion: 40, safety: true });
    const res = await get(f.ctx, f.cookie, `${f.base}/records`);
    expect(res.json().records[0]).toEqual({
      id: expect.any(Number),
      humanId: 'T-0001',
      subtype: 'task',
      status: 'draft',
      title: 'Paint',
      ballInCourtId: null,
      dueDate: null,
      priority: null,
      severity: null,
      completion: 40,
      safety: true,
      updatedAt: expect.any(String),
    });
  });

  it('rejects unknown filters and unknown codes', async () => {
    const unknown = await get(f.ctx, f.cookie, `${f.base}/records?colour=red`);
    expect(unknown.statusCode).toBe(400);
    expect((await get(f.ctx, f.cookie, `${f.base}/records?status=finished`)).statusCode).toBe(400);
    expect((await get(f.ctx, f.cookie, `${f.base}/records?sort=title`)).statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/records-list.test.ts`
Expected: FAIL — all 10 tests fail with `list failed: 404 {"error":"not_found"}`: `GET /records` does not exist yet.

- [ ] **Step 3: Create `src/server/records/list.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  codesOf,
  foldText,
  isCode,
  type CodeOf,
  type ListKey,
  type Priority,
  type Severity,
  type Status,
  type Subtype,
} from '../../domain';
import type { Db } from '../db/connection';
import { ProjectParams } from '../http/params';
import { subtreeIds } from '../lists/locations';
import { requireProject } from '../lists/projects';

/** One row of the record list (design §10.2). */
export interface RecordSummary {
  id: number;
  humanId: string;
  subtype: Subtype;
  status: Status;
  title: string | null;
  ballInCourtId: number | null;
  dueDate: string | null;
  priority: Priority | null;
  severity: Severity | null;
  completion: number | null;
  safety: boolean;
  updatedAt: string;
}

export interface RecordList {
  records: RecordSummary[];
  /** Estimated cost sums only records currently marked Outside contract scope (design §5.4, §10.2). */
  totals: { count: number; estimatedCost: number };
}

/** Comma-separated values in one query parameter, e.g. status=open,issued */
const csv = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((part) => part.trim())
            .filter((part) => part !== '')
        : value,
    z.array(item).min(1),
  );
const codes = <K extends ListKey>(key: K) =>
  csv(z.custom<CodeOf<K>>((value) => isCode(key, value), `Unknown ${key} code`));
const ids = csv(z.coerce.number().int().positive());
const flag = z.enum(['true', 'false']).transform((value) => value === 'true');

/** Filters combine with AND; the values of one filter combine with OR. */
export const RecordListQuery = z.strictObject({
  subtype: codes('subtype').optional(),
  status: codes('status').optional(),
  severity: codes('severity').optional(),
  priority: codes('priority').optional(),
  stage: codes('stage').optional(),
  problemType: codes('problemType').optional(),
  locationId: ids.optional(),
  zoneTypeId: ids.optional(),
  tradeId: ids.optional(),
  tagId: ids.optional(),
  ballInCourtId: ids.optional(),
  responsibleId: ids.optional(),
  safety: flag.optional(),
  outsideScope: flag.optional(),
  /** Records that must be done before this record (its "requires first"). */
  before: z.coerce.number().int().positive().optional(),
  /** Records that require this record first (its "must be done before"). */
  after: z.coerce.number().int().positive().optional(),
  /** Unfinished records that must be done before at least one unfinished record. */
  blocking: flag.optional(),
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(),
  q: z.string().max(200).optional(),
  sort: z.enum(['id', 'due', 'priority', 'severity', 'updated']).default('id'),
  dir: z.enum(['asc', 'desc']).optional(),
});
export type RecordListQueryInput = z.output<typeof RecordListQuery>;

const UNFINISHED = "('closed', 'cancelled', 'superseded')";

/** Most urgent / most severe first; empty last. Codes come from the value lists, never from input. */
const rank = (column: string, key: 'priority' | 'severity'): string =>
  `CASE ${column} ${codesOf(key)
    .map((code, index) => `WHEN '${code}' THEN ${index}`)
    .join(' ')} ELSE 99 END`;

const SORTS: Record<RecordListQueryInput['sort'], { expression: string; defaultDir: 'asc' | 'desc'; nullsLast?: string }> = {
  id: { expression: 'r.human_id', defaultDir: 'asc' },
  due: { expression: 'r.due_date', defaultDir: 'asc', nullsLast: 'r.due_date IS NULL' },
  priority: { expression: rank('r.priority', 'priority'), defaultDir: 'asc', nullsLast: 'r.priority IS NULL' },
  severity: { expression: rank('r.severity', 'severity'), defaultDir: 'asc', nullsLast: 'r.severity IS NULL' },
  updated: { expression: 'r.updated_at', defaultDir: 'desc' },
};

const placeholders = (values: readonly unknown[]): string => values.map(() => '?').join(', ');
const likePattern = (text: string): string => `%${foldText(text).replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

/**
 * The record list with filters, text search, sorting and totals (design §5.5, §10.2).
 * A record ticked on several matching locations appears and counts once.
 */
export function listRecords(db: Db, projectId: number, query: RecordListQueryInput): RecordList {
  const where: string[] = ['r.project_id = ?'];
  const params: unknown[] = [projectId];
  const anyOf = (column: string, values: readonly unknown[] | undefined): void => {
    if (!values) return;
    where.push(`${column} IN (${placeholders(values)})`);
    params.push(...values);
  };
  const linkedTo = (table: string, column: string, values: readonly number[] | undefined): void => {
    if (!values) return;
    where.push(`EXISTS (SELECT 1 FROM ${table} l WHERE l.record_id = r.id AND l.${column} IN (${placeholders(values)}))`);
    params.push(...values);
  };
  /** A location filter includes every node inside the selected ones (design §5.5). */
  const locatedIn = (nodeIds: readonly number[]): void => {
    const all = [...new Set(nodeIds.flatMap((nodeId) => subtreeIds(db, projectId, nodeId)))];
    if (all.length === 0) where.push('0');
    else linkedTo('record_locations', 'location_id', all);
  };

  anyOf('r.subtype', query.subtype);
  anyOf('r.status', query.status);
  anyOf('r.severity', query.severity);
  anyOf('r.priority', query.priority);
  anyOf('r.stage', query.stage);
  anyOf('r.ball_in_court_id', query.ballInCourtId);
  anyOf('r.responsible_id', query.responsibleId);
  if (query.problemType) {
    where.push(`EXISTS (SELECT 1 FROM json_each(r.problem_types) j WHERE j.value IN (${placeholders(query.problemType)}))`);
    params.push(...query.problemType);
  }
  linkedTo('record_trades', 'trade_id', query.tradeId);
  linkedTo('record_tags', 'tag_id', query.tagId);
  if (query.locationId) locatedIn(query.locationId);
  if (query.zoneTypeId) {
    // Only nodes that carry the zone type; unlike a location filter, nodes inside them do not count (design §9.5).
    where.push(
      `EXISTS (SELECT 1 FROM record_locations l JOIN location_nodes n ON n.id = l.location_id
        WHERE l.record_id = r.id AND n.project_id = ? AND n.zone_type_id IN (${placeholders(query.zoneTypeId)}))`,
    );
    params.push(projectId, ...query.zoneTypeId);
  }
  if (query.safety !== undefined) {
    where.push('r.safety = ?');
    params.push(Number(query.safety));
  }
  if (query.outsideScope !== undefined) {
    where.push('r.outside_scope = ?');
    params.push(Number(query.outsideScope));
  }
  if (query.before !== undefined) {
    where.push('r.id IN (SELECT earlier_id FROM record_precedence WHERE later_id = ?)');
    params.push(query.before);
  }
  if (query.after !== undefined) {
    where.push('r.id IN (SELECT later_id FROM record_precedence WHERE earlier_id = ?)');
    params.push(query.after);
  }
  if (query.blocking !== undefined) {
    const blocks = `(r.status NOT IN ${UNFINISHED} AND EXISTS (
      SELECT 1 FROM record_precedence p JOIN records l ON l.id = p.later_id
      WHERE p.earlier_id = r.id AND l.status NOT IN ${UNFINISHED}))`;
    where.push(query.blocking ? blocks : `NOT ${blocks}`);
  }
  if (query.dueFrom) {
    where.push('r.due_date >= ?');
    params.push(query.dueFrom);
  }
  if (query.dueTo) {
    where.push('r.due_date <= ?');
    params.push(query.dueTo);
  }
  if (query.q && foldText(query.q) !== '') {
    where.push(
      "(bb_fold(r.title) LIKE ? ESCAPE '\\' OR bb_fold(r.description) LIKE ? ESCAPE '\\' OR bb_fold(r.human_id) LIKE ? ESCAPE '\\')",
    );
    const pattern = likePattern(query.q);
    params.push(pattern, pattern, pattern);
  }

  const sort = SORTS[query.sort];
  const dir = (query.dir ?? sort.defaultDir).toUpperCase();
  const orderBy = [sort.nullsLast, `${sort.expression} ${dir}`, 'r.human_id ASC'].filter(Boolean).join(', ');
  const whereSql = where.join(' AND ');

  const rows = db
    .prepare(
      `SELECT r.id, r.human_id AS humanId, r.subtype, r.status, r.title, r.ball_in_court_id AS ballInCourtId,
         r.due_date AS dueDate, r.priority, r.severity, r.completion, r.safety, r.updated_at AS updatedAt
       FROM records r WHERE ${whereSql} ORDER BY ${orderBy}`,
    )
    .all(...params) as (Omit<RecordSummary, 'safety'> & { safety: number })[];
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN r.outside_scope = 1 THEN r.estimated_cost_cents END), 0) AS cents
       FROM records r WHERE ${whereSql}`,
    )
    .get(...params) as { count: number; cents: number };

  return {
    records: rows.map((row) => ({ ...row, safety: row.safety === 1 })),
    totals: { count: totals.count, estimatedCost: totals.cents / 100 },
  };
}

export function registerRecordListRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listRecords(db, projectId, RecordListQuery.parse(request.query));
  });
}
```

- [ ] **Step 4: Replace `src/server/records/routes.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { registerActivityRoutes } from './activity';
import { registerRecordListRoutes } from './list';
import { registerLogRoutes } from './log';
import { registerMeasurementRoutes } from './measurements';
import { registerOptionRoutes } from './options';
import { registerRecordCoreRoutes } from './records';
import { registerTransitionRoutes } from './transitions';

/** Every records route (Plan 3). */
export function registerRecordRoutes(app: FastifyInstance, db: Db): void {
  registerRecordCoreRoutes(app, db);
  registerActivityRoutes(app, db);
  registerTransitionRoutes(app, db);
  registerOptionRoutes(app, db);
  registerMeasurementRoutes(app, db);
  registerLogRoutes(app, db);
  registerRecordListRoutes(app, db);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/server/records-list.test.ts` → PASS (10 tests). Then `npm test` and `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/server/records/list.ts src/server/records/routes.ts tests/server/records-list.test.ts
git commit -m "feat(server): record list with filters, accent-insensitive search, sorting and totals"
```

### Task 9: Tags and locations that records use

**Files:**

- Modify: `src/server/lists/tags.ts`, `src/server/lists/locations.ts`
- Test: `tests/server/lists-with-records.test.ts`

This completes the Plan 2 hand-over items: a tag merge moves record links, a tag delete reports its usage first, and a location that records use cannot be deleted (the owner retires it instead). A merge or delete also marks each record whose tags change as updated (Decision 13), so the record moves up when the list is sorted by update time.

- [ ] **Step 1: Write the failing test `tests/server/lists-with-records.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTag } from '../../src/server/lists/tags';
import { get, send } from './helpers';
import { getRecord, makeFixture, patchRecord, postRecord, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

const tagUrl = (id: number, suffix = '') => `${f.base}/tags/${id}${suffix}`;

describe('tags on records (design §9.3)', () => {
  it('a merge moves the records to the remaining tag, once per record', async () => {
    const onlySource = await postRecord(f, { subtype: 'task', tagIds: [f.tags.windows] });
    const both = await postRecord(f, { subtype: 'task', tagIds: [f.tags.windows, f.tags.stone] });
    const merged = await send(f.ctx, f.cookie, 'POST', tagUrl(f.tags.windows, '/merge'), { intoId: f.tags.stone });
    expect(merged.statusCode).toBe(200);
    expect((await getRecord(f, onlySource.id)).tagIds).toEqual([f.tags.stone]);
    expect((await getRecord(f, both.id)).tagIds).toEqual([f.tags.stone]);
    expect((await get(f.ctx, f.cookie, tagUrl(f.tags.stone, '/usage'))).json()).toEqual({ records: 2 });
  });

  it('shows how many records a tag is on, and a delete removes it from them', async () => {
    const record = await postRecord(f, { subtype: 'task', tagIds: [f.tags.stone, f.tags.windows] });
    expect((await get(f.ctx, f.cookie, tagUrl(f.tags.stone, '/usage'))).json()).toEqual({ records: 1 });
    expect((await send(f.ctx, f.cookie, 'DELETE', tagUrl(f.tags.stone))).statusCode).toBe(200);
    expect((await getRecord(f, record.id)).tagIds).toEqual([f.tags.windows]);
  });

  it('a rename applies to every record carrying the tag', async () => {
    await postRecord(f, { subtype: 'task', tagIds: [f.tags.stone] });
    await send(f.ctx, f.cookie, 'PATCH', tagUrl(f.tags.stone), { nameEn: 'Natural stone' });
    const records = (await get(f.ctx, f.cookie, `${f.base}/records?tagId=${f.tags.stone}`)).json();
    expect(records.totals.count).toBe(1);
  });
});

describe('record update time after tag operations', () => {
  it('a merge or delete marks the records whose tags change as updated, and only those', async () => {
    const pool = createTag(f.ctx.db, f.projectId, { nameEl: 'Πισίνα', nameEn: 'Pool' }).id;
    const merged = await postRecord(f, { subtype: 'task', tagIds: [f.tags.windows] });
    const deleted = await postRecord(f, { subtype: 'task', tagIds: [pool] });
    const untouched = await postRecord(f, { subtype: 'task', tagIds: [f.tags.stone] });
    const old = '2000-01-01T00:00:00.000Z';
    f.ctx.db.prepare('UPDATE records SET updated_at = ?').run(old);
    await send(f.ctx, f.cookie, 'POST', tagUrl(f.tags.windows, '/merge'), { intoId: f.tags.stone });
    await send(f.ctx, f.cookie, 'DELETE', tagUrl(pool));
    expect((await getRecord(f, merged.id)).updatedAt).not.toBe(old);
    expect((await getRecord(f, deleted.id)).updatedAt).not.toBe(old);
    expect((await getRecord(f, untouched.id)).updatedAt).toBe(old);
  });
});

describe('locations on records (design §9.4)', () => {
  it('refuses to delete a node that a record uses, directly or inside it', async () => {
    const record = await postRecord(f, { subtype: 'task', locationIds: [f.locations.v1Kitchen] });
    for (const node of [f.locations.v1Kitchen, f.locations.villa1]) {
      const res = await send(f.ctx, f.cookie, 'DELETE', `${f.base}/locations/${node}`);
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'location_in_use', details: { records: 1 } });
    }
    const retired = await send(f.ctx, f.cookie, 'PATCH', `${f.base}/locations/${f.locations.villa1}`, { active: false });
    expect(retired.json()).toMatchObject({ active: false });
    await patchRecord(f, record.id, { locationIds: [] });
    expect((await send(f.ctx, f.cookie, 'DELETE', `${f.base}/locations/${f.locations.villa1}`)).statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/server/lists-with-records.test.ts`
Expected: FAIL — 4 tests fail and 1 passes. The merge leaves the record without tags (`expected [] to deeply equal [ 1 ]`), `/usage` answers `404`, the merged and deleted records keep their old update time, and deleting a used location hits the database's foreign-key check (`500` where `409` is expected). The rename test already passes: a rename never touched records; it guards that behaviour.

- [ ] **Step 3: Modify `src/server/lists/tags.ts`**

Replace:

```ts
import { ItemParams, ProjectParams } from '../http/params';

```

with:

```ts
import { ItemParams, ProjectParams } from '../http/params';
import { requireUserId } from '../http/user';

```

Replace:

```ts
/**
 * Merges a tag into another, which keeps its own names (design §9.3).
 * Plan 3 adds: move the source tag's record links to the target (in this transaction) before the delete.
 */
export function mergeTag(db: Db, projectId: number, sourceId: number, intoId: number): Tag {
  if (sourceId === intoId) throw new HttpError(400, 'merge_into_self');
  getTag(db, projectId, sourceId);
  const target = getTag(db, projectId, intoId);
  db.transaction(() => {
    db.prepare('DELETE FROM tags WHERE project_id = ? AND id = ?').run(projectId, sourceId);
  })();
  return target;
}

/** Plan 3 adds: the number of affected records, shown to the owner before confirming (design §9.3). */
export function deleteTag(db: Db, projectId: number, id: number): void {
  getTag(db, projectId, id);
  db.prepare('DELETE FROM tags WHERE project_id = ? AND id = ?').run(projectId, id);
}
```

with:

```ts
/** Every record carrying the tag is about to change: mark it as updated by the owner. */
function touchRecordsWithTag(db: Db, tagId: number, userId: number, now: Date): void {
  db.prepare(
    'UPDATE records SET updated_at = ?, updated_by = ? WHERE id IN (SELECT record_id FROM record_tags WHERE tag_id = ?)',
  ).run(now.toISOString(), userId, tagId);
}

/**
 * Merges a tag into another, which keeps its own names (design §9.3). Records carrying the source tag
 * carry the target instead (a record that already has both keeps one link) and are marked as updated.
 */
export function mergeTag(
  db: Db,
  projectId: number,
  sourceId: number,
  intoId: number,
  userId: number,
  now: Date = new Date(),
): Tag {
  if (sourceId === intoId) throw new HttpError(400, 'merge_into_self');
  getTag(db, projectId, sourceId);
  const target = getTag(db, projectId, intoId);
  db.transaction(() => {
    touchRecordsWithTag(db, sourceId, userId, now);
    db.prepare(
      'INSERT OR IGNORE INTO record_tags (record_id, tag_id) SELECT record_id, ? FROM record_tags WHERE tag_id = ?',
    ).run(intoId, sourceId);
    // Deleting the tag removes its remaining record links (ON DELETE CASCADE).
    db.prepare('DELETE FROM tags WHERE project_id = ? AND id = ?').run(projectId, sourceId);
  })();
  return target;
}

/** How many records carry the tag; shown to the owner before a delete is confirmed (design §9.3). */
export function tagUsage(db: Db, projectId: number, id: number): { records: number } {
  getTag(db, projectId, id);
  return { records: db.prepare('SELECT COUNT(*) FROM record_tags WHERE tag_id = ?').pluck().get(id) as number };
}

/** Removes the tag from every record (ON DELETE CASCADE), marking those records as updated, and deletes it. */
export function deleteTag(db: Db, projectId: number, id: number, userId: number, now: Date = new Date()): void {
  getTag(db, projectId, id);
  db.transaction(() => {
    touchRecordsWithTag(db, id, userId, now);
    db.prepare('DELETE FROM tags WHERE project_id = ? AND id = ?').run(projectId, id);
  })();
}
```

Replace:

```ts
    return mergeTag(db, projectId, id, TagMergeBody.parse(request.body).intoId);
  });

  app.delete('/api/projects/:projectId/tags/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteTag(db, projectId, id);
    return { ok: true };
  });
```

with:

```ts
    return mergeTag(db, projectId, id, TagMergeBody.parse(request.body).intoId, requireUserId(request));
  });

  app.get('/api/projects/:projectId/tags/:id/usage', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return tagUsage(db, projectId, id);
  });

  app.delete('/api/projects/:projectId/tags/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteTag(db, projectId, id, requireUserId(request));
    return { ok: true };
  });
```

- [ ] **Step 4: Modify `src/server/lists/locations.ts`**

Replace:

```ts
/**
 * Deletes the node and everything inside it.
 * Plan 3 adds: only when no record uses any of them; otherwise 409 and the owner retires the node instead (design §9.4).
 */
export function deleteLocation(db: Db, projectId: number, id: number): void {
  getLocation(db, projectId, id);
  const ids = subtreeIds(db, projectId, id);
  db.prepare(`DELETE FROM location_nodes WHERE project_id = ? AND id IN (${ids.map(() => '?').join(', ')})`).run(
    projectId,
    ...ids,
  );
}
```

with:

```ts
/**
 * Deletes the node and everything inside it, but only when no record uses any of them;
 * otherwise the owner retires the node instead (design §9.4).
 */
export function deleteLocation(db: Db, projectId: number, id: number): void {
  getLocation(db, projectId, id);
  const ids = subtreeIds(db, projectId, id);
  const placeholders = ids.map(() => '?').join(', ');
  const records = db
    .prepare(`SELECT COUNT(DISTINCT record_id) FROM record_locations WHERE location_id IN (${placeholders})`)
    .pluck()
    .get(...ids) as number;
  if (records > 0) throw new HttpError(409, 'location_in_use', { records });
  db.prepare(`DELETE FROM location_nodes WHERE project_id = ? AND id IN (${placeholders})`).run(projectId, ...ids);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/server/lists-with-records.test.ts` → PASS (5 tests). Then `npm test` and `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/server/lists/tags.ts src/server/lists/locations.ts tests/server/lists-with-records.test.ts
git commit -m "feat(server): tag merge, usage and delete across records; locations in use cannot be deleted"
```

### Task 10: Reads never write; records need the owner

**Files:**

- Test: `tests/server/records-reads.test.ts`

A guard test over everything built in Tasks 3–9 (design §11.5): no GET request changes the database, and the records routes follow Plan 2's session and `Origin` rules. It uses SQLite's `total_changes()`, which counts every row written on the connection. It should pass at once; if it fails, a GET handler writes and must be fixed.

- [ ] **Step 1: Write the test `tests/server/records-reads.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get, send } from './helpers';
import { makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

describe('records and the request rules (design §11.5)', () => {
  it('GET requests never write anything', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue', title: 'Jamb', problemTypes: ['defect'] });
    await send(f.ctx, f.cookie, 'POST', recordUrl(f, qi.id, '/options'), { label: 'Grind' });
    await send(f.ctx, f.cookie, 'POST', recordUrl(f, qi.id, '/measurement-sets'), { date: '2026-09-14', phase: 'before' });
    await send(f.ctx, f.cookie, 'POST', recordUrl(f, qi.id, '/log'), { text: 'Seen on site' });
    await send(f.ctx, f.cookie, 'POST', recordUrl(f, qi.id, '/transitions'), { to: 'open' });

    const totalChanges = () => f.ctx.db.prepare('SELECT total_changes()').pluck().get();
    const before = totalChanges();
    const urls = [
      `${f.base}/records`,
      `${f.base}/records?q=jamb&sort=updated`,
      recordUrl(f, qi.id),
      ...['/activity', '/verifications', '/options', '/measurement-sets', '/log'].map((suffix) => recordUrl(f, qi.id, suffix)),
      `${f.base}/tags/${f.tags.stone}/usage`,
    ];
    for (const url of urls) expect((await get(f.ctx, f.cookie, url)).statusCode, url).toBe(200);
    expect(totalChanges()).toBe(before);
  });

  it('records routes need the owner session, and changes need the matching Origin', async () => {
    const record = await postRecord(f, { subtype: 'task' });
    const noSession = await f.ctx.app.inject({ method: 'GET', url: recordUrl(f, record.id) });
    expect(noSession.statusCode).toBe(401);
    const noOrigin = await f.ctx.app.inject({
      method: 'PATCH',
      url: recordUrl(f, record.id),
      headers: { cookie: f.cookie },
      payload: { title: 'x' },
    });
    expect(noOrigin.statusCode).toBe(403);
    const wrongOrigin = await f.ctx.app.inject({
      method: 'POST',
      url: recordUrl(f, record.id, '/transitions'),
      headers: { cookie: f.cookie, origin: 'https://www.ktimanet.com' },
      payload: { to: 'cancelled', reasonCode: 'duplicate' },
    });
    expect(wrongOrigin.statusCode).toBe(403);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/server/records-reads.test.ts` → PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add tests/server/records-reads.test.ts
git commit -m "test(server): GET requests on records never write; records routes need the owner"
```

### Task 11: Verify, record and close Plan 3

**Files:**

- Modify: `docs/designs/2026-10-02-v1-records-design.md` (§14)
- Modify: `docs/plans/2026-10-03-plan-3-records-api.md` (metadata), `docs/plans/2026-10-02-v1-roadmap.md` (Plan 3 status)

- [ ] **Step 1: Run the full suite and the type check**

Run: `npm test`
Expected: `Test Files  29 passed (29)` and `Tests  229 passed (229)` (Plans 1–2: 155; Plan 3: 74 — records 10, records-db 3, records-api 12, record-links 6, transitions-api 10, options-api 6, measurements-api 5, log-api 5, records-list 10, lists-with-records 5, records-reads 2).
Run: `npm run typecheck` → no output.

- [ ] **Step 2: Update design §14 (Decisions 2 and 12)**

Replace:

```text
- Inspections, checklists, inspection & test plans.
```

with:

```text
- Inspections, checklists, inspection & test plans.
- Deleting records: a record created by mistake is cancelled (reason _Raised in error_).
- Edit-conflict detection: when the same record is saved from two devices, the last save wins.
```

- [ ] **Step 3: Update this plan's metadata**

Set `> **Status:** Completed`, `> **Retention:** Historical — do not execute.`, `> **Implemented by:**` the Plan 3 commit range (first..last hash), and `> **Verified:**` with the date and the two results of Step 1.

- [ ] **Step 4: Update the roadmap**

In `docs/plans/2026-10-02-v1-roadmap.md`, change the Plan 3 row's status from `Written` to `Completed`.

- [ ] **Step 5: Commit**

```bash
git add docs/designs/2026-10-02-v1-records-design.md docs/plans/2026-10-03-plan-3-records-api.md docs/plans/2026-10-02-v1-roadmap.md
git commit -m "docs: record Plan 3 completion; design §14 lists record deletion and edit conflicts as out of scope"
```

---

## Hand-over to later plans

- **Plan 4 (files and sharing):**
  - `deleteLogEntry` (`log.ts`) must delete the entry's attachment occurrences in its transaction (design §5.11).
  - Share responses must leave out private content (design §2): `notes`, `outsideScope`, `estimatedCost`, private Log entries and their attachments. Draft records are "not available".
  - On shared pages, _Must be done before / Requires first_ entries show only ID and title and omit Draft records (`readMustBeDoneBefore` / `readRequiresFirst` return the status, so the filter is simple).
  - Share links created or revoked are activity entries: add the actions to `ActivityAction` in `activity.ts`.
  - Decide whether the shared page shows the activity log at all. If it does, apply design §5.12: entries about private fields are owner-only.
- **Plan 5 (web interface):**
  - The status dialog offers `allowedTransitions` from `GET /records/:id`; the server still checks every condition and answers `422 transition_rejected` with Plan 1's rule codes, which the browser turns into messages.
  - Measurement comparison views and label suggestions use the domain functions on `GET …/measurement-sets` (Decision 10).
  - Before a tag delete, show `GET /tags/:id/usage`; on `409 location_in_use`, offer to retire the node instead.
  - The estimated cost is hidden while _Outside contract scope_ is unticked (Decision 9).
- **Plan 6 (print and operations):** the A3 print view reads `GET /records/:id` and the sub-collection routes; it must leave out private content, as share pages do.
