# Record interface and work packages implementation plan

> **For agentic workers:** Use `superpowers:executing-plans` for inline execution. Use `superpowers:subagent-driven-development` only if the owner requests delegation. Execute task-by-task and track checkboxes.
>
> **Document type:** Implementation plan · **Status:** Draft · **Date:** 2026-10-06
> **Retention:** Current planning document; not an instruction to begin implementation in this turn.
> **Implements:** [Consolidated design](../designs/2026-10-06-record-ui-and-work-packages-design.md), including corrections at `ae88ee9`.
> **Implemented by:** Not implemented.
> **Verified:** Repository interfaces and design coverage checked during planning. Proposed implementation and tests have not been replayed.
> **Merged to main:** Documentation publication only; no implementation merged.
> **Checklist note:** Unchecked tasks are future implementation work.

**Goal:** Deliver the simplified record UI, optional project work packages and safe record deletion while preserving existing evidence, history, permissions and recovery capability.

**Architecture:** Extend the SQLite/Fastify model with packages and optional record membership. Reuse current record components, protected media, public projections and print flow. Add small reusable React controls; never port the layered blueprint scripts into production.

**Tech stack:** Existing React/Vite, TypeScript, Fastify, better-sqlite3, Zod, Vitest and Playwright. Node >=22.13.0. No new runtime dependencies.

**Spec:** The consolidated design linked above is the single baseline. [Iteration 7 HTML](../designs/2026-10-06-ui-batch-7.html) is illustrative. The old amendment is superseded. The written design wins over incomplete sample behaviour.

## Global constraints

- No nested packages, N:N membership, automatic inheritance, new permissions, dark mode or hosting changes.
- Preserve all 17 generated record-vocabulary lists. Add package vocabulary separately; do not hand-edit vocabulary.data.ts or rewrite its historical source design.
- A package belongs to one project. A record retains its project and has zero or one package. Reject cross-project package/person selection.
- Owner alone manages packages, membership and deletions. Reader projections contain package name only, never package ID, metadata, counts or sibling links.
- Use the existing 650 px phone breakpoint, dateText for display, and Europe/Athens for today. Do not use the visitor's timezone or UTC date as the overdue boundary.
- Implement all 76 approved wording rows in design §8. Preserve typed prose, including exact Instruction text and line breaks.
- Retain all existing measurement rows, precision and phases; Log metadata; both photo purposes; privacy; verification history; both dependency directions.
- Existing login/Origin/JSON guards apply. Package endpoints are not contributor endpoints. No tokens, private text or payloads in diagnostics.
- Short write transactions protect membership and deletion. Never stream files or perform network I/O inside them.
- Stored bytes remain immutable. Removing occurrences does not delete blobs or reduce storage accounting. IDs are not reused.
- Use design §L colours. Sparse bars omit zero groups and retain white separators and exact counts, including Closed/On hold-only packages.
- Execution may use an isolated checkout according to the execution workflow. Do not leave persistent workspace clutter. Plan publication does not authorize live deployment.

## Review focus

These failure cases are assigned explicit tests below:

1. Athens midnight/DST while a phone remains open: chips and server totals must agree (Tasks 1, 7, 9).
2. Package rename/deletion/assignment in another tab while saving or deleting (Tasks 3, 4, 10).
3. Inline package creation or separately saved Log entry while a record draft is open: no lost draft or duplicated uncertain create (Tasks 10–12).
4. Public/private occurrences sharing the same file bytes remain independently protected after UI/deletion changes (Tasks 5, 6, 13).
5. Failed/passed verification notes and incoming prerequisites remain readable under existing viewer restrictions; sparse bars retain meaning (Tasks 7, 12, 13).

## File responsibilities and execution conventions

| Area | Existing files | New files |
|---|---|---|
| Domain | src/domain/index.ts, records.ts, sharing.ts | src/domain/work-packages.ts, calendar.ts |
| Migration | src/server/db/migrations.ts | src/server/db/migration-0007-work-packages.ts |
| Packages | src/server/app.ts | src/server/work-packages/store.ts, routes.ts |
| Membership | src/server/records/store.ts, records.ts, list.ts, references.ts | None |
| Deletion | src/server/records/routes.ts; src/server/lists/projects.ts | src/server/records/delete.ts |
| Projections | src/server/sharing/projection.ts; src/server/printing/routes.ts | None |
| Web controls | src/web/core/forms.tsx, api.ts; src/web/styles.css | core/InfoButton.tsx, SearchPicker.tsx, Panel.tsx, StatusBadge.tsx, DueChip.tsx, useToday.ts under src/web |
| Navigation/lists | src/web/App.tsx; src/web/home/RecordList.tsx, Capture.tsx; src/server/web.ts | src/web/core/navigation.ts; src/web/home/RecordCard.tsx |
| Package screens | Existing project/person APIs | src/web/packages/data.ts, PackageList.tsx, PackagePage.tsx, PackageForm.tsx, PackagePicker.tsx, PackageStatusBar.tsx |
| Record screens | src/web/record/RecordPage.tsx, RecordEditor.tsx, Overview.tsx, StatusDialog.tsx, Options.tsx, Measurements.tsx, Log.tsx, Sharing.tsx, Activity.tsx, data.ts | src/web/record/DeleteRecordDialog.tsx |
| Print | src/web/printing/PrintPage.tsx | None |

