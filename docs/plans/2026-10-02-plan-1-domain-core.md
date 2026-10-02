# Plan 1 — Domain Core Implementation Plan

> **Document type:** Implementation plan
> **Status:** Completed
> **Retention:** Active until executed; historical afterwards.
> **Implements:** `docs/designs/2026-10-02-v1-records-design.md` §4.2 (IDs), §5–§6 (required fields, disposition and decision rules), §5.7 (measurement rules and comparisons), §7 (value lists), §8 (status rules).
> **Implemented by:** `804a372..95e1bf4` (Tasks 1–6); final public exports and verification are in this completion commit (`feat(domain): public exports; complete Plan 1`).
> **Verified:** 2026-10-03 (Australia/Sydney) — `npm test` (68 passed across 7 files), `npm run typecheck` clean.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the repository's TypeScript scaffold and the pure `src/domain` package: bilingual value lists generated from the design, human IDs, status sets, required-field and save validation, status transition rules, and measurement comparisons — all test-first.

**Architecture:** `src/domain` is pure TypeScript with no I/O, shared later by the Fastify server and the React app. The 17 value lists are extracted once from design §7 by a script into `vocabulary.data.ts` (the design stays the single source while it is the implementation baseline); typed helpers live in `vocab.ts`. Rules are plain functions returning error codes, so the server can enforce them and the UI can explain them.

**Tech Stack:** Node.js ≥ 22.12.0, TypeScript 5 (strict, ESM, `moduleResolution: bundler`), Vitest 3. No runtime dependencies yet.

---

## File structure

| File | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `vitest.config.ts` | Scaffold: ESM, strict TypeScript, Vitest |
| `scripts/extract-vocabulary.mjs` | Reads design §7 tables → writes `src/domain/vocabulary.data.ts` |
| `src/domain/vocabulary.data.ts` | **Generated.** The 17 value lists: code, EN/EL labels, EN/EL definitions |
| `src/domain/vocab.ts` | Code types per list; `codesOf`, `isCode`, `labelOf`, `definitionOf` |
| `src/domain/ids.ts` | `formatHumanId` (QI-0001, DC-0001, T-0001) |
| `src/domain/statuses.ts` | Status sets per subtype; active / non-terminal predicates |
| `src/domain/record-rules.ts` | `RecordState`; required fields; `validateSave`; `allowedTargets`; `checkTransition` |
| `src/domain/measurements.ts` | Label normalisation; duplicate rows; set order; between-items and over-time comparisons |
| `src/domain/index.ts` | Public exports of the domain package |
| `tests/domain/*.test.ts` | One test file per module |
| `tests/domain/helpers.ts` | `makeRecord()` test fixture shared by the rule tests |

---

### Task 1: Scaffold and value lists

**Files:**

- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `scripts/extract-vocabulary.mjs`
- Create (generated): `src/domain/vocabulary.data.ts`
- Create: `src/domain/vocab.ts`
- Test: `tests/domain/vocabulary.test.ts`

- [x] **Step 1: Create `package.json`**

```json
{
  "name": "builtbasis",
  "version": "0.1.0",
  "private": true,
  "license": "UNLICENSED",
  "type": "module",
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "vocabulary:extract": "node scripts/extract-vocabulary.mjs"
  }
}
```

- [x] **Step 2: Install development dependencies**

Run: `npm install -D typescript@5 vitest@3 @types/node@22`
Expected: `added N packages`; `package-lock.json` created.

- [x] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests", "vitest.config.ts"]
}
```

- [x] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

- [x] **Step 5: Write the failing test `tests/domain/vocabulary.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  LIST_KEYS,
  codesOf,
  definitionOf,
  entriesOf,
  isCode,
  labelOf,
  type ListKey,
} from '../../src/domain/vocab';

// Pins the design §7 lists: a changed count means the design and the code disagree.
const EXPECTED_COUNTS: Record<ListKey, number> = {
  subtype: 3,
  status: 10,
  onHoldReason: 6,
  cancellationReason: 5,
  problemType: 6,
  stage: 4,
  disposition: 4,
  route: 5,
  severity: 3,
  priority: 4,
  personRole: 8,
  locationNodeKind: 4,
  measurementPhase: 3,
  unit: 8,
  photoPhase: 3,
  verificationMethod: 4,
  verificationOutcome: 2,
};

describe('vocabulary (design §7)', () => {
  it('contains exactly the 17 value lists', () => {
    expect([...LIST_KEYS].sort()).toEqual(Object.keys(EXPECTED_COUNTS).sort());
  });

  it.each(Object.entries(EXPECTED_COUNTS))('%s has %i values', (key, count) => {
    expect(entriesOf(key as ListKey)).toHaveLength(count);
  });

  it('every value in every list has a code, EN/EL labels and EN/EL definitions', () => {
    for (const key of LIST_KEYS) {
      for (const entry of entriesOf(key)) {
        expect(entry.code, key).toMatch(/^[a-z0-9_]+$/);
        for (const field of ['en', 'el', 'defEn', 'defEl'] as const) {
          expect(entry[field].trim(), `${key}.${entry.code}.${field}`).not.toBe('');
        }
      }
    }
  });

  it('codes are unique within each list', () => {
    for (const key of LIST_KEYS) {
      const codes = codesOf(key);
      expect(new Set(codes).size, key).toBe(codes.length);
    }
  });

  it('carries no markdown emphasis from the design tables', () => {
    for (const key of LIST_KEYS) {
      for (const entry of entriesOf(key)) {
        expect(`${entry.defEn} ${entry.defEl}`, `${key}.${entry.code}`).not.toMatch(/(^|\s)_\S/);
      }
    }
  });

  it('looks up labels and definitions by language', () => {
    expect(labelOf('status', 'in_progress', 'en')).toBe('In progress');
    expect(labelOf('status', 'in_progress', 'el')).toBe('Σε εξέλιξη');
    expect(labelOf('disposition', 'repair', 'el')).toBe('Επισκευή');
    expect(definitionOf('disposition', 'repair', 'en')).toContain('Decided by');
  });

  it('recognises valid codes and rejects unknown ones', () => {
    expect(isCode('severity', 'critical')).toBe(true);
    expect(isCode('severity', 'urgent')).toBe(false);
    expect(isCode('severity', 42)).toBe(false);
    expect(() => labelOf('severity', 'nope', 'en')).toThrow(RangeError);
  });
});
```

- [x] **Step 6: Run the test to verify it fails**

Run: `npx vitest run tests/domain/vocabulary.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/domain/vocab"`.