Current helpers: makeFixture/postRecord/patchRecord/getRecord in tests/server/record-fixture.ts; get/send/loginAsOwner/makeContext in tests/server/helpers.ts; login(page, username?) and seed() in tests/browser/fixture.ts. Use synthetic temporary data only.

Each task ends with targeted checks, typecheck and a focused commit. First add the regression tests and confirm they fail for the missing behaviour, not environment setup. Do not rewrite unrelated code to conceal existing failures.

Browser checks require `npm run build`, followed by `npm run test:browser -- <spec paths>`. They use existing isolated test servers on 3490 and 5174. On this PC set `$env:PLAYWRIGHT_CHANNEL = 'chrome'` when bundled Chromium is unavailable. Never repoint tests to production.

## Task 1 — Package contracts and calendar rules

**Create:** src/domain/work-packages.ts, calendar.ts; tests/domain/work-packages.test.ts, calendar.test.ts. **Modify:** src/domain/index.ts.

**Interfaces produced:**

```ts
export type PackageStatus = 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export const PACKAGE_STATUSES: readonly (VocabularyEntry & { code: PackageStatus })[];
export const PACKAGE_SORT_ORDER: readonly PackageStatus[];
export interface WorkPackageInput {
  name: string; description: string | null; responsibleId: number | null;
  targetDate: string | null; status: PackageStatus;
}
export interface WorkPackage extends WorkPackageInput {
  id: number; projectId: number; createdAt: string; updatedAt: string;
}
export interface PackageCounts {
  total: number; outstanding: number; overdue: number; byStatus: Record<Status, number>;
}
export interface PackageSummary extends WorkPackage { counts: PackageCounts }
export interface PackageDetail extends PackageSummary {
  today: string; bySubtypeStatus: {subtype: Subtype; status: Status; count: number}[];
}
export const PROJECT_TIME_ZONE = 'Europe/Athens';
export function calendarToday(now?: Date): string;
export function isOutstanding(status: Status): boolean;
export function isOverdue(status: Status, dueDate: string | null, today: string): boolean;
export function isPastTarget(status: PackageStatus, targetDate: string | null, today: string): boolean;
export function calendarDayDifference(from: string, to: string): number;
```

Export strict Zod WorkPackageCreate and WorkPackagePatch schemas with inferred WorkPackageInput/WorkPackagePatchInput types matching the shape above. Create defaults nullable fields to null and status to planned; PATCH has no defaults. Name trims, length 1–200. Description <=10,000, blank to null, otherwise preserve prose. Dates are valid ISO dates; IDs positive integers. foldText(name) supplies normalized uniqueness/search keys.

- [ ] Add create/PATCH tests for omission versus null, five bilingual package statuses/definitions and approved sort order. Add calendar assertions:

```ts
expect(calendarToday(new Date('2026-10-06T20:59:59Z'))).toBe('2026-10-06');
expect(calendarToday(new Date('2026-10-06T21:00:00Z'))).toBe('2026-10-07');
expect(calendarToday(new Date('2026-12-01T21:59:59Z'))).toBe('2026-12-01');
expect(calendarToday(new Date('2026-12-01T22:00:00Z'))).toBe('2026-12-02');
expect(calendarDayDifference('2026-03-28', '2026-03-30')).toBe(2);
expect(isOverdue('draft', '2026-10-05', '2026-10-06')).toBe(true);
expect(isOverdue('closed', '2026-10-05', '2026-10-06')).toBe(false);
expect(isPastTarget('planned', '2026-10-05', '2026-10-06')).toBe(true);
expect(isPastTarget('completed', '2026-10-05', '2026-10-06')).toBe(false);
```

- [ ] Run `npm test -- tests/domain/work-packages.test.ts tests/domain/calendar.test.ts`; confirm missing behaviour fails.
- [ ] Implement calendarToday with Intl.DateTimeFormat/formatToParts and explicit timezone. Day differences subtract UTC representations of validated date-only strings; DST does not create fractional days. Export through index.ts. Do not change isActive, which means required-field enforcement, not outstanding work.
- [ ] Run targeted tests and `npm run typecheck`. Commit `feat: define package contracts and Athens calendar rules`.