- [x] **Step 7: Create `scripts/extract-vocabulary.mjs`**

```js
// Extracts the value lists of design §7 into src/domain/vocabulary.data.ts.
// Run while the design is the implementation baseline: npm run vocabulary:extract
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const DESIGN = 'docs/designs/2026-10-02-v1-records-design.md';
const OUTPUT = 'src/domain/vocabulary.data.ts';

const KEYS = {
  '7.1': 'subtype',
  '7.2': 'status',
  '7.3': 'onHoldReason',
  '7.4': 'cancellationReason',
  '7.5': 'problemType',
  '7.6': 'stage',
  '7.7': 'disposition',
  '7.8': 'route',
  '7.9': 'severity',
  '7.10': 'priority',
  '7.11': 'personRole',
  '7.12': 'locationNodeKind',
  '7.13': 'measurementPhase',
  '7.14': 'unit',
  '7.15': 'photoPhase',
  '7.16': 'verificationMethod',
  '7.17': 'verificationOutcome',
};

// Removes markdown emphasis (_word_) without touching snake_case inside words.
const clean = (cell) => cell.trim().replace(/(?<![\p{L}\p{N}])_([^_]+?)_(?![\p{L}\p{N}])/gu, '$1');

const ROW = /^\| `([a-z0-9_]+)` \| (.*?) \| (.*?) \| (.*?) \| (.*?) \|$/;

const lists = {};
let current = null;
for (const line of readFileSync(DESIGN, 'utf8').split(/\r?\n/)) {
  const heading = line.match(/^### (7\.\d+) /);
  if (heading) {
    current = KEYS[heading[1]] ?? null;
    if (current) lists[current] = [];
    continue;
  }
  if (line.startsWith('## ') || line.startsWith('### ')) {
    current = null;
    continue;
  }
  if (!current) continue;
  const row = line.match(ROW);
  if (row) {
    lists[current].push({
      code: row[1],
      en: clean(row[2]),
      el: clean(row[3]),
      defEn: clean(row[4]),
      defEl: clean(row[5]),
    });
  }
}

for (const key of Object.values(KEYS)) {
  if (!lists[key] || lists[key].length === 0) {
    throw new Error(`No values found for ${key}; check the headings of design §7`);
  }
}

const header =
  `// GENERATED by scripts/extract-vocabulary.mjs from ${DESIGN} §7. Do not edit by hand.\n` +
  `// Regenerate with: npm run vocabulary:extract\n\n`;
const body =
  `export const VOCABULARY = ${JSON.stringify(lists, null, 2)} as const satisfies Record<\n` +
  `  string,\n  readonly { code: string; en: string; el: string; defEn: string; defEl: string }[]\n>;\n`;
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, header + body, 'utf8');

for (const [key, values] of Object.entries(lists)) console.log(`${key}: ${values.length}`);
console.log(`Wrote ${OUTPUT}`);
```

- [x] **Step 8: Run the extraction**

Run: `npm run vocabulary:extract`
Expected output (17 lines, then the file):

```text
subtype: 3
status: 10
onHoldReason: 6
cancellationReason: 5
problemType: 6
stage: 4
disposition: 4
route: 5
severity: 3
priority: 4
personRole: 8
locationNodeKind: 4
measurementPhase: 3
unit: 8
photoPhase: 3
verificationMethod: 4
verificationOutcome: 2
Wrote src/domain/vocabulary.data.ts
```

Open `src/domain/vocabulary.data.ts` and spot-check: `"code": "in_progress"` has `"el": "Σε εξέλιξη"`; the `repair` definition reads `… recorded in Decided by / Decided on.` (no underscores).

- [x] **Step 9: Create `src/domain/vocab.ts`**

```ts
import { VOCABULARY } from './vocabulary.data';

export type Lang = 'en' | 'el';

export interface VocabularyEntry {
  readonly code: string;
  readonly en: string;
  readonly el: string;
  readonly defEn: string;
  readonly defEl: string;
}

type Vocabulary = typeof VOCABULARY;
export type ListKey = keyof Vocabulary;
export type CodeOf<K extends ListKey> = Vocabulary[K][number]['code'];

export type Subtype = CodeOf<'subtype'>;
export type Status = CodeOf<'status'>;
export type OnHoldReason = CodeOf<'onHoldReason'>;
export type CancellationReason = CodeOf<'cancellationReason'>;
export type ProblemType = CodeOf<'problemType'>;
export type Stage = CodeOf<'stage'>;
export type Disposition = CodeOf<'disposition'>;
export type Route = CodeOf<'route'>;
export type Severity = CodeOf<'severity'>;
export type Priority = CodeOf<'priority'>;
export type PersonRole = CodeOf<'personRole'>;
export type LocationNodeKind = CodeOf<'locationNodeKind'>;
export type MeasurementPhase = CodeOf<'measurementPhase'>;
export type Unit = CodeOf<'unit'>;
export type PhotoPhase = CodeOf<'photoPhase'>;
export type VerificationMethod = CodeOf<'verificationMethod'>;
export type VerificationOutcome = CodeOf<'verificationOutcome'>;

export const LIST_KEYS = Object.keys(VOCABULARY) as ListKey[];

export function entriesOf(key: ListKey): readonly VocabularyEntry[] {
  return VOCABULARY[key] as readonly VocabularyEntry[];
}

export function codesOf<K extends ListKey>(key: K): CodeOf<K>[] {
  return entriesOf(key).map((entry) => entry.code) as CodeOf<K>[];
}

export function isCode<K extends ListKey>(key: K, value: unknown): value is CodeOf<K> {
  return typeof value === 'string' && entriesOf(key).some((entry) => entry.code === value);
}

function findEntry(key: ListKey, code: string): VocabularyEntry {
  const entry = entriesOf(key).find((candidate) => candidate.code === code);
  if (!entry) throw new RangeError(`Unknown ${key} code: ${code}`);
  return entry;
}

export function labelOf(key: ListKey, code: string, lang: Lang): string {
  const entry = findEntry(key, code);
  return lang === 'en' ? entry.en : entry.el;
}