## Task 2 — Migration 0007 and recovery compatibility

**Create:** src/server/db/migration-0007-work-packages.ts; tests/server/work-package-migration.test.ts. **Modify:** src/server/db/migrations.ts; tests/server/operations.test.ts.

**Produces:** MIGRATION_0007_WORK_PACKAGES, id `0007_work_packages`, registered after 0006. Use design §5 DDL without changing earlier migrations.

- [ ] Build a fixture at migration 0006 with all subtypes, selected option, measurements, failed/passed checks, dependency, private/public Log attachments, both photo purposes, grants and links. Capture row contents/counts and ID high-water marks.
- [ ] Test upgrade: empty package table, null membership on every existing record, unchanged existing values and photo metadata, empty foreign_key_check, integrity_check=ok, second migrate call applies nothing, package IDs do not reuse deleted values, bare SQL cannot delete an in-use package.
- [ ] Run `npm test -- tests/server/work-package-migration.test.ts` before adding the migration.
- [ ] Add exact designed schema, indexes and registry entry. Exercise existing backup-before-migrate on the populated fixture.
- [ ] Test new-schema bundle inspect/export/restore through src/server/operations/bundles.ts. Its inspectDatabase compares exact MIGRATIONS IDs. Keep rejection of incompatible old schemas; recovery of an old backup uses matching old release tools, then offline migration before opening with new code. Do not relax compatibility checks.
- [ ] Update any tests that explicitly assert migration IDs/counts (including tests/server/db.test.ts) to include 0007 without weakening schema checks. Run migration, db and operations tests plus typecheck. Commit `feat: add work package schema migration`.

## Task 3 — Package API, totals and lifecycle

**Create:** src/server/work-packages/store.ts, routes.ts; tests/server/work-packages-api.test.ts. **Modify:** src/server/app.ts, src/server/lists/projects.ts, src/web/projects/Projects.tsx; tests/server/projects-management.test.ts.

**Interfaces produced:**

```ts
createWorkPackage(db: Db, projectId: number, input: WorkPackageInput, now?: Date): WorkPackage;
getWorkPackage(db: Db, projectId: number, id: number): WorkPackage;
updateWorkPackage(db: Db, projectId: number, id: number, patch: WorkPackagePatchInput, now?: Date): WorkPackage;
listWorkPackages(db: Db, projectId: number, now?: Date): {today: string; packages: PackageSummary[]};
getWorkPackageDetail(db: Db, projectId: number, id: number, now?: Date): PackageDetail;
deleteWorkPackage(db: Db, projectId: number, id: number, confirmName: string): void;
registerWorkPackageRoutes(app: FastifyInstance, db: Db): void;
```

Routes under `/api/projects/:projectId/work-packages`: GET list 200; POST create 201; GET `/:id` detail 200; PATCH `/:id` updated package 200; DELETE `/:id` JSON `{confirmName}` returns 204. Default owner guards apply.

Errors: 404 work_package_not_found for unknown/wrong-project package; 409 work_package_name_taken with `{existingName}`; 409 work_package_not_empty with `{recordCount}`; 409 work_package_confirmation_mismatch. Person validation follows existing invalid_reference conventions. Preserve an unchanged retired assignee; disallow newly selecting one.

- [ ] Add API tests for defaults, patch semantics, normalized duplicates (including Greek final sigma/accents), empty names, invalid project/person, retired retention, and typed deletion. Verify every endpoint rejects unauthenticated/contributor access; mutations require Origin.
- [ ] Mixed fixture: Draft, Open, On hold, Closed, Cancelled and DC Superseded; first three due yesterday. Assert total=6, outstanding=3, overdue=3; every status key present with zeros where needed; subtype counts reconcile. Empty packages return zero counts.
- [ ] Run `npm test -- tests/server/work-packages-api.test.ts` before implementation.
- [ ] Implement writes in immediate transactions. Recheck membership count and exact name within delete; normalized name uniqueness uses foldText and a SQL constraint. Status changes never write record fields. No server confirmation flag.
- [ ] List uses package retrieval plus one grouped record query, not one query per package. Group by package/subtype/status and conditionally sum overdue against one captured today. Avoid N:N joins that multiply records. Details reuse counting logic.
- [ ] Register routes. Add package count to projectUsage and the project deletion preview. Delete project records first, packages next, then people. Modify src/web/projects/Projects.tsx and its ProjectUsage typing/display to include the new package count in project-deletion confirmation. Existing person routes do not delete people; do not add a new person-delete feature. Preserve retirement.
- [ ] Test two connections using direct membership SQL at this stage (repeat through the API in Task 4): assignment first blocks deletion; deletion first makes assignment fail. No orphan. Project deletion removes packages/access but retains blobs.
- [ ] Run package/project tests and typecheck. Commit `feat: add owner work package management and totals`.

## Task 4 — Record membership, filters and activity

**Modify:** src/domain/records.ts; src/server/records/store.ts, records.ts, list.ts, references.ts. **Create:** tests/server/work-package-membership.test.ts. Extend records-api.test.ts and records-list.test.ts.

**Interfaces:** RecordPatch gains optional nullable workPackageId; RecordCreate inherits it. RecordRow, RecordDetail and RecordSummary gain workPackageId. Owner detail resolves workPackageName:string|null. RecordListQuery gains workPackageId?:number|'none'; absence is no filter. Preserve RecordList envelope and cost totals.

- [ ] Test all subtypes create/assign/move/clear/omitted patch; invalid ID/project; valid completed/cancelled packages. Assert status, dates, people, grants and links do not change. Invalid membership rolls back other edits in the same save.
- [ ] Test query absent/none/positive ID. Malformed input returns 400; unknown/wrong-project package gives 404 work_package_not_found, never another project's records. UI can show Invalid filter chip alongside that error.
- [ ] Run `npm test -- tests/server/work-package-membership.test.ts tests/server/records-list.test.ts` and confirm intended failures.
- [ ] Extend SQL aliases, schema, update fields and TRACKED_FIELDS. Check package ownership inside the record write transaction; use immediate create/update transactions to serialize validation against deletion.
- [ ] Membership activity uses field workPackageId and owner from/to IDs, plus `detail:{fromPackage:{id,name}|null,toPackage:{id,name}|null}` captured inside the transaction. No no-op event. Follow existing chosen-option snapshot pattern. Keep names in historical events after ungrouping and empty-package deletion.
- [ ] Add parameterized filters, parsing the literal none before coercing positive IDs. Repeat Task 3 membership/deletion races through the real record API. Resolve current package name on reads; rename does not touch record.updatedAt or emit false record edits. Test these properties.
- [ ] Run targeted record tests/typecheck. Commit `feat: assign records to packages with filters and history`.

## Task 5 — Reader and print projections

**Modify:** src/domain/sharing.ts; src/server/sharing/projection.ts; src/server/printing/routes.ts; src/web/printing/PrintPage.tsx; src/web/record/Activity.tsx. **Tests:** shared-record-api.test.ts, assigned-records.test.ts, api-privacy.test.ts, print-api.test.ts under tests/server; tests/browser/print.spec.ts.

**Interfaces:** SharedRecord.record and PrintRecord.record gain workPackageName:string|null only. Public membership activity maps to display field workPackageName with name/null from/to values; it must not expose owner IDs/detail snapshots. Explicitly extend the existing public activity allowlist.

- [ ] Add exact-key/canary assertions: name may appear; package ID, description, responsible person, target date, counts and sibling records must not. Package endpoints remain owner-only for a contributor with a member-record grant.
- [ ] Test old/new activity names after assignment and ungrouping without IDs/private metadata. Unknown activity fields remain excluded. Keep per-occurrence evidence privacy tests passing.
- [ ] Run the named server tests before modifying projections.
- [ ] Build public fields explicitly; never spread owner snapshots. Add current name to buildPrintRecord and render only when assigned. Update typed fixtures/callers without adding unsafe casts.
- [ ] Extend print freshness test: rename package after opening print, without changing record.updatedAt. Refresh/print must use the new name. Preserve QR rules, Greek rendering, private-field exclusions and multipage layout; do not add screen-only overdue chips.
- [ ] Run server tests, build, print browser spec and typecheck. Commit `feat: expose safe package context to readers and print`.

## Task 6 — Safe record deletion

**Create:** src/server/records/delete.ts; tests/server/record-delete.test.ts, record-delete-race.test.ts. **Modify:** src/server/records/routes.ts. Reuse controlled-upload patterns in tests/server/upload-session-race.test.ts.

**Interfaces:** `deleteRecord(db:Db,projectId:number,recordId:number,confirmHumanId:string):void`; `registerRecordDeleteRoutes(app,db)`. DELETE /api/projects/:projectId/records/:id receives JSON `{confirmHumanId}`, returns 204. Existing not-found behaviour applies. Wrong confirmation: 409 record_confirmation_mismatch. Any precedence edge in either direction: 409 record_has_dependencies with owner-only `{records:[{id,humanId,title}]}`.