export function definitionOf(key: ListKey, code: string, lang: Lang): string {
  const entry = findEntry(key, code);
  return lang === 'en' ? entry.defEn : entry.defEl;
}
```

- [x] **Step 10: Run the tests and the type check**

Run: `npx vitest run tests/domain/vocabulary.test.ts`
Expected: PASS — 23 tests (6 named tests + 17 parameterised counts).
Run: `npm run typecheck`
Expected: no output, exit code 0.

- [x] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts scripts/extract-vocabulary.mjs src/domain/vocabulary.data.ts src/domain/vocab.ts tests/domain/vocabulary.test.ts
git commit -m "feat(domain): scaffold and bilingual value lists generated from design §7"
```

### Task 2: Human IDs

**Files:**

- Create: `src/domain/ids.ts`
- Test: `tests/domain/ids.test.ts`

- [x] **Step 1: Write the failing test `tests/domain/ids.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { formatHumanId } from '../../src/domain/ids';

describe('formatHumanId (design §4.2)', () => {
  it('uses the subtype prefix and a 4-digit sequence', () => {
    expect(formatHumanId('quality_issue', 1)).toBe('QI-0001');
    expect(formatHumanId('detail_clarification', 7)).toBe('DC-0007');
    expect(formatHumanId('task', 12)).toBe('T-0012');
  });

  it('never truncates sequences above 9999', () => {
    expect(formatHumanId('task', 12345)).toBe('T-12345');
  });

  it('rejects non-positive or fractional sequences', () => {
    expect(() => formatHumanId('task', 0)).toThrow(RangeError);
    expect(() => formatHumanId('task', 1.5)).toThrow(RangeError);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/domain/ids.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/domain/ids"`.

- [x] **Step 3: Create `src/domain/ids.ts`**

```ts
import type { Subtype } from './vocab';

const PREFIX: Record<Subtype, string> = {
  quality_issue: 'QI',
  detail_clarification: 'DC',
  task: 'T',
};

/** Human ID: subtype prefix + per-project, per-subtype sequence (design §4.2). */
export function formatHumanId(subtype: Subtype, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Sequence must be a positive integer, got ${sequence}`);
  }
  return `${PREFIX[subtype]}-${String(sequence).padStart(4, '0')}`;
}
```

- [x] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/domain/ids.test.ts`
Expected: PASS — 3 tests.

- [x] **Step 5: Commit**

```bash
git add src/domain/ids.ts tests/domain/ids.test.ts
git commit -m "feat(domain): human record IDs"
```

### Task 3: Status sets

**Files:**

- Create: `src/domain/statuses.ts`
- Test: `tests/domain/statuses.test.ts`

- [x] **Step 1: Write the failing test `tests/domain/statuses.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { isActive, isNonTerminal, statusesFor } from '../../src/domain/statuses';

describe('status sets (design §7.2, §8)', () => {
  it('Quality Issue and Task use every status except Superseded', () => {
    for (const subtype of ['quality_issue', 'task'] as const) {
      const statuses = statusesFor(subtype);
      expect(statuses).toHaveLength(9);
      expect(statuses).not.toContain('superseded');
    }
  });

  it('Detail Clarification uses all 10 statuses', () => {
    expect(statusesFor('detail_clarification')).toHaveLength(10);
    expect(statusesFor('detail_clarification')).toContain('superseded');
  });

  it('active statuses are all except Draft, Cancelled and Superseded', () => {
    expect(isActive('draft')).toBe(false);
    expect(isActive('cancelled')).toBe(false);
    expect(isActive('superseded')).toBe(false);
    expect(isActive('open')).toBe(true);
    expect(isActive('on_hold')).toBe(true);
    expect(isActive('closed')).toBe(true);
  });

  it('non-terminal statuses are all except Closed, Cancelled and Superseded', () => {
    expect(isNonTerminal('closed')).toBe(false);
    expect(isNonTerminal('cancelled')).toBe(false);
    expect(isNonTerminal('superseded')).toBe(false);
    expect(isNonTerminal('draft')).toBe(true);
    expect(isNonTerminal('ready_for_verification')).toBe(true);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/domain/statuses.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/domain/statuses"`.

- [x] **Step 3: Create `src/domain/statuses.ts`**

```ts
import { codesOf, type Status, type Subtype } from './vocab';

const INCOMPLETE_ALLOWED: readonly Status[] = ['draft', 'cancelled', 'superseded'];
const END_STATES: readonly Status[] = ['closed', 'cancelled', 'superseded'];

/** Statuses a subtype may use (design §7.2). */
export function statusesFor(subtype: Subtype): Status[] {
  const all = codesOf('status');
  return subtype === 'detail_clarification' ? all : all.filter((status) => status !== 'superseded');
}

/** Active statuses require complete required fields (design §5, §8.2). */
export function isActive(status: Status): boolean {
  return !INCOMPLETE_ALLOWED.includes(status);
}

/** Non-terminal statuses can be superseded (design §8.1). */
export function isNonTerminal(status: Status): boolean {
  return !END_STATES.includes(status);
}
```

- [x] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/domain/statuses.test.ts`
Expected: PASS — 4 tests.

- [x] **Step 5: Commit**

```bash
git add src/domain/statuses.ts tests/domain/statuses.test.ts
git commit -m "feat(domain): status sets per subtype"
```

### Task 4: Required fields and save validation

**Files:**

- Create: `src/domain/record-rules.ts`
- Create: `tests/domain/helpers.ts`
- Test: `tests/domain/record-rules.test.ts`

- [x] **Step 1: Create the test fixture `tests/domain/helpers.ts`**

```ts
import type { RecordState } from '../../src/domain/record-rules';

/** A complete, open Quality Issue; override any field per test. */
export function makeRecord(overrides: Partial<RecordState> = {}): RecordState {
  return {
    subtype: 'quality_issue',
    status: 'open',
    statusBeforeHold: null,
    title: 'Stone step at entrance',
    problemTypes: ['defect'],
    question: null,
    disposition: null,
    decidedById: null,
    decidedOn: null,
    ...overrides,
  };
}
```

- [x] **Step 1b: Write the failing test `tests/domain/record-rules.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { missingRequired, validateSave } from '../../src/domain/record-rules';
import { makeRecord } from './helpers';