- [ ] Test wrong confirmation, owner/Origin checks, missing/wrong-project record and dependency edges in both directions. Rejection changes nothing.
- [ ] Seed options including a chosen option, measurements, checks, Log, photos of both purposes, public/private attachments sharing bytes, history, grants and links. Successful deletion removes occurrences/children/access, retains sibling data and blob rows/files, and does not reuse record or human IDs.
- [ ] Run `npm test -- tests/server/record-delete.test.ts` before implementation.
- [ ] Implement one immediate transaction: require record/project, compare typed ID, recheck edges, remove photo/attachment occurrences and share links, clear chosen_option_id where necessary for FK ordering, delete record and cascade-owned rows. Keep counters and all immutable blobs. Never delete another record's history.
- [ ] Test two-connection reference/deletion ordering. Pause an asynchronous upload before occurrence commit: if deletion wins, resumed upload fails and cannot recreate evidence; published unreferenced bytes may remain. If upload wins, deletion removes its occurrence. Reuse test-side I/O barriers; no production debug routes.
- [ ] Run delete/race plus existing files/records/shared-access tests and typecheck. Commit `feat: safely delete records and revoke their access`.

## Task 7 — Reusable controls, calendar display and colours

**Create:** src/web/core/InfoButton.tsx, SearchPicker.tsx, Panel.tsx, StatusBadge.tsx, DueChip.tsx, useToday.ts; src/web/packages/PackageStatusBar.tsx; tests/web/package-presentation.test.ts, tests/browser/ui-controls.spec.ts. **Modify:** src/web/core/forms.tsx, src/web/styles.css.

**Interfaces:**

```ts
InfoButton({label, children}: {label:string; children:ReactNode});
type Choice = {id:number; label:string; group?:string; disabled?:boolean; suffix?:ReactNode};
type SinglePickerProps = {mode:'single'; value:number|null; onChange:(v:number|null)=>void};
type MultiPickerProps = {mode:'multiple'; value:number[]; onChange:(v:number[])=>void};
// SearchPicker common props: label, items:Choice[], emptyLabel, triggerRef?:Ref<HTMLButtonElement>.
Panel({title, children, onClose, returnFocusRef}: {
  title:string; children:ReactNode; onClose:()=>void;
  returnFocusRef:RefObject<HTMLElement|null>;
});
StatusBadge(props: {kind:'record';status:Status}|{kind:'package';status:PackageStatus});
DueChip({status,dueDate,today}: {status:Status;dueDate:string|null;today:string});
useToday(): string;
PackageStatusBar({counts,variant}: {counts:PackageCounts;variant:'list'|'detail'});
```

- [ ] Test dotted 16 px info icon aligned to text, >=24 px hit area, hover/focus/click opening, Escape/outside dismissal and accessible name. Long Greek help fits 360 px.
- [ ] Test picker search with accents/final sigma; multi chips/checkboxes; single null radio choice; arrow selection without closing; Enter/Escape closing with focus return; pointer choice closing single; outside pointer/focus including blank area beside trigger closing without focus theft. Search Enter never submits the parent form. Retired selected values remain readable/removable.
- [ ] Test bar zero/mixed/sparse states. For 8 Closed and 2 On hold, assert exactly two segments in approved order, 2 px white gap, exact text/aria counts and no zero-group placeholders. Group sums equal total. Minimum segment widths are visual aids, not exact proportions for tiny groups.
- [ ] Run unit/control tests before implementation. Add any isolated component fixture under tests/browser/fixtures using the existing Vite test harness; never expose it through production routes. Build before browser tests.
- [ ] Implement design L/M2 tokens/grouping and dialog-backed Panel. Do not remove existing validation-error red when applying reserved status colours. Preserve print CSS unless an explicit print requirement applies.
- [ ] useToday updates on mount, every 60 seconds, visibility return and focus; removes listeners/timers on unmount. Test fake-clock Athens midnight/DST. Task 9 refreshes totals so chips and aggregate data do not diverge.
- [ ] Replace persistent definition blocks in VocabSelect with InfoButton; retain access to the selected and complete value-list definitions through compact help content. Reuse original labels and definitions.
- [ ] Run focused tests and typecheck. Commit `feat: add accessible pickers panels and status presentation`.

## Task 8 — Routes, navigation and shared record cards

**Create:** src/web/core/navigation.ts, src/web/home/RecordCard.tsx; tests/web/navigation.test.ts. **Modify:** src/web/App.tsx, src/server/web.ts, src/web/home/RecordList.tsx, styles.css; tests/server/web-app.test.ts, tests/browser/home.spec.ts.

**Interfaces:** `recordReturnPath(projectId:number,from:string|null):string`. RecordCard receives `{record:RecordSummary,people:{id:number;name:string}[],packageName?:string|null,hidePackage?:boolean,today:string,href:string}`. Package routes: /projects/:projectId/work-packages and /:packageId; support direct reload through the server's HTML route allowlist.