describe('required fields (design §5.1, §6, §8.2)', () => {
  it('Draft, Cancelled and Superseded may be incomplete', () => {
    for (const status of ['draft', 'cancelled'] as const) {
      expect(missingRequired(makeRecord({ status, title: null, problemTypes: [] }))).toEqual([]);
    }
    expect(
      missingRequired(makeRecord({ subtype: 'detail_clarification', status: 'superseded', title: '', question: null })),
    ).toEqual([]);
  });

  it('active Quality Issues need a title and at least one type of problem', () => {
    expect(missingRequired(makeRecord({ title: '  ', problemTypes: [] }))).toEqual(['title', 'problemTypes']);
  });

  it('active Detail Clarifications need a title and a question', () => {
    expect(missingRequired(makeRecord({ subtype: 'detail_clarification', problemTypes: [], question: ' ' }))).toEqual([
      'question',
    ]);
  });

  it('active Tasks need only a title', () => {
    expect(missingRequired(makeRecord({ subtype: 'task', problemTypes: [] }))).toEqual([]);
    expect(missingRequired(makeRecord({ subtype: 'task', title: null, problemTypes: [] }))).toEqual(['title']);
  });
});

describe('validateSave (design §6.1, §8.2)', () => {
  it('accepts a complete open Quality Issue without a disposition', () => {
    expect(validateSave(makeRecord())).toEqual([]);
  });

  it('requires a disposition once a Quality Issue is Issued, In progress, Ready for verification or Closed', () => {
    for (const status of ['issued', 'in_progress', 'ready_for_verification', 'closed'] as const) {
      expect(validateSave(makeRecord({ status }))).toEqual(['disposition_required']);
    }
  });

  it('requires Decided by and Decided on for Repair and Accept as is', () => {
    expect(validateSave(makeRecord({ status: 'issued', disposition: 'repair' }))).toEqual(['decision_required']);
    expect(
      validateSave(makeRecord({ status: 'issued', disposition: 'repair', decidedById: 3, decidedOn: '2026-10-05' })),
    ).toEqual([]);
    expect(validateSave(makeRecord({ status: 'issued', disposition: 'rework' }))).toEqual([]);
  });

  it('reports missing required fields with a required: prefix', () => {
    expect(validateSave(makeRecord({ title: null }))).toEqual(['required:title']);
  });

  it('requires Decided by and Decided on for Repair and Accept as is in every active status', () => {
    for (const status of ['open', 'awaiting_decision', 'on_hold'] as const) {
      for (const disposition of ['repair', 'accept_as_is'] as const) {
        expect(validateSave(makeRecord({ status, disposition })), `${status}/${disposition}`).toEqual([
          'decision_required',
        ]);
      }
    }
    expect(validateSave(makeRecord({ status: 'draft', disposition: 'repair' }))).toEqual([]);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/domain/record-rules.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/domain/record-rules"`.

- [x] **Step 3: Create `src/domain/record-rules.ts`**

```ts
import { isActive } from './statuses';
import type { Disposition, ProblemType, Status, Subtype } from './vocab';

/** The fields of a record that the domain rules need (design §5–§8). */
export interface RecordState {
  subtype: Subtype;
  status: Status;
  statusBeforeHold: Status | null;
  title: string | null;
  problemTypes: readonly ProblemType[];
  question: string | null;
  disposition: Disposition | null;
  decidedById: number | null;
  decidedOn: string | null;
}

export type RequiredField = 'title' | 'problemTypes' | 'question';

export type RuleError =
  | `required:${RequiredField}`
  | 'disposition_required'
  | 'decision_required'
  | 'accept_as_is_required'
  | 'transition_not_allowed'
  | 'reason_required'
  | 'reason_invalid'
  | 'reason_note_required'
  | 'note_required'
  | 'verification_required';

export const hasText = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim() !== '';

const DECISION_DISPOSITIONS: readonly Disposition[] = ['repair', 'accept_as_is'];
const DISPOSITION_STATUSES: readonly Status[] = ['issued', 'in_progress', 'ready_for_verification', 'closed'];

/** Required fields missing for the record's current status (design §5.1, §6.1, §6.2). */
export function missingRequired(record: RecordState): RequiredField[] {
  if (!isActive(record.status)) return [];
  const missing: RequiredField[] = [];
  if (!hasText(record.title)) missing.push('title');
  if (record.subtype === 'quality_issue' && record.problemTypes.length === 0) missing.push('problemTypes');
  if (record.subtype === 'detail_clarification' && !hasText(record.question)) missing.push('question');
  return missing;
}

/** Repair and Accept as is need Decided by and Decided on (design §5.6, §6.1). */
export function needsDecision(record: Pick<RecordState, 'disposition' | 'decidedById' | 'decidedOn'>): boolean {
  return (
    record.disposition !== null &&
    DECISION_DISPOSITIONS.includes(record.disposition) &&
    (record.decidedById === null || !hasText(record.decidedOn))
  );
}

/** Rules every save must satisfy in the record's current status (design §8.2). */
export function validateSave(record: RecordState): RuleError[] {
  const errors: RuleError[] = missingRequired(record).map((field) => `required:${field}` as const);
  if (record.subtype === 'quality_issue' && isActive(record.status)) {
    if (DISPOSITION_STATUSES.includes(record.status) && record.disposition === null) {
      errors.push('disposition_required');
    }
    // Repair and Accept as is need a recorded decision in every active status (design §5.6).
    if (needsDecision(record)) errors.push('decision_required');
  }
  return errors;
}
```

- [x] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/domain/record-rules.test.ts`
Expected: PASS — 9 tests.

- [x] **Step 5: Commit**

```bash
git add src/domain/record-rules.ts tests/domain/helpers.ts tests/domain/record-rules.test.ts
git commit -m "feat(domain): required fields and save validation"
```

### Task 5: Status transitions

**Files:**

- Modify: `src/domain/record-rules.ts` (append transition rules)
- Test: `tests/domain/transitions.test.ts`

- [x] **Step 1: Write the failing test `tests/domain/transitions.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { allowedTargets, checkTransition } from '../../src/domain/record-rules';
import { makeRecord } from './helpers';

const verification = { checkedById: 2, date: '2026-10-10', method: 'measurement' };

describe('allowedTargets (design §8.1)', () => {
  it('Draft can only become Open or Cancelled', () => {
    expect(allowedTargets(makeRecord({ status: 'draft' }))).toEqual(['open', 'cancelled']);
  });

  it('only Quality Issues and Tasks close straight from Open', () => {
    expect(allowedTargets(makeRecord({ status: 'open' }))).toContain('closed');
    expect(allowedTargets(makeRecord({ subtype: 'task', status: 'open' }))).toContain('closed');
    expect(allowedTargets(makeRecord({ subtype: 'detail_clarification', status: 'open' }))).not.toContain('closed');
  });

  it('only Detail Clarifications and Quality Issues close from Issued', () => {
    expect(allowedTargets(makeRecord({ subtype: 'detail_clarification', status: 'issued' }))).toContain('closed');
    expect(allowedTargets(makeRecord({ subtype: 'task', status: 'issued' }))).not.toContain('closed');
  });

  it('only Tasks close from In progress', () => {
    expect(allowedTargets(makeRecord({ subtype: 'task', status: 'in_progress' }))).toContain('closed');
    expect(allowedTargets(makeRecord({ status: 'in_progress' }))).not.toContain('closed');
  });

  it('Ready for verification leads only to Closed or In progress (plus Superseded for DC)', () => {
    expect(allowedTargets(makeRecord({ status: 'ready_for_verification' }))).toEqual(['closed', 'in_progress']);
    expect(allowedTargets(makeRecord({ subtype: 'detail_clarification', status: 'ready_for_verification' }))).toEqual([
      'closed',
      'in_progress',
      'superseded',
    ]);
  });

  it('On hold resumes only to the status before the hold', () => {
    expect(allowedTargets(makeRecord({ status: 'on_hold', statusBeforeHold: 'issued' }))).toEqual(['issued']);
  });

  it('Cancelled and Superseded are terminal; Closed can only reopen', () => {
    expect(allowedTargets(makeRecord({ status: 'cancelled' }))).toEqual([]);
    expect(allowedTargets(makeRecord({ subtype: 'detail_clarification', status: 'superseded' }))).toEqual([]);
    expect(allowedTargets(makeRecord({ status: 'closed' }))).toEqual(['open']);
  });

  it('Superseded is offered only to Detail Clarifications', () => {
    expect(allowedTargets(makeRecord({ subtype: 'detail_clarification', status: 'draft' }))).toContain('superseded');
    expect(allowedTargets(makeRecord({ status: 'open' }))).not.toContain('superseded');
  });
});

describe('checkTransition (design §5.10, §6.1, §7.3, §7.4, §8)', () => {
  it('rejects transitions that are not allowed', () => {
    expect(checkTransition(makeRecord({ status: 'draft' }), { to: 'closed' })).toEqual({
      ok: false,
      errors: ['transition_not_allowed'],
    });
  });

  it('Draft → Open requires the required fields', () => {
    expect(checkTransition(makeRecord({ status: 'draft', title: null, problemTypes: [] }), { to: 'open' })).toEqual({
      ok: false,
      errors: ['required:title', 'required:problemTypes'],
    });
  });

  it('Draft → Cancelled needs only a reason', () => {
    const draft = makeRecord({ status: 'draft', title: null, problemTypes: [] });
    expect(checkTransition(draft, { to: 'cancelled', reasonCode: 'raised_in_error' })).toEqual({
      ok: true,
      verificationOutcome: null,
    });
  });

  it('a Quality Issue needs a disposition before Issued or In progress', () => {
    expect(checkTransition(makeRecord(), { to: 'issued' })).toEqual({ ok: false, errors: ['disposition_required'] });
    expect(checkTransition(makeRecord(), { to: 'in_progress' })).toEqual({
      ok: false,
      errors: ['disposition_required'],
    });
    expect(checkTransition(makeRecord({ disposition: 'rework' }), { to: 'issued' }).ok).toBe(true);
  });

  it('Repair needs Decided by and Decided on before Issued', () => {
    expect(checkTransition(makeRecord({ disposition: 'repair' }), { to: 'issued' })).toEqual({
      ok: false,
      errors: ['decision_required'],
    });
  });

  it('closing a Quality Issue without verification requires Accept as is with a decision', () => {
    expect(checkTransition(makeRecord({ disposition: 'rework' }), { to: 'closed' })).toEqual({
      ok: false,
      errors: ['accept_as_is_required'],
    });
    expect(checkTransition(makeRecord({ disposition: 'accept_as_is' }), { to: 'closed' })).toEqual({
      ok: false,
      errors: ['decision_required'],
    });
    const accepted = makeRecord({ disposition: 'accept_as_is', decidedById: 1, decidedOn: '2026-10-05' });
    expect(checkTransition(accepted, { to: 'closed' })).toEqual({ ok: true, verificationOutcome: null });
  });

  it('On hold needs a valid reason, and Other needs a note', () => {
    const issued = makeRecord({ status: 'issued', disposition: 'rework' });
    expect(checkTransition(issued, { to: 'on_hold' })).toEqual({ ok: false, errors: ['reason_required'] });
    expect(checkTransition(issued, { to: 'on_hold', reasonCode: 'raining' })).toEqual({
      ok: false,
      errors: ['reason_invalid'],
    });
    expect(checkTransition(issued, { to: 'on_hold', reasonCode: 'other' })).toEqual({
      ok: false,
      errors: ['reason_note_required'],
    });
    expect(checkTransition(issued, { to: 'on_hold', reasonCode: 'weather' }).ok).toBe(true);
  });

  it('Cancelled with Replaced needs a note naming the record', () => {
    expect(checkTransition(makeRecord(), { to: 'cancelled', reasonCode: 'replaced' })).toEqual({
      ok: false,
      errors: ['reason_note_required'],
    });
    expect(checkTransition(makeRecord(), { to: 'cancelled', reasonCode: 'replaced', reasonNote: 'QI-0042' }).ok).toBe(
      true,
    );
  });

  it('leaving Ready for verification requires a verification entry and derives the outcome', () => {
    const ready = makeRecord({ status: 'ready_for_verification', disposition: 'rework' });
    expect(checkTransition(ready, { to: 'closed' })).toEqual({ ok: false, errors: ['verification_required'] });
    expect(checkTransition(ready, { to: 'closed', verification })).toEqual({ ok: true, verificationOutcome: 'passed' });
    expect(checkTransition(ready, { to: 'in_progress', verification })).toEqual({
      ok: true,
      verificationOutcome: 'failed',
    });
    expect(
      checkTransition(ready, { to: 'closed', verification: { ...verification, method: 'guess' } }),
    ).toEqual({ ok: false, errors: ['verification_required'] });
  });

  it('superseding a Detail Clarification needs a note and creates no verification', () => {
    const dc = makeRecord({
      subtype: 'detail_clarification',
      status: 'ready_for_verification',
      problemTypes: [],
      question: 'Tile set-out in basement bathrooms?',
    });
    expect(checkTransition(dc, { to: 'superseded' })).toEqual({ ok: false, errors: ['note_required'] });
    expect(checkTransition(dc, { to: 'superseded', note: 'Replaced by DC-0009' })).toEqual({
      ok: true,
      verificationOutcome: null,
    });
  });

  it('reopening a Closed record needs a note', () => {
    const closed = makeRecord({ status: 'closed', disposition: 'rework' });
    expect(checkTransition(closed, { to: 'open' })).toEqual({ ok: false, errors: ['note_required'] });
    expect(checkTransition(closed, { to: 'open', note: 'Crack reappeared' }).ok).toBe(true);
  });

  it('any transition keeps Repair and Accept as is tied to a recorded decision', () => {
    const issuedRepair = makeRecord({ status: 'issued', disposition: 'repair' });
    expect(checkTransition(issuedRepair, { to: 'on_hold', reasonCode: 'weather' })).toEqual({
      ok: false,
      errors: ['decision_required'],
    });
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/domain/transitions.test.ts`
Expected: FAIL — `allowedTargets is not a function` (or `does not provide an export named 'allowedTargets'`).

- [x] **Step 3: Replace `src/domain/record-rules.ts` with the complete file below** (Task 4 content plus the transition rules)

```ts
import { isActive, isNonTerminal, statusesFor } from './statuses';
import { isCode, type Disposition, type ProblemType, type Status, type Subtype, type VerificationOutcome } from './vocab';

/** The fields of a record that the domain rules need (design §5–§8). */
export interface RecordState {
  subtype: Subtype;
  status: Status;
  statusBeforeHold: Status | null;
  title: string | null;
  problemTypes: readonly ProblemType[];
  question: string | null;
  disposition: Disposition | null;
  decidedById: number | null;
  decidedOn: string | null;
}

export type RequiredField = 'title' | 'problemTypes' | 'question';

export type RuleError =
  | `required:${RequiredField}`
  | 'disposition_required'
  | 'decision_required'
  | 'accept_as_is_required'
  | 'transition_not_allowed'
  | 'reason_required'
  | 'reason_invalid'
  | 'reason_note_required'
  | 'note_required'
  | 'verification_required';

export const hasText = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim() !== '';

const DECISION_DISPOSITIONS: readonly Disposition[] = ['repair', 'accept_as_is'];
const DISPOSITION_STATUSES: readonly Status[] = ['issued', 'in_progress', 'ready_for_verification', 'closed'];

/** Required fields missing for the record's current status (design §5.1, §6.1, §6.2). */
export function missingRequired(record: RecordState): RequiredField[] {
  if (!isActive(record.status)) return [];
  const missing: RequiredField[] = [];
  if (!hasText(record.title)) missing.push('title');
  if (record.subtype === 'quality_issue' && record.problemTypes.length === 0) missing.push('problemTypes');
  if (record.subtype === 'detail_clarification' && !hasText(record.question)) missing.push('question');
  return missing;
}

/** Repair and Accept as is need Decided by and Decided on (design §5.6, §6.1). */
export function needsDecision(record: Pick<RecordState, 'disposition' | 'decidedById' | 'decidedOn'>): boolean {
  return (
    record.disposition !== null &&
    DECISION_DISPOSITIONS.includes(record.disposition) &&
    (record.decidedById === null || !hasText(record.decidedOn))
  );
}

/** Rules every save must satisfy in the record's current status (design §8.2). */
export function validateSave(record: RecordState): RuleError[] {
  const errors: RuleError[] = missingRequired(record).map((field) => `required:${field}` as const);
  if (record.subtype === 'quality_issue' && isActive(record.status)) {
    if (DISPOSITION_STATUSES.includes(record.status) && record.disposition === null) {
      errors.push('disposition_required');
    }
    // Repair and Accept as is need a recorded decision in every active status (design §5.6).
    if (needsDecision(record)) errors.push('decision_required');
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Status transitions (design §8.1)
// ---------------------------------------------------------------------------

export interface VerificationInput {
  checkedById: number | null;
  date: string | null;
  method: string | null;
  note?: string | null;
}

export interface TransitionInput {
  to: Status;
  reasonCode?: string | null;
  reasonNote?: string | null;
  note?: string | null;
  verification?: VerificationInput | null;
}

export type TransitionResult =
  | { ok: true; verificationOutcome: VerificationOutcome | null }
  | { ok: false; errors: RuleError[] };

const BASE_TARGETS: Record<Status, readonly Status[]> = {
  draft: ['open', 'cancelled'],
  open: ['awaiting_decision', 'issued', 'in_progress', 'on_hold', 'cancelled', 'closed'],
  awaiting_decision: ['issued', 'on_hold', 'cancelled', 'closed'],
  issued: ['in_progress', 'on_hold', 'cancelled', 'closed'],
  in_progress: ['ready_for_verification', 'on_hold', 'cancelled', 'closed'],
  ready_for_verification: ['closed', 'in_progress'],
  on_hold: [], // resume only: see allowedTargets
  closed: ['open'],
  cancelled: [],
  superseded: [],
};

/** Which subtypes may close from which status without verification (design §8.1). */
function closeAllowedFrom(record: RecordState): boolean {
  switch (record.status) {
    case 'open':
      return record.subtype === 'quality_issue' || record.subtype === 'task';
    case 'awaiting_decision':
      return record.subtype === 'quality_issue';
    case 'issued':
      return record.subtype === 'quality_issue' || record.subtype === 'detail_clarification';
    case 'in_progress':
      return record.subtype === 'task';
    default:
      return true; // ready_for_verification → closed (with verification)
  }
}

/** Statuses the record may move to, before field conditions are checked. */
export function allowedTargets(record: RecordState): Status[] {
  const own = statusesFor(record.subtype);
  const base: Status[] =
    record.status === 'on_hold'
      ? record.statusBeforeHold
        ? [record.statusBeforeHold]
        : []
      : [...BASE_TARGETS[record.status]];
  const targets = base.filter((target) => target !== 'closed' || closeAllowedFrom(record));
  if (record.subtype === 'detail_clarification' && isNonTerminal(record.status)) targets.push('superseded');
  return targets.filter((target) => own.includes(target));
}

/** Checks a status change and derives the verification outcome where one applies. */
export function checkTransition(record: RecordState, input: TransitionInput): TransitionResult {
  const { to } = input;
  if (!allowedTargets(record).includes(to)) return { ok: false, errors: ['transition_not_allowed'] };

  // The resulting record must satisfy every save rule: required fields, disposition, decision.
  const errors: RuleError[] = validateSave({ ...record, status: to });
  const leavesVerification = record.status === 'ready_for_verification' && (to === 'closed' || to === 'in_progress');

  if (
    record.subtype === 'quality_issue' &&
    to === 'closed' &&
    !leavesVerification &&
    record.disposition !== null &&
    record.disposition !== 'accept_as_is'
  ) {
    errors.push('accept_as_is_required');
  }

  const checkReason = (list: 'onHoldReason' | 'cancellationReason', noteRequiredFor: readonly string[]): void => {
    const code = input.reasonCode;
    if (!hasText(code)) errors.push('reason_required');
    else if (!isCode(list, code)) errors.push('reason_invalid');
    else if (noteRequiredFor.includes(code) && !hasText(input.reasonNote)) errors.push('reason_note_required');
  };
  if (to === 'on_hold') checkReason('onHoldReason', ['other']);
  if (to === 'cancelled') checkReason('cancellationReason', ['replaced', 'other']);

  const reopening = record.status === 'closed' && to === 'open';
  if ((to === 'superseded' || reopening) && !hasText(input.note)) errors.push('note_required');

  let verificationOutcome: VerificationOutcome | null = null;
  if (leavesVerification) {
    const verification = input.verification;
    if (
      !verification ||
      verification.checkedById === null ||
      !hasText(verification.date) ||
      !isCode('verificationMethod', verification.method)
    ) {
      errors.push('verification_required');
    }
    verificationOutcome = to === 'closed' ? 'passed' : 'failed';
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, verificationOutcome };
}
```

- [x] **Step 4: Run the transition and record-rule tests**

Run: `npx vitest run tests/domain/transitions.test.ts tests/domain/record-rules.test.ts`
Expected: PASS — 20 transition tests and 9 record-rule tests.

- [x] **Step 5: Commit**

```bash
git add src/domain/record-rules.ts tests/domain/transitions.test.ts
git commit -m "feat(domain): status transition rules"
```

### Task 6: Measurements

**Files:**

- Create: `src/domain/measurements.ts`
- Test: `tests/domain/measurements.test.ts`

- [x] **Step 1: Write the failing test `tests/domain/measurements.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  compareItems,
  compareOverTime,
  duplicateRowKeys,
  normalizeLabel,
  orderSets,
  type MeasurementSet,
} from '../../src/domain/measurements';

const before: MeasurementSet = {
  id: 1,
  date: '2026-09-14',
  phase: 'before',
  rows: [
    { item: 'Left side', quantity: 'Stone thickness', value: 18, unit: 'cm' },
    { item: 'Right side', quantity: 'Stone thickness', value: 15.3, unit: 'cm' },
    { item: 'Top', quantity: 'Stone thickness', value: 20, unit: 'cm' },
    { item: 'Left side', quantity: 'White depth', value: 40.5, unit: 'cm' },
    { item: 'Left side', quantity: 'Stone thickness', value: 180, unit: 'mm' },
  ],
};
const after: MeasurementSet = {
  id: 2,
  date: '2026-10-20',
  phase: 'after',
  rows: [{ item: 'left  SIDE', quantity: 'stone thickness ', value: 15.5, unit: 'cm' }],
};

describe('measurement labels (design §5.7)', () => {
  it('normalises by trimming, collapsing whitespace and ignoring case, including Greek', () => {
    expect(normalizeLabel('  Stone   THICKNESS ')).toBe('stone thickness');
    expect(normalizeLabel('Πάχος  ΠΈΤΡΑΣ')).toBe(normalizeLabel('πάχος πέτρας'));
  });

  it('finds duplicate Item + Quantity + Unit rows within a set', () => {
    const rows = [
      { item: 'Left side', quantity: 'Width', value: 1, unit: 'cm' as const },
      { item: 'left  side', quantity: 'WIDTH', value: 2, unit: 'cm' as const },
      { item: 'Left side', quantity: 'Width', value: 3, unit: 'mm' as const },
    ];
    expect(duplicateRowKeys(rows)).toHaveLength(1);
    expect(duplicateRowKeys(before.rows)).toEqual([]);
  });
});

describe('set order (design §5.7)', () => {
  it('orders by date, then by set id', () => {
    const sets = [
      { id: 5, date: '2026-10-01' },
      { id: 3, date: '2026-10-01' },
      { id: 9, date: '2026-09-01' },
    ];
    expect(orderSets(sets).map((set) => set.id)).toEqual([9, 3, 5]);
  });
});

describe('comparison views (design §5.7)', () => {
  it('between items: same quantity and unit, difference from the first item', () => {
    expect(compareItems(before, 'stone thickness', 'cm')).toEqual([
      { item: 'Left side', value: 18, diffFromFirst: 0 },
      { item: 'Right side', value: 15.3, diffFromFirst: expect.closeTo(-2.7, 10) },
      { item: 'Top', value: 20, diffFromFirst: 2 },
    ]);
    expect(compareItems(before, 'Slope', 'percent')).toEqual([]);
  });

  it('between items: keeps sub-millimetre differences (no rounding in the domain)', () => {
    const set: MeasurementSet = {
      id: 3,
      date: '2026-10-21',
      phase: 'other',
      rows: [
        { item: 'A', quantity: 'Level', value: 1, unit: 'm' },
        { item: 'B', quantity: 'Level', value: 1.0004, unit: 'm' },
      ],
    };
    expect(compareItems(set, 'Level', 'm')[1]?.diffFromFirst).toBeCloseTo(0.0004, 10);
  });

  it('over time: same item, quantity and unit across sets, later minus earlier', () => {
    expect(compareOverTime([after, before], 'Left side', 'Stone thickness', 'cm')).toEqual([
      { setId: 1, date: '2026-09-14', phase: 'before', value: 18, changeFromPrevious: null },
      { setId: 2, date: '2026-10-20', phase: 'after', value: 15.5, changeFromPrevious: -2.5 },
    ]);
  });

  it('over time: keeps sub-millimetre changes', () => {
    const first: MeasurementSet = {
      id: 4,
      date: '2026-10-01',
      phase: 'before',
      rows: [{ item: 'A', quantity: 'Level', value: 1, unit: 'm' }],
    };
    const second: MeasurementSet = {
      id: 5,
      date: '2026-10-02',
      phase: 'after',
      rows: [{ item: 'A', quantity: 'Level', value: 1.0004, unit: 'm' }],
    };
    expect(compareOverTime([first, second], 'A', 'Level', 'm')[1]?.changeFromPrevious).toBeCloseTo(0.0004, 10);
  });

  it('over time: skips sets without a matching row and never mixes units', () => {
    expect(compareOverTime([before, after], 'Left side', 'Stone thickness', 'mm')).toEqual([
      { setId: 1, date: '2026-09-14', phase: 'before', value: 180, changeFromPrevious: null },
    ]);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/domain/measurements.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/domain/measurements"`.

- [x] **Step 3: Create `src/domain/measurements.ts`**

```ts
import type { MeasurementPhase, Unit } from './vocab';

export interface MeasurementRow {
  item: string;
  quantity: string;
  value: number;
  unit: Unit;
}

export interface MeasurementSet {
  id: number;
  date: string; // YYYY-MM-DD
  phase: MeasurementPhase;
  rows: readonly MeasurementRow[];
}

export interface ItemComparison {
  item: string;
  value: number;
  diffFromFirst: number;
}

export interface SeriesPoint {
  setId: number;
  date: string;
  phase: MeasurementPhase;
  value: number;
  changeFromPrevious: number | null;
}

/** Trim, collapse internal whitespace, ignore letter case (design §5.7). */
export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLocaleLowerCase('el');
}

function rowKey(row: Pick<MeasurementRow, 'item' | 'quantity' | 'unit'>): string {
  return `${normalizeLabel(row.item)}\u0000${normalizeLabel(row.quantity)}\u0000${row.unit}`;
}

/** Normalised Item + Quantity + Unit keys that occur more than once (must be unique within a set). */
export function duplicateRowKeys(rows: readonly Pick<MeasurementRow, 'item' | 'quantity' | 'unit'>[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    const key = rowKey(row);
    if (seen.has(key)) duplicates.add(key);
    else seen.add(key);
  }
  return [...duplicates];
}

/** Measurement date, then creation order (internal set id). */
export function orderSets<T extends { id: number; date: string }>(sets: readonly T[]): T[] {
  return [...sets].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
}

/** Between items: one set, one quantity and unit; each item compared with the first in display order.
 *  Differences keep full precision; rounding is a display concern. */
export function compareItems(set: MeasurementSet, quantity: string, unit: Unit): ItemComparison[] {
  const wanted = normalizeLabel(quantity);
  const rows = set.rows.filter((row) => normalizeLabel(row.quantity) === wanted && row.unit === unit);
  const first = rows[0];
  if (!first) return [];
  return rows.map((row) => ({ item: row.item, value: row.value, diffFromFirst: row.value - first.value }));
}

/** Before vs after: one item + quantity + unit across sets in set order; later minus earlier. */
export function compareOverTime(
  sets: readonly MeasurementSet[],
  item: string,
  quantity: string,
  unit: Unit,
): SeriesPoint[] {
  const key = rowKey({ item, quantity, unit });
  const points: SeriesPoint[] = [];
  let previous: number | null = null;
  for (const set of orderSets(sets)) {
    const row = set.rows.find((candidate) => rowKey(candidate) === key);
    if (!row) continue;
    points.push({
      setId: set.id,
      date: set.date,
      phase: set.phase,
      value: row.value,
      changeFromPrevious: previous === null ? null : row.value - previous,
    });
    previous = row.value;
  }
  return points;
}
```

- [x] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/domain/measurements.test.ts`
Expected: PASS — 8 tests.

- [x] **Step 5: Commit**

```bash
git add src/domain/measurements.ts tests/domain/measurements.test.ts
git commit -m "feat(domain): measurement rules and comparison views"
```

### Task 7: Public exports and final verification

**Files:**

- Create: `src/domain/index.ts`
- Test: `tests/domain/index.test.ts`
- Modify: `docs/plans/2026-10-02-plan-1-domain-core.md` (metadata), `docs/plans/2026-10-02-v1-roadmap.md` (status)

- [x] **Step 1: Write the failing test `tests/domain/index.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import * as domain from '../../src/domain';

describe('domain public exports', () => {
  it('exposes the rules, IDs, vocabulary and measurement functions', () => {
    for (const name of [
      'checkTransition',
      'allowedTargets',
      'validateSave',
      'missingRequired',
      'formatHumanId',
      'statusesFor',
      'labelOf',
      'definitionOf',
      'isCode',
      'compareItems',
      'compareOverTime',
      'duplicateRowKeys',
    ]) {
      expect(typeof (domain as unknown as Record<string, unknown>)[name], name).toBe('function');
    }
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/domain/index.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/domain"`.

- [x] **Step 3: Create `src/domain/index.ts`**

```ts
export * from './vocab';
export * from './ids';
export * from './statuses';
export * from './record-rules';
export * from './measurements';
```

- [x] **Step 4: Run the whole suite and the type check**

Run: `npm test`
Expected: PASS — 7 test files: vocabulary 23, ids 3, statuses 4, record-rules 9, transitions 20, measurements 8, index 1 (68 tests).
Run: `npm run typecheck`
Expected: no output, exit code 0.

- [x] **Step 5: Update plan metadata and roadmap**

In this file set `Status: Completed`, `Implemented by: <first>..<last commit>`, `Verified: <date> — npm test (68 passed), npm run typecheck clean`. In `docs/plans/2026-10-02-v1-roadmap.md` set Plan 1 status to `Completed`.

- [x] **Step 6: Commit**

```bash
git add src/domain/index.ts tests/domain/index.test.ts docs/plans/2026-10-02-plan-1-domain-core.md docs/plans/2026-10-02-v1-roadmap.md
git commit -m "feat(domain): public exports; complete Plan 1"
```

## Completion evidence

The final suite passed all 68 tests across seven files. TypeScript reported no errors. The public-export smoke test first failed because `src/domain/index.ts` was absent, then passed after the barrel module was added.

The declared Node minimum was raised from 22 to 22.12.0 in the package manifest, lockfile root and this plan to match the locked Vite tooling. This is a small implementation deviation from the original scaffold.

Vitest 3 is retained for this Node-only domain slice. The Task 1 audit reported two moderate entries for [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9). The affected mocker dev-server endpoint is not used by this configuration. Upgrade to a maintained patched Vitest version before enabling the affected browser/dev-server mocker integration. Audit output has not been suppressed.