- [ ] Test direct routes/refresh, exactly one active project-menu family, no owner package menu for readers. Back preserves origin list query or package page.
- [ ] Return path tests: accept existing query-only `?status=open`, or same-project Records list/package-detail path with validated query. Reject external/protocol-relative URLs, backslashes, cross-project paths, malformed encoding and nested redirects; fall back to project Records. Construct allowed paths rather than testing only startsWith.
- [ ] Run navigation/server tests before implementation.
- [ ] Extend current regex-based routing without a new router. Mount minimal package route shells here for route tests; replace them with real pages in Task 9. Extract inline RecordList cards once. Preserve all record facts, add dateText/DueChip/status badge and optional package context. Keep real links and keyboard operation.
- [ ] At <=650 px, navigation scrolls within itself with edge fade; current link is brought into view without page scrolling. Hidden scrollbar must not hide focus or prevent access to trailing items. Verify 360/390 px no page overflow.
- [ ] Run routing/home tests/typecheck. Commit `feat: route package pages and reuse record cards`.

## Task 9 — Package list and detail pages

**Create:** src/web/packages/data.ts, PackageList.tsx, PackagePage.tsx; tests/browser/work-packages.spec.ts. **Modify:** App.tsx. **Consumes:** Tasks 1, 3, 7, 8.

**Interfaces:** `loadPackages(projectId,signal):Promise<{today:string;packages:PackageSummary[]}>`; `loadPackage(projectId,id,signal):Promise<PackageDetail>`; PackageList({projectId,projectName}); PackagePage({projectId,packageId}). Use existing api<T>/ErrorNotice/AbortController patterns.

- [ ] Create per-test data through owner API. Test empty/no-match/loading/error states, Greek search, approved status sorting then Intl.Collator(lang) name sorting (ID tie-break), long names and 360 px cards.
- [ ] Test detail breadcrumb, omitted empty attributes, Past target for an empty planned package, no Past target for completed/cancelled, mismatch notice, subtype/status table and totals/legend agreement. Obtain records through existing endpoint plus workPackageId, not a second list API.
- [ ] Run package browser spec after build; confirm absent screens fail.
- [ ] Implement design A–C. Whole-row click respects selection/modifiers and the accessible name link; no nested interactive controls. Reuse RecordCard, outstanding first then human ID with ID tie-break; hide repeated package name. Table columns use existing vocabulary order for statuses present.
- [ ] Refresh list/detail on entry, successful mutations, visibility return and changed useToday. Abort/ignore stale requests. During aggregate refresh use response.today for its labels; do not claim yesterday's totals are current. Task 10 separately refreshes confirmation data.
- [ ] New/Edit/Delete connect to Task 10; do not call the pages delivered before those actions work. No fake sample data or blueprint controls.
- [ ] Run package/browser/type checks. Commit `feat: show work package lists and record summaries`.

## Task 10 — Package forms and lifecycle dialogs

**Create:** src/web/packages/PackageForm.tsx. **Modify:** PackageList.tsx, PackagePage.tsx, data.ts, src/web/core/api.ts for translated errors; tests/browser/work-packages.spec.ts.

**Interface:** PackageForm({projectId:number,initial?:WorkPackage,people:Person[],inline:boolean,onSaved:(p:WorkPackage)=>void,onCancel:()=>void}). Reuse for page actions and inline creation in Task 11. Use modal/dirty-guard patterns, not window.prompt/alert.

- [ ] Test empty/duplicate inline Name errors with aria-invalid/describedby and focus; values survive every failure. Separate Create/Save button text. Retired current responsible remains readable but cannot be newly selected.
- [ ] When saving a change into completed/cancelled, read fresh detail and current outstanding records before confirmation. Show <=5 ID/status entries, remaining count and overdue count. Go back preserves values and focuses Status. Same-status metadata edits do not confirm.
- [ ] Test another tab adding a record after page load. Confirmation is informative, not a lock: a record may arrive after the fresh read; saving still changes only the package and refreshes the mismatch notice. Do not add a server confirmation flag.
- [ ] Implement unknown-create-outcome handling using isUnknownOutcome/Projects.tsx pattern. Block repeat POST until refreshing the list reconciles the result; unresolved ambiguity retains draft and shows refreshed data, never automatically resubmits.
- [ ] Delete always opens fresh-data dialog. Populated: count, Show its records, Keep package. Empty: exact typed name. On DELETE 409 work_package_not_empty, switch to blocked state with returned count. Name mismatch refreshes state without replacing typed confirmation. Unknown delete outcome refreshes list before retry.
- [ ] Implement D–F, approved EN/EL phrases and singular/plural forms, busy guards and successful navigation/refresh. Test draft retention, conflict and unknown-outcome branches.
- [ ] Run package browser tests/typecheck. Commit `feat: manage package forms and safe lifecycle confirmations`.

## Task 11 — Assignment, Records filter and capture

**Create:** src/web/packages/PackagePicker.tsx; tests/browser/work-package-assignment.spec.ts. **Modify:** src/web/home/Capture.tsx, RecordList.tsx; src/web/record/RecordEditor.tsx, data.ts; tests/web/record-data.test.ts.

**Interfaces:** PackagePicker({packages:WorkPackage[],value:number|null,savedValue:number|null,onChange,onCreate,triggerRef}). RecordData.owner gains packages:WorkPackage[]; loadRecord may receive PackageSummary[] from list API and retain the common fields. Capture gains initialWorkPackageId?:number|null and package-aware close/success handling; preserve its upload flow.

- [ ] Test Work package position after Description/before Severity, active/finished choice groups, No work package, status pills, joins/leaves/moves notes and complete keyboard rules.
- [ ] Inline creation preserves unsaved title and exact Instruction text, saves package immediately and selects it in draft. Cancelling record keeps package but saved membership unchanged; saving assigns it. Escape closes only the top dialog.
- [ ] Other-tab rename/deletion while editing: refresh options without discarding draft; deleted selection gives actionable error, not silent null assignment. Unknown outcome obeys Task 10.
- [ ] Capture from package preselects it but inherits no responsible/date. Retain create-then-upload and uncertain-create handling. Close returns to package and refreshes counts. Ordinary capture can remain ungrouped.
- [ ] Records filter stays visible next to search with Apply. Test absent/none/ID URLs, invalid ID chip/error, combined search, chip removal and Back preserving applied filters. Hide repeated package name only when filtering to one package.
- [ ] Implement Task 4 contracts, update initial draft and typed test fixtures, reuse SearchPicker, and place small + New package text action beside label. Preserve other filters and owner cost totals.
- [ ] Run assignment/home/record-data checks and typecheck. Commit `feat: connect package assignment filters and capture`.

## Task 12 — Record layout, panels and retained history

**Modify:** src/web/record/RecordPage.tsx, RecordEditor.tsx, Overview.tsx, StatusDialog.tsx, Options.tsx, Measurements.tsx, Log.tsx, Sharing.tsx, Activity.tsx; src/web/styles.css; location photo rendering reached from RecordPage. **Create:** src/web/record/DeleteRecordDialog.tsx; tests/browser/record-ui.spec.ts. Update existing record.spec.ts, review-log.spec.ts, review-sharing.spec.ts and location-photos.spec.ts for deliberate destination changes.

**Interfaces:** Preserve existing child data/mutation callbacks. Keep RecordEditor draft in a stable mounted editor or lift it into RecordPage; entry-panel saves/refreshes must never reset it. DeleteRecordDialog uses Task 6 API. No new state-management dependency.

- [ ] Create populated fixtures for every applicable field in each subtype. Assert the four sections, panels and reading groups preserve all design §3 capabilities, not just the visible blueprint sample.
- [ ] Add required review regression: failed check then passed check with distinct multiline notes, date/checker/method/outcome; incoming prerequisite and outgoing dependency. Expanding Overview exposes all history and both directions, Created and Updated. Contributor/shared views retain allowed verification fields but omit Draft references, internal dependency IDs and private fields. Activity is not a substitute for verification notes.
- [ ] Test unsaved record -> Measurements/Log panel -> save entry -> close -> cancel record. Draft survives panel operations; saved child survives record cancellation. Cover failed refresh and access loss without stale private information remaining.
- [ ] Run record-ui spec before implementation.
- [ ] Implement identity/title/next-action strip, conditional safety, four tabs/mobile section selector, Sharing/Activity panels. On phone use More sheet for permitted secondary actions; Delete is last below separator. A panel launched from More returns focus to More. Readers never get edit/delete controls.
- [ ] Implement Work, subtype decision block, People and timing, Location, Trades/tags, collapsible References and Private, fixed Save/Cancel. Preserve full measurements and Log fields, options, typed instruction and existing tag creation/retired selections.
- [ ] Implement J1–J7 DOM order, formatted dates, instruction block, full verification history and Sequence/dates. Preserve current conditional status reason/note and Next action by “Since” information; place Since under that value without creating a new section.
- [ ] Align Add icons after headings and reuse labelled edit/bin controls. Location gallery remains separate from tree; preserve upload progress/failures, existing limits and independent saves. Retain method/outcome definitions through info controls.
- [ ] Change status uses real allowedTransitions and existing validation; missing-field guidance returns to editor without losing input. Delete dialog uses typed ID and dependency-blocked state; success returns through safe navigation and updates package totals.
- [ ] Run record-ui and named existing browser specs plus typecheck. Commit `feat: simplify record screens without losing history or evidence`.

## Task 13 — Integrated bilingual and permission acceptance

**Tests:** Extend tests/browser/record-ui.spec.ts, work-packages.spec.ts, work-package-assignment.spec.ts, print.spec.ts and tests/server/api-privacy.test.ts. Production changes only for demonstrated in-scope defects.

- [ ] EN/EL owner journey: create package and all record subtypes; assign/move/ungroup; upload multiple location images; save full Log and multi-row measurements; verify failed then passed; view both dependency directions; print current package name; delete unreferenced disposable record then empty package.
- [ ] Upload-only contributor sees package name/upload only; Log-only can add entries; neither can manage packages, membership, notes or deletion. Anonymous view has no package navigation/endpoint or private metadata. Assert HTTP fields as well as hidden controls.
- [ ] Public/private attachment occurrences sharing bytes remain independent. Private Log deletion still removes its occurrences atomically. Existing authorization/session-race tests must remain passing.
- [ ] Desktop, 360/390 px, keyboard-only, long Greek names, empty/populated states, retained focus, conflict errors and narrow tables. Overflow tables inside their container, not the page.
- [ ] Different browser timezone across Athens midnight: use fixed clocks; chips, totals and Past target agree after refresh. Planned empty past-target package warns; completed/cancelled does not.
- [ ] Sparse Closed/On hold and mixed status bars retain exact text/aria counts and separators. Measure design L contrast pairs; do not treat the review's figures as independently verified. Preserve approved colours unless a real failure requires a documented correction.
- [ ] Build and run relevant browser/API suites and typecheck. Commit `test: cover package and record UI acceptance journeys`.

## Task 14 — Full verification, docs and release handoff

**Modify:** docs/specs/v1.md, docs/ARCHITECTURE.md, docs/reference/data-model.md, docs/guides/web-interface.md, deployment.md, backup-restore.md, release-checklist.md, README.md; this plan and consolidated design lifecycle/evidence.

- [ ] Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:browser`. Record actual counts, commands, environment and failures. Never copy an earlier plan's counts. After fixes rerun affected checks and justified integration checks.
- [ ] Run a populated isolated migration/backup/restore rehearsal on synthetic temporary data: file hashes, membership, record children, new schema and cleared restored access. Verify old-schema rejection by new tools. No live data or recovery cutover during implementation.
- [ ] Update current conceptual/logical/physical model from migration 0007; integrate packages and remove proposed-only wording only for delivered changes. Record server-enforced same-project constraints. Preserve provenance of the original schema snapshot.
- [ ] Reconcile each design coverage row and A–M requirement with implemented components/tests. Explicitly record verification history, Requires first and sparse bars. All 76 approved phrases are accounted for; existing record vocabulary meanings stay unchanged.
- [ ] Operator guide: verified pre-upgrade backup; deploy migration-aware code; fresh verified post-upgrade backup before relying on current scheduled export; retain matching old release with pre-upgrade backup. Old backup recovery uses old matching tooling then offline migration, never relaxed checks or an old-code-only rollback over new data.
- [ ] Keep status honest: merged but not deployed leaves hosted acceptance pending. Design becomes Historical only after implemented enduring requirements are reconciled and commit range/deviations recorded. Amendment remains superseded.
- [ ] Commit `docs: reconcile work packages and record interface delivery`. Hand over implementation commits, evidence and remaining hosted checks. Merge/push/deployment follow the owner's execution-stage instructions; publication of this plan is not deployment authorization.

## Coverage and dependencies

| Design requirement | Tasks |
|---|---|
| Model and migration | 1–4, 14 |
| Existing record capabilities and new deletion | 5–6, 11–13 |
| A navigation; B–C package pages | 8–9 |
| D confirmation; E form; F deletion | 3, 10 |
| G filters; H header; I picker | 4, 8, 11–12 |
| J Overview including history and reverse dependencies | 12–13 |
| K phone actions | 7, 12–13 |
| L colours; M date/count rules and sparse bars | 1, 7, 9, 13 |
| Wording, privacy, print | 1, 5, 7–13 |
| Backup/restore and closeout | 2, 14 |

Execute in numbered order. Each task has a focused commit and test result. No parallel agents are required. Tasks 9–12 are intermediate integration states, not separate finished UI releases.

## Planning evidence

The plan was checked against repository domain schemas, SQL stores/list/activity, guards, reader/print projections, routing, test helpers, build scripts and strict backup schema compatibility at ae88ee9. It specifies files, interfaces and regression assertions; it is not a full source-code transcript. Future implementation tests and the application suite have not been run during planning. The plan remains Draft for review before execution.
