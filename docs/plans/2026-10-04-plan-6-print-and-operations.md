# Plan 6 — Print, PDF and operations

> **Document type:** Implementation plan
> **Status:** In progress
> **Retention:** Active execution instructions until completed or abandoned; retain as historical evidence afterwards.
> **Implements:** [Approved v1 design](../designs/2026-10-02-v1-records-design.md), §5.12, §11.6–11.8, §12–13; [roadmap](2026-10-02-v1-roadmap.md); DOCS-STANDARD v1.4 §2.
> **Parent plan:** [v1 roadmap](2026-10-02-v1-roadmap.md)
> **Implemented by:** Tasks 1–3: `e915b44`, `83a869c`, `c21a279` on `codex/plan-6`. Tasks 4–6 remain pending live acceptance and closeout.
> **Verified:** 2026-10-04 local implementation: 501 unit/API tests in 70 files, 51 browser tests in 11 specs, builds, TypeScript and production-only runtime probe passed. No live release or scheduled recovery acceptance is claimed.
> **Merged to main:** Implementation remains on `codex/plan-6`; not merged.
> **Checklist note:** Preflight and Tasks 1–3 are executed. Remaining unchecked items are active live-release work. The embedded file snapshots retain their original checklist text.
> **Execution:** Use subagent-driven-development or inline executing-plans task by task. Use Astra Medium for delegated work, as the owner requested.

## Outcome and boundary

Finish the approved v1 scope: owner A3 print/PDF output, tested production packaging, nightly consistent backups, verified off-site copies, safe offline restore and actual release acceptance. The owner-approved design remains the implementation baseline. This is its final delivery plan, not another design or a change of hosting architecture.

Authoring starts from `59f04d0`, with Plan 5 merged and verified (464 unit/API tests, 39 browser tests). It uses a separate scratch checkout. All proposed application/scripts/tests are included completely, once per file. Runtime payloads are not installed on main by publishing this document. The extraction helper checks SHA-256 before writing selected files. The lockfile is generated from the existing one, never embedded as a replacement snapshot.

**Owner decisions, 2026-10-04:** print without QR is allowed, including Drafts; **Include QR link** is off by default. Add owner-only Administration with full backup/storage status, warning-only notices below navigation elsewhere, and Windows notifications for failed off-site pulls. The owner selected a configurable 5 GB remaining-file warning threshold. These additions are included in the proposed snapshots and release acceptance below.

## Global constraints and settled decisions

- Keep React/Vite, Fastify/TypeScript and SQLite/better-sqlite3. No server-side Chromium: Plan 0 proved the needed system libraries are absent. PDF means desktop browser Save as PDF from the A3 landscape print view.
- Printing is owner-only. Its dedicated GET response uses a strict §12 allowlist. Both Notes fields, Log, Activity and private/commercial data are absent. Printing works without a share link, including for Drafts with their status clearly shown. **Include QR link** is off by default. Enabling it requires explicit selection of an active link or explicit creation of one. Drafts cannot include QR. Printing never creates a link automatically and printing without QR does not depend on the sharing service. No empty/failing-resource sheet is represented as ready.
- Pin existing QR encoder `qrcode` 1.5.4 and types 1.5.6. Test decoding independently with `jsqr` 1.4.0. Pin esbuild 0.28.2, already present transitively in the baseline, for local Node bundle generation. Do not upgrade unrelated dependencies.
- Compile the server and operational CLIs locally. Hosting installs only production dependencies and executes `.mjs` entrypoints. Bundled browser packages remain development dependencies. Source npm commands using tsx and the private Excel seed importer remain local development commands. The production package excludes data, environment files, keys, source contacts and node_modules.
- Keep the 100,000,000-byte whole-request ceiling, immutable blobs and configured total budget/reserve. Actual hosting quota and reserve values must be recorded at execution; free filesystem bytes are not the account quota. No per-user quotas or deletion of published evidence.
- Nightly backup retains the latest snapshot for each of 14 UTC days and eight Monday-start UTC weeks, taking their union. Protect database pinning against rotation. A backup/export or pull lock fails closed on collision; remove a stale lock only after confirming its job stopped. Unreleased export pins are operational cleanup, not timed eviction of possibly active transfers.
- Off-site order is pinned completed database and manifest first, then missing immutable files, then full hash/size/database and source-freshness verification, then COMPLETE. Use two SFTP batches, not a connection per file. Preserve the source backup filename and creation timestamp separately from export and verification times. Scheduled verification rejects a source older than the configurable 36-hour default. Deliberate restore can use an older completed recovery point. Shared local file pool is never pruned in v1. A restored directory is fresh; the live directory is never overwritten by the restore command.
- Administration always shows full server-backup/storage status. Other owner pages show only a compact warning with an Administration link, excluded from contributor/shared/print views. Missing or overdue backups (configurable 36-hour default), remaining file allowance below the configurable 5 GB default, unsafe storage and failed status checks warn visibly. Healthy status and loading indicators stay off working pages. `FILES_WARNING_BELOW_BYTES` is a server configuration setting; it does not change upload admission. Windows pull failures notify the logged-on owner and retain a failed exit status. The website does not claim the PC copy is current; a stopped PC or a task that never starts cannot notify.
- Restore checks exact schema compatibility and all bytes before publication, then deletes sessions/grants, revokes links and disables nonowners atomically. Preserve the owner. Emit only the system reset reason and counts. Reset contributor passwords before enabling and deliberately granting access again. Keep the dedicated share key outside code, data and backups.
- Separate local replay from live evidence. Tasks 4–5 require hosting access, private configuration, Windows scheduler access and actual off-site drill results. Do not mark release complete until those gates pass. No production change is authorized merely by publishing or reviewing this plan.

## Review focus and evidence ownership

| Failure condition | Expected behavior | Verification |
|---|---|---|
| Private record content or a revoked QR leaks into a PDF | Strict projection; QR off by default and valid when selected; refresh immediately before native print | Task 1 API/browser privacy, decoded QR and revocation tests |
| Long Greek text, delayed image loads or page breaks truncate output | A3 landscape, continuing pages, ready resources | Task 1 actual generated PDF dimensions/text and browser readiness tests; physical output Task 4 |
| Rotation races a slow PC pull | Pinned database survives rotation; immutable references remain available | Task 2 pin/retention test; scheduled transfer Task 5 |
| Nightly backups stop but old snapshots keep transferring | Source timestamp stays unchanged; stale verification fails without a new COMPLETE report | Task 2 repeated-export regression and Task 3 failed-pull test |
| Backup jobs fail quietly or storage runs low | Visible owner warning and a failed-pull desktop notification; unknown status is not healthy | Task 1 owner status/API tests; Task 3 notification orchestration tests; actual scheduled delivery Task 5 |
| A referenced person or location changes without touching the record timestamp | Print adopts every refreshed value and waits for that snapshot's resources | Task 1 unchanged-record-timestamp browser regression |
| Corrupt/missing bytes, wrong schema or restored old access | No completed candidate; all old access reset before publication | Task 2 integrity/schema/access-reset/cleanup tests; real drill Task 5 |
| Development works but production omits tsx or hosting differs | Compiled runtime works with production-only packages; live failures block release | Task 3 process/production-only probe; Task 4 hosted checklist |

## Preflight

- [x] Start an isolated implementation branch/worktree from main containing this plan. Check status, Node and npm versions. Preserve unrelated work. Node must be at least 22.13; the hosting trial uses Node 24.
- [x] Read the governing design, Plan 0 [hosting evidence](../../spikes/webhosting-l/README.md), [access guide](../guides/share-key-management.md) and [web guide](../guides/web-interface.md).
- [x] Run this runtime baseline guard. Documentation-only changes after authoring are allowed. Reconcile a runtime difference before overwriting it.

```powershell
git diff --exit-code 59f04d0 -- package.json package-lock.json tsconfig.json src scripts tests vite.config.ts vite.browser-test.config.ts playwright.config.ts vitest.config.ts
npm ci --ignore-scripts
npm rebuild esbuild
npm test
```

Expected baseline: 464 tests across 64 files. The pinned better-sqlite3 13 package includes its native prebuild; the existing Windows installation workaround is retained. Hosting installs normally with its approved allowScripts entry and Node 24.

Extraction command, from the implementation checkout:

```powershell
node docs/plans/tools/replay-plan6.mjs docs/plans/2026-10-04-plan-6-print-and-operations.md . 1 setup
```

Arguments after the destination are task `1`–`6` or `all`, then `setup`, `test`, `implementation` or `all`. Extract phases in task order. The helper writes only payload files; it does not install, test, delete, deploy or commit. Each task owns the files shown in its complete blocks. Task 1 produces print routes/UI; Task 2 produces backup/export/restore interfaces; Task 3 consumes those CLI entrypoints; Tasks 4–5 execute their operating guides; Task 6 closes documentation only after live evidence.

For Chrome tests in PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:browser
```

Ports 3490 and 5174 must be free. Use synthetic local fixtures, never a production database or production server for automated tests. Do not run browser suites concurrently.


## Task 1: Owner A3 print view, Administration and backup/storage warnings

**Depends on:** verified Plan 5 baseline.

Owner-only print projection and resource-ready A3 landscape output. The single print screen defaults to no QR and permits Drafts; an optional Include QR link checkbox enables explicit existing-link selection. No-QR printing needs no sharing request. The print view excludes both Notes fields, Log, Activity and private/commercial content. Latest measurement tables and comparison history follow the existing domain functions. Always adopt the refreshed printable snapshot, including independently maintained labels and generatedAt; wait for its resources before native print. A direct browser print before resources are ready produces no incomplete record sheet. Align the existing editor and overview Greek labels with the design. Add owner-only Administration with always-available backup/storage details. Other working pages show only a compact warning and an Administration link; healthy status and loading indicators remain hidden. The configurable remaining-file threshold defaults to 5 GB. The read-only API and live capacity snapshot are independent of the Task 2 scheduler. Missing, overdue, unavailable and unsafe-capacity states also warn. Extra storage details stay collapsed by default; printing and readers never show this owner information.

- [x] Extract setup and install dependencies preserving the existing lockfile. Run `npm install --ignore-scripts`, then `npm rebuild esbuild`. Move bundled browser-only packages to development dependencies without changing their versions. Inspect the lockfile diff and commit it; no embedded lockfile replaces it.

#### File: `package.json`

<!-- replay task=1 phase=setup encoding=text sha256=cb9f967004574667a2105afba3659d5135454542c6f71aa3b276af7c6f4d4a49 -->

``````json
{
  "name": "builtbasis",
  "version": "0.1.0",
  "private": true,
  "license": "UNLICENSED",
  "type": "module",
  "engines": {
    "node": ">=22.13.0"
  },
  "scripts": {
    "dev": "tsx watch src/server/main.ts",
    "start": "tsx src/server/main.ts",
    "owner": "tsx scripts/owner.ts",
    "user": "tsx scripts/user.ts",
    "seed:gennadi": "tsx scripts/seed-gennadi.ts",
    "shares:revoke-all": "tsx scripts/revoke-share-links.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "vocabulary:extract": "node scripts/extract-vocabulary.mjs",
    "web:dev": "vite",
    "web:build": "vite build",
    "test:browser": "playwright test",
    "server:build": "node scripts/build-server.mjs",
    "build": "npm run server:build && npm run web:build",
    "start:production": "node dist/server/main.mjs",
    "backup": "tsx scripts/backup.ts",
    "backup:export": "tsx scripts/backup-export.ts",
    "restore": "tsx scripts/restore.ts"
  },
  "allowScripts": {
    "better-sqlite3@13.0.3": true
  },
  "devDependencies": {
    "@kenjiuno/msgreader": "1.28.0",
    "@playwright/test": "1.63.0",
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^22.20.5",
    "@types/qrcode": "1.5.6",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "esbuild": "0.28.2",
    "exceljs": "^4.4.0",
    "exifr": "7.1.3",
    "heic-to": "1.6.5",
    "htmlparser2": "12.0.0",
    "jsqr": "1.4.0",
    "pdfjs-dist": "6.3.289",
    "postal-mime": "4.0.2",
    "qrcode": "1.5.4",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "tsx": "^4.23.15",
    "typescript": "^5.9.3",
    "vite": "7.3.6",
    "vitest": "^3.2.7"
  },
  "dependencies": {
    "@fastify/cookie": "^11.1.2",
    "@fastify/multipart": "9.3.0",
    "@fastify/static": "10.1.5",
    "better-sqlite3": "13.0.3",
    "fastify": "^5.12.5",
    "zod": "^4.6.5"
  }
}
``````

- [x] Write/extract the tests first.

#### File: `tests/server/print-api.test.ts`

<!-- replay task=1 phase=test encoding=text sha256=5cd331f9264e3d721f96d5e22dfff9e69c6c601abf90e277288b0b370b5b13bf -->

``````typescript
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createContributor } from '../../src/server/auth/contributors';
import { createSession } from '../../src/server/auth/sessions';
import { get, OWNER, send } from './helpers';
import { addPhoto } from './file-fixture';
import { forceStatus, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';
let f: Fixture;
beforeEach(async () => { f = await makeFixture(); });
afterEach(async () => { await f.ctx.close(); });

it('returns only printable fields and GET never creates a share or changes records', async () => {
  const record = await postRecord(f, { subtype: 'task', title: 'Printable title', description: 'Printable description', notes: 'PRIVATE_SENTINEL', publicNotes: 'PUBLIC_NOTES_SENTINEL', outsideScope: true, estimatedCost: 98234.56 });
  await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/log'), { text: 'LOG_SENTINEL', private: false });
  const before = f.ctx.db.serialize();
  const response = await get(f.ctx, f.cookie, recordUrl(f, record.id, '/print'));
  expect(response.statusCode, response.body).toBe(200);
  expect(response.json().record).toMatchObject({ title: 'Printable title', description: 'Printable description' });
  for (const value of ['PRIVATE_SENTINEL', 'PUBLIC_NOTES_SENTINEL', 'LOG_SENTINEL', '98234.56', 'publicNotes', 'outsideScope', 'estimatedCost', 'activity', 'attachments', 'statusReason', 'completion', 'safety', 'mustBeDoneBefore']) expect(response.body).not.toContain(value);
  expect(response.headers['cache-control']).toContain('no-store');
  expect(f.ctx.db.serialize()).toEqual(before);
});

it('prints at most four Before and After photos most recent first, excluding During', async () => {
  const record = await postRecord(f, { subtype: 'task' });
  for (const phase of ['before', 'after', 'during']) for (let i = 1; i <= 5; i++) await addPhoto(f, record.id, { phase, caption: `${phase}-${i}` });
  const response = await get(f.ctx, f.cookie, recordUrl(f, record.id, '/print'));
  expect(response.statusCode).toBe(200);
  expect(response.json().photos.map((p: { caption: string }) => p.caption)).toEqual(['before-5', 'before-4', 'before-3', 'before-2', 'after-5', 'after-4', 'after-3', 'after-2']);
});

it('requires an owner session and scopes the record to its project', async () => {
  const record = await postRecord(f, { subtype: 'task' });
  const url = recordUrl(f, record.id, '/print');
  expect((await f.ctx.app.inject({ url })).statusCode).toBe(401);
  const id = createContributor(f.ctx.db, 'reader', 'Reader', OWNER.password);
  const cookie = `bb_session=${createSession(f.ctx.db, id).token}`;
  expect((await get(f.ctx, cookie, url)).statusCode).toBe(403);
  forceStatus(f, record.id, 'open');
  const share = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/share-links'), { label: 'Reader' });
  expect((await f.ctx.app.inject({ url, headers: { authorization: `Bearer ${share.json().url.split('#')[1]}` } })).statusCode).toBe(401);
  expect((await get(f.ctx, f.cookie, `/api/projects/999999/records/${record.id}/print`)).statusCode).toBe(404);
});

it('selects the latest set by date then id for every phase and retains comparison history', async () => {
  const record = await postRecord(f, { subtype: 'task' });
  for (const [date, phase, value] of [['2026-01-02', 'before', 10], ['2026-01-01', 'before', 5], ['2026-01-02', 'before', 12], ['2026-01-03', 'after', 8]] as const) {
    const response = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/measurement-sets'), { date, phase, rows: [{ item: 'Wall', quantity: 'Width', unit: 'mm', value }] });
    expect(response.statusCode).toBe(201);
  }
  const payload = (await get(f.ctx, f.cookie, recordUrl(f, record.id, '/print'))).json();
  expect(payload.measurements.map((set: { rows: { value: number }[] }) => set.rows[0]!.value)).toEqual([12, 8]);
  expect(payload.comparisons[0].points.map((point: { value: number; changeFromPrevious: number | null }) => [point.value, point.changeFromPrevious])).toEqual([[5, null], [10, 5], [12, 2], [8, -4]]);
});
``````

#### File: `tests/web/print-links.test.ts`

<!-- replay task=1 phase=test encoding=text sha256=c4cf4f173beb882ab3ff52360f496518575307afb66f2ad429ae27b1b65f8c6d -->

``````typescript
import { expect, it } from 'vitest';
import type { ShareLinkOut } from '../../src/domain';
import { activePrintLinks } from '../../src/web/printing/PrintPage';
it('allows only usable, non-revoked, strictly unexpired links and none for Draft', () => {
  const link: ShareLinkOut = { id: 1, label: 'Chosen', url: 'https://example.test/share#token', createdAt: '2026-01-01', expiresAt: null, revokedAt: null, lastViewedAt: null, viewCount: 0 };
  const links = [link, { ...link, id: 2, expiresAt: '2026-01-02T00:00:00Z' }, { ...link, id: 3, expiresAt: '2026-01-03T00:00:00Z' }, { ...link, id: 4, revokedAt: '2026-01-01' }, { ...link, id: 5, url: null }];
  expect(activePrintLinks(links, false, Date.parse('2026-01-02T00:00:00Z')).map(item => item.id)).toEqual([1, 3]);
  expect(activePrintLinks(links, true, Date.parse('2026-01-02T00:00:00Z'))).toEqual([]);
});
``````

#### File: `tests/browser/print.spec.ts`

<!-- replay task=1 phase=test encoding=text sha256=f3622c248c2482980b7b071f8b50f450ec0c40890c2e7a63a64b8abd5a841ab5 -->

``````typescript
import Database from 'better-sqlite3';
import jsQR from 'jsqr';
import { readFileSync } from 'node:fs';
import { test, expect, login, seed } from './fixture';
const origin = 'http://127.0.0.1:3490';

for (const status of ['draft', 'open'] as const) test(`default no-QR printing works for a ${status} record without links`, async ({ page }) => {
  await login(page);
  const { projectId } = seed();
  const created = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype: 'task', title: `No QR ${status}`, notes: 'NO_QR_PRIVATE', publicNotes: 'NO_QR_PUBLIC_NOTES' } });
  expect(created.status()).toBe(201);
  const { id } = await created.json() as { id: number };
  const base = `/api/projects/${projectId}/records/${id}`;
  if (status === 'open') expect((await page.request.post(base + '/transitions', { headers: { origin }, data: { to: 'open' } })).status()).toBe(200);
  let shareRequests = 0;
  page.on('request', request => { if (request.url().includes(base + '/share-links')) shareRequests++; });
  await page.goto(`/projects/${projectId}/records/${id}/print`);
  const checkbox = page.getByRole('checkbox', { name: 'Include QR link', exact: true });
  await expect(checkbox).not.toBeChecked();
  if (status === 'draft') await expect(checkbox).toBeDisabled();
  const button = page.getByRole('button', { name: 'Print / Save PDF', exact: true });
  await expect(button).toBeEnabled();
  await expect(page.locator('.print-sheet')).toContainText(status === 'draft' ? 'Draft' : 'Open');
  await expect(page.locator('.print-sheet a')).toHaveCount(0);
  await expect(page.locator('.print-sheet')).not.toContainText('NO_QR_');
  await page.evaluate(() => { window.print = () => { document.body.dataset.printed = document.querySelector('.print-page')!.classList.contains('print-ready') ? 'ready' : 'not-ready'; }; });
  await button.click();
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'ready');
  expect(shareRequests).toBe(0);
  expect(await (await page.request.get(base + '/share-links')).json()).toEqual([]);
});

test('no-QR printing survives unavailable sharing, including after a failed QR opt-in', async ({ page }) => {
  await login(page);
  const { projectId, recordId } = seed();
  const base = `/api/projects/${projectId}/records/${recordId}`;
  await page.route(base + '/share-links', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }));
  await page.goto(`/projects/${projectId}/records/${recordId}/print`);
  const button = page.getByRole('button', { name: 'Print / Save PDF', exact: true });
  await expect(button).toBeEnabled();
  await page.evaluate(() => { window.print = () => { document.body.dataset.printed = 'yes'; }; });
  await button.click(); await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes');
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(button).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).uncheck();
  await expect(button).toBeEnabled();
  await page.evaluate(() => { delete document.body.dataset.printed; });
  await button.click(); await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes');
  await expect(page.locator('.print-sheet a')).toHaveCount(0);
});

test('print refreshes renamed people and locations from another session without a record timestamp change', async ({ page, browser }) => {
  await login(page);
  const { projectId } = seed();
  const project = `/api/projects/${projectId}`;
  const personResponse = await page.request.post(project + '/people', { headers: { origin }, data: { code: 'PRINT-RENAME', name: 'Original print person', role: 'other' } });
  expect(personResponse.status()).toBe(201);
  const person = await personResponse.json() as { id: number };
  const locationResponse = await page.request.post(project + '/locations', { headers: { origin }, data: { kind: 'building', nameEn: 'Original print location' } });
  expect(locationResponse.status()).toBe(201);
  const location = await locationResponse.json() as { id: number };
  const created = await page.request.post(project + '/records', { headers: { origin }, data: { subtype: 'task', title: 'Fresh print snapshot', ballInCourtId: person.id, locationIds: [location.id] } });
  expect(created.status()).toBe(201);
  const record = await created.json() as { id: number };
  const base = project + `/records/${record.id}`;
  expect((await page.request.post(base + '/transitions', { headers: { origin }, data: { to: 'open' } })).status()).toBe(200);
  expect((await page.request.post(base + '/share-links', { headers: { origin }, data: { label: 'Fresh print QR' } })).status()).toBe(201);
  await page.goto(`/projects/${projectId}/records/${record.id}/print`);
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await page.getByLabel('QR share link', { exact: true }).selectOption({ label: 'Fresh print QR' });
  const printButton = page.getByRole('button', { name: 'Print / Save PDF', exact: true });
  await expect(printButton).toBeEnabled();
  await expect(page.locator('.print-sheet')).toContainText('Original print person');
  const before = await (await page.request.get(base)).json() as { updatedAt: string };
  const other = await browser.newContext({ baseURL: origin });
  try {
    const editor = await other.newPage(); await login(editor);
    expect((await editor.request.patch(project + `/people/${person.id}`, { headers: { origin }, data: { name: 'Renamed print person' } })).status()).toBe(200);
    expect((await editor.request.patch(project + `/locations/${location.id}`, { headers: { origin }, data: { nameEn: 'Renamed print location' } })).status()).toBe(200);
    expect((await (await editor.request.get(base)).json()).updatedAt).toBe(before.updatedAt);
  } finally { await other.close(); }
  await page.evaluate(() => { window.print = () => {
    const sheet = document.querySelector('.print-sheet')!;
    document.body.dataset.printSnapshot = JSON.stringify({ text: sheet.textContent, generatedAt: sheet.querySelector('footer time')?.getAttribute('datetime'), ready: document.querySelector('.print-page')!.classList.contains('print-ready') });
  }; });
  const response = page.waitForResponse(response => response.url().endsWith(base + '/print'));
  await printButton.click();
  const snapshot = await (await response).json() as { generatedAt: string };
  await expect(page.locator('body')).toHaveAttribute('data-print-snapshot', /Renamed print person/);
  const printed = JSON.parse((await page.locator('body').getAttribute('data-print-snapshot'))!) as { text: string; generatedAt: string; ready: boolean };
  expect(printed.text).toContain('Renamed print location');
  expect(printed.text).not.toContain('Original print person');
  expect(printed.generatedAt).toBe(snapshot.generatedAt);
  expect(printed.ready).toBe(true);
});

test('owner print excludes Notes and Log from both DOM and its payload, and requires deliberate QR selection', async ({ page }) => {
  await login(page);
  const { projectId, recordId, shareUrl } = seed();
  const payloads: string[] = [];
  page.on('response', response => { if (response.url().includes(`/records/${recordId}`) && response.request().resourceType() === 'fetch') void response.text().then(text => payloads.push(text)); });
  await page.goto(`/projects/${projectId}/records/${recordId}/print`);
  await expect(page.getByRole('heading', { name: 'Public sample task', exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  await page.getByLabel('QR share link', { exact: true }).selectOption({ label: 'Browser synthetic reader' });
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  await expect(page.getByRole('img', { name: 'Share QR code', exact: true })).toBeVisible();
  expect(await page.locator('.print-qr a').getAttribute('href')).toBe(shareUrl);
  const pixels = await page.locator('.print-qr img').evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    return { data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data), width: canvas.width, height: canvas.height };
  });
  expect(jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)?.data).toBe(shareUrl);
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).uncheck();
  await expect(page.locator('.print-qr')).toHaveCount(0);
  await expect(page.locator('.print-sheet a')).toHaveCount(0);
  expect(await page.locator('.print-sheet').innerHTML()).not.toContain(shareUrl);
  await page.evaluate(() => { window.print = () => { document.body.dataset.printedLinks = String(document.querySelectorAll('.print-sheet a').length); }; });
  await page.getByRole('button', { name: 'Print / Save PDF', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-printed-links', '0');
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await page.getByLabel('QR share link', { exact: true }).selectOption({ label: 'Browser synthetic reader' });
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  for (const secret of ['PRIVATE_SENTINEL', 'Public site note', 'Public log entry', 'PRIVATE_LOG_SENTINEL', '9876.54']) {
    expect(await page.locator('body').textContent()).not.toContain(secret);
    expect(payloads.join('')).not.toContain(secret);
  }
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  await expect(page.getByRole('heading', { name: 'Περιγραφή', exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('.print-controls')).toBeHidden();
  await expect(page.locator('.print-sheet')).toBeVisible();
  const pdf = await page.pdf({ preferCSSPageSize: true, path: 'test-results/print-greek-a3.pdf' });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: new Uint8Array(pdf), useSystemFonts: true });
  const pdfDocument = await loading.promise;
  const first = await pdfDocument.getPage(1);
  expect(first.view[2]! - first.view[0]!).toBeCloseTo(1190.55, -1);
  expect(first.view[3]! - first.view[1]!).toBeCloseTo(841.89, -1);
  await loading.destroy();
});

test('one print action adopts a changed record and waits for its newly added photo', async ({ page }) => {
  await login(page);
  const { projectId } = seed();
  const created = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype: 'task', title: 'Before fresh snapshot' } });
  expect(created.status()).toBe(201);
  const record = await created.json() as { id: number };
  const base = `/api/projects/${projectId}/records/${record.id}`;
  expect((await page.request.post(base + '/transitions', { headers: { origin }, data: { to: 'open' } })).status()).toBe(200);
  expect((await page.request.post(base + '/share-links', { headers: { origin }, data: { label: 'Changed print QR' } })).status()).toBe(201);
  await page.goto(`/projects/${projectId}/records/${record.id}/print`);
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await page.getByLabel('QR share link', { exact: true }).selectOption({ label: 'Changed print QR' });
  const button = page.getByRole('button', { name: 'Print / Save PDF', exact: true });
  await expect(button).toBeEnabled();
  const file = { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: readFileSync('tests/browser/fixtures/media-oriented.jpg') };
  expect((await page.request.post(base + '/photos', { headers: { origin }, multipart: { metadata: JSON.stringify({ phase: 'after', caption: 'New print photo' }), original: file, display: file, thumbnail: file } })).status()).toBe(201);
  expect((await page.request.patch(base, { headers: { origin }, data: { title: 'After fresh snapshot' } })).status()).toBe(200);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(base + '/photos/*/display', async route => { await gate; await route.continue(); });
  await page.evaluate(() => { window.print = () => {
    const image = document.querySelector('.print-photos img') as HTMLImageElement | null;
    document.body.dataset.printSnapshot = JSON.stringify({ text: document.querySelector('.print-sheet')!.textContent, photoReady: !!image?.complete && image.naturalWidth > 0, ready: document.querySelector('.print-page')!.classList.contains('print-ready') });
  }; });
  await button.click();
  await expect(page.locator('.print-sheet')).toContainText('After fresh snapshot');
  await expect(button).toBeDisabled();
  await expect(page.locator('body')).not.toHaveAttribute('data-print-snapshot');
  release();
  await expect(page.locator('body')).toHaveAttribute('data-print-snapshot', /After fresh snapshot/);
  const printed = JSON.parse((await page.locator('body').getAttribute('data-print-snapshot'))!) as { photoReady: boolean; ready: boolean };
  expect(printed).toMatchObject({ photoReady: true, ready: true });
});

test('no link is created on GET and long text continues onto further A3 pages', async ({ page }) => {
  await login(page);
  const { projectId, dbPath } = seed();
  const description = Array.from({ length: 180 }, (_, i) => `Paragraph ${i + 1}. Synthetic printable evidence with enough detail to exercise pagination.`).join('\n');
  const response = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype: 'task', title: 'Multipage print fixture', description } });
  expect(response.status()).toBe(201);
  const record = await response.json() as { id: number };
  const db = new Database(dbPath); try { db.prepare("UPDATE records SET status = 'open' WHERE id = ?").run(record.id); } finally { db.close(); }
  const base = `/api/projects/${projectId}/records/${record.id}`;
  await page.goto(`/projects/${projectId}/records/${record.id}/print`);
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Create share link', exact: true })).toBeVisible();
  expect(await (await page.request.get(base + '/share-links')).json()).toEqual([]);
  await page.getByLabel('Link label', { exact: true }).fill('Printed handover');
  await page.getByRole('button', { name: 'Create share link', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  await page.getByLabel('QR share link', { exact: true }).selectOption({ label: 'Printed handover' });
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  const pdf = await page.pdf({ preferCSSPageSize: true, path: 'test-results/print-multipage-a3.pdf' });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: new Uint8Array(pdf), useSystemFonts: true });
  const pdfDocument = await loading.promise;
  expect(pdfDocument.numPages).toBeGreaterThan(1);
  let content = ''; for (let i = 1; i <= pdfDocument.numPages; i++) { const p = await pdfDocument.getPage(i); content += (await p.getTextContent()).items.map(item => 'str' in item ? item.str : '').join(' '); }
  expect(content).toContain('Paragraph 1.'); expect(content).toContain('Paragraph 180.');
  await loading.destroy();
});

test('printing waits for photo resources and excludes revoked and expired QR choices', async ({ page }) => {
  await login(page);
  const { projectId, dbPath } = seed();
  const response = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype: 'task', title: 'Print resources' } });
  const record = await response.json() as { id: number };
  const base = `/api/projects/${projectId}/records/${record.id}`;
  const db = new Database(dbPath); try { db.prepare("UPDATE records SET status = 'open' WHERE id = ?").run(record.id); } finally { db.close(); }
  const file = { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: readFileSync('tests/browser/fixtures/media-oriented.jpg') };
  const photo = await page.request.post(base + '/photos', { headers: { origin }, multipart: { metadata: JSON.stringify({ phase: 'before', caption: 'Visible evidence' }), original: file, display: file, thumbnail: file } });
  expect(photo.status()).toBe(201);
  for (const label of ['Current', 'Expired', 'Revoked']) {
    const created = await page.request.post(base + '/share-links', { headers: { origin }, data: { label } });
    expect(created.status()).toBe(201);
    const linkId = (await created.json()).id as number;
    if (label === 'Revoked') await page.request.post(base + `/share-links/${linkId}/revoke`, { headers: { origin }, data: {} });
    if (label === 'Expired') { const database = new Database(dbPath); try { database.prepare('UPDATE share_links SET expires_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', linkId); } finally { database.close(); } }
  }
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(base + '/photos/*/display', async route => { await gate; await route.continue(); });
  await page.goto(`/projects/${projectId}/records/${record.id}/print`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('checkbox', { name: 'Include QR link', exact: true }).check();
  const choices = page.getByLabel('QR share link', { exact: true });
  await expect(choices.locator('option')).toHaveText(['Choose a link', 'Current']);
  await choices.selectOption({ label: 'Current' });
  await expect(page.locator('.print-qr img')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  await expect(page.getByRole('img', { name: 'Visible evidence', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/print-resources.png', fullPage: true });
  await page.evaluate(() => { window.print = () => { document.body.dataset.printCalled = document.querySelector('.print-page')?.classList.contains('print-ready') ? 'ready' : 'not-ready'; }; });
  await page.getByRole('button', { name: 'Print / Save PDF', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-print-called', 'ready');
  const shares = await (await page.request.get(base + '/share-links')).json() as { id: number; label: string }[];
  await page.request.post(base + `/share-links/${shares.find(link => link.label === 'Current')!.id}/revoke`, { headers: { origin }, data: {} });
  await page.evaluate(() => { delete document.body.dataset.printCalled; });
  await page.getByRole('button', { name: 'Print / Save PDF', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  await expect(page.locator('body')).not.toHaveAttribute('data-print-called');
});
``````

#### File: `tests/browser/record.spec.ts`

<!-- replay task=1 phase=test encoding=text sha256=213c4b2dfe302eb4e5695afb4ffe98c2f59284c2637353c85884b7cc61e2ad98 -->

``````typescript
import type { Page } from '@playwright/test';
import { test, expect, login, seed } from './fixture';

const origin = 'http://127.0.0.1:3490';
async function create(page: Page, subtype = 'task', extra: Record<string, unknown> = {}) {
  const { projectId } = seed();
  const response = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype, title: `Synthetic ${subtype} ${Date.now()}`, ...extra } });
  expect(response.ok()).toBeTruthy();
  const record = await response.json() as { id: number; title: string };
  await page.goto(`/projects/${projectId}/records/${record.id}`);
  await expect(page.getByRole('heading', { name: record.title, exact: true })).toBeVisible();
  return { ...record, base: `/api/projects/${projectId}/records/${record.id}` };
}
async function tab(page: Page, name: string) { await page.getByRole('navigation', { name: 'Record sections' }).getByRole('button', { name, exact: true }).click(); }
async function transition(page: Page, target: string) {
  await page.getByRole('button', { name: 'Change status', exact: true }).click();
  await page.getByRole('combobox', { name: 'New status', exact: true }).selectOption(target);
}
async function applyStatus(page: Page) {
  await page.getByRole('button', { name: 'Apply status', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function saved(page: Page, button: string) {
  await page.getByRole('button', { name: button, exact: true }).click();
  await expect(page.getByRole('button', { name: button, exact: true })).toHaveCount(0);
}

test('owner editor preserves exact text across language changes, confirms cancellation and keeps saved hidden estimates', async ({ page }) => {
  await login(page); const record = await create(page, 'task', { outsideScope: true, estimatedCost: 19.25 });
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  const exact = '  Owner wording\n  remains unchanged  ';
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill(exact);
  const locations = page.getByRole('group', { name: 'Locations', exact: true });
  await locations.locator('summary').filter({ hasText: /^Villa 1$/ }).click();
  await locations.getByRole('checkbox', { name: 'Kitchen', exact: true }).check();
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('el');
  await expect(page.getByRole('textbox', { name: 'Περιγραφή', exact: true })).toHaveValue(exact);
  await page.getByRole('combobox', { name: 'Γλώσσα', exact: true }).selectOption('en');
  await page.getByLabel('Estimated cost (€)', { exact: true }).fill('42.90');
  await page.getByLabel('Outside contract scope', { exact: true }).uncheck();
  await saved(page, 'Save record');
  const response = await page.request.get(record.base);
  expect(await response.json()).toMatchObject({ description: exact, outsideScope: false, estimatedCost: 19.25 });
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Unsaved');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Unsaved');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: record.title, exact: true })).toBeVisible();
});

test('QI classification and chosen options require an accountable decision; DC keeps its own classification', async ({ page }) => {
  await login(page); const qi = await create(page, 'quality_issue');
  await page.getByRole('button', { name: 'Add option', exact: true }).click();
  await page.getByRole('textbox', { name: 'Option label', exact: true }).fill('Repair carefully');
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Preserve the original proposal.');
  await saved(page, 'Save option');
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  await page.getByRole('group', { name: 'Type of problem', exact: true }).getByRole('checkbox').first().check();
  await page.getByRole('combobox', { name: 'Disposition', exact: true }).selectOption('repair');
  await page.getByRole('combobox', { name: 'Chosen option', exact: true }).selectOption({ label: 'Repair carefully' });
  await page.getByRole('textbox', { name: 'Instruction text', exact: true }).fill('  Issued wording\nDo not translate.  ');
  await saved(page, 'Save record');
  await transition(page, 'open');
  await page.getByRole('button', { name: 'Apply status', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Record who decided');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  await page.getByRole('combobox', { name: 'Decided by', exact: true }).selectOption(String(seed().architectId));
  await page.getByLabel('Decided on', { exact: true }).fill('2026-10-02');
  await saved(page, 'Save record');
  await transition(page, 'open'); await applyStatus(page);
  expect(await (await page.request.get(qi.base)).json()).toMatchObject({ status: 'open', instructionText: '  Issued wording\nDo not translate.  ' });
  await create(page, 'detail_clarification');
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Disposition', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill('How should the edge be finished?');
  await page.getByRole('combobox', { name: 'Issued by', exact: true }).selectOption(String(seed().architectId));
  await page.getByRole('combobox', { name: 'Route', exact: true }).selectOption({ index: 1 });
  await saved(page, 'Save record'); await transition(page, 'open'); await applyStatus(page);
  await expect(page.getByText('How should the edge be finished?', { exact: true })).toBeVisible();
});

test('status hold reasons and failed then passed verification are explicit and localized', async ({ page }) => {
  await login(page); await create(page); await transition(page, 'open'); await applyStatus(page);
  await transition(page, 'on_hold');
  await page.getByRole('combobox', { name: 'Reason', exact: true }).selectOption('other');
  await page.getByRole('textbox', { name: 'Reason note', exact: true }).fill('Waiting for access.');
  await applyStatus(page);
  await expect(page.getByText('Waiting for access.', { exact: true })).toBeVisible();
  await transition(page, 'open'); await applyStatus(page);
  await transition(page, 'in_progress'); await applyStatus(page);
  await transition(page, 'ready_for_verification'); await applyStatus(page);
  for (const target of ['in_progress', 'closed']) {
    await transition(page, target);
    await page.getByRole('combobox', { name: 'Checked by', exact: true }).selectOption(String(seed().architectId));
    await page.getByLabel('Date', { exact: true }).fill('2026-10-03');
    await page.getByRole('combobox', { name: 'Method', exact: true }).selectOption({ index: 1 });
    await page.getByRole('textbox', { name: 'Verification note', exact: true }).fill(target === 'closed' ? 'Passed after correction.' : 'Needs another correction.');
    await applyStatus(page);
    if (target === 'in_progress') { await transition(page, 'ready_for_verification'); await applyStatus(page); }
  }
  await page.getByText('Verification history (2)', { exact: true }).click();
  await expect(page.getByText('Needs another correction.', { exact: true })).toBeVisible();
  await expect(page.getByText('Passed after correction.', { exact: true })).toBeVisible();
});

test('measurement sets reject normalized duplicates and show exact signed comparisons in date order', async ({ page }) => {
  await login(page); const record = await create(page); await tab(page, 'Measurements');
  await page.getByRole('button', { name: 'Add measurement set', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-10-01');
  await page.getByRole('combobox', { name: 'Item', exact: true }).fill(' Left ');
  await page.getByRole('combobox', { name: 'Quantity', exact: true }).fill('Offset');
  await page.getByLabel('Value', { exact: true }).fill('-1.25');
  await page.getByRole('button', { name: 'Add row', exact: true }).click();
  await page.getByRole('combobox', { name: 'Item', exact: true }).nth(1).fill('left');
  await page.getByRole('combobox', { name: 'Quantity', exact: true }).nth(1).fill(' offset ');
  await page.getByLabel('Value', { exact: true }).nth(1).fill('2.5');
  await page.getByRole('button', { name: 'Save measurements', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('only once');
  await page.getByRole('combobox', { name: 'Item', exact: true }).nth(1).fill('Right');
  await saved(page, 'Save measurements');
  await page.locator('summary').filter({ hasText: /Between items.*offset.*mm/i }).click();
  await expect(page.getByRole('cell', { name: '3.75', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add measurement set', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-10-02');
  await page.getByRole('combobox', { name: 'Phase', exact: true }).selectOption('after');
  await page.getByRole('combobox', { name: 'Item', exact: true }).fill('left');
  await page.getByRole('combobox', { name: 'Quantity', exact: true }).fill('offset');
  await page.getByLabel('Value', { exact: true }).fill('0.125');
  await saved(page, 'Save measurements');
  await page.locator('summary').filter({ hasText: /Before vs after.*Left.*Offset/ }).click();
  await expect(page.getByRole('cell', { name: '1.375', exact: true })).toBeVisible();
  const sets = await (await page.request.get(record.base + '/measurement-sets')).json() as { rows: { value: number }[] }[];
  expect(sets.map(set => set.rows[0]?.value)).toEqual([-1.25, 0.125]);
});

test('owner Log CRUD retains private content and share links support explicit copy and revoke', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await login(page); const record = await create(page); await transition(page, 'open'); await applyStatus(page);
  await tab(page, 'Log'); await page.getByRole('button', { name: 'Add Log entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Entry', exact: true }).fill('Private synthetic entry');
  await page.getByLabel('Private · owner only', { exact: true }).check();
  await saved(page, 'Save entry');
  await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Entry', exact: true }).fill('Private synthetic edited');
  await saved(page, 'Save entry');
  await tab(page, 'Sharing'); await page.getByText('Create a share link', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Link label', exact: true }).fill('Synthetic reader');
  await page.getByRole('button', { name: 'Create link', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Share URL', exact: true })).toBeVisible();
  const url = await page.getByRole('textbox', { name: 'Share URL', exact: true }).inputValue();
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  const shared = await context.newPage(); await shared.goto(url);
  await expect(shared.getByRole('heading', { name: record.title, exact: true })).toBeVisible();
  await expect(shared.locator('body')).not.toContainText('Private synthetic');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Revoke link', exact: true }).click();
  await expect(page.getByText('Revoked', { exact: true })).toBeVisible();
  await shared.getByRole('button', { name: 'Ανανέωση', exact: true }).click();
  await expect(shared.getByRole('heading', { name: record.title, exact: true })).toHaveCount(0);
  await expect(shared.getByRole('alert')).toBeVisible();
  await tab(page, 'Log'); page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(page.getByText('Private synthetic edited', { exact: true })).toHaveCount(0);
});

test('independent contributor permissions allow uploader attachment and logger public creation, then revoke visible access', async ({ page, browser }) => {
  await login(page); const record = await create(page); await transition(page, 'open'); await applyStatus(page);
  await tab(page, 'Log'); await page.getByRole('button', { name: 'Add Log entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Entry', exact: true }).fill('Public entry for contributor evidence'); await saved(page, 'Save entry');
  await tab(page, 'Sharing');
  for (const [username, permission] of [['uploader', 'Upload photos and attachments'], ['logger', 'Add Log entries']] as const) {
    await page.getByRole('combobox', { name: 'User', exact: true }).selectOption(String(seed().users[username]));
    await page.getByLabel(permission, { exact: true }).check();
    await page.getByRole('button', { name: 'Save access', exact: true }).click();
    await expect(page.getByRole('heading', { name: `Sample ${username}`, exact: true })).toBeVisible();
  }
  const uploadContext = await browser.newContext(); const uploader = await uploadContext.newPage();
  const logContext = await browser.newContext(); const logger = await logContext.newPage();
  try {
    await login(uploader, 'uploader'); await uploader.goto(`/assigned/${record.id}`); await tab(uploader, 'Log');
    await expect(uploader.getByRole('button', { name: 'Add Log entry', exact: true })).toHaveCount(0);
    await uploader.getByText('Attach a file to this entry', { exact: true }).click();
    await uploader.getByLabel('Attachment file', { exact: true }).setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic attachment. No personal data.') });
    await uploader.getByRole('button', { name: 'Upload attachment', exact: true }).click();
    await expect(uploader.getByText('Attachment: synthetic.txt', { exact: true })).toBeVisible();
    await login(logger, 'logger'); await logger.goto(`/assigned/${record.id}`); await tab(logger, 'Log');
    await expect(logger.getByText('Attach a file to this entry', { exact: true })).toHaveCount(0);
    await logger.getByRole('button', { name: 'Add Log entry', exact: true }).click();
    await expect(logger.getByLabel('Private · owner only', { exact: true })).toHaveCount(0);
    await logger.getByRole('textbox', { name: 'Entry', exact: true }).fill('Public contributor statement'); await saved(logger, 'Save entry');
    await expect(logger.getByRole('button', { name: 'Edit entry', exact: true })).toHaveCount(0);
    const article = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Sample uploader', exact: true }) });
    page.once('dialog', dialog => dialog.accept()); await article.getByRole('button', { name: 'Remove access', exact: true }).click();
    await expect(article).toHaveCount(0);
    await uploader.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(uploader.getByRole('heading', { name: record.title, exact: true })).toHaveCount(0);
    await expect(uploader.locator('body')).not.toContainText('Public entry for contributor evidence');
    await expect(uploader.getByRole('alert')).toBeVisible();
  } finally { await uploadContext.close(); await logContext.close(); }
});

test('transient refresh failure keeps evidence form and remaining uploads mounted', async ({ page }) => {
  await login(page); const record = await create(page); await tab(page, 'Evidence');
  await page.getByRole('combobox', { name: 'Upload type', exact: true }).selectOption('attachments');
  await page.getByRole('textbox', { name: 'Attachment title', exact: true }).fill('Pending evidence wording');
  await page.getByLabel('Files', { exact: true }).setInputFiles([
    { name: 'first-synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('First synthetic file') },
    { name: 'second-synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('Second synthetic file') },
  ]);
  let posts = 0;
  await page.route(`**${record.base}`, route => route.fulfill({ status: 500, json: { error: 'temporary_failure' } }));
  await page.route(`**${record.base}/attachments`, route => {
    if (route.request().method() !== 'POST') return route.continue();
    posts++;
    return posts === 2 ? route.fulfill({ status: 507, json: { error: 'storage_capacity' } }) : route.continue();
  });
  await page.getByRole('button', { name: 'Upload evidence', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Storage is full' })).toBeVisible();
  await expect(page.getByRole('heading', { name: record.title, exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Attachment title', exact: true })).toHaveValue('Pending evidence wording');
  await expect(page.getByRole('button', { name: 'Upload evidence', exact: true })).toBeEnabled();
  expect(posts).toBe(2);
  await page.unroute(`**${record.base}`); await page.unroute(`**${record.base}/attachments`);
  await page.getByRole('button', { name: 'Upload evidence', exact: true }).click();
  await expect(page.getByText('Upload complete.', { exact: true })).toBeVisible();
  const files = await (await page.request.get(record.base + '/attachments')).json() as { originalFilename: string }[];
  expect(files.map(file => file.originalFilename).sort()).toEqual(['first-synthetic.txt', 'second-synthetic.txt']);
});

test('inline tag creation and collision recovery retain unsaved record text', async ({ page }) => {
  await login(page); const record = await create(page);
  await page.getByRole('button', { name: 'Edit record', exact: true }).click();
  const wording = '  Unsubmitted record wording\nKeep it intact.  ';
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill(wording);
  await page.getByText('Add a new tag', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Tag name in English', exact: true }).fill('Stone');
  await page.getByRole('button', { name: 'Create and select tag', exact: true }).click();
  await expect(page.getByRole('button', { name: /Use existing tag/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue(wording);
  await page.getByRole('button', { name: /Use existing tag/ }).click();
  await expect(page.getByRole('group', { name: 'Tags', exact: true }).getByRole('checkbox', { name: 'Stone', exact: true })).toBeChecked();
  const label = `Synthetic new tag ${Date.now()}`;
  await page.getByRole('combobox', { name: 'Tag name in English', exact: true }).fill(label);
  const tagUrl = `**/api/projects/${seed().projectId}/tags`;
  await page.route(tagUrl, route => route.request().method() === 'POST' ? route.fulfill({ status: 503, json: { error: 'temporary_failure' } }) : route.continue());
  await page.getByRole('button', { name: 'Create and select tag', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Tag name in English', exact: true })).toHaveValue(label);
  await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue(wording);
  await page.unroute(tagUrl);
  await page.getByRole('button', { name: 'Create and select tag', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Tags', exact: true }).getByRole('checkbox', { name: label, exact: true })).toBeChecked();
  await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue(wording);
  await saved(page, 'Save record');
  const result = await (await page.request.get(record.base)).json() as { description: string; tagIds: number[] };
  expect(result.description).toBe(wording); expect(result.tagIds).toHaveLength(2);
});
``````

#### File: `tests/server/monitoring.test.ts`

<!-- replay task=1 phase=test encoding=text sha256=356ead499afae5ba2cc97a951f357c75b5f30c76a4cf0d42f5cf036b4d272a2f -->

``````typescript
import { afterEach, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { get, loginAsOwner, makeContext, OWNER, type TestContext } from './helpers';
import { createContributor } from '../../src/server/auth/contributors';
import { createSession } from '../../src/server/auth/sessions';
import { loadConfig } from '../../src/server/config';
vi.mock('node:fs/promises', async original => ({ ...await original<typeof import('node:fs/promises')>() }));
let ctx: TestContext;
afterEach(async () => { vi.restoreAllMocks(); if (ctx) await ctx.close(); });
it('exposes read-only status only to the owner without paths or secrets', async () => {
  ctx = await makeContext(); const cookie = await loginAsOwner(ctx);
  expect((await ctx.app.inject('/api/operations/status')).statusCode).toBe(401);
  const contributor = createContributor(ctx.db, 'status-reader', 'Reader', OWNER.password);
  const token = createSession(ctx.db, contributor).token;
  expect((await get(ctx, `bb_session=${token}`, '/api/operations/status')).statusCode).toBe(403);
  const result = await get(ctx, cookie, '/api/operations/status');
  expect(result.statusCode).toBe(200);
  expect(result.headers['cache-control']).toContain('no-store');
  expect(result.json().backup.state).toBe('missing');
  expect(result.body).not.toContain(ctx.config.dataDir);
  expect(result.body).not.toContain(ctx.config.shareKey!.toString('hex'));
});
it('uses nightly source timestamps, rejects future dates, and shows read failures as unavailable', async () => {
  ctx = await makeContext(); const cookie = await loginAsOwner(ctx);
  await fs.mkdir(ctx.config.backupsDir);
  const stamp = (date: Date) => `builtbasis-nightly-${date.toISOString().replace(/[:.]/g, '-')}.db`;
  await fs.writeFile(join(ctx.config.backupsDir, stamp(new Date(Date.now() - 40 * 3600000))), 'fixture');
  await fs.writeFile(join(ctx.config.backupsDir, 'builtbasis-nightly-ignore.db.tmp'), 'partial');
  expect((await get(ctx, cookie, '/api/operations/status')).json().backup.state).toBe('overdue');
  await fs.writeFile(join(ctx.config.backupsDir, stamp(new Date())), 'fixture');
  expect((await get(ctx, cookie, '/api/operations/status')).json().backup.state).toBe('ok');
  await fs.writeFile(join(ctx.config.backupsDir, stamp(new Date(Date.now() + 3600000))), 'fixture');
  expect((await get(ctx, cookie, '/api/operations/status')).json().backup.state).toBe('unavailable');
  vi.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('private path'));
  expect((await get(ctx, cookie, '/api/operations/status')).json().backup.state).toBe('unavailable');
  vi.spyOn(fs, 'statfs').mockRejectedValueOnce(new Error('private disk path'));
  expect((await get(ctx, cookie, '/api/operations/status')).json().storage.state).toBe('unavailable');
});
it('accepts only a positive finite backup warning age', () => {
  expect(loadConfig({ BUILTBASIS_DATA_DIR: '.', BACKUP_MAX_AGE_HOURS: '12.5' }).backupMaxAgeHours).toBe(12.5);
  for (const value of ['0', '-1', 'Infinity', 'no']) expect(() => loadConfig({ BUILTBASIS_DATA_DIR: '.', BACKUP_MAX_AGE_HOURS: value })).toThrow();
});
it('warns below the configured file allowance threshold', async () => {
  ctx = await makeContext(); const cookie = await loginAsOwner(ctx);
  const read = async () => (await get(ctx, cookie, '/api/operations/status')).json().storage;
  expect(await read()).toMatchObject({ state: 'warning', managedHeadroomBytes: '1000000000', warningBelowBytes: '5000000000' });
  ctx.config.filesWarningBelowBytes = 1000000000;
  expect((await read()).state).toBe('ok'); // At the threshold is not below it.
  ctx.config.filesWarningBelowBytes = 1000000001;
  expect((await read()).state).toBe('warning');
  ctx.config.filesWarningBelowBytes = 999999999;
  expect((await read()).state).toBe('ok');
});
it('defaults the file allowance warning to 5 GB and rejects invalid thresholds', () => {
  expect(loadConfig({ BUILTBASIS_DATA_DIR: '.' }).filesWarningBelowBytes).toBe(5000000000);
  expect(loadConfig({ BUILTBASIS_DATA_DIR: '.', FILES_WARNING_BELOW_BYTES: '2000000000' }).filesWarningBelowBytes).toBe(2000000000);
  for (const value of ['', '0', '-1', '1.5', 'Infinity', 'no', '9007199254740992']) {
    expect(() => loadConfig({ BUILTBASIS_DATA_DIR: '.', FILES_WARNING_BELOW_BYTES: value })).toThrow();
  }
});
``````

#### File: `tests/server/storage-capacity.test.ts`

<!-- replay task=1 phase=test encoding=text sha256=164d55bd7be2d432acd63768b1799f8b9fc7df1a44c8ba4c678ebfd96edbc1e5 -->

``````typescript
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { openStorageCapacity } from '../../src/server/files/capacity';
import { stageFile, publishFile, discardStaged } from '../../src/server/files/storage';
vi.mock('node:fs/promises', async original => ({...await original<typeof import('node:fs/promises')>()}));
let dir: string;
beforeEach(async()=>{dir=await fs.mkdtemp(join(tmpdir(),'bb-capacity-'));});
afterEach(async()=>{vi.restoreAllMocks();await fs.rm(dir,{recursive:true,force:true});});
const policy={budgetBytes:100,freeReserveBytes:1};
const pdf=Buffer.concat([Buffer.from('%PDF-1.7\n'),Buffer.alloc(31)]);
it('reports the live retained/orphan/reserved accounting and separate filesystem headroom', async () => {
 await fs.writeFile(join(dir,'orphan'),Buffer.alloc(30));
 const capacity=await openStorageCapacity(dir,{budgetBytes:200_000_000,freeReserveBytes:100});
 vi.spyOn(fs,'statfs').mockResolvedValue({bavail:300_000_000n,bsize:1n} as never);
 const slot=await capacity.reserve('100000000');
 expect(await capacity.snapshot()).toMatchObject({state:'warning',retainedBytes:'30',reservedBytes:'100000000',managedHeadroomBytes:'99999970',filesystemAvailableBytes:'300000000',filesystemHeadroomBytes:'199999900'});
 slot.release(); expect((await capacity.snapshot()).state).toBe('ok');
 vi.spyOn(fs,'statfs').mockResolvedValueOnce({bavail:99n,bsize:1n} as never);
 expect(await capacity.snapshot()).toMatchObject({state:'warning',filesystemHeadroomBytes:'-1'});
 const failing=await capacity.reserve('1'); failing.cleanupFailed(); failing.release();
 expect(await capacity.snapshot()).toMatchObject({state:'warning',healthy:false});
 vi.spyOn(fs,'statfs').mockRejectedValueOnce(new Error('private'));
 expect((await capacity.snapshot()).state).toBe('unavailable');
});
it('counts actual retained orphans and stale temporary bytes on every startup',async()=>{
 await fs.mkdir(join(dir,'.tmp')); await fs.writeFile(join(dir,'.tmp','stale'),Buffer.alloc(10));
 await fs.writeFile(join(dir,'orphan'),Buffer.alloc(30));
 const capacity=await openStorageCapacity(dir,policy);
 await expect(capacity.reserve('61')).rejects.toMatchObject({statusCode:507,code:'storage_capacity'});
 const slot=await capacity.reserve('60');slot.release();
});
it('reserves concurrent requests before awaiting filesystem probes and releases admission failures',async()=>{
 const capacity=await openStorageCapacity(dir,policy);
 const first=await capacity.reserve('60');
 await expect(capacity.reserve('41')).rejects.toMatchObject({statusCode:507});
 first.release();first.release();
 const next=await capacity.reserve('100');next.release();
 vi.spyOn(fs,'statfs').mockRejectedValueOnce(new Error('private disk path'));
 await expect(capacity.reserve('100')).rejects.toMatchObject({statusCode:507,code:'storage_capacity'});
 const afterFailure=await capacity.reserve('100');afterFailure.release();
});
it('protects the physical free-space reserve including pending uploads',async()=>{
 const capacity=await openStorageCapacity(dir,{budgetBytes:1000,freeReserveBytes:100});
 vi.spyOn(fs,'statfs').mockResolvedValue({bavail:200n,bsize:1n} as never);
 const first=await capacity.reserve('60');
 await expect(capacity.reserve('41')).rejects.toMatchObject({statusCode:507});
 first.release();const next=await capacity.reserve('100');next.release();
});
it('charges a newly published orphan once across concurrent identical uploads',async()=>{
 const capacity=await openStorageCapacity(dir,policy);
 const a=await capacity.reserve('50');const b=await capacity.reserve('50');
 const fa=await stageFile(dir,Readable.from([pdf]),'a.pdf','attachment');
 const fb=await stageFile(dir,Readable.from([pdf]),'b.pdf','attachment');
 await Promise.all([publishFile(dir,fa,a.retained),publishFile(dir,fb,b.retained)]);
 a.release();b.release();
 await expect(capacity.reserve('61')).rejects.toMatchObject({statusCode:507});
 const next=await capacity.reserve('60');next.release();
 const restarted=await openStorageCapacity(dir,policy);
 await expect(restarted.reserve('61')).rejects.toMatchObject({statusCode:507});
});
it('records the hardlink before a later publish cleanup failure and fails closed on unknown staging cleanup',async()=>{
 const capacity=await openStorageCapacity(dir,policy);const slot=await capacity.reserve('60');
 const file=await stageFile(dir,Readable.from([pdf]),'a.pdf','attachment');
 vi.spyOn(fs,'unlink').mockRejectedValueOnce(new Error('forced unlink failure'));
 await expect(publishFile(dir,file,slot.retained)).rejects.toThrow('forced unlink');
 await discardStaged(file);slot.release();
 await expect(capacity.reserve('61')).rejects.toMatchObject({statusCode:507});
 const second=await capacity.reserve('60');second.cleanupFailed();second.release();
 await expect(capacity.reserve('1')).rejects.toMatchObject({statusCode:507});
});
it('distinguishes malformed and oversized envelopes from storage admission',async()=>{
 const capacity=await openStorageCapacity(dir,{budgetBytes:200_000_000,freeReserveBytes:1});
 await expect(capacity.reserve('100000001')).rejects.toMatchObject({statusCode:413});
 await expect(capacity.reserve('-1')).rejects.toMatchObject({statusCode:400});
 const chunked=await capacity.reserve(undefined);expect(chunked.maxBodyBytes).toBe(100_000_000);chunked.release();
});
it('prevents two admissions from spending capacity while the first statfs probe is pending',async()=>{
 const capacity=await openStorageCapacity(dir,policy);
 let finish!:(value:never)=>void;
 vi.spyOn(fs,'statfs').mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve as typeof finish;}) as never);
 const firstPromise=capacity.reserve('60');
 await expect(capacity.reserve('41')).rejects.toMatchObject({statusCode:507});
 finish({bavail:1000n,bsize:1n} as never);
 const first=await firstPromise;first.release();
 const after=await capacity.reserve('100');after.release();
});
it('fails closed if staging cleanup becomes uncertain while another admission probes free space',async()=>{
 const capacity=await openStorageCapacity(dir,policy);const first=await capacity.reserve('40');
 let finish!:(value:never)=>void;
 vi.spyOn(fs,'statfs').mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve as typeof finish;}) as never);
 const second=capacity.reserve('40');first.cleanupFailed();first.release();
 finish({bavail:1000n,bsize:1n} as never);
 await expect(second).rejects.toMatchObject({statusCode:507});
});
``````

#### File: `tests/browser/operations-status.spec.ts`

<!-- replay task=1 phase=test encoding=text sha256=039cb00f179f43c996905a4287f5ce55699287acfeabc9029acdee6a5d3f574b -->

``````typescript
import { test, expect, login, seed } from './fixture';
import type { OperationsStatus } from '../../src/server/monitoring/status';

test('healthy status is hidden on working pages and always available in Administration', async ({ page }) => {
  await login(page);
  const status = await (await page.request.get('/api/operations/status')).json() as OperationsStatus;
  status.backup = { state: 'ok', sourceCreatedAt: new Date().toISOString(), ageHours: 0, maxAgeHours: 36 };
  status.storage = { ...status.storage, state: 'ok', managedHeadroomBytes: '6000000000', warningBelowBytes: '5000000000' };
  let requests = 0;
  await page.route('**/api/operations/status', route => { requests++; return route.fulfill({ json: status }); });
  const paths = ['/projects', `/projects/${seed().projectId}/records`, `/projects/${seed().projectId}/lists`, `/projects/${seed().projectId}/records/${seed().recordId}`];
  for (const path of paths) {
    const before = requests;
    await page.goto(path);
    await expect.poll(() => requests).toBeGreaterThan(before);
    await expect(page.getByTestId('operations-status')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Administration', exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Administration', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Administration', exact: true })).toBeVisible();
  const box = page.getByRole('region', { name: 'Server backup and storage' });
  await expect(box).toContainText('Server backup is recent');
  await expect(box).toContainText('6 GB');
  await expect(box).toContainText('Warning below: 5 GB');
  await box.getByText('Storage details', { exact: true }).click();
  await expect(box.getByText(/does not establish hosting account quota/)).toBeVisible();
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  await expect(page.getByRole('heading', { name: 'Διαχείριση', exact: true })).toBeVisible();
  await expect(box).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Αντίγραφα ασφαλείας και χώρος' })).toContainText('Προειδοποίηση κάτω από: 5 GB');
});

test('warnings are compact, link to Administration and disappear after recovery', async ({ page }) => {
  await login(page);
  await page.goto(`/projects/${seed().projectId}/records`);
  const box = page.getByRole('region', { name: 'Server backup and storage' });
  await expect(box).toContainText('No completed server backup');
  await expect(box).toContainText('File allowance is below the warning threshold');
  await expect(box.getByText('Storage details', { exact: true })).toHaveCount(0);
  await box.getByRole('link', { name: 'Open Administration' }).click();
  await expect(page.getByRole('heading', { name: 'Administration', exact: true })).toBeVisible();
  await expect(box.getByText('Storage details', { exact: true })).toBeVisible();

  const status = await (await page.request.get('/api/operations/status')).json() as OperationsStatus;
  status.storage.state = 'ok';
  status.backup.state = 'overdue';
  await page.route('**/api/operations/status', route => route.fulfill({ json: status }));
  await page.goto('/projects');
  await expect(box).toContainText('Server backup overdue');
  status.backup.state = 'unavailable';
  await page.evaluate(() => dispatchEvent(new Event('focus')));
  await expect(box).toContainText('Backup status unavailable');
  status.backup.state = 'ok';
  await page.evaluate(() => dispatchEvent(new Event('focus')));
  await expect(box).toHaveCount(0);
});

test('failed status checks warn instead of leaving a healthy or empty display', async ({ page }) => {
  await login(page);
  await page.route('**/api/operations/status', route => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/projects');
  const box = page.getByRole('region', { name: 'Server backup and storage' });
  await expect(box).toContainText('Status unavailable');
  await expect(box).not.toContainText('File allowance remaining');
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  await expect(page.getByRole('region', { name: 'Αντίγραφα ασφαλείας και χώρος' })).toContainText('Η κατάσταση δεν είναι διαθέσιμη');
});

test('Administration and status are absent from contributor, share and print views', async ({ page }) => {
  await login(page, 'reader');
  await page.goto('/administration');
  await expect(page.getByRole('heading', { name: 'Assigned records' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Administration', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('operations-status')).toHaveCount(0);
  expect((await page.request.get('/api/operations/status')).status()).toBe(403);
  await page.goto(seed().shareUrl);
  await expect(page.getByTestId('operations-status')).toHaveCount(0);
  await page.context().clearCookies();
  await login(page);
  await page.goto(`/projects/${seed().projectId}/records/${seed().recordId}/print`);
  await expect(page.getByTestId('operations-status')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Administration', exact: true })).toHaveCount(0);
});

``````

- [x] Run the focused test before implementation: `npx vitest run tests/server/print-api.test.ts tests/web/print-links.test.ts tests/server/monitoring.test.ts tests/server/storage-capacity.test.ts`. The API suite fails on the missing endpoint before implementation. Existing guard-only assertions may already pass. The new browser case fails on the absent print heading after building the baseline. Do not mistake a missing browser installation for the intended RED.

- [x] Write/extract the complete implementation files.

#### File: `src/server/printing/routes.ts`

<!-- replay task=1 phase=implementation encoding=text sha256=0d5d50433d444478315f57e74438108515c71c4c46df7383e222e4646fbaf40a -->

``````typescript
import type { FastifyInstance } from 'fastify';
import { compareOverTime, normalizeLabel, orderSets } from '../../domain';
import type { Db } from '../db/connection';
import { ItemParams } from '../http/params';
import { getRecordDetail } from '../records/records';
import { listMeasurementSets } from '../records/measurements';
import { listOptions } from '../records/options';
import { listVerifications } from '../records/transitions';
import { listPhotos } from '../files/occurrences';
import { listPeople } from '../lists/people';
import { listLocations } from '../lists/locations';
import { listTrades } from '../lists/trades';
import { listTags } from '../lists/tags';

/** §12 is an allowlist independent of the larger owner and shared record contracts. */
export function buildPrintRecord(db: Db, projectId: number, recordId: number) {
  const r = getRecordDetail(db, projectId, recordId);
  const sets = orderSets(listMeasurementSets(db, recordId));
  const measurements = [...new Map(sets.map(set => [set.phase, set])).values()];
  const groups = new Map(sets.flatMap(set => set.rows).map(row => [JSON.stringify([normalizeLabel(row.item), normalizeLabel(row.quantity), row.unit]), row]));
  const comparisons = [...groups.values()].map(row => ({ item: row.item, quantity: row.quantity, unit: row.unit, points: compareOverTime(sets, row.item, row.quantity, row.unit) }));
  const verifications = listVerifications(db, recordId).map(v => ({ id: v.id, checkedById: v.checkedById, date: v.date, method: v.method, outcome: v.outcome, note: v.note }));
  const personIds = new Set([r.ballInCourtId, r.responsibleId, r.issuedById, r.decidedById, ...measurements.map(s => s.measuredById), ...verifications.map(v => v.checkedById)]);
  const nodes = new Map(listLocations(db, projectId).map(n => [n.id, n]));
  const locations = r.locationIds.map(id => {
    const path: { nameEn: string; nameEl: string }[] = [];
    const seen = new Set<number>(); let node = nodes.get(id);
    while (node && !seen.has(node.id)) { seen.add(node.id); path.unshift({ nameEn: node.nameEn, nameEl: node.nameEl }); node = node.parentId === null ? undefined : nodes.get(node.parentId); }
    return path;
  });
  const names = (items: { id: number; nameEn: string; nameEl: string }[], ids: number[]) => items.filter(item => ids.includes(item.id)).map(item => ({ nameEn: item.nameEn, nameEl: item.nameEl }));
  const photos = listPhotos(db, recordId);
  return {
    record: {
      humanId: r.humanId, title: r.title, subtype: r.subtype, status: r.status, severity: r.severity, priority: r.priority,
      dueDate: r.dueDate, ballInCourtId: r.ballInCourtId, responsibleId: r.responsibleId, reference: r.reference,
      description: r.subtype === 'detail_clarification' ? null : r.description, question: r.subtype === 'detail_clarification' ? r.question : null,
      problemTypes: r.problemTypes, stage: r.stage, disposition: r.disposition, correction: r.correction, route: r.route, issuedById: r.issuedById,
      chosenOption: listOptions(db, recordId).filter(o => o.id === r.chosenOptionId).map(o => ({ label: o.label, description: o.description }))[0] ?? null,
      decidedById: r.decidedById, decidedOn: r.decidedOn, instructionText: r.instructionText, updatedAt: r.updatedAt,
    },
    people: listPeople(db, projectId).filter(p => personIds.has(p.id)).map(p => ({ id: p.id, name: p.name })),
    locations, trades: names(listTrades(db, projectId), r.tradeIds), tags: names(listTags(db, projectId), r.tagIds),
    measurements, comparisons, verifications,
    photos: (['before', 'after'] as const).flatMap(phase => photos.filter(p => p.phase === phase).slice(0, 4).map(p => ({ id: p.id, phase: p.phase, caption: p.caption }))),
    generatedAt: new Date().toISOString(),
  };
}
export type PrintRecord = ReturnType<typeof buildPrintRecord>;
export function registerPrintRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/print', { config: { privateResponse: true } }, async request => {
    const { projectId, id } = ItemParams.parse(request.params);
    return db.transaction(() => buildPrintRecord(db, projectId, id))();
  });
}
``````

#### File: `src/server/app.ts`

<!-- replay task=1 phase=implementation encoding=text sha256=22033bd734e2245dd7451aa4990655dbd497c214e25fd763c5fb7e3579ce0d9f -->

``````typescript
import { registerPrintRoutes } from './printing/routes';
import { resolve } from 'node:path';
import { registerWeb } from './web';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { ZodError } from 'zod';
import { DEFAULT_LOGIN_LIMITS, LoginLimiter } from './auth/login-limiter';
import type { AppConfig } from './config';
import type { Db } from './db/connection';
import { HttpError } from './errors';
import { registerGuards } from './http/guards';
import { registerProjectRoutes } from './lists/projects';
import { registerPeopleRoutes } from './lists/people';
import { registerTradeRoutes } from './lists/trades';
import { registerZoneTypeRoutes } from './lists/zone-types';
import { registerTagRoutes } from './lists/tags';
import { registerLocationRoutes } from './lists/locations';
import { registerRecordRoutes } from './records/routes';
import { registerFileRoutes } from './files/routes';
import { openStorageCapacity } from './files/capacity';
import { requireShareKey } from './sharing/crypto';
import { reconcileShareKey } from './sharing/links';
import { registerSharingRoutes } from './sharing/routes';
import { safeErrorDiagnostic, safeLogger } from './http/logging';
import { registerAccessRoutes } from './access/routes';
import { registerAuthRoutes } from './routes/auth';
import { registerHealthRoutes } from './routes/health';
import { registerOperationsStatus } from './monitoring/status';

export interface AppDeps {
  config: AppConfig;
  db: Db;
  /** Tests may pass their own limiter; the server uses the defaults. */
  limiter?: LoginLimiter;
  logger?: FastifyServerOptions['logger'];
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { config, db } = deps;
  requireShareKey(config.shareKey);
  const capacity = await openStorageCapacity(config.filesDir, {
    budgetBytes: config.filesStorageBudgetBytes ?? 0,
    freeReserveBytes: config.filesFreeReserveBytes ?? 0,
  });
  const revokedLinks = reconcileShareKey(db, config.shareKey);
  const app = Fastify({ logger: safeLogger(deps.logger), bodyLimit: 1024 * 1024 });
  if (revokedLinks > 0) app.log.info({ event: 'share_key_changed', revokedLinks });
  await app.register(cookie);
  await app.register(multipart);
  registerGuards(app, config, db);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      if (error.statusCode >= 500) {
        const cause: unknown = Object.getOwnPropertyDescriptor(error, 'cause')?.value;
        request.log.error({ event: 'internal_error', ...safeErrorDiagnostic(cause ?? error) });
      }
      return reply
        .status(error.statusCode)
        .send(error.details === undefined ? { error: error.code } : { error: error.code, details: error.details });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'invalid_input',
        details: error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message })),
      });
    }
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({ error: 'bad_request' });
    }
    request.log.error({ event: 'internal_error', ...safeErrorDiagnostic(error) });
    return reply.status(500).send({ error: 'internal_error' });
  });
  app.setNotFoundHandler(async (_request, reply) => reply.status(404).send({ error: 'not_found' }));

  registerHealthRoutes(app);
  registerOperationsStatus(app, config, capacity);
  registerAuthRoutes(app, { config, db, limiter: deps.limiter ?? new LoginLimiter(DEFAULT_LOGIN_LIMITS) });
  registerProjectRoutes(app, db);
  registerPeopleRoutes(app, db);
  registerTradeRoutes(app, db);
  registerZoneTypeRoutes(app, db);
  registerTagRoutes(app, db);
  registerLocationRoutes(app, db);
  registerRecordRoutes(app, db);
  registerPrintRoutes(app, db);
  registerFileRoutes(app, db, config, capacity);
  registerSharingRoutes(app, db, config);
  registerAccessRoutes(app, db, config, capacity);
  await registerWeb(app, resolve('dist/web'));
  return app;
}
``````

#### File: `src/server/web.ts`

<!-- replay task=1 phase=implementation encoding=text sha256=143765d441c3d4e6aa57b9cc2c6bbb83724edcffbaba2af0f568c69357390c22 -->

``````typescript
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import serveStatic from '@fastify/static';
export async function registerWeb(app: FastifyInstance, directory: string): Promise<void> {
  let html: string;
  try { html = await readFile(join(directory, 'index.html'), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  if ((await stat(join(directory, 'assets'))).isDirectory()) await app.register(serveStatic, { root: join(directory, 'assets'), prefix: '/assets/', index: false, redirect: false, dotfiles: 'deny', maxAge: '1y', immutable: true });
  for (const route of ['/', '/login', '/administration', '/projects', '/projects/:projectId/records', '/projects/:projectId/records/:id', '/projects/:projectId/records/:id/print', '/projects/:projectId/lists', '/assigned', '/assigned/:id', '/share']) {
    app.get(route, async (_request, reply) => reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer').header('X-Content-Type-Options', 'nosniff').header('X-Robots-Tag', 'noindex, nofollow')
      .header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
      .type('text/html; charset=utf-8').send(html));
  }
}
``````

#### File: `src/web/printing/PrintPage.tsx`

<!-- replay task=1 phase=implementation encoding=text sha256=f0f8fd5668892fa7aeba7eb3826946305882d7f1a656ef9fbbf6aba2eaf8cafc -->

``````typescript
import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { compareItems, isCode, labelOf, normalizeLabel, type ListKey, type ShareLinkOut } from '../../domain';
import type { PrintRecord } from '../../server/printing/routes';
import { api } from '../core/api';
import { ErrorNotice, Field } from '../core/forms';
import { useI18n } from '../core/i18n';
import { dateText } from '../record/helpers';
import { measurementNumber } from '../record/number-format';
import './print.css';

export function activePrintLinks(links: ShareLinkOut[], draft: boolean, now = Date.now()): ShareLinkOut[] {
  return draft ? [] : links.filter(link => link.url && !link.revokedAt && (!link.expiresAt || Date.parse(link.expiresAt) > now));
}

export function PrintPage({ projectId, recordId }: { projectId: number; recordId: number }) {
  const { t } = useI18n(); const base = `/api/projects/${projectId}/records/${recordId}`;
  const [data, setData] = useState<PrintRecord | null>(null); const [links, setLinks] = useState<ShareLinkOut[]>([]);
  const [includeQr, setIncludeQr] = useState(false); const [shareError, setShareError] = useState<unknown>(null); const [linksLoaded, setLinksLoaded] = useState(false);
  const [selected, setSelected] = useState(''); const [qr, setQr] = useState(''); const [label, setLabel] = useState('');
  const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState<string[]>([]);
  const [snapshotVersion, setSnapshotVersion] = useState(0); const [printPending, setPrintPending] = useState(false);
  const [now, setNow] = useState(Date.now()); const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); void document.fonts.ready.then(() => setFontsReady(true)); return () => clearInterval(timer); }, []);
  useEffect(() => { const abort = new AbortController(); void api<PrintRecord>(base + '/print', { signal: abort.signal }).then(setData).catch(reason => { if (!abort.signal.aborted) setError(reason); }); return () => abort.abort(); }, [base]);
  useEffect(() => {
    if (!includeQr || !data || data.record.status === 'draft') return;
    const abort = new AbortController(); setLinksLoaded(false); setShareError(null);
    void api<ShareLinkOut[]>(base + '/share-links', { signal: abort.signal }).then(shares => { setLinks(shares); setLinksLoaded(true); }).catch(reason => { if (!abort.signal.aborted) setShareError(reason); });
    return () => abort.abort();
  }, [base, includeQr, data?.record.status]);
  const active = activePrintLinks(links, data?.record.status === 'draft', now);
  const link = includeQr ? active.find(item => String(item.id) === selected) : undefined;
  useEffect(() => { let cancelled = false; setQr(''); setLoaded(old => old.filter(key => key !== 'qr')); if (link?.url) void QRCode.toDataURL(link.url, { errorCorrectionLevel: 'M', margin: 4, width: 256 }).then(url => { if (!cancelled) setQr(url); }).catch(reason => { if (!cancelled) setShareError(reason); }); return () => { cancelled = true; }; }, [link?.url]);
  const markLoaded = (key: string) => setLoaded(old => old.includes(key) ? old : [...old, key]);
  const ready = !!data && (!includeQr || (!!link && !!qr && linksLoaded && loaded.includes('qr') && !shareError)) && data.photos.every(photo => loaded.includes(String(photo.id))) && fontsReady && !busy && !error;
  useEffect(() => {
    if (!printPending) return;
    if (error || (includeQr && (shareError || !link))) { setPrintPending(false); return; }
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!cancelled) { setPrintPending(false); window.print(); }
    })();
    return () => { cancelled = true; };
  }, [printPending, ready, error, includeQr, shareError, link]);
  const print = async () => {
    setBusy(true); setError(null);
    try {
      const freshData = await api<PrintRecord>(base + '/print');
      setData(freshData); setLoaded([]); setSnapshotVersion(version => version + 1);
      if (includeQr) {
        if (freshData.record.status === 'draft') { setIncludeQr(false); setSelected(''); return; }
        let freshLinks: ShareLinkOut[];
        try { freshLinks = await api<ShareLinkOut[]>(base + '/share-links'); }
        catch (reason) { setShareError(reason); return; }
        setLinks(freshLinks);
        if (!activePrintLinks(freshLinks, false).some(item => String(item.id) === selected)) { setSelected(''); return; }
      }
      setPrintPending(true);
    } catch (reason) { setError(reason); } finally { setBusy(false); }
  };
  return <div className={`print-page${ready ? ' print-ready' : ''}`}>
    <div className="print-controls"><h1>{t('Print / Save PDF', 'Εκτύπωση / Αποθήκευση PDF')}</h1><p>{t('Print in A3 landscape. Select Save as PDF and turn off browser headers and footers. A QR link is optional.', 'Εκτυπώστε σε A3 οριζόντια. Επιλέξτε αποθήκευση ως PDF και απενεργοποιήστε κεφαλίδες και υποσέλιδα του προγράμματος περιήγησης. Ο σύνδεσμος QR είναι προαιρετικός.')}</p><ErrorNotice error={error} />
      <a href={`/projects/${projectId}/records/${recordId}`}>{t('Back to record', 'Επιστροφή στην καταγραφή')}</a>
      <label><input type="checkbox" checked={includeQr} disabled={!data || data.record.status === 'draft' || busy || printPending} onChange={event => { setIncludeQr(event.target.checked); setSelected(''); setShareError(null); }} />{t('Include QR link', 'Συμπερίληψη συνδέσμου QR')}</label>
      {data?.record.status === 'draft' && <p>{t('Drafts print without a QR link. Open the record before sharing it.', 'Οι πρόχειρες καταγραφές εκτυπώνονται χωρίς σύνδεσμο QR. Ανοίξτε την καταγραφή πριν την κοινοποίησή της.')}</p>}
      {includeQr && data?.record.status !== 'draft' && <><ErrorNotice error={shareError} />
        <Field label={t('QR share link', 'Σύνδεσμος κοινοποίησης QR')}><select aria-label={t('QR share link', 'Σύνδεσμος κοινοποίησης QR')} value={selected} disabled={busy || printPending || !linksLoaded} onChange={event => { setSelected(event.target.value); setError(null); }}><option value="">{t('Choose a link', 'Επιλέξτε σύνδεσμο')}</option>{active.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
        {data && linksLoaded && !shareError && !active.length && <form onSubmit={async event => { event.preventDefault(); setBusy(true); setShareError(null); try { await api(base + '/share-links', { method: 'POST', body: { label } }); setLinks(await api(base + '/share-links')); setLabel(''); } catch (reason) { setShareError(reason); } finally { setBusy(false); } }}><Field label={t('Link label', 'Τίτλος συνδέσμου')}><input required maxLength={200} value={label} onChange={event => setLabel(event.target.value)} /></Field><button disabled={busy} type="submit">{t('Create share link', 'Δημιουργία συνδέσμου κοινοποίησης')}</button></form>}
      </>}
      <button disabled={!ready || printPending} onClick={() => void print()}>{t('Print / Save PDF', 'Εκτύπωση / Αποθήκευση PDF')}</button>
      {data && !ready && <p role="status">{includeQr ? t('Select a valid QR link and wait for all images to load.', 'Επιλέξτε έγκυρο σύνδεσμο QR και περιμένετε τη φόρτωση όλων των εικόνων.') : t('Wait for the print view and all images to load.', 'Περιμένετε τη φόρτωση της προβολής εκτύπωσης και όλων των εικόνων.')}</p>}
    </div>
    <p className="print-blocker">{t('Print view is not ready. Return to the print screen and check its status.', 'Η προβολή εκτύπωσης δεν είναι έτοιμη. Επιστρέψτε στην οθόνη εκτύπωσης και ελέγξτε την κατάστασή της.')}</p>
    {data && <PrintSheet key={snapshotVersion} data={data} base={base} qr={includeQr ? qr : ''} shareUrl={link?.url ?? ''} onLoaded={markLoaded} onError={() => setError(new Error(t('An image could not load. Reload this page before printing.', 'Μια εικόνα δεν φορτώθηκε. Ανανεώστε τη σελίδα πριν εκτυπώσετε.')))} />}
  </div>;
}

function PrintSheet({ data, base, qr, shareUrl, onLoaded, onError }: { data: PrintRecord; base: string; qr: string; shareUrl: string; onLoaded(key: string): void; onError(): void }) {
  const { t, lang } = useI18n(); const r = data.record;
  const name = (item: { nameEn: string; nameEl: string }) => lang === 'el' ? item.nameEl || item.nameEn : item.nameEn || item.nameEl;
  const person = (id: number | null) => data.people.find(item => item.id === id)?.name ?? '—';
  const fixed = (list: ListKey, code: string | null) => code && isCode(list, code) ? labelOf(list, code, lang) : '—';
  const number = (value: number) => measurementNumber(value, lang);
  const field = (en: string, el: string, value: ReactNode) => <div><dt>{t(en, el)}</dt><dd>{value || '—'}</dd></div>;
  return <article className="print-sheet" lang={lang}>
    <h1>{r.humanId} · {r.title}</h1>
    <dl className="print-header">{field('Subtype', 'Υποκατηγορία', fixed('subtype', r.subtype))}{field('Status', 'Κατάσταση', fixed('status', r.status))}{field('Severity', 'Σοβαρότητα', fixed('severity', r.severity))}{field('Priority', 'Προτεραιότητα', fixed('priority', r.priority))}{field('Due date', 'Προθεσμία', dateText(r.dueDate, lang))}{field('Ball in court', 'Επόμενη ενέργεια από', person(r.ballInCourtId))}{field('Responsible', 'Υπεύθυνος', person(r.responsibleId))}</dl>
    <dl className="print-header">{field('Location', 'Θέση', data.locations.map(path => path.map(name).join(' / ')).join('\n'))}{field('Trades', 'Ειδικότητες', data.trades.map(name).join(', '))}{field('Tags', 'Ετικέτες', data.tags.map(name).join(', '))}{field('Reference', 'Αναφορά', r.reference)}</dl>
    <section><h2>{r.subtype === 'detail_clarification' ? t('Question', 'Ερώτημα') : t('Description', 'Περιγραφή')}</h2><p className="print-text">{r.subtype === 'detail_clarification' ? r.question : r.description}</p></section>
    {r.subtype !== 'task' && <><section><h2>{t('Classification', 'Ταξινόμηση')}</h2><dl>{r.subtype === 'quality_issue' ? <>{field('Type of problem', 'Είδος προβλήματος', r.problemTypes.map(code => fixed('problemType', code)).join(', '))}{field('Stage', 'Στάδιο', fixed('stage', r.stage))}{field('Disposition', 'Τρόπος αντιμετώπισης', fixed('disposition', r.disposition))}{field('Correction', 'Διόρθωση', r.correction)}</> : <>{field('Route', 'Διαδικασία', fixed('route', r.route))}{field('Issued by', 'Εκδόθηκε από', person(r.issuedById))}</>}</dl></section>
    <section><h2>{t('Decision and instruction', 'Απόφαση και εντολή')}</h2><dl>{field('Chosen option', 'Επιλεγμένη λύση', r.chosenOption && <>{r.chosenOption.label}{'\n'}{r.chosenOption.description}</>)}{field('Decided by', 'Αποφάσισε', person(r.decidedById))}{field('Decided on', 'Ημερομηνία απόφασης', dateText(r.decidedOn, lang))}{field('Instruction text', 'Κείμενο εντολής', r.instructionText)}</dl></section></>}
    {data.measurements.length > 0 && <section><h2>{t('Measurements', 'Μετρήσεις')}</h2>{data.measurements.map(set => <div key={set.id}><h3>{fixed('measurementPhase', set.phase)} · {dateText(set.date, lang)} · {person(set.measuredById)}</h3><p className="print-text">{set.note}</p><table><thead><tr>{[t('Item', 'Αντικείμενο'), t('Quantity', 'Μέγεθος'), t('Value', 'Τιμή'), t('Unit', 'Μονάδα'), t('Note', 'Σημείωση')].map(text => <th key={text}>{text}</th>)}</tr></thead><tbody>{set.rows.map((row, i) => <tr key={i}><td>{row.item}</td><td>{row.quantity}</td><td>{number(row.value)}</td><td>{fixed('unit', row.unit)}</td><td>{row.note}</td></tr>)}</tbody></table>
      {[...new Map(set.rows.map(row => [JSON.stringify([normalizeLabel(row.quantity), row.unit]), row])).values()].map(row => <div key={JSON.stringify([row.quantity, row.unit])}><h4>{t('Between items', 'Μεταξύ αντικειμένων')} · {row.quantity} ({fixed('unit', row.unit)})</h4><table><thead><tr><th>{t('Item', 'Αντικείμενο')}</th><th>{t('Value', 'Τιμή')}</th><th>{t('Difference from first item', 'Διαφορά από το πρώτο αντικείμενο')}</th></tr></thead><tbody>{compareItems(set, row.quantity, row.unit).map((item, i) => <tr key={i}><td>{item.item}</td><td>{number(item.value)}</td><td>{number(item.diffFromFirst)}</td></tr>)}</tbody></table></div>)}
    </div>)}{data.comparisons.map((comparison, i) => <div key={i}><h3>{t('Before vs after', 'Πριν και μετά')} · {comparison.item} · {comparison.quantity} ({fixed('unit', comparison.unit)})</h3><table><thead><tr><th>{t('Date', 'Ημερομηνία')}</th><th>{t('Phase', 'Φάση')}</th><th>{t('Value', 'Τιμή')}</th><th>{t('Change', 'Μεταβολή')}</th></tr></thead><tbody>{comparison.points.map(point => <tr key={point.setId}><td>{dateText(point.date, lang)}</td><td>{fixed('measurementPhase', point.phase)}</td><td>{number(point.value)}</td><td>{point.changeFromPrevious === null ? '—' : number(point.changeFromPrevious)}</td></tr>)}</tbody></table></div>)}</section>}
    {(['before', 'after'] as const).map(phase => data.photos.some(photo => photo.phase === phase) && <section key={phase}><h2>{fixed('photoPhase', phase)}</h2><div className="print-photos">{data.photos.filter(photo => photo.phase === phase).map(photo => <figure key={photo.id}><img src={`${base}/photos/${photo.id}/display`} alt={photo.caption ?? fixed('photoPhase', phase)} onLoad={() => onLoaded(String(photo.id))} onError={onError} /><figcaption>{photo.caption}</figcaption></figure>)}</div></section>)}
    {data.verifications.length > 0 && <section><h2>{t('Verification entries', 'Καταχωρίσεις επαλήθευσης')}</h2>{data.verifications.map(entry => <div key={entry.id}><h3>{dateText(entry.date, lang)} · {person(entry.checkedById)} · {fixed('verificationMethod', entry.method)} · {fixed('verificationOutcome', entry.outcome)}</h3><p className="print-text">{entry.note}</p></div>)}</section>}
    {qr && shareUrl && <div className="print-qr"><a href={shareUrl}><img src={qr} alt={t('Share QR code', 'Κωδικός QR κοινοποίησης')} onLoad={() => onLoaded('qr')} onError={onError} /></a></div>}
    <footer>{t('Generated', 'Δημιουργία')} <time dateTime={data.generatedAt}>{dateText(data.generatedAt, lang)}</time> · {t('Record updated', 'Ενημέρωση καταγραφής')} <time dateTime={r.updatedAt}>{dateText(r.updatedAt, lang)}</time></footer>
  </article>;
}
``````

#### File: `src/web/printing/print.css`

<!-- replay task=1 phase=implementation encoding=text sha256=0b3e2741cc95800646dd1aecf896c91a2dbaa5681850bf954c8801ea3ce7dd8e -->

``````css
.print-controls { margin-bottom: 1.5rem; }
.print-blocker { display: none; }
.print-sheet { background: white; color: #111; padding: 10mm; max-width: 400mm; margin: auto; font-size: 10pt; line-height: 1.3; }
.print-sheet h1 { font-size: 20pt; margin: 0 0 5mm; }
.print-sheet h2 { font-size: 13pt; margin: 4mm 0 2mm; border-bottom: 1px solid #aaa; }
.print-sheet h3, .print-sheet h4 { font-size: 10pt; margin: 3mm 0 1mm; }
.print-sheet p { margin: 1mm 0 3mm; }
.print-sheet dl { margin: 0; }
.print-sheet dl > div { margin: 0 0 2mm; }
.print-sheet dt { font-weight: bold; }
.print-sheet dd { margin: 0; white-space: pre-wrap; }
.print-header { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2mm 5mm; }
.print-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.print-sheet table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
.print-sheet td, .print-sheet th { padding: 1mm 2mm; border: 1px solid #bbb; white-space: pre-wrap; overflow-wrap: anywhere; }
.print-photos { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3mm; }
.print-photos figure { margin: 0; }
.print-photos img { display: block; width: 100%; height: 38mm; object-fit: contain; }
.print-qr img { width: 28mm; height: 28mm; }
.print-sheet footer { font-size: 8pt; margin-top: 3mm; }
@page { size: A3 landscape; margin: 10mm; }
@media print {
  body:has(.print-page) { margin: 0; background: white; }
  body:has(.print-page) .site-header, body:has(.print-page) .site-nav, .print-controls { display: none !important; }
  body:has(.print-page) main { max-width: none; padding: 0; margin: 0; }
  .print-sheet { max-width: none; padding: 0; margin: 0; box-shadow: none; }
  .print-page:not(.print-ready) .print-sheet { display: none; }
  .print-page:not(.print-ready) .print-blocker { display: block; }
  .print-sheet section, .print-sheet dl > div, .print-sheet p { break-inside: auto; overflow: visible; }
  .print-sheet h1, .print-sheet h2, .print-sheet h3, .print-sheet h4, .print-sheet dt { break-after: avoid; }
  .print-sheet thead { display: table-header-group; }
  .print-sheet tr, .print-sheet figure, .print-qr { break-inside: avoid; }
  .print-sheet p { orphans: 3; widows: 3; }
}
``````

#### File: `src/web/App.tsx`

<!-- replay task=1 phase=implementation encoding=text sha256=1342641e32dce9158d57041a9712951b46c7034992e3b2b1810870b4987c98f4 -->

``````typescript
import { useEffect, useState } from 'react';
import type { Project } from '../server/lists/projects';
import { api, ApiError } from './core/api';
import { useI18n } from './core/i18n';
import { BusyButton, ErrorNotice, Field } from './core/forms';
import { RecordList } from './home/RecordList';
import { RecordPage } from './record/RecordPage';
import { PrintPage } from './printing/PrintPage';
import { ManagedLists } from './lists/ManagedLists';
import { OperationsStatus } from './OperationsStatus';
interface User { displayName: string; isOwner: boolean }
function Login({ onLogin }: { onLogin(): void }) {
  const { t } = useI18n(); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  return <form className="panel login" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(null); try { await api('/api/auth/login', { method: 'POST', body: { username, password } }); setPassword(''); onLogin(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}><h1>{t('Sign in', 'Σύνδεση')}</h1><Field label={t('Username', 'Όνομα χρήστη')}><input autoComplete="username" value={username} required maxLength={100} onChange={event => setUsername(event.target.value)}/></Field><Field label={t('Password', 'Συνθηματικό')}><input autoComplete="current-password" type="password" value={password} required maxLength={200} onChange={event => setPassword(event.target.value)}/></Field><ErrorNotice error={error}/><BusyButton className="primary" busy={busy}>{t('Sign in', 'Σύνδεση')}</BusyButton></form>;
}
function Assigned() {
  const { t } = useI18n(); const [rows, setRows] = useState<{ id: number; humanId: string; title: string | null }[]>([]); const [error, setError] = useState<unknown>(null);
  useEffect(() => { const abort = new AbortController(); api<typeof rows>('/api/assigned-records', { signal: abort.signal }).then(setRows).catch(failure => { if (!abort.signal.aborted) setError(failure); }); return () => abort.abort(); }, []);
  return <><h1>{t('Assigned records', 'Καταγραφές με πρόσβαση')}</h1><ErrorNotice error={error}/><div className="record-list">{rows.map(row => <a className="panel" key={row.id} href={`/assigned/${row.id}`}><strong>{row.humanId}</strong> · {row.title || t('Untitled', 'Χωρίς τίτλο')}</a>)}</div>{!error && !rows.length && <p>{t('No records have been assigned to you.', 'Δεν σας έχει δοθεί πρόσβαση σε καταγραφές.')}</p>}</>;
}
export function App() {
  const { lang, setLang, t } = useI18n(); const shared = location.pathname === '/share'; const [user, setUser] = useState<User | null>(null); const [ready, setReady] = useState(shared); const [error, setError] = useState<unknown>(null); const [projects, setProjects] = useState<Project[]>([]);
  const [token, setToken] = useState(() => shared ? location.hash.slice(1) : '');
  useEffect(() => { if (!shared) return; const changed = () => setToken(location.hash.slice(1)); addEventListener('hashchange', changed); return () => removeEventListener('hashchange', changed); }, [shared]);
  const load = async () => { setError(null); try { const current = await api<User>('/api/auth/me'); setUser(current); if (current.isOwner) setProjects(await api<Project[]>('/api/projects')); } catch (failure) { setUser(null); if (!(failure instanceof ApiError && failure.status === 401)) setError(failure); } finally { setReady(true); } };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { if (!shared) void load(); }, [shared]);
  const match = /^\/projects\/(\d+)\/(records|lists)(?:\/(\d+))?$/.exec(location.pathname); const projectId = match ? Number(match[1]) : undefined; const recordId = match?.[3] ? Number(match[3]) : undefined;
  const printMatch = /^\/projects\/(\d+)\/records\/(\d+)\/print$/.exec(location.pathname);
  const administration = location.pathname === '/administration';
  const assignedId = /^\/assigned\/(\d+)$/.exec(location.pathname)?.[1];
  const project = projects.find(item => item.id === projectId);
  const from = new URLSearchParams(location.search).get('from') ?? ''; const safeFrom = from.startsWith('?') ? from : '';
  return <><header className="site-header"><a className="brand" href={shared ? undefined : user?.isOwner ? '/projects' : '/assigned'}>BuiltBasis</a>{project && <span>{project.name}</span>}<div className="header-actions"><label>{t('Language', 'Γλώσσα')} <select aria-label={t('Language', 'Γλώσσα')} value={lang} onChange={event => setLang(event.target.value as 'en' | 'el')}><option value="en">English</option><option value="el">Ελληνικά</option></select></label>{user && <><span>{user.displayName}</span><button onClick={async () => { try { await api('/api/auth/logout', { method: 'POST', body: {} }); location.assign('/login'); } catch (failure) { setError(failure); } }}>{t('Sign out', 'Αποσύνδεση')}</button></>}</div></header>
  {user?.isOwner && !shared && !printMatch && <nav className="site-nav">{projectId && <><a href={`/projects/${projectId}/records`}>{t('Records', 'Καταγραφές')}</a><a href={`/projects/${projectId}/lists`}>{t('Managed lists', 'Διαχείριση λιστών')}</a></>}<a href="/projects">{t('Projects', 'Έργα')}</a><a href="/administration" aria-current={administration ? 'page' : undefined}>{t('Administration', 'Διαχείριση')}</a></nav>}
  {user?.isOwner && !shared && !printMatch && !administration && <OperationsStatus/>}
  <main><ErrorNotice error={error}/>{shared ? (/^[A-Za-z0-9_-]{43}$/.test(token) ? <RecordPage context={{ mode: 'shared', base: '/api/shared', token }} onBack={() => {}}/> : <h1>{t('Record not available', 'Η καταγραφή δεν είναι διαθέσιμη')}</h1>) : !ready ? <p role="status">{t('Loading…', 'Φόρτωση…')}</p> : !user ? <Login onLogin={() => { location.assign(location.pathname === '/login' || location.pathname === '/' ? '/projects' : location.pathname + location.search); }}/> : !user.isOwner ? (assignedId ? <RecordPage context={{ mode: 'contributor', base: `/api/assigned-records/${assignedId}`, recordId: Number(assignedId) }} onBack={() => location.assign('/assigned')}/> : <Assigned/>) : administration ? <><h1>{t('Administration', 'Διαχείριση')}</h1><OperationsStatus detailed/></> : printMatch ? <PrintPage projectId={Number(printMatch[1])} recordId={Number(printMatch[2])}/> : projectId && project ? (match?.[2] === 'lists' ? <ManagedLists projectId={projectId}/> : recordId ? <RecordPage context={{ mode: 'owner', base: `/api/projects/${projectId}/records/${recordId}`, projectId, recordId }} onBack={() => location.assign(`/projects/${projectId}/records${safeFrom}`)}/> : <RecordList projectId={projectId}/>) : <><h1>{t('Projects', 'Έργα')}</h1>{projects.length ? <div className="record-list">{projects.map(item => <a className="panel" key={item.id} href={`/projects/${item.id}/records`}>{item.name}</a>)}</div> : <p>{t('No project has been set up yet. Ask the owner to load the project data.', 'Δεν έχει καταχωριστεί έργο. Ζητήστε από τον ιδιοκτήτη να φορτώσει τα δεδομένα.')}</p>}</>}</main></>;
}
``````

#### File: `src/web/record/Sharing.tsx`

<!-- replay task=1 phase=implementation encoding=text sha256=457f73f3476c332dab896fac5efc57306e16f04e3ef2a46b98c2454ed0c006c1 -->

``````typescript
import { useEffect, useState } from 'react';
import type { ShareLinkOut } from '../../domain';
import { api } from '../core/api';
import { BusyButton, ErrorNotice, Field } from '../core/forms';
import { useI18n } from '../core/i18n';
import { dateText } from './helpers';

type Grant = { userId: number; canUpload: boolean; canAddLog: boolean };
type Contributor = { id: number; displayName: string; active: boolean };
export function Sharing({ base, draft, onAccessLost, onDirty }: { base: string; draft: boolean; onAccessLost: (error: unknown) => void; onDirty: (dirty: boolean) => void }) {
  const { t, lang } = useI18n(); const [links, setLinks] = useState<ShareLinkOut[]>([]); const [grants, setGrants] = useState<Grant[]>([]); const [people, setPeople] = useState<Contributor[]>([]); const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [label, setLabel] = useState(''); const [expiry, setExpiry] = useState(''); const [selected, setSelected] = useState(''); const [upload, setUpload] = useState(false); const [log, setLog] = useState(false); const [copied, setCopied] = useState<number | null>(null);
  useEffect(() => { const controller = new AbortController(); void Promise.all([api<ShareLinkOut[]>(base + '/share-links', { signal: controller.signal }), api<Grant[]>(base + '/grants', { signal: controller.signal }), api<Contributor[]>('/api/contributors', { signal: controller.signal })]).then(([l, g, p]) => { setLinks(l); setGrants(g); setPeople(p); }).catch(reason => { if (!controller.signal.aborted) { setError(reason); onAccessLost(reason); } }); return () => controller.abort(); }, [base]);
  useEffect(() => { onDirty(Boolean(label || expiry || selected || upload || log || busy)); }, [label, expiry, selected, upload, log, busy, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(null); try { await action(); } catch (reason) { setError(reason); onAccessLost(reason); } finally { setBusy(false); } };
  return <section><h2>{t('Sharing and access', 'Κοινοποίηση και πρόσβαση')}</h2><ErrorNotice error={error} />{draft && <p>{t('Draft records are unavailable through links and contributor grants.', 'Οι πρόχειρες εγγραφές δεν είναι διαθέσιμες μέσω συνδέσμων και δικαιωμάτων συνεργατών.')}</p>}
    <p><a href={base.replace('/api', '') + '/print'}>{t('A3 print / PDF', 'Εκτύπωση A3 / PDF')}</a></p>
    <h3>{t('Read-only links', 'Σύνδεσμοι μόνο για ανάγνωση')}</h3><p>{t('Anyone holding a link can read the public record until it expires or is revoked.', 'Όποιος έχει τον σύνδεσμο μπορεί να διαβάσει τη δημόσια εγγραφή μέχρι τη λήξη ή την ανάκλησή του.')}</p>
    {links.map(link => { const expired = !!link.expiresAt && Date.parse(link.expiresAt) <= Date.now(); return <article key={link.id}><h4>{link.label}</h4><dl><div><dt>{t('Created', 'Δημιουργία')}</dt><dd>{dateText(link.createdAt, lang)}</dd></div><div><dt>{t('Expires', 'Λήξη')}</dt><dd>{dateText(link.expiresAt, lang)}</dd></div><div><dt>{t('Last viewed', 'Τελευταία προβολή')}</dt><dd>{dateText(link.lastViewedAt, lang)}</dd></div><div><dt>{t('Views', 'Προβολές')}</dt><dd>{link.viewCount}</dd></div></dl><p>{link.revokedAt ? t('Revoked', 'Ανακλήθηκε') : expired ? t('Expired', 'Έληξε') : draft ? t('Draft — unavailable', 'Πρόχειρο — μη διαθέσιμο') : t('Active', 'Ενεργός')}</p>{link.url && <><Field label={t('Share URL', 'Διεύθυνση κοινοποίησης')}><input readOnly value={link.url} onFocus={e => e.target.select()} /></Field><button disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(link.url!); setCopied(link.id); })}>{t('Copy link', 'Αντιγραφή συνδέσμου')}</button>{copied === link.id && <span role="status">{t('Copied', 'Αντιγράφηκε')}</span>}</>}{!link.revokedAt && <button disabled={busy} onClick={() => { if (window.confirm(t('Revoke this link? People using it will lose access.', 'Ανάκληση αυτού του συνδέσμου; Οι χρήστες του θα χάσουν την πρόσβαση.'))) void run(async () => { await api(base + `/share-links/${link.id}/revoke`, { method: 'POST', body: {} }); setLinks(await api(base + '/share-links')); }); }}>{t('Revoke link', 'Ανάκληση συνδέσμου')}</button>}</article>; })}
    <details><summary>{t('Create a share link', 'Δημιουργία συνδέσμου κοινοποίησης')}</summary><form onChange={() => onDirty(true)} onSubmit={e => { e.preventDefault(); void run(async () => { const link = await api<ShareLinkOut>(base + '/share-links', { method: 'POST', body: { label, expiresAt: expiry ? new Date(expiry).toISOString() : null } }); setLinks(old => [link, ...old]); setLabel(''); setExpiry(''); onDirty(false); }); }}><fieldset disabled={busy}><Field label={t('Link label', 'Τίτλος συνδέσμου')}><input required maxLength={200} value={label} onChange={e => setLabel(e.target.value)} /></Field><Field label={t('Expiry (optional)', 'Λήξη (προαιρετική)')}><input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} /></Field><BusyButton busy={busy} type="submit">{t('Create link', 'Δημιουργία συνδέσμου')}</BusyButton></fieldset></form></details>
    <h3>{t('Named users', 'Ονομαστικοί χρήστες')}</h3><p>{t('Reading, uploading evidence and adding Log entries are separate permissions. Both switches off gives read-only access.', 'Η ανάγνωση, η μεταφόρτωση τεκμηρίων και η προσθήκη καταχωρίσεων είναι ανεξάρτητα δικαιώματα. Με τους δύο διακόπτες κλειστούς επιτρέπεται μόνο η ανάγνωση.')}</p>
    {grants.map(grant => <article key={grant.userId}><h4>{people.find(person => person.id === grant.userId)?.displayName ?? t('Unavailable user', 'Μη διαθέσιμος χρήστης')}</h4><p>{t('Upload evidence', 'Μεταφόρτωση τεκμηρίων')}: {grant.canUpload ? t('Yes', 'Ναι') : t('No', 'Όχι')} · {t('Add Log', 'Προσθήκη στο ημερολόγιο')}: {grant.canAddLog ? t('Yes', 'Ναι') : t('No', 'Όχι')}</p><button disabled={busy} onClick={() => { setSelected(String(grant.userId)); setUpload(grant.canUpload); setLog(grant.canAddLog); }}>{t('Edit access', 'Επεξεργασία πρόσβασης')}</button><button disabled={busy} onClick={() => { if (window.confirm(t('Remove this user’s access to the record?', 'Αφαίρεση πρόσβασης αυτού του χρήστη στην εγγραφή;'))) void run(async () => { await api(base + `/grants/${grant.userId}`, { method: 'DELETE' }); setGrants(old => old.filter(item => item.userId !== grant.userId)); }); }}>{t('Remove access', 'Αφαίρεση πρόσβασης')}</button></article>)}
    <form onChange={() => onDirty(true)} onSubmit={e => { e.preventDefault(); void run(async () => { const grant = await api<Grant>(base + `/grants/${selected}`, { method: 'PUT', body: { canUpload: upload, canAddLog: log } }); setGrants(old => [...old.filter(item => item.userId !== grant.userId), grant]); setSelected(''); setUpload(false); setLog(false); onDirty(false); }); }}><fieldset disabled={busy}><legend>{t('Grant or update record access', 'Παραχώρηση ή ενημέρωση πρόσβασης εγγραφής')}</legend><Field label={t('User', 'Χρήστης')}><select required value={selected} onChange={e => { setSelected(e.target.value); const grant = grants.find(item => item.userId === Number(e.target.value)); setUpload(grant?.canUpload ?? false); setLog(grant?.canAddLog ?? false); }}><option value="">{t('Choose', 'Επιλέξτε')}</option>{people.filter(person => person.active).map(person => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></Field><label><input type="checkbox" checked={upload} onChange={e => setUpload(e.target.checked)} />{t('Upload photos and attachments', 'Μεταφόρτωση φωτογραφιών και συνημμένων')}</label><label><input type="checkbox" checked={log} onChange={e => setLog(e.target.checked)} />{t('Add Log entries', 'Προσθήκη καταχωρίσεων στο ημερολόγιο')}</label><BusyButton type="submit" busy={busy}>{t('Save access', 'Αποθήκευση πρόσβασης')}</BusyButton></fieldset></form>
  </section>;
}
``````

#### File: `src/web/record/Overview.tsx`

<!-- replay task=1 phase=implementation encoding=text sha256=d3a92a164659885cb61d4a73639fda6608d729550c8868ec352d8aeab5f4f746 -->

``````typescript
import type { ReactNode } from 'react';
import { definitionOf, isCode, labelOf, type ListKey } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import { useI18n } from '../core/i18n';
import type { RecordData } from './data';
import { dateText } from './helpers';

export function RecordSummary({ data }: { data: RecordData }) {
  const { t, lang } = useI18n(); const r = data.record;
  const lastBallChange = data.activity.find(entry => entry.field === 'ballInCourtId');
  const fixed = (list: ListKey, code: string | null) => code && isCode(list, code) ? <details className="value-definition"><summary>{labelOf(list, code, lang)}</summary>{definitionOf(list, code, lang)}</details> : '—';
  return <dl className="summary-grid">
    <div><dt>{t('Subtype', 'Υποκατηγορία')}</dt><dd>{fixed('subtype', r.subtype)}</dd></div><div><dt>{t('Status', 'Κατάσταση')}</dt><dd>{fixed('status', r.status)}</dd></div>
    <div><dt>{t('Ball in court', 'Επόμενη ενέργεια από')}</dt><dd>{data.labels.people.find(person => person.id === r.ballInCourtId)?.name ?? '—'}{r.ballInCourtId !== null && lastBallChange && <small>{t('Since', 'Από')} {dateText(lastBallChange.at, lang)}</small>}</dd></div>
    <div><dt>{t('Responsible', 'Υπεύθυνος')}</dt><dd>{data.labels.people.find(person => person.id === r.responsibleId)?.name ?? '—'}</dd></div>
    <div><dt>{t('Due date', 'Προθεσμία')}</dt><dd>{dateText(r.dueDate, lang)}</dd></div><div><dt>{t('Priority', 'Προτεραιότητα')}</dt><dd>{fixed('priority', r.priority)}</dd></div><div><dt>{t('Severity', 'Σοβαρότητα')}</dt><dd>{fixed('severity', r.severity)}</dd></div>
    <div><dt>{t('Completion', 'Ολοκλήρωση')}</dt><dd>{r.completion === null ? '—' : <><progress max={100} value={r.completion} /> {r.completion}%</>}</dd></div><div><dt>{t('Safety implications', 'Θέμα ασφαλείας')}</dt><dd>{r.safety ? t('Yes', 'Ναι') : t('No', 'Όχι')}</dd></div>
  </dl>;
}

export function Overview({ data }: { data: RecordData }) {
  const { t, lang } = useI18n(); const r = data.record;
  const name = (item: { nameEn: string; nameEl: string }) => lang === 'el' ? item.nameEl || item.nameEn : item.nameEn || item.nameEl;
  const person = (id: number | null) => data.labels.people.find(item => item.id === id)?.name ?? '—';
  const value = (en: string, el: string, content: ReactNode) => <div><dt>{t(en, el)}</dt><dd className="user-text">{content || '—'}</dd></div>;
  const vocab = (en: string, el: string, list: ListKey, code: string | null) => value(en, el, code && isCode(list, code) ? <details className="value-definition"><summary>{labelOf(list, code, lang)}</summary>{definitionOf(list, code, lang)}</details> : '—');
  const selected = (ids: number[], list: { id: number; nameEn: string; nameEl: string }[]) => ids.map(id => list.find(item => item.id === id)).filter(item => item !== undefined).map(name).join(', ');
  return <>
    {r.statusReason && <section><h3>{t('Status reason', 'Αιτιολογία κατάστασης')}</h3>{r.statusReason.code && isCode(r.status === 'on_hold' ? 'onHoldReason' : 'cancellationReason', r.statusReason.code) && <p>{labelOf(r.status === 'on_hold' ? 'onHoldReason' : 'cancellationReason', r.statusReason.code, lang)}</p>}<p className="user-text">{r.statusReason.note}</p></section>}
    <section><h2>{t('Description and location', 'Περιγραφή και θέση')}</h2><p className="user-text">{r.description || '—'}</p><dl>{value('Location', 'Θέση', r.locationIds.map(id => data.labels.locations.find(item => item.id === id)?.path.map(name).join(' / ')).filter(Boolean).join('\n'))}{value('Trades', 'Ειδικότητες', selected(r.tradeIds, data.labels.trades))}{value('Tags', 'Ετικέτες', selected(r.tagIds, data.labels.tags))}{value('Reference', 'Αναφορά', r.reference)}</dl></section>
    <section><h2>{t('Classification', 'Ταξινόμηση')}</h2><dl>{r.subtype === 'quality_issue' && <>{value('Type of problem', 'Είδος προβλήματος', r.problemTypes.map(code => <details key={code}><summary>{labelOf('problemType', code, lang)}</summary>{definitionOf('problemType', code, lang)}</details>))}{vocab('Stage', 'Στάδιο', 'stage', r.stage)}{vocab('Disposition', 'Τρόπος αντιμετώπισης', 'disposition', r.disposition)}{value('Correction', 'Διόρθωση', r.correction)}</>}{r.subtype === 'detail_clarification' && <>{value('Question', 'Ερώτημα', r.question)}{vocab('Route', 'Διαδικασία', 'route', r.route)}{value('Issued by', 'Εκδόθηκε από', person(r.issuedById))}</>}{r.subtype === 'task' && value('Subtype', 'Υποκατηγορία', labelOf('subtype', r.subtype, lang))}</dl></section>
    {r.subtype !== 'task' && <section><h2>{t('Decision and instruction', 'Απόφαση και εντολή')}</h2><dl>{value('Chosen option', 'Επιλεγμένη λύση', data.options.find(option => option.id === r.chosenOptionId)?.label)}{value('Decided by', 'Αποφάσισε', person(r.decidedById))}{value('Decided on', 'Ημερομηνία απόφασης', dateText(r.decidedOn, lang))}{value('Instruction text', 'Κείμενο εντολής', r.instructionText)}</dl></section>}
    <details><summary>{t('Sequence and dates', 'Σειρά εργασιών και ημερομηνίες')}</summary><dl>{value('Must be done before', 'Να γίνει πριν', r.mustBeDoneBefore.map(item => `${item.humanId} ${item.title ?? ''}`).join('\n'))}{value('Requires first', 'Απαιτείται πρώτα', r.requiresFirst.map(item => `${item.humanId} ${item.title ?? ''}`).join('\n'))}{value('Created', 'Δημιουργία', dateText(r.createdAt, lang))}{value('Updated', 'Ενημέρωση', dateText(r.updatedAt, lang))}</dl></details>
    <section><h2>{t('Public Notes', 'Δημόσιες σημειώσεις')}</h2><p className="user-text">{r.publicNotes || '—'}</p></section>
    {data.owner && <details><summary>{t('Private · owner only', 'Ιδιωτικά · μόνο για τον ιδιοκτήτη')}</summary><dl>{value('Private Notes', 'Ιδιωτικές σημειώσεις', (r as RecordDetail).notes)}{value('Outside contract scope', 'Εκτός σύμβασης', (r as RecordDetail).outsideScope ? t('Yes', 'Ναι') : t('No', 'Όχι'))}{(r as RecordDetail).outsideScope && value('Estimated cost', 'Εκτιμώμενο κόστος', (r as RecordDetail).estimatedCost === null ? '—' : new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format((r as RecordDetail).estimatedCost!))}</dl></details>}
    <details><summary>{t('Verification history', 'Ιστορικό επαλήθευσης')} ({data.verifications.length})</summary>{data.verifications.map(entry => <article key={entry.id}><h3>{dateText(entry.date, lang)} · {labelOf('verificationOutcome', entry.outcome, lang)}</h3><p>{person(entry.checkedById)} · {labelOf('verificationMethod', entry.method, lang)}</p><p className="user-text">{entry.note}</p><details><summary>{t('Definitions', 'Ορισμοί')}</summary><p>{definitionOf('verificationMethod', entry.method, lang)}</p><p>{definitionOf('verificationOutcome', entry.outcome, lang)}</p></details></article>)}</details>
  </>;
}
``````

#### File: `src/web/record/RecordEditor.tsx`

<!-- replay task=1 phase=implementation encoding=text sha256=ef14d1e43a2d3bdd4488a8565bfc73225a3a043a39911dde9d7f4d5861016440 -->

``````typescript
import { useState } from 'react';
import { entriesOf, definitionOf, labelOf, type ListKey, type RecordPatchInput } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import { Field, MultiPick, PersonSelect, VocabSelect, BusyButton } from '../core/forms';
import { LocationPicker } from '../core/LocationPicker';
import { useI18n } from '../core/i18n';
import type { RecordData } from './data';
import { changedPatch } from './helpers';
import { TagPicker } from './TagPicker';

export function RecordEditor({ data, busy, onSave, onCancel, onDirty }: { data: RecordData; busy: boolean; onSave: (patch: RecordPatchInput) => Promise<void>; onCancel: () => void; onDirty: () => void }) {
  const { t, lang } = useI18n(); const record = data.record as RecordDetail;
  const [draft, setDraft] = useState<RecordPatchInput>(() => ({ title: record.title, description: record.description, reference: record.reference, publicNotes: record.publicNotes, notes: record.notes, ballInCourtId: record.ballInCourtId, responsibleId: record.responsibleId, tradeIds: record.tradeIds, severity: record.severity, priority: record.priority, dueDate: record.dueDate, completion: record.completion, safety: record.safety, tagIds: record.tagIds, locationIds: record.locationIds, mustBeDoneBeforeIds: record.mustBeDoneBefore.map(item => item.id), outsideScope: record.outsideScope, estimatedCost: record.estimatedCost, ...(record.subtype === 'quality_issue' ? { problemTypes: record.problemTypes, stage: record.stage, disposition: record.disposition, correction: record.correction } : {}), ...(record.subtype === 'detail_clarification' ? { question: record.question, route: record.route, issuedById: record.issuedById } : {}), ...(record.subtype !== 'task' ? { chosenOptionId: record.chosenOptionId, decidedById: record.decidedById, decidedOn: record.decidedOn, instructionText: record.instructionText } : {}) }));
  const [initial] = useState(draft);
  const set = <K extends keyof RecordPatchInput,>(field: K, value: RecordPatchInput[K]) => { setDraft(old => ({ ...old, [field]: value })); onDirty(); };
  const text = (field: keyof RecordPatchInput, en: string, el: string, multiline = false, maxLength = 20_000) => <Field label={t(en, el)} key={field}>{multiline ? <textarea maxLength={maxLength} value={String(draft[field] ?? '')} onChange={e => set(field, e.target.value)} /> : <input maxLength={maxLength} value={String(draft[field] ?? '')} onChange={e => set(field, e.target.value)} />}</Field>;
  const vocab = (field: keyof RecordPatchInput, list: ListKey, en: string, el: string) => <VocabSelect key={field} list={list} label={t(en, el)} value={draft[field] as string | null} onChange={value => set(field, value as never)} />;
  const person = (field: 'ballInCourtId' | 'responsibleId' | 'decidedById' | 'issuedById', en: string, el: string) => <PersonSelect key={field} label={t(en, el)} people={data.owner!.people} value={draft[field] ?? null} onChange={value => set(field, value)} />;
  const date = (field: 'dueDate' | 'decidedOn', en: string, el: string) => <Field label={t(en, el)}><input type="date" value={draft[field] ?? ''} onChange={e => set(field, e.target.value || null)} /></Field>;
  const name = (item: { nameEn: string; nameEl: string }) => lang === 'el' ? item.nameEl || item.nameEn : item.nameEn || item.nameEl;
  return <form onSubmit={e => { e.preventDefault(); void onSave(changedPatch(initial, draft)); }}>
    <fieldset disabled={busy}><legend>{t('Edit record', 'Επεξεργασία εγγραφής')}</legend>
      {text('title', 'Title', 'Τίτλος', false, 200)}{text('description', 'Description', 'Περιγραφή', true)}{text('reference', 'Reference', 'Αναφορά', false, 2000)}
      <div className="form-grid">{person('ballInCourtId', 'Ball in court', 'Επόμενη ενέργεια από')}{person('responsibleId', 'Responsible', 'Υπεύθυνος')}{vocab('severity', 'severity', 'Severity', 'Σοβαρότητα')}{vocab('priority', 'priority', 'Priority', 'Προτεραιότητα')}{date('dueDate', 'Due date', 'Προθεσμία')}
      <Field label={t('Completion (%)', 'Ολοκλήρωση (%)')}><input type="number" min="0" max="100" step="10" value={draft.completion ?? ''} onChange={e => set('completion', e.target.value === '' ? null : Number(e.target.value))} /></Field></div>
      <label><input type="checkbox" checked={draft.safety} onChange={e => set('safety', e.target.checked)} />{t('Safety implications', 'Θέμα ασφαλείας')}</label>
      <MultiPick label={t('Trades', 'Ειδικότητες')} items={data.owner!.trades.map(item => ({ ...item, label: name(item) }))} value={draft.tradeIds ?? []} onChange={ids => set('tradeIds', ids)} />
      <TagPicker projectId={record.projectId} initial={data.owner!.tags} value={draft.tagIds ?? []} onChange={ids => set('tagIds', ids)} onDirty={onDirty} />
      <LocationPicker label={t('Locations', 'Θέσεις')} nodes={data.owner!.locations} value={draft.locationIds ?? []} onChange={ids => set('locationIds', ids)} />
      <MultiPick label={t('Must be done before', 'Να γίνει πριν')} items={data.owner!.records.filter(item => item.id !== record.id).map(item => ({ id: item.id, label: `${item.humanId} ${item.title ?? ''}` }))} value={draft.mustBeDoneBeforeIds ?? []} onChange={ids => set('mustBeDoneBeforeIds', ids)} />
      {record.subtype === 'quality_issue' && <><fieldset><legend>{t('Type of problem', 'Είδος προβλήματος')}</legend>{entriesOf('problemType').map(item => <div key={item.code}><label><input type="checkbox" checked={draft.problemTypes?.includes(item.code as never)} onChange={e => set('problemTypes', (e.target.checked ? [...draft.problemTypes ?? [], item.code] : draft.problemTypes?.filter(code => code !== item.code)) as RecordDetail['problemTypes'])} />{labelOf('problemType', item.code, lang)}</label><details><summary>{t('Definition', 'Ορισμός')}</summary>{definitionOf('problemType', item.code, lang)}</details></div>)}</fieldset>{vocab('stage', 'stage', 'Stage', 'Στάδιο')}{vocab('disposition', 'disposition', 'Disposition', 'Τρόπος αντιμετώπισης')}{text('correction', 'Correction', 'Διόρθωση', true)}</>}
      {record.subtype === 'detail_clarification' && <>{text('question', 'Question', 'Ερώτημα', true)}{vocab('route', 'route', 'Route', 'Διαδικασία')}{person('issuedById', 'Issued by', 'Εκδόθηκε από')}</>}
      {record.subtype !== 'task' && <><Field label={t('Chosen option', 'Επιλεγμένη λύση')}><select value={draft.chosenOptionId ?? ''} onChange={e => set('chosenOptionId', e.target.value ? Number(e.target.value) : null)}><option value="">{t('None', 'Καμία')}</option>{data.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field>{person('decidedById', 'Decided by', 'Αποφάσισε')}{date('decidedOn', 'Decided on', 'Ημερομηνία απόφασης')}{text('instructionText', 'Instruction text', 'Κείμενο εντολής', true)}</>}
      {text('publicNotes', 'Public Notes', 'Δημόσιες σημειώσεις', true)}
      <fieldset><legend>{t('Private · owner only', 'Ιδιωτικά · μόνο για τον ιδιοκτήτη')}</legend>{text('notes', 'Private Notes', 'Ιδιωτικές σημειώσεις', true)}<label><input type="checkbox" checked={draft.outsideScope} onChange={e => set('outsideScope', e.target.checked)} />{t('Outside contract scope', 'Εκτός σύμβασης')}</label>{draft.outsideScope && <Field label={t('Estimated cost (€)', 'Εκτιμώμενο κόστος (€)')}><input type="number" min="0" step="0.01" value={draft.estimatedCost ?? ''} onChange={e => set('estimatedCost', e.target.value === '' ? null : Number(e.target.value))} /></Field>}</fieldset>
      <BusyButton busy={busy} type="submit">{t('Save record', 'Αποθήκευση εγγραφής')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button>
    </fieldset>
  </form>;
}
``````

#### File: `src/server/config.ts`

<!-- replay task=1 phase=implementation encoding=text sha256=65d9fdca66f61ffeff774b9de159e9e6d47089598f024f28b39d58e9978e0dcd -->

``````typescript
import { join } from 'node:path';

export interface AppConfig {
  dataDir: string;
  dbPath: string;
  backupsDir: string;
  filesDir: string;
  shareKey: Buffer | null;
  /** Explicit HTTP upload capacity settings; offline commands may omit them. */
  filesStorageBudgetBytes: number | null;
  filesFreeReserveBytes: number | null;
  filesWarningBelowBytes: number;
  backupMaxAgeHours: number;
  /** Scheme + host (+ port) that browsers send as Origin, e.g. https://builtbasis.ktimanet.com */
  publicOrigin: string;
  secureCookies: boolean;
  /** Read the visitor IP from CF-Connecting-IP (design §11.6). */
  behindCloudflare: boolean;
  /** PORT: a port number or a socket path. null = listen like Hetzner's example (no arguments). */
  port: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataDir = env.BUILTBASIS_DATA_DIR;
  if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');
  const publicOrigin = new URL(env.PUBLIC_BASE_URL ?? 'http://localhost:3000').origin;
  const encodedKey = env.SHARE_LINK_KEY;
  if (encodedKey !== undefined && !/^[a-fA-F0-9]{64}$/.test(encodedKey)) {
    throw new Error('SHARE_LINK_KEY must contain exactly 64 hexadecimal characters');
  }
  const positiveBytes = (key: string): number | null => {
    const value = env[key];
    if (value === undefined) return null;
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
      throw new Error(`${key} must be a positive safe integer byte count`);
    }
    return Number(value);
  };
  const backupAge = env.BACKUP_MAX_AGE_HOURS ?? '36';
  if (!/^\d+(?:\.\d+)?$/.test(backupAge) || !Number.isFinite(Number(backupAge)) || Number(backupAge) <= 0) throw new Error('BACKUP_MAX_AGE_HOURS must be positive');
  return {
    dataDir,
    dbPath: join(dataDir, 'builtbasis.db'),
    backupsDir: join(dataDir, 'backups'),
    filesDir: join(dataDir, 'files'),
    shareKey: encodedKey === undefined ? null : Buffer.from(encodedKey, 'hex'),
    filesStorageBudgetBytes: positiveBytes('FILES_STORAGE_BUDGET_BYTES'),
    filesFreeReserveBytes: positiveBytes('FILES_FREE_RESERVE_BYTES'),
    filesWarningBelowBytes: positiveBytes('FILES_WARNING_BELOW_BYTES') ?? 5000000000,
    backupMaxAgeHours: Number(backupAge),
    publicOrigin,
    secureCookies: publicOrigin.startsWith('https://'),
    behindCloudflare: env.BEHIND_CLOUDFLARE === '1',
    port: env.PORT ?? null,
  };
}
``````

#### File: `src/server/files/capacity.ts`

<!-- replay task=1 phase=implementation encoding=text sha256=723383d98570f215657bd31a86a536a17eca668960f288d67a3f430a840f9fa3 -->

``````typescript
import { mkdir, readdir, stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { UPLOAD_REQUEST_LIMIT } from '../../domain';
import { HttpError } from '../errors';
import { blobPath, type StagedFile } from './storage';

export interface StoragePolicy { budgetBytes: number; freeReserveBytes: number }
export interface StorageStatus {
  state: 'ok' | 'warning' | 'unavailable'; healthy: boolean;
  retainedBytes: string; reservedBytes: string; budgetBytes: string; managedHeadroomBytes: string;
  freeReserveBytes: string; filesystemAvailableBytes: string | null; filesystemHeadroomBytes: string | null;
}
export interface UploadReservation {
  maxBodyBytes: number;
  retained: (file: StagedFile) => void;
  cleanupFailed: () => void;
  release: () => void;
}
const denied = (cause?: unknown) => new HttpError(507, 'storage_capacity', undefined, { cause });

/** One HTTP process owns this directory. Retained blobs are never deleted while it runs. */
export async function openStorageCapacity(filesDir: string, policy: StoragePolicy) {
  if (![policy.budgetBytes, policy.freeReserveBytes].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('storage_configuration_required');
  }
  const retainedPaths = new Map<string, bigint>();
  const inodes = new Set<string>();
  let retainedBytes = 0n;
  let pendingBytes = 0n;
  let healthy = true;
  const budget = BigInt(policy.budgetBytes);
  const reserve = BigInt(policy.freeReserveBytes);
  async function inventory(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await inventory(path);
      else if (entry.isFile()) {
        const info = await stat(path, { bigint: true });
        retainedPaths.set(path, info.size);
        // A crash can leave the temporary and published names for one hardlinked inode.
        const key = `${info.dev}:${info.ino}`;
        if (!inodes.has(key)) { inodes.add(key); retainedBytes += info.size; }
      } else throw new Error('unsupported_storage_entry');
    }
  }
  try { await mkdir(filesDir, { recursive: true }); await inventory(filesDir); }
  catch { throw new Error('storage_inventory_failed'); }

  return {
    async snapshot(): Promise<StorageStatus> {
      let available: bigint | null = null;
      try { const space = await statfs(filesDir, { bigint: true }); available = space.bavail * space.bsize; } catch { /* Unknown capacity must be visible. */ }
      // Read accounting after the async probe so in-flight changes are represented consistently.
      const managedHeadroom = budget - retainedBytes - pendingBytes;
      const filesystemHeadroom = available === null ? null : available - pendingBytes - reserve;
      return {
        state: available === null ? 'unavailable' : !healthy || managedHeadroom < BigInt(UPLOAD_REQUEST_LIMIT) || filesystemHeadroom! < BigInt(UPLOAD_REQUEST_LIMIT) ? 'warning' : 'ok',
        healthy, retainedBytes: String(retainedBytes), reservedBytes: String(pendingBytes), budgetBytes: String(budget),
        managedHeadroomBytes: String(managedHeadroom), freeReserveBytes: String(reserve),
        filesystemAvailableBytes: available === null ? null : String(available), filesystemHeadroomBytes: filesystemHeadroom === null ? null : String(filesystemHeadroom),
      };
    },
    async reserve(contentLength: string | undefined): Promise<UploadReservation> {
      if (contentLength !== undefined && !/^\d+$/.test(contentLength)) throw new HttpError(400, 'invalid_upload');
      const amount = contentLength === undefined ? BigInt(UPLOAD_REQUEST_LIMIT) : BigInt(contentLength);
      if (amount > BigInt(UPLOAD_REQUEST_LIMIT)) throw new HttpError(413, 'upload_too_large');
      if (!healthy || retainedBytes + pendingBytes + amount > budget) throw denied();
      // Reserve before the first await so concurrent admissions cannot spend the same headroom.
      pendingBytes += amount;
      try {
        const space = await statfs(filesDir, { bigint: true });
        if (!healthy || space.bavail * space.bsize - pendingBytes < reserve) throw denied();
      } catch (error) {
        pendingBytes -= amount;
        throw denied(error);
      }
      let released = false;
      return {
        maxBodyBytes: Number(amount),
        retained: (file: StagedFile): void => {
          const path = blobPath(filesDir, file.hash);
          const size = BigInt(file.size);
          const existing = retainedPaths.get(path);
          if (existing !== undefined) {
            if (existing !== size) healthy = false;
            return;
          }
          retainedPaths.set(path, size);
          retainedBytes += size;
        },
        cleanupFailed: (): void => { healthy = false; },
        release: (): void => {
          if (!released) { pendingBytes -= amount; released = true; }
        },
      };
    },
  };
}
export type StorageCapacity = Awaited<ReturnType<typeof openStorageCapacity>>;
``````

#### File: `src/server/monitoring/status.ts`

<!-- replay task=1 phase=implementation encoding=text sha256=4b1ab05e97dc77b675eadba34308de402bc0334454db3f66b8bfb38973441a9c -->

``````typescript
import { readdir } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config';
import type { StorageCapacity, StorageStatus } from '../files/capacity';

export interface BackupStatus {
  state: 'ok' | 'missing' | 'overdue' | 'unavailable';
  sourceCreatedAt: string | null; ageHours: number | null; maxAgeHours: number;
}
export interface OperationsStatus { checkedAt: string; backup: BackupStatus; storage: StorageStatus & { warningBelowBytes: string } }

/** Reads existing completed naming only; no dependency on scheduled backup/export tools. */
async function backupStatus(dir: string, maxAgeHours: number, now: Date): Promise<BackupStatus> {
  const empty = { sourceCreatedAt: null, ageHours: null, maxAgeHours };
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const names = entries.filter(entry => entry.isFile() && /^builtbasis-nightly-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.db$/.test(entry.name)).map(entry => entry.name).sort().reverse();
    if (!names[0]) return { state: 'missing', ...empty };
    const stamp = names[0].slice('builtbasis-nightly-'.length, -3).replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');
    const date = new Date(stamp);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== stamp) return { state: 'unavailable', ...empty };
    const ageHours = (now.getTime() - date.getTime()) / 3600000;
    return { state: ageHours < -5 / 60 ? 'unavailable' : ageHours > maxAgeHours ? 'overdue' : 'ok', sourceCreatedAt: stamp, ageHours: Math.max(0, ageHours), maxAgeHours };
  } catch (error) {
    return { state: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unavailable', ...empty };
  }
}
export function registerOperationsStatus(app: FastifyInstance, config: AppConfig, capacity: StorageCapacity): void {
  app.get('/api/operations/status', { config: { privateResponse: true } }, async (): Promise<OperationsStatus> => {
    const now = new Date();
    const [backup, storage] = await Promise.all([backupStatus(config.backupsDir, config.backupMaxAgeHours, now), capacity.snapshot()]);
    const warningBelowBytes = String(config.filesWarningBelowBytes);
    const state = storage.state === 'ok' && BigInt(storage.managedHeadroomBytes) < BigInt(warningBelowBytes) ? 'warning' : storage.state;
    return { checkedAt: now.toISOString(), backup, storage: { ...storage, state, warningBelowBytes } };
  });
}
``````

#### File: `src/web/OperationsStatus.tsx`

<!-- replay task=1 phase=implementation encoding=text sha256=756ad1e0a4e0b664e659a7eec4bad2af943db4f358ee395a64ce1d0998f2128a -->

``````typescript
import { useEffect, useState } from 'react';
import type { OperationsStatus as Status } from '../server/monitoring/status';
import { api } from './core/api';
import { useI18n } from './core/i18n';

export function OperationsStatus({ detailed = false }: { detailed?: boolean }) {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current: AbortController | undefined;
    const refresh = () => {
      current?.abort();
      const abort = new AbortController(); current = abort;
      const timeout = setTimeout(() => { abort.abort(); setFailed(true); setStatus(null); }, 15000);
      api<Status>('/api/operations/status', { signal: abort.signal }).then(value => {
        if (!abort.signal.aborted) { setStatus(value); setFailed(false); }
      }).catch(() => { if (!abort.signal.aborted) { setFailed(true); setStatus(null); } }).finally(() => clearTimeout(timeout));
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    addEventListener('focus', refresh);
    return () => { current?.abort(); clearInterval(timer); removeEventListener('focus', refresh); };
  }, []);
  const bytes = (value: string | null) => {
    if (value === null) return t('unavailable', 'μη διαθέσιμο');
    const gb = Math.abs(Number(value)) >= 1000000000;
    return `${(Number(value) / (gb ? 1000000000 : 1000000)).toLocaleString(lang, { maximumFractionDigits: 1 })} ${gb ? 'GB' : 'MB'}`;
  };
  const backupText = !status ? '' : status.backup.state === 'missing' ? t('No completed server backup.', 'Δεν υπάρχει ολοκληρωμένο αντίγραφο στον διακομιστή.')
    : status.backup.state === 'unavailable' ? t('Backup status unavailable.', 'Η κατάσταση αντιγράφων δεν είναι διαθέσιμη.')
    : status.backup.state === 'overdue' ? t('Server backup overdue.', 'Το αντίγραφο στον διακομιστή έχει καθυστερήσει.') : t('Server backup is recent.', 'Το αντίγραφο στον διακομιστή είναι πρόσφατο.');
  const warning = failed || (status && (status.backup.state !== 'ok' || status.storage.state !== 'ok'));
  if (!detailed && !warning) return null;
  const storageText = !status ? '' : status.storage.state === 'unavailable' ? t('Storage status unavailable.', 'Η κατάσταση αποθήκευσης δεν είναι διαθέσιμη.')
    : !status.storage.healthy ? t('Storage needs checking; uploads are blocked.', 'Απαιτείται έλεγχος χώρου· οι μεταφορτώσεις έχουν αποκλειστεί.')
    : BigInt(status.storage.managedHeadroomBytes) < BigInt(status.storage.warningBelowBytes) ? t('File allowance is below the warning threshold.', 'Ο διαθέσιμος χώρος για αρχεία είναι κάτω από το όριο προειδοποίησης.')
    : status.storage.state === 'warning' ? t('Storage is running low; large uploads may fail.', 'Ο χώρος εξαντλείται· μεγάλες μεταφορτώσεις μπορεί να αποτύχουν.') : '';
  return <section className={`operations-status panel${warning ? ' operations-warning' : ''}`} data-testid="operations-status" aria-label={t('Server backup and storage', 'Αντίγραφα ασφαλείας και χώρος')} aria-live="polite">
    <strong>{t('Server backup and storage', 'Αντίγραφα ασφαλείας και χώρος')}</strong>
    {failed ? <p>{t('Status unavailable. Check backups and storage before relying on them.', 'Η κατάσταση δεν είναι διαθέσιμη. Ελέγξτε τα αντίγραφα και την αποθήκευση.')}</p>
      : !status ? <p>{t('Checking status…', 'Έλεγχος κατάστασης…')}</p> : <>
        {(detailed || status.backup.state !== 'ok') && <p>{backupText} {detailed && status.backup.sourceCreatedAt && <>{new Date(status.backup.sourceCreatedAt).toLocaleString(lang)} ({status.backup.ageHours?.toFixed(1)} {t('hours old', 'ώρες πριν')}; {t('limit', 'όριο')} {status.backup.maxAgeHours} h).</>}</p>}
        {(detailed || status.storage.state !== 'ok') && <p>{storageText} {t('File allowance remaining', 'Χώρος που απομένει για αρχεία')}: {bytes(status.storage.managedHeadroomBytes)}.</p>}
        {detailed && <><p>{t('Warning below', 'Προειδοποίηση κάτω από')}: {bytes(status.storage.warningBelowBytes)}.</p>
        <details><summary>{t('Storage details', 'Λεπτομέρειες χώρου')}</summary>
          <p>{t('Managed-file budget', 'Όριο διαχειριζόμενων αρχείων')}: {bytes(status.storage.budgetBytes)}. {t('Retained, including orphan files', 'Διατηρούμενα, μαζί με μη συσχετισμένα αρχεία')}: {bytes(status.storage.retainedBytes)}; {t('reserved for uploads', 'δεσμευμένα για μεταφορτώσεις')}: {bytes(status.storage.reservedBytes)}.</p>
          <p>{t('Filesystem available', 'Διαθέσιμος χώρος συστήματος αρχείων')}: {bytes(status.storage.filesystemAvailableBytes)}; {t('free-space reserve', 'απόθεμα ελεύθερου χώρου')}: {bytes(status.storage.freeReserveBytes)}; {t('headroom after reserve and pending uploads', 'περιθώριο μετά το απόθεμα και τις εκκρεμείς μεταφορτώσεις')}: {bytes(status.storage.filesystemHeadroomBytes)}. {t('This does not establish hosting account quota.', 'Αυτό δεν επιβεβαιώνει το όριο του λογαριασμού φιλοξενίας.')}</p>
          <p>{t('The PC off-site copy is separate and is not checked here.', 'Το αντίγραφο εκτός διακομιστή στον υπολογιστή είναι ξεχωριστό και δεν ελέγχεται εδώ.')}</p>
        </details></>}
      </>}
    {!detailed && <a href="/administration">{t('Open Administration', 'Άνοιγμα διαχείρισης')}</a>}
  </section>;
}
``````

#### File: `src/web/styles.css`

<!-- replay task=1 phase=implementation encoding=text sha256=b1c2ceb65de58e9b0ce80fabfc9ac21193ff070af14b59aa6f22317bf7eb965b -->

``````css
:root{font-family:system-ui,-apple-system,sans-serif;color:#243747;background:#f2f5f7;line-height:1.5;font-size:16px}*{box-sizing:border-box}body{margin:0}a{color:#225c7b;text-underline-offset:3px}button,input,select,textarea{font:inherit}button,a,input,select,summary{touch-action:manipulation}button{border:1px solid #9cabb7;background:white;color:#243747;border-radius:5px;padding:.55rem .85rem;cursor:pointer;min-height:42px}button:disabled{opacity:.6;cursor:default}button.primary,.primary{background:#245e79;color:white;border-color:#245e79}input,select,textarea{border:1px solid #b1c0cc;border-radius:4px;background:white;color:inherit;max-width:100%;min-height:42px;padding:.45rem .6rem}input:not([type=checkbox]):not([type=radio]),textarea{width:100%}input[type=checkbox],input[type=radio]{width:20px;height:20px;min-height:20px}textarea{min-height:100px;resize:vertical}select[multiple]{min-height:116px}h1{font-size:1.7rem;line-height:1.2}h2{font-size:1.25rem}h3{font-size:1.05rem}small,.muted{color:#596d7c}fieldset{border:1px solid #ced8e0;border-radius:5px;margin:12px 0;min-width:0}legend{padding:0 6px}label{overflow-wrap:anywhere}.site-header{display:flex;align-items:center;gap:24px;background:#203b50;color:white;padding:15px 28px;flex-wrap:wrap}.brand{font-size:1.3rem;color:white;font-weight:750;text-decoration:none}.header-actions{margin-left:auto;display:flex;align-items:center;gap:15px;flex-wrap:wrap}.header-actions label{font-size:.85rem}.header-actions select{font-size:.85rem}.site-nav{display:flex;gap:24px;padding:12px 28px;background:white;border-bottom:1px solid #d4dfe5}main{max-width:1280px;margin:auto;padding:28px}.panel,.filters,.record-card{background:white;border:1px solid #d1dce4;border-radius:7px;padding:20px;margin:16px 0}.panel a{overflow-wrap:anywhere}.grid,.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}.field{display:flex;flex-direction:column;gap:5px;margin:12px 0}.field>span{font-size:.87rem;font-weight:600}.field select{width:100%}.check{display:flex;align-items:center;gap:8px;margin:7px 0;font-size:.9rem}.multi{max-height:240px;overflow:auto}.title-row,.actions,.toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between}.actions,.toolbar{justify-content:flex-start;margin:14px 0}.error{background:#fff0ed;color:#8a3028;border:1px solid #e6b4ab;padding:12px;margin:12px 0;border-radius:5px;white-space:pre-wrap}.success{background:#e7f4ed;padding:12px}.badge{display:inline-block;background:#e6eff5;border-radius:4px;padding:3px 9px;font-size:.85rem}.safety{background:#f8e7de;color:#893d27;padding:3px 8px;border-radius:4px}.record-list{display:grid;gap:10px}.record-card{margin:0}.record-card>a{text-decoration:none}.record-card h2{display:inline;margin-left:16px;font-size:1.05rem}.record-facts{display:flex;gap:16px;flex-wrap:wrap;font-size:.86rem;margin-top:12px}.record-facts progress{width:65px;height:8px}.totals{font-size:.9rem}.tabs,.record-tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #c4d4df;margin:16px 0;padding-bottom:8px}.tabs button,.record-tabs button{border-color:transparent;background:transparent;font-size:.88rem}.tabs button[aria-selected=true],.record-tabs button[aria-selected=true]{border-bottom:3px solid #245e79;color:#245e79;font-weight:700}.phone-sections{display:none}.record-summary{display:flex;gap:20px;flex-wrap:wrap}.private{border-color:#d8c8a6;background:#fcf9f1}.help{font-size:.85rem;margin:5px 0 12px}.help summary{color:#315e77}.help dd{margin:3px 0 12px}details>summary{cursor:pointer;min-height:38px;padding:7px 0}.location-picker ul{list-style:none;padding-left:16px}.location-picker>ul{padding-left:0}.location-picker .field{max-width:450px}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{border-bottom:1px solid #dbe4e9;padding:10px;text-align:left;vertical-align:top}th{background:#f4f7f9}.table-wrap{overflow-x:auto}img,video,canvas{max-width:100%;height:auto}audio{max-width:100%}dialog{max-width:min(1000px,95vw);max-height:92vh;border:1px solid #9eb2c0;border-radius:8px;padding:24px}dialog::backdrop{background:#1c2d4090}.login{max-width:450px;margin:40px auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #c38320;outline-offset:3px}.viewer{overflow:auto}.photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}@media(max-width:650px){main{padding:16px}.site-header{padding:12px 16px;gap:12px}.header-actions{gap:8px}.header-actions>span{display:none}.site-nav{padding:10px 16px;gap:15px;font-size:.9rem}.panel,.filters,.record-card{padding:14px}.grid,.form-grid{grid-template-columns:1fr}.record-card h2{display:block;margin:5px 0}.record-facts{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tabs,.record-tabs{display:none}.phone-sections{display:block}.record-summary{gap:12px}h1{font-size:1.4rem}dialog{padding:15px}.actions button{flex-grow:1}table{min-width:500px}}

.user-text{white-space:pre-wrap;overflow-wrap:anywhere}.table-scroll{overflow-x:auto}.filter-chips{display:flex;flex-wrap:wrap;gap:8px}.record-tabs button[aria-current=page]{border-bottom:3px solid #245e79;color:#245e79;font-weight:700}
.summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;background:white;border:1px solid #d1dce4;border-radius:7px;padding:16px}.summary-grid dt{font-size:.82rem;color:#596d7c}.summary-grid dd{margin:0}.summary-grid small{display:block}.summary-grid progress{width:80px}.record-page details{max-width:100%;overflow-x:auto}.record-page section>dl dd{margin:3px 0 14px}.record-page section>dl dt{font-weight:600}.record-page article{border-bottom:1px solid #d1dce4;padding:12px 0}
.site-header select{color:#243747}@media(max-width:650px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.phone-sections{display:flex;flex-direction:column;gap:6px}.summary-grid>div{min-width:0;overflow-wrap:anywhere}}

.operations-status { margin: .6rem auto; max-width: 1200px; padding: .65rem 1rem; font-size: .85rem; }
.operations-status p { margin: .25rem 0; }
.operations-warning { border-color: #a35b00; background: #fff8e9; }
@media print { .operations-status { display: none !important; } }
``````

- [x] GREEN: run `npx vitest run tests/server/print-api.test.ts tests/web/print-links.test.ts tests/server/monitoring.test.ts tests/server/storage-capacity.test.ts` and require success.

- [x] Run npm run web:build, npm run typecheck, then PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/print.spec.ts (PowerShell syntax below). Expect 19 focused print/monitoring/capacity tests and eight print browser tests. Also run tests/browser/operations-status.spec.ts; expect four tests for healthy-state suppression, Administration, warning/recovery behavior, refresh errors, Greek labels and reader/print exclusion. Also run the eight existing record browser tests after aligning the Greek labels. Inspect the A3 PDFs and screenshot in test-results; decode the QR, verify Greek text and multipage completeness. Browser chrome/headers must be disabled in the actual Save as PDF dialog.

- [x] Self-review the task diff, run `git diff --check`, and commit only this task’s files and generated package lock. Preserve synthetic PDF fixture whitespace from Plan 5.

## Task 2: Nightly backups, pinned exports and offline restore

**Depends on:** Task 1.

Use the existing data-directory configuration. Durable nightly VACUUM INTO backups retain the latest 14 UTC days and eight Monday-start UTC weeks (union, at most 22 names). Pre-migration backups are separate. A completed database inode is pinned before transfer; only its database and manifest are staged, never another copy of all server blobs. Preserve source backup identity and timestamp separately from export and verification time; scheduled verification rejects sources older than the configurable 36-hour default, while deliberate restore may use an older completed recovery point. Restore publishes a fresh verified candidate after resetting all restored access.

- [x] Write/extract the tests first.

#### File: `tests/server/operations.test.ts`

<!-- replay task=2 phase=test encoding=text sha256=482ad759622beab3192dfec97a9900c06bc369f95ed0c22eca7f4f85b964408a -->

``````typescript
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { backupDatabase } from '../../src/server/db/backup';
import { blobPath } from '../../src/server/files/storage';
import { completedBackups, nightlyBackup, retainedBackups, withBackupLock } from '../../src/server/operations/backups';
import { beginExport, completeBundle, fingerprint, releaseExport, restoreBundle, verifyBundle } from '../../src/server/operations/bundles';

vi.mock('node:fs', async (original) => ({ ...await original<typeof import('node:fs')>() }));

const dirs: string[] = [];
const databases: Db[] = [];
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-02T01:00:00Z')); });
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const db of databases.splice(0)) if (db.open) db.close();
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

it('does not make an old snapshot fresh by re-exporting it after live writes', async () => {
  const f = fixture();
  const first = await beginExport(f.backups, f.files);
  await completeBundle(first.path, f.files);
  const firstReport = JSON.parse(fs.readFileSync(join(first.path, 'COMPLETE'), 'utf8'));
  expect(firstReport.sourceCreatedAt).toBe('2026-10-01T01:00:00.000Z');
  f.db.prepare('UPDATE projects SET name = ?').run('New live data not backed up');
  vi.setSystemTime(new Date('2026-10-04T01:00:00Z'));
  const repeated = await beginExport(f.backups, f.files);
  expect(repeated).toMatchObject({ sourceBackup: 'builtbasis-nightly-2026-10-01T01-00-00-000Z.db',
    sourceCreatedAt: '2026-10-01T01:00:00.000Z', exportedAt: '2026-10-04T01:00:00.000Z' });
  await expect(completeBundle(repeated.path, f.files)).rejects.toThrow('stale_source_backup');
  expect(fs.existsSync(join(repeated.path, 'COMPLETE'))).toBe(false);
  await expect(completeBundle(first.path, f.files)).rejects.toThrow('stale_source_backup');
  expect(JSON.parse(fs.readFileSync(join(first.path, 'COMPLETE'), 'utf8'))).toEqual(firstReport);
  // An earlier verified recovery point stays restorable even after its scheduling freshness expires.
  await restoreBundle(first.path, join(f.dir, 'restore-old'), true, f.files);
  const restored = openDatabase(join(f.dir, 'restore-old', 'builtbasis.db'));
  databases.push(restored);
  expect(restored.prepare('SELECT name FROM projects').pluck().get()).toBe('Synthetic drill');
});

it('records source and verification time separately and accepts unchanged recent backup bytes', async () => {
  const f = fixture();
  const original = join(f.backups, completedBackups(f.backups)[0]!);
  const recent = 'builtbasis-nightly-2026-10-02T00-00-00-000Z.db';
  fs.copyFileSync(original, join(f.backups, recent));
  const exported = await beginExport(f.backups, f.files);
  const manifest = JSON.parse(fs.readFileSync(join(exported.path, 'manifest.json'), 'utf8'));
  expect(manifest).toMatchObject({ sourceBackup: recent, sourceCreatedAt: '2026-10-02T00:00:00.000Z', exportedAt: '2026-10-02T01:00:00.000Z' });
  vi.setSystemTime(new Date('2026-10-02T02:00:00Z'));
  await completeBundle(exported.path, f.files);
  expect(JSON.parse(fs.readFileSync(join(exported.path, 'COMPLETE'), 'utf8'))).toEqual({
    sourceBackup: recent, sourceCreatedAt: '2026-10-02T00:00:00.000Z',
    exportedAt: '2026-10-02T01:00:00.000Z', verifiedAt: '2026-10-02T02:00:00.000Z',
  });
  expect(await fingerprint(join(exported.path, 'builtbasis.db'))).toEqual(await fingerprint(original));
});

it('rejects future source dates and configurable-age violations before completion', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  await expect(completeBundle(exported.path, f.files, { maxAgeHours: 12 })).rejects.toThrow('stale_source_backup');
  await expect(completeBundle(exported.path, f.files, { maxAgeHours: 0 })).rejects.toThrow('invalid_max_age_hours');
  await expect(completeBundle(exported.path, f.files, { maxAgeHours: Infinity })).rejects.toThrow('invalid_max_age_hours');
  await expect(completeBundle(exported.path, f.files, { maxAgeHours: 25 })).resolves.toMatchObject({ sourceCreatedAt: '2026-10-01T01:00:00.000Z' });
  const recent = join(f.backups, completedBackups(f.backups)[0]!);
  fs.copyFileSync(recent, join(f.backups, 'builtbasis-nightly-2026-10-03T00-00-00-000Z.db'));
  const future = await beginExport(f.backups, f.files);
  await expect(completeBundle(future.path, f.files)).rejects.toThrow('future_source_backup');
  expect(fs.existsSync(join(future.path, 'COMPLETE'))).toBe(false);
});

it('rejects manifest source-time relabelling and unstructured completion markers', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  const manifestPath = join(exported.path, 'manifest.json');
  const original = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(original);
  manifest.sourceCreatedAt = '2026-10-02T01:00:00.000Z';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  await expect(completeBundle(exported.path, f.files)).rejects.toThrow('source_timestamp_mismatch');
  fs.writeFileSync(manifestPath, original);
  fs.writeFileSync(join(exported.path, 'COMPLETE'), 'old unstructured marker');
  await expect(restoreBundle(exported.path, join(f.dir, 'restored'), true, f.files)).rejects.toThrow();
  expect(fs.existsSync(join(f.dir, 'restored'))).toBe(false);
});
function fixture() {
  const dir = fs.mkdtempSync(join(tmpdir(), 'builtbasis-operations-'));
  dirs.push(dir);
  const backups = join(dir, 'backups');
  const files = join(dir, 'files');
  const db = openDatabase(join(dir, 'builtbasis.db'));
  databases.push(db);
  migrate(db, { backupsDir: backups });
  db.exec(`INSERT INTO users (id, username, password_hash, created_at, updated_at, is_owner) VALUES
    (1,'owner','owner-secret','2026','2026',1),(2,'contributor','old-secret','2026','2026',0);
    INSERT INTO projects VALUES (1,'p1','Synthetic drill','2026');
    INSERT INTO records (id,project_id,subtype,sequence,human_id,status,created_at,created_by,updated_at,updated_by)
      VALUES (1,1,'IN',1,'IN-1','open','2026',1,'2026',1);
    INSERT INTO sessions VALUES ('old-session',2,'2026','2099');
    INSERT INTO record_grants VALUES (1,2,1,1);
    INSERT INTO share_links (record_id,label,token_hash,key_fingerprint,token_ciphertext,token_nonce,token_tag,created_by,created_at)
      VALUES (1,'old link','token','fingerprint',X'01',X'02',X'03',1,'2026');`);
  const bytes = Buffer.from('synthetic retained evidence');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const path = blobPath(files, hash);
  fs.mkdirSync(dirname(path), { recursive: true });
  fs.writeFileSync(path, bytes);
  db.prepare('INSERT INTO blobs VALUES (?, ?, ?)').run(hash, bytes.length, 'text/plain');
  nightlyBackup(db, backups, new Date('2026-10-01T01:00:00Z'));
  return { dir, backups, files, db, path, hash };
}

it('drills restore from a separate offsite copy and resets all restored access before publication', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  const offsite = join(f.dir, 'offsite');
  fs.cpSync(exported.path, offsite, { recursive: true });
  fs.cpSync(f.files, join(offsite, 'files'), { recursive: true });
  releaseExport(f.backups, exported.id);
  await completeBundle(offsite);
  const destination = join(f.dir, 'restored');
  const result = await restoreBundle(offsite, destination, true);
  expect(result).toEqual({ event: 'restore_access_reset', reason: 'database_restore',
    deletedSessions: 1, revokedLinks: 1, disabledContributors: 1, deletedGrants: 1 });
  const restored = openDatabase(join(destination, 'builtbasis.db'));
  databases.push(restored);
  expect(restored.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(0);
  expect(restored.prepare('SELECT count(*) FROM record_grants').pluck().get()).toBe(0);
  expect(restored.prepare('SELECT count(*) FROM share_links WHERE revoked_at IS NULL').pluck().get()).toBe(0);
  expect(restored.prepare('SELECT is_active FROM users ORDER BY id').pluck().all()).toEqual([1, 0]);
  expect(restored.prepare('SELECT password_hash FROM users WHERE id=1').pluck().get()).toBe('owner-secret');
  expect(fs.readFileSync(blobPath(join(destination, 'files'), f.hash))).toEqual(fs.readFileSync(f.path));
  expect(f.db.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(1);
});

it('reports only newly reset access and does not disclose credentials or rewrite earlier revocations', async () => {
  const f = fixture();
  f.db.exec("UPDATE users SET is_active=0 WHERE is_owner=0; DELETE FROM sessions; DELETE FROM record_grants; UPDATE share_links SET revoked_at='2026-09-01T00:00:00.000Z'");
  nightlyBackup(f.db, f.backups, new Date('2026-10-02'));
  const exported = await beginExport(f.backups, f.files);
  await completeBundle(exported.path, f.files);
  const destination = join(f.dir, 'restored');
  expect(await restoreBundle(exported.path, destination, true, f.files)).toEqual({
    event: 'restore_access_reset', reason: 'database_restore', deletedSessions: 0,
    revokedLinks: 0, disabledContributors: 0, deletedGrants: 0,
  });
  const restored = openDatabase(join(destination, 'builtbasis.db'));
  databases.push(restored);
  expect(restored.prepare('SELECT revoked_at FROM share_links').pluck().get()).toBe('2026-09-01T00:00:00.000Z');
});

it('rejects missing and same-size corrupt blobs before completion or restore publication', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  await expect(completeBundle(exported.path)).rejects.toThrow();
  expect(fs.existsSync(join(exported.path, 'COMPLETE'))).toBe(false);
  await completeBundle(exported.path, f.files);
  fs.writeFileSync(f.path, Buffer.alloc(fs.statSync(f.path).size));
  await expect(restoreBundle(exported.path, join(f.dir, 'restored'), true, f.files)).rejects.toThrow('file_verification_failed');
  expect(fs.existsSync(join(f.dir, 'restored'))).toBe(false);
});

it('refuses incomplete and corrupt database bundles', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  await expect(restoreBundle(exported.path, join(f.dir, 'restored'), true, f.files)).rejects.toThrow('incomplete_bundle');
  fs.writeFileSync(join(exported.path, 'builtbasis.db'), 'not sqlite');
  await expect(verifyBundle(exported.path, f.files)).rejects.toThrow('file_verification_failed');
  expect(() => withBackupLock(f.backups, () => withBackupLock(f.backups, () => null))).toThrow();
});

it('rejects a database from a different schema even when its manifest hash matches', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  const path = join(exported.path, 'builtbasis.db');
  const db = openDatabase(path);
  db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run('9999_future', '2026');
  db.close();
  const manifestPath = join(exported.path, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.database = await fingerprint(path);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  await expect(completeBundle(exported.path, f.files)).rejects.toThrow('incompatible_schema');
  expect(fs.existsSync(join(exported.path, 'COMPLETE'))).toBe(false);
});

it('keeps a pin readable after nightly rotation and ignores migration backups and partial files', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  fs.writeFileSync(join(f.backups, 'unrelated.tmp'), 'partial');
  backupDatabase(f.db, f.backups, 'pre-migration');
  // Seed historical names from a validated immutable snapshot; exercise real VACUUM/rotation once.
  const validated = join(f.backups, completedBackups(f.backups)[0]!);
  for (let day = 2; day < 75; day++) {
    const stamp = new Date(Date.UTC(2026, 9, day)).toISOString().replace(/[:.]/g, '-');
    fs.linkSync(validated, join(f.backups, `builtbasis-nightly-${stamp}.db`));
  }
  nightlyBackup(f.db, f.backups, new Date(Date.UTC(2026, 9, 75)));
  expect(completedBackups(f.backups).length).toBeLessThanOrEqual(22);
  expect(completedBackups(f.backups).some((name) => name.includes('2026-10-01'))).toBe(false);
  await expect(verifyBundle(exported.path, f.files)).resolves.toBeDefined();
  expect(fs.existsSync(join(f.backups, 'unrelated.tmp'))).toBe(true);
  expect(fs.readdirSync(f.backups).some((name) => name.includes('pre-migration'))).toBe(true);
  expect(() => releaseExport(f.backups, '../files')).toThrow('invalid_export_id');
});

it('keeps the latest copy for each retained UTC day and Monday-based week', () => {
  const names = Array.from({ length: 70 }, (_, i) => `builtbasis-nightly-${new Date(Date.UTC(2026, 0, i + 1)).toISOString().replace(/[:.]/g, '-')}.db`);
  const retained = retainedBackups(names);
  for (const name of names.slice(-14)) expect(retained.has(name)).toBe(true);
  expect(retained.has(names[0]!)).toBe(false);
  expect(retained.size).toBe(19);
});

it('removes failed restore candidates and never overwrites an existing destination', async () => {
  const f = fixture();
  const exported = await beginExport(f.backups, f.files);
  await completeBundle(exported.path, f.files);
  const target = join(f.dir, 'restored');
  await expect(restoreBundle(exported.path, target, false, f.files)).rejects.toThrow('offline_confirmation_required');
  const copy = vi.spyOn(fs, 'copyFileSync').mockImplementation(() => { throw new Error('disk full'); });
  await expect(restoreBundle(exported.path, target, true, f.files)).rejects.toThrow('disk full');
  copy.mockRestore();
  expect(fs.readdirSync(f.dir).some((name) => name.includes('.candidate-'))).toBe(false);
  fs.mkdirSync(target);
  await expect(restoreBundle(exported.path, target, true, f.files)).rejects.toThrow('destination_exists');
});

it('cleans failed backup temp files and preserves completed backups on name collision', () => {
  const f = fixture();
  const now = new Date('2026-10-01T01:00:00Z');
  expect(() => backupDatabase(f.db, f.backups, 'nightly', now)).toThrow('backup_name_exists');
  const rename = vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('publish failed'); });
  expect(() => backupDatabase(f.db, f.backups, 'nightly', new Date('2026-10-02'))).toThrow('publish failed');
  rename.mockRestore();
  expect(fs.readdirSync(f.backups).some((name) => name.endsWith('.tmp'))).toBe(false);
});

it('closes a failed integrity-check connection and never publishes the bad backup', () => {
  const f = fixture();
  const pragma = vi.spyOn(Database.prototype, 'pragma').mockReturnValueOnce('corrupt');
  expect(() => backupDatabase(f.db, f.backups, 'nightly', new Date('2026-10-03'))).toThrow('backup_integrity_failed');
  pragma.mockRestore();
  expect(completedBackups(f.backups)).toHaveLength(1);
  expect(fs.readdirSync(f.backups).some((name) => name.endsWith('.tmp'))).toBe(false);
});
``````

- [x] Run the focused test before implementation: `npx vitest run tests/server/operations.test.ts tests/server/db.test.ts`. The new operations suite fails to import the missing operations modules. Existing database tests remain green. Then extract the implementation and verify all eighteen focused operations/database tests.

- [x] Write/extract the complete implementation files.

#### File: `src/server/operations/durability.ts`

<!-- replay task=2 phase=implementation encoding=text sha256=f0c43a010fe65e93b74de0fcec620e7e48e7938218fd5ce78b92510c7040c3a2 -->

``````typescript
import { closeSync, fsyncSync, openSync } from 'node:fs';

export function syncFile(path: string): void {
  const fd = openSync(path, 'r+');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
export function syncDirectory(path: string): void {
  if (process.platform === 'win32') return;
  const fd = openSync(path, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
``````

#### File: `src/server/db/backup.ts`

<!-- replay task=2 phase=implementation encoding=text sha256=962984c49cdc4c4ad858bb942777586697cb5feec7f3839f556237528b9d00d9 -->

``````typescript
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { syncDirectory, syncFile } from '../operations/durability';
import { join } from 'node:path';
import type { Db } from './connection';

/**
 * Consistent copy with VACUUM INTO, written under a temporary name and integrity-checked
 * before it gets its final name, so an interrupted or damaged backup never looks complete (design §11.7).
 */
export function backupDatabase(db: Db, backupsDir: string, label: string, now: Date = new Date()): string {
  mkdirSync(backupsDir, { recursive: true });
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const finalPath = join(backupsDir, `builtbasis-${label}-${stamp}.db`);
  const tmpPath = `${finalPath}.tmp`;
  if (existsSync(finalPath) || existsSync(tmpPath)) throw new Error('backup_name_exists');
  try {
    db.prepare('VACUUM INTO ?').run(tmpPath);
    const check = new Database(tmpPath, { readonly: true });
    try {
      const result = check.pragma('integrity_check', { simple: true });
      if (result !== 'ok') throw new Error('backup_integrity_failed');
    } finally { check.close(); }
    syncFile(tmpPath);
    renameSync(tmpPath, finalPath);
    syncDirectory(backupsDir);
    return finalPath;
  } catch (error) {
    rmSync(tmpPath, { force: true });
    throw error;
  }
}
``````

#### File: `src/server/operations/backups.ts`

<!-- replay task=2 phase=implementation encoding=text sha256=b84d136647b6ed096d4c861c741d045de7de466e4d34b4a627a98bbce4fdf003 -->

``````typescript
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from '../db/connection';
import { backupDatabase } from '../db/backup';
import { syncDirectory } from './durability';

export const NIGHTLY_NAME = /^builtbasis-nightly-(\d{4}-\d{2}-\d{2})T\d{2}-\d{2}-\d{2}-\d{3}Z\.db$/;

/** Export pinning and rotation use the same short filesystem lock. Never clear a live lock. */
export function withBackupLock<T>(dir: string, action: () => T): T {
  mkdirSync(dir, { recursive: true });
  const lock = join(dir, '.operations-lock');
  mkdirSync(lock);
  try { return action(); } finally { rmSync(lock, { recursive: true }); }
}
export function completedBackups(dir: string): string[] {
  return readdirSync(dir).filter((name) => NIGHTLY_NAME.test(name)).sort().reverse();
}

/** Latest backup for each UTC day; weekly buckets start Monday. Union retains at most 22 copies. */
export function retainedBackups(names: string[]): Set<string> {
  const keep = new Set<string>();
  const days = new Set<string>();
  const weeks = new Set<string>();
  for (const name of [...names].sort().reverse()) {
    const match = NIGHTLY_NAME.exec(name);
    if (!match) continue;
    const day = match[1]!;
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    const week = date.toISOString().slice(0, 10);
    if (days.size < 14 && !days.has(day)) { keep.add(name); days.add(day); }
    if (weeks.size < 8 && !weeks.has(week)) { keep.add(name); weeks.add(week); }
  }
  return keep;
}
export function nightlyBackup(db: Db, dir: string, now = new Date()): string {
  return withBackupLock(dir, () => {
    const result = backupDatabase(db, dir, 'nightly', now);
    const names = completedBackups(dir);
    const keep = retainedBackups(names);
    for (const name of names) if (!keep.has(name)) rmSync(join(dir, name));
    syncDirectory(dir);
    return result;
  });
}
``````

#### File: `src/server/operations/bundles.ts`

<!-- replay task=2 phase=implementation encoding=text sha256=3491ad0a6ce99cc593c42b52fec4e3faa4deed698204c86143105737a9eda241 -->

``````typescript
import Database from 'better-sqlite3';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { MIGRATIONS } from '../db/migrations';
import { blobPath } from '../files/storage';
import { completedBackups, withBackupLock } from './backups';
import { syncDirectory, syncFile } from './durability';

interface Fingerprint { hash: string; size: number }
interface SourceMetadata { sourceBackup: string; sourceCreatedAt: string; exportedAt: string }
interface Manifest extends SourceMetadata { version: 1; database: Fingerprint; blobs: Fingerprint[] }
export interface CompletionReport extends SourceMetadata { verifiedAt: string }
export const DEFAULT_MAX_AGE_HOURS = 36;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

function timestamp(value: string): number {
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) throw new Error('invalid_backup_timestamp');
  return time;
}
function sourceTimestamp(name: string): string {
  const match = /^builtbasis-nightly-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.db$/.exec(name);
  if (!match) throw new Error('invalid_source_backup');
  const value = `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
  timestamp(value);
  return value;
}
function sourceMetadata(manifest: Manifest): SourceMetadata {
  if (sourceTimestamp(manifest.sourceBackup) !== manifest.sourceCreatedAt) throw new Error('source_timestamp_mismatch');
  timestamp(manifest.exportedAt);
  return { sourceBackup: manifest.sourceBackup, sourceCreatedAt: manifest.sourceCreatedAt, exportedAt: manifest.exportedAt };
}
function completionReport(bundle: string, manifest: Manifest): CompletionReport {
  const report = JSON.parse(readFileSync(join(bundle, 'COMPLETE'), 'utf8')) as CompletionReport;
  if (report.sourceBackup !== manifest.sourceBackup || report.sourceCreatedAt !== manifest.sourceCreatedAt ||
      report.exportedAt !== manifest.exportedAt) throw new Error('completion_metadata_mismatch');
  timestamp(report.verifiedAt);
  return report;
}
export async function fingerprint(path: string): Promise<Fingerprint> {
  const hash = createHash('sha256');
  let size = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); size += chunk.length; }
  return { hash: hash.digest('hex'), size };
}
export function inspectDatabase(path: string): Fingerprint[] {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    if (db.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('database_integrity_failed');
    if ((db.pragma('foreign_key_check') as unknown[]).length) throw new Error('database_foreign_keys_failed');
    const ids = db.prepare('SELECT id FROM schema_migrations ORDER BY id').pluck().all();
    if (JSON.stringify(ids) !== JSON.stringify(MIGRATIONS.map((m) => m.id))) throw new Error('incompatible_schema');
    return db.prepare('SELECT hash, size FROM blobs ORDER BY hash').all() as Fingerprint[];
  } finally { db.close(); }
}
async function checkFile(path: string, expected: Fingerprint): Promise<void> {
  const actual = await fingerprint(path);
  if (actual.hash !== expected.hash || actual.size !== expected.size) throw new Error('file_verification_failed');
}
function writeDurable(path: string, text: string): void {
  writeFileSync(path, text, { flag: 'wx', mode: 0o600 });
  syncFile(path);
  syncDirectory(dirname(path));
}
function copyDurable(source: string, target: string): void {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  syncFile(target);
  syncDirectory(dirname(target));
}

export async function beginExport(backupsDir: string, filesDir: string): Promise<{ id: string; path: string; filesPath: string } & SourceMetadata> {
  const id = randomBytes(16).toString('hex');
  const path = join(backupsDir, '.exports', id);
  const source = withBackupLock(backupsDir, () => {
    const name = completedBackups(backupsDir)[0];
    if (!name) throw new Error('no_completed_backup');
    const sourceCreatedAt = sourceTimestamp(name);
    mkdirSync(path, { recursive: true, mode: 0o700 });
    // Hard link pins the completed inode even if rotation subsequently removes its original name.
    linkSync(join(backupsDir, name), join(path, 'builtbasis.db'));
    syncDirectory(path);
    return { sourceBackup: name, sourceCreatedAt };
  });
  try {
    const blobs = inspectDatabase(join(path, 'builtbasis.db'));
    for (const blob of blobs) {
      await checkFile(blobPath(filesDir, blob.hash), blob);
    }
    const metadata = { ...source, exportedAt: new Date().toISOString() };
    const manifest: Manifest = { version: 1, ...metadata, database: await fingerprint(join(path, 'builtbasis.db')), blobs };
    writeDurable(join(path, 'manifest.json'), JSON.stringify(manifest));
    syncDirectory(join(backupsDir, '.exports'));
    return { id, path: resolve(path), filesPath: resolve(filesDir), ...metadata };
  } catch (error) { rmSync(path, { recursive: true, force: true }); throw error; }
}
export function releaseExport(backupsDir: string, id: string): void {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('invalid_export_id');
  rmSync(join(backupsDir, '.exports', id), { recursive: true, force: true });
}

export async function verifyBundle(bundle: string, filesDir = join(bundle, 'files')): Promise<Manifest> {
  const manifest = JSON.parse(readFileSync(join(bundle, 'manifest.json'), 'utf8')) as Manifest;
  if (manifest.version !== 1) throw new Error('unsupported_bundle');
  sourceMetadata(manifest);
  await checkFile(join(bundle, 'builtbasis.db'), manifest.database);
  const blobs = inspectDatabase(join(bundle, 'builtbasis.db'));
  if (JSON.stringify(blobs) !== JSON.stringify(manifest.blobs)) throw new Error('manifest_reference_mismatch');
  for (const blob of blobs) await checkFile(blobPath(filesDir, blob.hash), blob);
  return manifest;
}
export async function completeBundle(bundle: string, filesDir = join(bundle, 'files'),
  options: { maxAgeHours?: number } = {}): Promise<CompletionReport> {
  const maxAgeHours = options.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS;
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0 || !Number.isFinite(maxAgeHours * 3600000)) throw new Error('invalid_max_age_hours');
  const manifest = await verifyBundle(bundle, filesDir);
  const now = new Date();
  const sourceAge = now.getTime() - timestamp(manifest.sourceCreatedAt);
  if (sourceAge < -CLOCK_SKEW_MS) throw new Error('future_source_backup');
  if (timestamp(manifest.exportedAt) > now.getTime() + CLOCK_SKEW_MS) throw new Error('future_export');
  if (sourceAge > maxAgeHours * 3600000) throw new Error('stale_source_backup');
  const marker = join(bundle, 'COMPLETE');
  if (existsSync(marker)) return completionReport(bundle, manifest);
  const report = { ...sourceMetadata(manifest), verifiedAt: now.toISOString() };
  writeDurable(marker, JSON.stringify(report));
  return report;
}

export interface RestoreResult {
  event: 'restore_access_reset';
  reason: 'database_restore';
  deletedSessions: number;
  revokedLinks: number;
  disabledContributors: number;
  deletedGrants: number;
}

/** Operator must stop HTTP and scheduled jobs before invoking, and keep them stopped through cutover. */
export async function restoreBundle(bundle: string, destination: string, offlineConfirmed: boolean, filesDir = join(bundle, 'files')): Promise<RestoreResult> {
  if (!offlineConfirmed) throw new Error('offline_confirmation_required');
  if (!existsSync(join(bundle, 'COMPLETE'))) throw new Error('incomplete_bundle');
  if (existsSync(destination)) throw new Error('destination_exists');
  const manifest = await verifyBundle(bundle, filesDir);
  completionReport(bundle, manifest);
  const candidate = `${resolve(destination)}.candidate-${randomBytes(16).toString('hex')}`;
  mkdirSync(candidate, { mode: 0o700 });
  try {
    copyDurable(join(bundle, 'builtbasis.db'), join(candidate, 'builtbasis.db'));
    for (const blob of manifest.blobs) copyDurable(blobPath(filesDir, blob.hash), blobPath(join(candidate, 'files'), blob.hash));
    mkdirSync(join(candidate, 'files'), { recursive: true });
    // Verify candidate bytes too: failures during copy cannot produce a published restore.
    await checkFile(join(candidate, 'builtbasis.db'), manifest.database);
    for (const blob of manifest.blobs) await checkFile(blobPath(join(candidate, 'files'), blob.hash), blob);
    const db = new Database(join(candidate, 'builtbasis.db'));
    let result: RestoreResult;
    try {
      db.pragma('foreign_keys = ON');
      result = db.transaction((): RestoreResult => {
        const deletedSessions = db.prepare('DELETE FROM sessions').run().changes;
        const deletedGrants = db.prepare('DELETE FROM record_grants').run().changes;
        const disabledContributors = db.prepare('UPDATE users SET is_active = 0 WHERE is_owner = 0 AND is_active = 1').run().changes;
        const revokedLinks = db.prepare('UPDATE share_links SET revoked_at = ? WHERE revoked_at IS NULL').run(new Date().toISOString()).changes;
        return { event: 'restore_access_reset', reason: 'database_restore', deletedSessions, revokedLinks, disabledContributors, deletedGrants };
      })();
    } finally { db.close(); }
    inspectDatabase(join(candidate, 'builtbasis.db'));
    syncFile(join(candidate, 'builtbasis.db'));
    syncDirectory(join(candidate, 'files'));
    syncDirectory(candidate);
    if (existsSync(destination)) throw new Error('destination_exists');
    renameSync(candidate, destination);
    syncDirectory(dirname(resolve(destination)));
    return result;
  } catch (error) { rmSync(candidate, { recursive: true, force: true }); throw error; }
}
``````

#### File: `scripts/backup.ts`

<!-- replay task=2 phase=implementation encoding=text sha256=6d9865799f2ecf23dc8f789d37d54d9ab32def9feef1a3b63e9d975fa8527a53 -->

``````typescript
import Database from 'better-sqlite3';
import { loadEnvFile } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';
import { nightlyBackup } from '../src/server/operations/backups';

try {
  loadEnvFile();
  const config = loadConfig();
  const db = new Database(config.dbPath, { fileMustExist: true });
  try { console.log(JSON.stringify({ path: nightlyBackup(db, config.backupsDir) })); }
  finally { db.close(); }
} catch { console.error('backup_failed'); process.exitCode = 1; }
``````

#### File: `scripts/backup-export.ts`

<!-- replay task=2 phase=implementation encoding=text sha256=d264c77257a6884f2e8d3d7d092e7df29ae2eb6f81b30be6fdcbe78681d2a054 -->

``````typescript
import { loadEnvFile } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';
import { beginExport, completeBundle, releaseExport } from '../src/server/operations/bundles';

try {
  const [command, target, ...flags] = process.argv.slice(2);
  if (command === 'verify' && target) {
    let filesDir: string | undefined;
    let maxAgeHours: number | undefined;
    for (let i = 0; i < flags.length; i += 2) {
      const value = flags[i + 1];
      if (!value || value.startsWith('--')) throw new Error('invalid_arguments');
      if (flags[i] === '--files-dir' && filesDir === undefined) filesDir = value;
      else if (flags[i] === '--max-age-hours' && maxAgeHours === undefined && /^\d+(?:\.\d+)?$/.test(value)) maxAgeHours = Number(value);
      else throw new Error('invalid_arguments');
    }
    const report = await completeBundle(target, filesDir, { maxAgeHours });
    console.log(JSON.stringify({ complete: true, ...report }));
  } else {
    loadEnvFile();
    const config = loadConfig();
    if (command === 'begin' && target === undefined) console.log(JSON.stringify(await beginExport(config.backupsDir, config.filesDir)));
    else if (command === 'release' && target && flags.length === 0) { releaseExport(config.backupsDir, target); console.log(JSON.stringify({ released: true })); }
    else throw new Error('invalid_arguments');
  }
} catch (error) {
  const reasons = ['stale_source_backup', 'future_source_backup', 'future_export', 'invalid_max_age_hours'];
  const reason = error instanceof Error && reasons.includes(error.message) ? error.message : 'verification_or_transfer_failed';
  console.error(JSON.stringify({ event: 'backup_export_failed', reason }));
  process.exitCode = 1;
}
``````

#### File: `scripts/restore.ts`

<!-- replay task=2 phase=implementation encoding=text sha256=2e25481e86643a3b0c5f8ae3c604276ce2efd7be8f02c03951ef33b7ee0fdf88 -->

``````typescript
import { restoreBundle } from '../src/server/operations/bundles';

try {
  const [bundle, destination, offline, flag, filesDir, ...extra] = process.argv.slice(2);
  if (!bundle || !destination || offline !== '--offline-confirmed' || extra.length ||
      (flag !== undefined && (flag !== '--files-dir' || !filesDir))) throw new Error('invalid_arguments');
  const result = await restoreBundle(bundle, destination, true, filesDir);
  console.log(JSON.stringify({ restored: true, ...result }));
} catch { console.error('restore_failed'); process.exitCode = 1; }
``````

#### File: `docs/guides/backup-restore.md`

<!-- replay task=2 phase=implementation encoding=text sha256=d83db37ecad5ae871be376ee356b1d079473d563a549af3e859d5dcbd66f9487 -->

``````markdown
# Backup and restore

> **Document type:** Operator guide
> **Status:** Proposed with Plan 6; activate after implementation and the actual off-site drill.
> **Contracts:** [Approved design](../designs/2026-10-02-v1-records-design.md) and [access guide](share-key-management.md).

Backups contain the database and retained evidence, including private content. Keep the server data directory outside the web root. Restrict the owner's offsite directory and SSH key to the owner. Keep `SHARE_LINK_KEY` in the separate secret store. These commands never copy `.env` or export secrets.

## Nightly server backup

From the installed release, with `BUILTBASIS_DATA_DIR` set, run `/usr/local/nodejs/24/bin/node dist/server/backup.mjs`. The deployed archive contains compiled commands; source npm commands require a local development checkout. Configure cron only after verifying the hosting account's Node path and private data directory. The command opens the existing database without migrating it. It uses `VACUUM INTO`, checks integrity, syncs the temporary file and publishes the completed name. It retains the latest copy from each of 14 UTC days and eight Monday-based UTC weeks. A copy can satisfy both daily and weekly retention. Pre-migration copies and partial files are outside this rotation.

Use an absolute Node executable, an absolute path to the private external non-secret operations configuration and the stable current-release directory in cron. Adapt this example to the verified account paths and the host's cron timezone:

```sh
0 2 * * * cd /home/ACCOUNT/builtbasis/current && /usr/local/nodejs/24/bin/node --env-file=/home/ACCOUNT/builtbasis-config/operations.env dist/server/backup.mjs >> /home/ACCOUNT/builtbasis-logs/backup.log 2>&1
```

Create the private log directory first. Keep operations.env outside release, data, backup and offsite-copy directories and restrict its permissions to the service account. It contains only `BUILTBASIS_DATA_DIR` and any other required non-secret CLI settings. Keep `SHARE_LINK_KEY` solely in the konsoleH HTTP application settings; never copy it into operations.env, cron or backup configuration. Backup, export and restore need no share key. If server commands run in an SSH shell without the data-path setting, pass that same absolute `--env-file` before the compiled script path.

The `.operations-lock` directory excludes concurrent nightly backup and export pin selection. A busy lock fails the command for monitoring/retry. Following a crash, stop jobs and prove no backup/export process remains before removing only that lock directory. Inspect partial `.tmp` files separately. Never remove retained immutable files to regain capacity. Raise capacity or move storage through a planned operation.

## Offsite pull protocol

1. From the current release, run `/usr/local/nodejs/24/bin/node dist/server/backup-export.mjs begin` over SSH with `BUILTBASIS_DATA_DIR` set. Parse the sole JSON response with `id`, `path`, `filesPath`, `sourceBackup`, `sourceCreatedAt` and `exportedAt`. The server first pins the newest completed nightly database with a hard link under the rotation lock. It preserves that backup's filename and UTC creation timestamp rather than using export time as backup freshness. It verifies every referenced immutable file and writes `manifest.json`. The export directory contains only that database and manifest.
2. Copy `builtbasis.db` and `manifest.json` from the returned export path into a new, private offsite bundle directory. This database copy must precede file transfer. The manifest format is `{version:1,sourceBackup,sourceCreatedAt,exportedAt,database:{hash,size},blobs:[{hash,size}]}`. The source timestamp must match the pinned nightly filename. Each blob is at `filesPath/<first-two-hash-characters>/<hash>` on the server. Hashes are lowercase SHA-256. Sizes are byte counts.
3. Transfer missing blobs into the offsite shared `files/` pool. The Windows script uses one SFTP batch for the pinned database and manifest first, followed by one SFTP batch for all missing blobs. It does not open a new SSH connection for each blob. Use temporary destination filenames and publish each file after transfer. Existing blobs are immutable. A truncated or corrupt existing blob must be quarantined and downloaded again after verification reports failure. Never mark the bundle complete on transfer success alone.
4. On the owner PC, run `node dist/server/backup-export.mjs verify <bundle> --files-dir <offsite-files> --max-age-hours 36` from the matching locally built checkout. The positive maximum source age is configurable and defaults to 36 hours; choose it deliberately for the schedule. Verification checks the database hash, integrity, foreign keys, exact schema migration list and every referenced file's size and SHA-256. It rejects an expired source backup and a source timestamp more than five minutes in the future. Only success writes structured JSON `COMPLETE` containing `sourceBackup`, `sourceCreatedAt`, `exportedAt` and `verifiedAt`. Keep failed bundles incomplete and report failure. A marker is never a substitute for verification at restore time.
5. Run `/usr/local/nodejs/24/bin/node dist/server/backup-export.mjs release <id>` over SSH with the same data configuration when transfer ends, including failures. This removes only the bounded export staging directory. If a network failure prevents release, record the id and retry it. Never use an automatic timeout to delete an export that might still be transferring.

The export pin survives server rotation. File transfer and hashing hold no SQLite transaction. Offsite copies may share the immutable pool; keep every blob required by every retained bundle. This procedure does not delete published files. An interrupted pull is not a completed backup. Alert on command failure, absent recent completed backups, failed scheduled tasks and insufficient storage. The owner PC must be running for its scheduled pull.

Monitor the JSON `sourceCreatedAt` age against the selected maximum. `exportedAt`, `verifiedAt`, directory names and filesystem modification times do not establish a new recovery point. Re-exporting yesterday's snapshot after new live writes does not update its source date. Identical database hashes on two genuinely separate recent snapshots are valid when no data changed. An existing COMPLETE report is not rewritten by repeat verification; a stale repeat fails without making the earlier report appear current.

From the matching built checkout on the owner PC, invoke the supplied Windows pull script. Replace all example paths and the SSH alias with the verified operator configuration:

```powershell
powershell.exe -NoProfile -NonInteractive -File "C:\path\to\builtbasis\scripts\pull-backup.ps1" -SshAlias "builtbasis-host" -RemoteRelease "/home/ACCOUNT/builtbasis/current" -RemoteData "/home/ACCOUNT/builtbasis-data" -Destination "X:\chosen-private-backup-folder" -MaxAgeHours 36
```

Configure Task Scheduler to run this command under the owner account with the checkout as its working directory. Select the nightly schedule deliberately; this example creates no task. Build the matching tools first. Verify `node`, `ssh` and `sftp` resolve in that account's unattended environment. Establish the host key deliberately and verify BatchMode SSH authentication succeeds without prompts. Keep the SSH private key separate from the backup destination. Do not weaken host-key checking to make scheduling work.

The pull script sends a built-in Windows desktop message on failure using [`msg.exe`](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/msg). This is a desktop message, not a notification-center toast. It targets only the local account named by `-NotificationUser`, which defaults to the task's `USERNAME`. Use the logged-on owner account; never use a wildcard or a remote server. The message contains no backup paths, tokens or credentials and remains visible for up to five minutes. The script preflights command availability. Setup, lock, SSH/SFTP, verification, stale-source and export-release failures trigger the message and preserve a failing process exit code. Notification delivery failure produces a diagnostic warning and does not turn the backup failure into success.

Configure the task to run in the owner's logged-on desktop session and verify an actual controlled failure message during release acceptance. `msg.exe` availability and session message permissions must be verified on that PC. Tests mock delivery and cannot prove the real desktop receives it. A powered-off PC, a task that never starts or an absent logged-on desktop cannot notify the owner through this mechanism. Check Task Scheduler history and the structured source dates separately. No additional service or email channel is installed.

Test the task using its actual scheduled identity and logon mode. Confirm X: exists and is writable in that context; an interactive mapped drive may not exist in a background task. Set `-Destination` to the verified private location. Configure no overlapping runs. Record the task's exit code and capture diagnostic output in a private log. Alert on nonzero results, missing completion reports and sourceCreatedAt older than the configured maximum. Check verifiedAt separately for task execution monitoring; never use COMPLETE file modification time for source freshness. An old COMPLETE file does not prove the latest pull succeeded. Investigate incomplete snapshot folders and failed export release. If `.pull-lock` remains after a crash, prove no pull is active before removing only that lock.

## Administration and warnings

Open **Administration / Διαχείριση** in the website navigation while signed in as owner. The page always shows the server-backup and storage status, with extra storage figures under Storage details. Normal working pages show only a compact warning and an Administration link when something needs attention. Healthy status and loading indicators stay off those screens. Contributors, public shares and print do not show either monitoring view. The owner-only read API discloses no filesystem paths or secrets.

Backup status uses the newest completed nightly filename's source time. Missing, overdue, future-dated or unreadable status warns. Set the positive `BACKUP_MAX_AGE_HOURS` server setting to change the 36-hour default. This reports the server copy only; it does not confirm that the separate Windows offsite task has run.

The file allowance uses the same live accounting as upload admission, including retained/orphan files and pending reservations. Set `FILES_WARNING_BELOW_BYTES` in the HTTP application's server configuration to change the default **5,000,000,000 bytes (5 GB)** warning threshold. At exactly the threshold there is no allowance warning; below it there is. This is an early warning, not an upload limit. Existing admission checks continue to enforce the managed-file budget and free-space reserve. Capacity warnings also remain when a maximum-size request cannot fit or accounting is unhealthy. Storage details separately show filesystem space and the configured reserve; neither establishes the hosting account quota.

Status loads when the page opens, refreshes on focus and every minute, and reports failed or timed-out checks instead of retaining a healthy-looking result. A recovered status removes the working-page warning. The website cannot issue warnings while it is closed. The separate Windows failure message remains responsible for failed offsite pulls.

## Offline restore

Stop the application, server cron and owner-PC pull jobs first. Confirm all writing processes have exited. Keep them stopped through verification, restore and cutover. Run only one restore operator at a time. `--offline-confirmed` records that operator prerequisite; it cannot stop an external service.

Use the application release with the exact migration list contained in the backup. Restore refuses older or newer schemas, corrupt data and incomplete bundles. Do not let startup migrate an unverified database. Keep the separate share key available for configured application startup, or use the existing key-loss procedure. No restored share links are reopened.

The schema must match, but deliberate offline restore is allowed from an old recovery point. The scheduled 36-hour freshness limit does not block restoring a previously completed, fully verified older bundle. The operator must review its preserved sourceCreatedAt and accept the corresponding recovery point. Restore validates the structured completion metadata and rechecks all bytes.

From the compatible installed release, run `/usr/local/nodejs/24/bin/node dist/server/restore.mjs <bundle> <fresh-data-directory> --offline-confirmed --files-dir <offsite-files>`. On the owner PC, use the local Node executable with that same compiled script and arguments. Restore verification needs no share key or application environment. The destination must not exist and its parent must already exist on the intended filesystem. Never pass the live data directory. The command verifies the bundle, copies into a private candidate, verifies the candidate bytes and resets access in one database transaction. It deletes all sessions, revokes every share link, disables every non-owner account and deletes every record grant. The owner's account and password remain unchanged. Only the validated candidate is renamed to the requested destination.

Point `BUILTBASIS_DATA_DIR` at that fresh destination while services remain stopped. Confirm file ownership, private permissions, capacity settings, external key and the compatible application release. Resume the application only after these checks. Log in as owner and review representative records, originals, previews and attachments. Before contributor access returns, reset each selected password, then enable the account, then deliberately grant records again. Issue new share links as needed. Resume scheduled jobs against the new data directory. Preserve the old directory for rollback; never overwrite it during restore.

Successful restore emits a system diagnostic with reason `database_restore` and counts of deleted sessions, newly revoked links, newly disabled contributors and deleted grants. It contains no credentials, tokens or per-record private data. Retain this output with the private restore evidence. Already revoked links keep their earlier revocation dates and are not counted as newly revoked.

## Recovery evidence

`npx vitest run tests/server/operations.test.ts tests/server/db.test.ts` performs a synthetic offsite-copy restore drill. It checks access reset, owner preservation, original database isolation, corrupt/missing blobs, schema mismatch, failed candidate cleanup and rotation while pinned. This local drill is not production recovery evidence. Before release, perform and record one operator drill from an actual offsite copy into a fresh isolated directory. Record backup identity, verification output, restore result and representative file checks. Keep production stopped only when doing a real cutover. Windows tests do not establish Linux directory-sync durability; verify that separately on hosting.
``````

- [x] GREEN: run `npx vitest run tests/server/operations.test.ts tests/server/db.test.ts` and require success.

- [x] Run npm run typecheck. Inspect the synthetic drill assertions: source remains unchanged; restored owner survives; sessions/grants are empty; links revoked; contributors disabled. Corrupt or missing bytes, schema mismatch and incomplete copies cannot become a completed restore. Do not run any command against live data during this task.

- [x] Self-review the task diff, run `git diff --check`, and commit only this task’s files. Preserve synthetic PDF fixture whitespace from Plan 5.

## Task 3: Compiled release and Windows transfer tools

**Depends on:** Task 2.

Build Node ESM entrypoints locally with esbuild while keeping runtime packages external. Stage only compiled assets and package manifests; npm ci --omit=dev runs with the hosting Node 24 directory on PATH. Staging never switches the running release. Windows pull pins the database, downloads database/manifest, copies only missing immutable blobs into a shared local pool, uses one SFTP batch for database/manifest and one for all missing blobs, verifies all references and source freshness, and only then creates COMPLETE. Failed pulls notify only the configured local logged-on operator through Windows msg.exe and retain a nonzero exit. This includes setup, lock, transfer, verification and pin-release failures. Windows tests exercise transfer and notification dispatch with mocked commands; they do not establish real SSH or desktop delivery.

- [x] Write/extract the tests first.

#### File: `tests/server/production-build.test.ts`

<!-- replay task=3 phase=test encoding=text sha256=b11cfa23c98109128781d9fdd6fa07eb168d9f18a89778b5003c1ad86dd88a4a -->

``````typescript
import { afterEach, expect, test } from 'vitest';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
test('compiled production entrypoints run without tsx and serve a real health request', async () => {
  execFileSync(process.execPath, ['scripts/build-server.mjs'], { cwd: process.cwd() });
  expect(execFileSync(process.execPath, ['dist/server/runtime-check.mjs'], { encoding: 'utf8' })).toContain('runtime ok');
  const listener = createServer();
  await new Promise<void>((done) => listener.listen(0, '127.0.0.1', done));
  const address = listener.address();
  if (!address || typeof address === 'string') throw new Error('port_missing');
  const port = address.port;
  await new Promise<void>((done, reject) => listener.close(error => error ? reject(error) : done()));
  const root = mkdtempSync(join(tmpdir(), 'bb-production-')); roots.push(root);
  const child = spawn(process.execPath, [resolve('dist/server/main.mjs')], {
    cwd: root, stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production',
      BUILTBASIS_DATA_DIR: join(root, 'data'), PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
      PORT: String(port), HOST: '127.0.0.1', SHARE_LINK_KEY: 'a'.repeat(64),
      FILES_STORAGE_BUDGET_BYTES: '1000000000', FILES_FREE_RESERVE_BYTES: '1' },
  });
  const exited = new Promise<void>((done) => child.once('exit', () => done()));
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error('production_process_exited');
      try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); if (response.ok) { ready = true; break; } } catch { /* wait for listen */ }
      await new Promise(done => setTimeout(done, 50));
    }
    expect(ready).toBe(true);
  } finally { child.kill(); await exited; }
}, 15000);
``````

#### File: `tests/server/pull-script.test.ts`

<!-- replay task=3 phase=test encoding=text sha256=b241d50dc756411e1653e976ac8d2321a26775473e038708e2254a1c22efec37 -->

``````typescript
import { afterEach, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const roots: string[] = [];
afterEach(() => { roots.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'bb-pull-script-')); roots.push(root);
  const source = join(root, 'source'); mkdirSync(source);
  const repo = join(root, 'repo'); mkdirSync(join(repo, 'dist/server'), { recursive: true });
  mkdirSync(join(repo, 'scripts'));
  copyFileSync('scripts/pull-backup.ps1', join(repo, 'scripts/pull-backup.ps1'));
  writeFileSync(join(repo, 'dist/server/backup-export.mjs'), 'throw new Error("verifier must be mocked");');
  // The test mocks SSH, SFTP and the verifier process. Actual byte/freshness verification is covered by operations tests.
  writeFileSync(join(source, 'builtbasis.db'), 'synthetic metadata');
  const blobs = Array.from({ length: 128 }, (_, i) => {
    const data = Buffer.from(`blob-${i}`); const hash = createHash('sha256').update(data).digest('hex');
    writeFileSync(join(source, hash), data); return { hash, size: data.length };
  });
  writeFileSync(join(source, 'manifest.json'), JSON.stringify({ blobs }));
  return { root, source, blobs, repo };
}
function run(f: ReturnType<typeof fixture>, mode = 'success') {
  const destination = join(f.root, 'backup with spaces');
  const output = execFileSync('powershell.exe', ['-NoProfile', '-File', resolve('tests/operations/pull-harness.ps1'),
    '-Repo', f.repo, '-Fixture', f.source, '-Destination', destination, '-Mode', mode], { encoding: 'utf8' });
  return { report: JSON.parse(output.trim()), destination };
}
it.skipIf(process.platform !== 'win32')('uses two SFTP batches for 128 new blobs, metadata first, and skips existing blobs on the next pull', () => {
  const f = fixture(); const first = run(f);
  expect(first.report).toMatchObject({ batches: [2, 128], released: true, age: '24', failed: false, locked: false, notifications: 0 });
  expect(first.report.order.slice(0, 2)).toEqual(['builtbasis.db', 'manifest.json']);
  for (const b of f.blobs) expect(existsSync(join(first.destination, 'files', b.hash.slice(0, 2), b.hash))).toBe(true);
  const second = run(f);
  expect(second.report.batches).toEqual([2]);
}, 15000);
it.skipIf(process.platform !== 'win32').each(['setup', 'lock', 'ssh', 'sftp', 'integrity', 'stale', 'release', 'notification-failure'])('dispatches one local desktop failure notification for %s without hiding failure', mode => {
  const { report } = run(fixture(), mode);
  expect(report.failed).toBe(true);
  expect(report.notifications).toBe(1);
  expect(report.notificationTargets).toEqual(['fixture-operator']);
  if (mode === 'notification-failure') expect(report.deliveryWarnings).toBe(1);
  expect(report.locked).toBe(mode === 'lock');
}, 15000);
it.skipIf(process.platform !== 'win32')('fails an overdue-source verifier result, releases its pin and never publishes COMPLETE', () => {
  const { report, destination } = run(fixture(), 'stale');
  expect(report).toMatchObject({ failed: true, released: true, locked: false });
  expect(existsSync(join(destination, 'snapshots', 'a'.repeat(32), 'COMPLETE'))).toBe(false);
}, 15000);
it.skipIf(process.platform !== 'win32')('exits the scheduled PowerShell process nonzero after notifying of setup failure', () => {
  const f = fixture();
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-File', resolve('tests/operations/pull-harness.ps1'), '-Repo', f.repo,
      '-Fixture', f.source, '-Destination', join(f.root, 'backup'), '-Mode', 'setup', '-Uncaught'], { stdio: 'pipe' });
    throw new Error('Expected nonzero exit');
  } catch (error) { expect((error as { status?: number }).status).toBe(1); }
}, 15000);
``````

#### File: `tests/operations/pull-harness.ps1`

<!-- replay task=3 phase=test encoding=text sha256=bddf339d636430f7bfa83b97df6b9b9c890ddd705f9ade2de57885e3cad7aed2 -->

``````powershell
param([string]$Repo, [string]$Fixture, [string]$Destination, [string]$Mode = 'success', [switch]$Uncaught)
$ErrorActionPreference = 'Stop'
$global:TransferBatches = [Collections.Generic.List[object]]::new()
$global:Released = $false
$global:VerifiedAge = $null
$global:CopyOrder = [Collections.Generic.List[string]]::new()
$global:Notifications = 0
$global:NotificationTargets = [Collections.Generic.List[string]]::new()
function global:msg.exe { $global:Notifications++; $global:NotificationTargets.Add($args[0]); $global:LASTEXITCODE = $(if ($Mode -eq 'notification-failure') { 1 } else { 0 }) }
function global:ssh {
  $global:LASTEXITCODE = 0
  if ($args[-1] -like '* begin') { if ($Mode -eq 'ssh') { $global:LASTEXITCODE = 1; return }; return '{"id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}' }
  if ($args[-1] -like '* release *') { $global:Released = $true; if ($Mode -eq 'release') { $global:LASTEXITCODE = 1 }; return }
  throw 'Unexpected SSH command in mock'
}
function global:scp { throw 'Per-file SCP is forbidden in this test' }
function global:sftp {
  if ($Mode -eq 'sftp') { $global:LASTEXITCODE = 1; return }
  $index = [Array]::IndexOf($args, '-b')
  if ($index -lt 0) { throw 'Missing SFTP batch file' }
  $lines = @(Get-Content -LiteralPath $args[$index + 1])
  $global:TransferBatches.Add($lines.Count)
  foreach ($line in $lines) {
    if ($line -notmatch '^get "([^"]+)" "([^"]+)"$') { throw 'Unexpected SFTP operation' }
    $remote = $Matches[1]; $local = $Matches[2]
    $name = ($remote -split '/')[-1]
    $global:CopyOrder.Add($name)
    Copy-Item -LiteralPath (Join-Path $Fixture $name) -Destination $local
    if ($Mode -eq 'integrity' -and $name -match '^[a-f0-9]{64}$') { [IO.File]::WriteAllText($local, 'corrupt') }
  }
  $global:LASTEXITCODE = 0
}
function global:node {
  $index = [Array]::IndexOf($args, '--max-age-hours')
  if ($index -lt 0) { throw 'Missing source freshness limit' }
  $global:VerifiedAge = $args[$index + 1]
  if ($Mode -in @('stale','notification-failure')) { $global:LASTEXITCODE = 1; return }
  [IO.File]::WriteAllText((Join-Path $args[2] 'COMPLETE'), '{"sourceCreatedAt":"2026-10-04T00:00:00Z"}')
  $global:LASTEXITCODE = 0
}
$failed = $false
if ($Mode -eq 'setup') { Remove-Item -LiteralPath (Join-Path $Repo 'dist/server/backup-export.mjs') }
if ($Mode -eq 'lock') { [IO.Directory]::CreateDirectory((Join-Path $Destination '.pull-lock')) | Out-Null }
if ($Uncaught) { & (Join-Path $Repo 'scripts/pull-backup.ps1') -SshAlias fixture -RemoteRelease /fixture/release -RemoteData /fixture/data -Destination $Destination -MaxAgeHours 24; return }
$deliveryWarnings = @()
try { & (Join-Path $Repo 'scripts/pull-backup.ps1') -SshAlias fixture -RemoteRelease /fixture/release -RemoteData /fixture/data -Destination $Destination -MaxAgeHours 24 -NotificationUser fixture-operator -WarningAction SilentlyContinue -WarningVariable deliveryWarnings | Out-Null }
catch { $failed = $true }
[ordered]@{ notificationTargets = $global:NotificationTargets.ToArray(); deliveryWarnings = $deliveryWarnings.Count; notifications = $global:Notifications; batches = $global:TransferBatches.ToArray(); released = $global:Released; age = $global:VerifiedAge; failed = $failed; order = $global:CopyOrder.ToArray(); locked = Test-Path (Join-Path $Destination '.pull-lock') } | ConvertTo-Json -Compress
``````

- [x] Run the focused test before implementation: `npx vitest run tests/server/production-build.test.ts tests/server/pull-script.test.ts`. The production test fails because scripts/build-server.mjs does not exist. It must pass after extraction, exercising a real compiled process and HTTP health request without invoking tsx.

- [x] Write/extract the complete implementation files.

#### File: `scripts/build-server.mjs`

<!-- replay task=3 phase=implementation encoding=text sha256=efb2d0f87059177c85b3ff666ef7fd73fa5962d68665b0c3998998c48b411832 -->

``````javascript
import { build } from 'esbuild';
await build({
  entryPoints: {
    main: 'src/server/main.ts', owner: 'scripts/owner.ts', user: 'scripts/user.ts',
    'revoke-share-links': 'scripts/revoke-share-links.ts', backup: 'scripts/backup.ts',
    'backup-export': 'scripts/backup-export.ts', restore: 'scripts/restore.ts',
    'runtime-check': 'scripts/runtime-check.ts',
  },
  outdir: 'dist/server', outExtension: { '.js': '.mjs' }, platform: 'node', target: 'node22',
  format: 'esm', bundle: true, packages: 'external', sourcemap: false,
});
``````

#### File: `scripts/runtime-check.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=3e716b032927eac324f4a6bbde14df8e3d99e1662d201fc00c1e3849a3813d0d -->

``````typescript
import Database from 'better-sqlite3';
const db = new Database(':memory:');
try {
  if (db.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('sqlite_check_failed');
  console.log('runtime ok');
} finally { db.close(); }
``````

#### File: `scripts/stage-release.ps1`

<!-- replay task=3 phase=implementation encoding=text sha256=5783802721612998f464f731d2500fca8ea5501c4a1d34ade0761aee4d1e9b28 -->

``````powershell
param(
  [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9][A-Za-z0-9.-]*$')][string]$SshAlias,
  [Parameter(Mandatory)][ValidatePattern('^/[A-Za-z0-9_/-]+$')][string]$RemoteRoot,
  [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{7,40}$')][string]$ReleaseId
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($RemoteRoot.Contains('/../') -or $RemoteRoot.EndsWith('/..') -or $RemoteRoot -eq '/') { throw 'Unsafe remote root' }
$repo = Split-Path $PSScriptRoot -Parent
Push-Location $repo
$archive = Join-Path ([IO.Path]::GetTempPath()) ('builtbasis-release-' + [guid]::NewGuid().ToString('N') + '.tar.gz')
try {
  foreach ($required in @('dist/server/main.mjs','dist/web/index.html','package-lock.json')) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Missing build: $required" }
  }
  # Explicit allowlist. No source data, environment files, keys or node_modules.
  & tar -czf $archive dist/server dist/web package.json package-lock.json
  if ($LASTEXITCODE -ne 0) { throw 'Archive failed' }
  $release = "$RemoteRoot/releases/$ReleaseId"
  & ssh -o BatchMode=yes -- $SshAlias "umask 077; mkdir -p '$RemoteRoot/releases' && mkdir '$release'"
  if ($LASTEXITCODE -ne 0) { throw 'Release directory exists or cannot be created' }
  & scp -o BatchMode=yes -- $archive "${SshAlias}:$release/release.tar.gz"
  if ($LASTEXITCODE -ne 0) { throw 'Upload failed; existing release is unchanged' }
  & ssh -o BatchMode=yes -- $SshAlias "set -e; export PATH=/usr/local/nodejs/24/bin:`$PATH; cd '$release'; tar -xzf release.tar.gz; npm ci --omit=dev; /usr/local/nodejs/24/bin/node --check dist/server/main.mjs; /usr/local/nodejs/24/bin/node dist/server/runtime-check.mjs; rm release.tar.gz"
  if ($LASTEXITCODE -ne 0) { throw 'Staging verification failed; do not activate this release' }
  Write-Output "Staged $release. Follow the deployment guide to activate and verify. The running app was not changed."
} finally {
  if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
  Pop-Location
}
``````

#### File: `scripts/pull-backup.ps1`

<!-- replay task=3 phase=implementation encoding=text sha256=4bfe52b267fac265a265f6999c4868e449de2ddac26fc8b17a2b761b21056ef2 -->

``````powershell
[CmdletBinding()]
param(
  [string]$SshAlias,
  [string]$RemoteRelease,
  [string]$RemoteData,
  [string]$Destination,
  $MaxAgeHours = 36,
  [string]$NotificationUser = $env:USERNAME
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$lockCreated = $false
$exportId = $null
try {
if ($NotificationUser -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') { throw 'Invalid local notification user' }
Get-Command msg.exe -ErrorAction Stop | Out-Null
$MaxAgeHours = [double]::Parse([string]$MaxAgeHours, [Globalization.CultureInfo]::InvariantCulture)
if ($SshAlias -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]*$' -or [string]::IsNullOrWhiteSpace($Destination) -or $MaxAgeHours -le 0 -or [double]::IsInfinity($MaxAgeHours) -or [double]::IsNaN($MaxAgeHours)) { throw 'Invalid pull configuration' }
foreach ($path in @($RemoteRelease,$RemoteData)) {
  if ($path -notmatch '^/[A-Za-z0-9_/-]+$' -or $path.Contains('/../') -or $path.EndsWith('/..') -or $path -eq '/') { throw 'Unsafe remote path' }
}
$repo = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path -LiteralPath (Join-Path $repo 'dist/server/backup-export.mjs'))) { throw 'Build the matching server tools first' }
$root = [IO.Path]::GetFullPath($Destination)
[IO.Directory]::CreateDirectory($root) | Out-Null
$lock = Join-Path $root '.pull-lock'
New-Item -ItemType Directory -Path $lock -ErrorAction Stop | Out-Null
$lockCreated = $true
$remoteCommand = "cd '$RemoteRelease' && BUILTBASIS_DATA_DIR='$RemoteData' /usr/local/nodejs/24/bin/node dist/server/backup-export.mjs"
# One SFTP process handles a batch; never open one SSH connection per blob.
function Invoke-BatchTransfer([string[]]$Lines) {
  $batch = Join-Path ([IO.Path]::GetTempPath()) ('builtbasis-sftp-' + [guid]::NewGuid().ToString('N') + '.txt')
  try {
    [IO.File]::WriteAllLines($batch, $Lines, [Text.UTF8Encoding]::new($false))
    & sftp -q -o BatchMode=yes -b $batch -- $SshAlias
    if ($LASTEXITCODE -ne 0) { throw 'SFTP transfer failed; copy is incomplete' }
  } finally { if (Test-Path -LiteralPath $batch) { Remove-Item -LiteralPath $batch -Force } }
}
function Sftp-Quote([string]$Path) {
  if ($Path.IndexOfAny([char[]]"`r`n`"``") -ge 0) { throw 'Unsupported transfer path' }
  return '"' + $Path.Replace('\','/') + '"'
}
try {
  $response = & ssh -o BatchMode=yes -- $SshAlias "$remoteCommand begin"
  if ($LASTEXITCODE -ne 0) { throw 'Cannot pin a completed server backup' }
  $export = ($response -join "`n") | ConvertFrom-Json
  if ($export.id -notmatch '^[a-f0-9]{32}$') { throw 'Invalid export identifier' }
  $exportId = $export.id
  $bundle = Join-Path $root "snapshots/$exportId"
  [IO.Directory]::CreateDirectory($bundle) | Out-Null
  $remoteBundle = "$RemoteData/backups/.exports/$exportId"
  $metadataBatch = foreach ($name in @('builtbasis.db','manifest.json')) {
    'get ' + (Sftp-Quote "$remoteBundle/$name") + ' ' + (Sftp-Quote (Join-Path $bundle $name))
  }
  Invoke-BatchTransfer $metadataBatch
  $manifest = Get-Content -LiteralPath (Join-Path $bundle 'manifest.json') -Raw | ConvertFrom-Json
  $pool = Join-Path $root 'files'
  $fileBatch = [Collections.Generic.List[string]]::new()
  $downloads = [Collections.Generic.List[object]]::new()
  foreach ($blob in $manifest.blobs) {
    if ($blob.hash -notmatch '^[a-f0-9]{64}$' -or $blob.size -lt 0) { throw 'Invalid blob manifest' }
    $prefix = $blob.hash.Substring(0,2)
    $folder = Join-Path $pool $prefix
    [IO.Directory]::CreateDirectory($folder) | Out-Null
    $target = Join-Path $folder $blob.hash
    if (-not (Test-Path -LiteralPath $target)) {
      $partial = "$target.part"
      $fileBatch.Add('get ' + (Sftp-Quote "$RemoteData/files/$prefix/$($blob.hash)") + ' ' + (Sftp-Quote $partial))
      $downloads.Add(@{ Partial = $partial; Target = $target; Hash = $blob.hash; Size = $blob.size })
    }
  }
  if ($fileBatch.Count) { Invoke-BatchTransfer $fileBatch.ToArray() }
  foreach ($download in $downloads) {
    if ((Get-Item -LiteralPath $download.Partial).Length -ne $download.Size -or (Get-FileHash -LiteralPath $download.Partial -Algorithm SHA256).Hash.ToLowerInvariant() -ne $download.Hash) { throw 'Blob integrity failed' }
    Move-Item -LiteralPath $download.Partial -Destination $download.Target
  }
  & node (Join-Path $repo 'dist/server/backup-export.mjs') verify $bundle --files-dir $pool --max-age-hours $MaxAgeHours.ToString([Globalization.CultureInfo]::InvariantCulture)
  if ($LASTEXITCODE -ne 0) { throw 'Off-site verification failed; copy is incomplete' }
} finally {
  try {
    if ($exportId) {
      & ssh -o BatchMode=yes -- $SshAlias "$remoteCommand release $exportId"
      if ($LASTEXITCODE -ne 0) { throw "Export pin release failed: $exportId. Inspect active jobs and release it manually." }
    }
  } finally { if ($lockCreated) { Remove-Item -LiteralPath $lock; $lockCreated = $false } }
}
Write-Output "Verified off-site backup: $bundle"
} catch {
  $pullFailure = $_
  try {
    if ($NotificationUser -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') { throw 'Invalid notification target' }
    Get-Command msg.exe -ErrorAction Stop | Out-Null
    # Local operator only. No remote server argument, wildcard or messages containing private paths.
    & msg.exe $NotificationUser /time:300 'BuiltBasis off-site backup failed. Check the scheduled task and its private log. The latest recovery point may be overdue.'
    if ($LASTEXITCODE -ne 0) { throw 'Desktop notification delivery failed' }
  } catch { Write-Warning 'BuiltBasis backup failed and the local desktop notification could not be delivered. Check task history and the private log.' }
  throw $pullFailure
}
``````

- [x] GREEN: run `npx vitest run tests/server/production-build.test.ts tests/server/pull-script.test.ts` and require success.

- [x] Expect 12 focused tests: one compiled-process check and 11 Windows transfer/failure checks. Run npm run build and npm run typecheck. Parse both PowerShell scripts with System.Management.Automation.Language.Parser and require zero errors. Follow the production-only probe below. Actual SSH upload, scheduling and live activation remain Task 4/5; local tests do not claim those passed.

- [x] Self-review the task diff, run `git diff --check`, and commit only this task’s files. Preserve synthetic PDF fixture whitespace from Plan 5.

## Task 4: Stage the hosted release and pass hosting acceptance

**Depends on:** Task 3.

This task requires the owner’s actual hosting settings and live acceptance evidence. Follow the complete deployment guide below. Confirm account quota and private data/configuration paths, stage the reviewed commit, provision project data privately, activate only the BuiltBasis domain, and perform every hosting/proxy/capacity/browser check. A failed gate keeps release work In progress.

- [ ] Write/extract the complete implementation files.

#### File: `docs/guides/deployment.md`

<!-- replay task=4 phase=implementation encoding=text sha256=49b2535d9bc76ba6e42dfb61efe1f5dd8d7b9a884135f401387a4c254171b4ee -->

``````markdown
# Deploy and release BuiltBasis v1

> **Document type:** Operator guide
> **Status:** Proposed with Plan 6. Activate only after its deployment checks pass.
> **Contracts:** [Approved v1 design](../designs/2026-10-02-v1-records-design.md), [access guide](share-key-management.md), [backup and recovery](backup-restore.md).

## Build and stage

Run locally from a clean implementation commit. Run `npm ci --ignore-scripts`, `npm rebuild esbuild`, `npm run build`, `npm run typecheck`, `npm test` and `npm run test:browser` (installed Chrome requires `PLAYWRIGHT_CHANNEL=chrome`). Node 22.13 is the minimum; the trial used Node 24 on hosting. `dist/server` contains compiled application and administrative entrypoints. It does not need tsx on hosting. The package lock is retained, not regenerated on the server.

Stage with PowerShell 7 and OpenSSH:

```powershell
$release = git rev-parse HEAD
./scripts/stage-release.ps1 -SshAlias builtbasis-hetzner -RemoteRoot /usr/home/ktimana/builtbasis -ReleaseId $release
```

The script transfers only built assets, compiled server tools and the package manifests. It installs production dependencies with the Node 24 toolchain, checks the native SQLite module, and leaves the running release unchanged. It refuses an existing release directory. A failed stage is not usable; inspect and remove only that failed release directory before retrying. No command deletes the data folder. Keep at least the current and previous release until verification is complete.

## First activation and configuration

Use separate directories: `/usr/home/ktimana/builtbasis/releases/<commit>` for code, `/usr/home/ktimana/builtbasis/current` for its symlink, `/usr/home/ktimana/builtbasis-data` for data, and `/usr/home/ktimana/builtbasis-config/operations.env` for non-secret command-line configuration. The configuration directory and file are owner-readable only (700 and 600). They are outside code, data and backup transfers. Preserve the dedicated share key across releases. Do not put real configuration or account passwords in this repository.

Record the actual account quota and current usage from konsoleH before setting `FILES_STORAGE_BUDGET_BYTES` and `FILES_FREE_RESERVE_BYTES`. Budget for immutable files, the database, 14 daily/8 weekly backups, export pins, two releases and other sites. The filesystem free-space value is not the account quota. No default budget is assumed. Record the chosen values and rationale privately in the release checklist.

Set `BACKUP_MAX_AGE_HOURS` if the server-backup warning threshold should differ from its 36-hour default. Keep it aligned with the nightly schedule and the Windows pull's `-MaxAgeHours`. Set `FILES_WARNING_BELOW_BYTES` if the default 5,000,000,000 bytes (5 GB) remaining-file warning should change. These values are server configuration, not editable website settings. Administration always shows full status; the other owner screens show only warnings with a link to that page. Verify healthy status is hidden there, missing/unreadable status warns, and contributors/share/print cannot see monitoring. The [backup guide](backup-restore.md) explains the separate Windows failure message and logged-on-desktop requirement.

Set `BUILTBASIS_DATA_DIR`, `PUBLIC_BASE_URL=https://builtbasis.ktimanet.com`, `SHARE_LINK_KEY`, `BEHIND_CLOUDFLARE=1`, both storage settings, and `NODE_ENV=production`. Leave `PORT` unset: Hetzner supplies its socket. Keep `SHARE_LINK_KEY` only in the HTTP application settings in konsoleH. The command-line tools do not need it. Put only `BUILTBASIS_DATA_DIR` and any other needed non-secret settings in `operations.env`; keep the data path aligned with konsoleH. Never duplicate the share key into that file. Never print the key in logs. Cloudflare Full (strict) remains enabled.

Provision real project data locally using the existing `seed:gennadi` command against a fresh private data directory. Source contact CSV/workbook and the resulting database are private. Do not include them in the release archive. Transfer the closed initial database to the production data folder only while Node is deactivated and only when no production database exists. Preserve any existing database instead of replacing it. Verify its schema/integrity on the server. Once the app has live data, use the restore procedure for data replacement.

For first activation, deactivate the spike in konsoleH. Create `current` as a symlink to the verified release. Set script path `dist/server/main.mjs`, working directory `builtbasis/current/`, Node 24 and memory 384 MB. Keep the log outside the release directory, restrict access, and configure log rotation in the hosting controls. Set the environment values above. Create the owner with an interactive SSH terminal before admitting users:

```sh
cd /usr/home/ktimana/builtbasis/current
/usr/local/nodejs/24/bin/node --env-file=/usr/home/ktimana/builtbasis-config/operations.env dist/server/owner.mjs OWNER_LOGIN "Owner display name"
```

The password is prompted; never place it in the command line. Other deployed tools use `node --env-file=... dist/server/user.mjs`, `backup.mjs`, `backup-export.mjs`, `restore.mjs`, or `revoke-share-links.mjs`. Source-level npm administration commands require the development checkout and are not used in the staged production directory.

## Subsequent activation and rollback

Take and verify a completed database backup before activation. In konsoleH deactivate BuiltBasis, confirm the exact Node process has stopped, then repoint `current` to the staged release. Keep the recorded previous symlink target. Reactivate and make a request; startup applies migrations after the existing pre-migration backup. This deliberate stop prevents the platform restarting the old release during a switch. WordPress is a separate domain and must remain untouched.

The trial also proved that stopping the exact running Node process triggers restart on the next request. Use that for restarting the same release after a configuration change; never use `killall node` or a guessed PID. For release switching this guide uses deactivation so the switch happens while writes are stopped.

While deactivated, use an interactive SSH shell to switch the symlink. Set `release_id` to the exact reviewed commit staged above. This touches only the code symlink:

```sh
set -e
code_root=/usr/home/ktimana/builtbasis
release_id=REPLACE_WITH_REVIEWED_COMMIT
case "$release_id" in *[!a-f0-9]*|'') echo 'Invalid release id'; exit 1;; esac
test -f "$code_root/releases/$release_id/dist/server/main.mjs"
if test -e "$code_root/current" && ! test -L "$code_root/current"; then echo 'current is not a symlink'; exit 1; fi
readlink "$code_root/current" || true
ln -s "$code_root/releases/$release_id" "$code_root/current.next"
mv -Tf "$code_root/current.next" "$code_root/current"
```

Record the old target printed by readlink before switching. A pre-existing current.next stops the command; inspect it instead of deleting it blindly. Then reactivate BuiltBasis in konsoleH and complete the checks below. Repoint to the recorded previous target with the same stopped-service procedure if code-only rollback is compatible.

If verification fails, deactivate again. Switch back only if the earlier code supports the current schema. Otherwise use the offline restore procedure, retain failed data for diagnosis, and account for writes since the chosen backup. Do not automatically restore a database or downgrade a schema. Every restored database loses all sessions, links and contributor grants as described in the recovery guide.

## Required hosted acceptance

Use synthetic records/files and dedicated temporary test accounts first. Record results in the Plan 6 execution evidence, without tokens, cookies or passwords. A failing check prevents go-live.

- HTTPS login/logout, host-only Secure/HttpOnly/SameSite cookie, matching-Origin writes, cross-origin rejection, contributor permissions and share/private-file rejection work through Cloudflare. Raw share fragments, Authorization headers and cookies are absent from application and upstream logs. Confirm trust in Cloudflare visitor headers cannot be bypassed through direct origin access; configure origin restrictions before relying on them.
- Shell, record/API, authorized files and errors retain no-store/private/noindex/no-referrer rules; Cloudflare bypasses caching of application pages and API responses. Only hashed static assets are long-cached. Test a revoked link again from a separate browser session.
- Stream an exact 100,000,000-byte multipart request and a 100,000,001-byte request (including metadata and boundaries), with and without Content-Length where supported by the proxy. The first obeys format/record rules and the second returns 413 without a new occurrence. Test disconnect cleanup, 507 capacity handling and originals/range/HEAD semantics. Measure whole-request sizes; a 100 MB file alone exceeds the request limit. If the proxy rejects earlier, record the actual boundary and resolve it before release rather than silently lowering the approved limit.
- Measure peak Node RSS during concurrent representative uploads, backup, and ordinary reads under the 384 MB limit. Verify capacity reservations and restart behavior. Test Linux file and directory fsync and retained-blob visibility following a controlled app termination; do not simulate host power loss or claim power-loss proof.
- Verify the actual nightly cron and Windows scheduled pull each complete successfully. Perform the restore drill from that off-site copy in an isolated destination. Confirm hashes, record/evidence reads and invalidation of old access before reopening anything.
- Inspect A3 landscape output in English and Greek, short and multipage records, default printing without QR (including Drafts), explicit optional QR scanning, photo readability and refreshed footer times. Print to PDF on a supported desktop browser. Test the ordinary interface and media fallback on the owner's actual phone, including representative large photos/email/media. Synthetic Chrome viewport tests do not prove physical-device memory limits.
- Check `https://www.ktimanet.com/` still serves WordPress using a browser User-Agent. After successful acceptance, remove only the explicitly identified spike app/data artifacts from Plan 0. Preserve all application data and backups.

Release only when the hosted checks, real off-site drill and documentation reconciliation pass. Until then record Plan 6 as In progress. The design becomes Historical only after its enduring contracts are consolidated into the maintained v1 specification and Architecture. Planning replay alone is never go-live evidence.
``````

#### File: `docs/guides/release-checklist.md`

<!-- replay task=4 phase=implementation encoding=text sha256=337695e765bb63db414697a0602623cfbd16c5466307784230044cb270f5a141 -->

``````markdown
# v1 release checklist

> **Document type:** Release acceptance checklist
> **Status:** Proposed and unexecuted. Every box below is intentionally empty. Local tests and planning replay do not establish hosting, deployment or recovery success.
> **Authority:** [Approved design](../designs/2026-10-02-v1-records-design.md), [proposed specification](../specs/v1.md) and [roadmap](../plans/2026-10-02-v1-roadmap.md).

For every completed gate, record the date, operator, release commit, environment, command or procedure, observed result and a private evidence location. Record failures plainly. Do not copy credentials, tokens, contact data or private record content into this repository. Do not activate the specification or mark the design historical until the external gates are satisfied.

## Build and release identity

- [ ] Record the exact reviewed commit and clean build inputs. Run unit/API tests, TypeScript, production builds and browser tests. Retain their actual outputs and distinguish replay from implementation evidence.
- [ ] Check the release archive contains only compiled server/web assets and production dependency manifests. It must exclude `.env`, keys, database/files/backups, source CSV/workbooks and synthetic test credentials.
- [ ] Install production dependencies with the verified hosting Node executable on PATH. Run the native SQLite runtime check in the staged release. Confirm no source `tsx` command is required on hosting.
- [ ] Record the stable current-release path and separate private data/configuration paths. Verify deployment cannot overwrite data or external configuration. Exercise the documented restart and rollback procedure without silently rolling back a migrated database.

## Hosting, proxy and capacity

- [ ] Confirm `builtbasis.ktimanet.com` is the only domain changed. Check `ktimanet.com` WordPress before and after activation, including a representative existing page and its HTTPS response.
- [ ] Confirm local disk placement and SQLite locking on the production data path. Verify Linux file and directory sync support. Record the hosting Node version, socket activation and restart behavior.
- [ ] Verify Cloudflare proxying, Full (strict), origin certificate and intended hostname. Record whether origin access is restricted to Cloudflare. Test direct-origin reachability and the `CF-Connecting-IP` trust boundary. Keep the global login failure cap even when the client-IP header is enabled.
- [ ] Inspect application, hosting and Cloudflare logging settings. Verify Authorization headers, share/session tokens, passwords and private request bodies do not enter upstream logs. Verify private/no-store, no-referrer, noindex and protective content headers survive the proxy.
- [ ] Send valid multipart requests totaling exactly **100,000,000 bytes**, including all boundaries, metadata and file parts, through the public Cloudflare URL. Check both declared Content-Length and streaming requests where supported. Verify accepted bytes and metadata after success.
- [ ] Send a **100,000,001-byte** request through the public path. Verify rejection, no incomplete evidence occurrence and temporary-file cleanup. Exercise a disconnect during upload. Record any lower upstream limit as a blocking failure rather than advertising a larger limit than users can reach.
- [ ] Observe streaming upload memory on hosting under the actual **384 MB** process limit. Include a near-limit attachment, a photo bundle and realistic concurrent activity. Record peak resident memory, process stability and response results. Confirm the server does not buffer whole large uploads.
- [ ] Check authorised GET, HEAD, one byte range, suffix/open ranges, unsupported multiple ranges and If-Range behavior through the proxy. Verify originals, previews and media remain private and no-store. Test revoked, expired and wrong-record access.
- [ ] Record the actual hosting account storage allowance and current usage. Select explicit `FILES_STORAGE_BUDGET_BYTES` and `FILES_FREE_RESERVE_BYTES`, leaving capacity for retained immutable files, database, backups, export pins, logs and other account use. Filesystem free bytes alone do not establish account quota.
- [ ] Exercise capacity refusal using an isolated configured limit. Verify new uploads fail safely while reads/login work. Document who monitors usage and how capacity is increased. Do not delete published immutable files as a capacity response.

## Access, seed and browser acceptance

- [ ] Provision the unique owner through the compiled interactive CLI. Keep passwords out of arguments and logs. Verify contributor create/reset/disable/enable commands, independent Upload/Add Log grants, grant removal and Draft denial on the deployed release.
- [ ] Select the intended empty project/database for seed import. Read the private CSV/workbook sources without copying them into the repository or release. Use the source-checkout seed command with its development dependencies if it is not packaged. Record list counts and representative bilingual values; verify repeat import refuses duplication. Do not import historical record rows without a separate decision.
- [ ] Test a real phone camera upload and photo selection, including iPhone HEIC where available. Check orientation, missing capture date, preserved original, preview fallback, narrow layout, touch controls and reconnect/error feedback. Desktop viewport emulation is not this gate.
- [ ] Check representative EML/MSG, PDF, SVG, audio/video and download-only attachments on desktop and phone. Confirm no external email tracking requests, safe failure/cancel, original-download fallback and supported playback behavior.
- [ ] Inspect the Greek and English interface with actual project labels. Check keyboard use, phone-accessible definitions, owner/contributor separation, public/private Notes and private Log attachments. Confirm one public occurrence never reveals metadata of a private occurrence with identical bytes.
- [ ] Print representative Greek and English records to **A3 landscape PDF** from the intended desktop browser. Include long multi-page text, all subtypes, measurements/comparisons and Before/After photo limits. Inspect Greek glyphs, page breaks, clipping and pagination at actual scale.
- [ ] Print an ordinary record and a Draft with **Include QR link** off by default. Confirm no link is created, no QR is printed, Draft status is clear, and sharing-service failure does not block printing without QR. Enable QR on an eligible record, decode it and open it on a separate device. Verify it resolves to the owner-selected active existing share link. Confirm revoked/expired/Draft denial, no automatic link creation, fresh labels/footer after managed-list changes, and exclusion of Notes, Log, Activity and all private fields from every PDF.

## Backup and recovery

- [ ] Verify Administration is linked in owner navigation and always shows the completed server source date, backup-age limit, remaining allowance and configured 5 GB warning threshold. Healthy status must stay hidden on the working pages; missing/overdue/read-failure or low storage must show a compact warning linked to Administration, which disappears after recovery. Check below/at/above the configured allowance threshold, live upload reservations, filesystem reserve and accounting failures. No paths/secrets or implied hosting quota; contributors/share/print cannot see monitoring.
- [ ] Under the actual scheduled Windows identity, trigger a controlled pull failure and observe the local `msg.exe` desktop message. Verify setup/transfer/stale/release failures keep a nonzero task exit, failed notification delivery is logged, and success sends no message. Record the logged-on-desktop requirement and that a powered-off PC or a task that never runs cannot alert through this mechanism.

- [ ] Install nightly server cron with absolute Node, stable release directory and the existing external configuration file. Keep the share key out of cron text and backup directories. Observe an actual scheduled run, inspect its completed SQLite copy and confirm failed jobs produce a visible operator alert.
- [ ] Confirm retention keeps 14 daily and eight weekly UTC buckets while leaving pre-migration backups and immutable blobs intact. Verify rotation cannot break an active pinned export. Document abandoned-pin and stale-lock inspection without clearing active work.
- [ ] Install the owner's Windows scheduled pull to the intended private X: destination. Observe an actual scheduled run. Check database-first pin/copy, incremental immutable-file transfer, every-reference hash/size verification and COMPLETE creation only after success. Verify failure alerting, PC availability assumptions and remote export release.
- [ ] Perform an actual restore drill from that completed offsite copy into a fresh isolated destination using compatible release code. Keep production data untouched. Record the selected backup, verification result, restored records and representative original/preview/attachment checks.
- [ ] In the restored drill, verify all sessions are deleted, every share link revoked, every non-owner account disabled and all record grants cleared. Verify the owner is preserved. Demonstrate reset-password, enable and deliberate regrant before contributor access returns.
- [ ] Rehearse the real-cutover prerequisite: stop application and all backup/pull jobs, verify writers are stopped, restore to a fresh path, select data/configuration, then reopen access. Document rollback preservation and key-loss handling. A fixture-only unit test does not satisfy the actual offsite drill.

## Closeout

- [ ] Reconcile actual deployed behavior with the specification, Architecture and operator guides. Record any approved deviation explicitly. Remove stale future-work claims only for work actually completed.
- [ ] Record the release owner's acceptance and the evidence locations for all external gates. Activate `docs/specs/v1.md` and mark the approved design historical only at this point. Update the roadmap and release documentation without turning planning replay into deployment evidence.
``````

- [ ] Use the release checklist as the evidence index. Record real commands, outcomes, release identity, operator and evidence locations. Never substitute planning replay or synthetic fixtures for actual hosting evidence. Do not publish tokens, credentials, contact files or private record data in git.

- [ ] Self-review the task diff, run `git diff --check`, and commit only this task’s files. Preserve synthetic PDF fixture whitespace from Plan 5.

## Task 5: Observe scheduled backups and perform the off-site recovery drill

**Depends on:** Task 4.

Install nightly server cron and the Windows scheduled pull using the operating guide from Task 2. Verify the scheduled jobs actually run under their real identities, including X: availability, noninteractive SSH authentication and the logged-on desktop required for local failure notifications. Demonstrate actual warning/message delivery using isolated failure cases. Pin/copy database first, copy immutable files, verify, then mark complete. Monitor failed jobs and the source backup timestamp. New transfer or COMPLETE times cannot make an old recovery point current. Perform the drill from that actual off-site copy into a new isolated data directory.

- [ ] Record integrity/hash verification, restored records/files, owner access, zero old sessions/grants, revoked links and disabled contributors. Demonstrate password reset before enable and deliberate regrant. A real production cutover requires app and jobs stopped through access reset and verification; the drill must not replace production data. Keep the key outside backups. Complete all backup/recovery gates before v1 delivery.

- [ ] Self-review the task diff, run `git diff --check`, and commit only this task’s files. Preserve synthetic PDF fixture whitespace from Plan 5.

## Task 6: Reconcile the specification and close the release

**Depends on:** Task 5.

The complete proposed maintained specification below consolidates approved requirements; it introduces no new product scope. Reconcile it against actual delivered behavior and accepted release evidence. It stays Proposed until all release gates pass. There is no artificial RED test for documentation.

- [ ] Write/extract the complete implementation files.

#### File: `docs/specs/v1.md`

<!-- replay task=6 phase=implementation encoding=text sha256=cb3e8e488b8162dc583fbf512b26c8565c7640319283855ca9d72c4c4e885400 -->

``````markdown
# BuiltBasis v1 specification

> **Document type:** Maintained specification (proposed)
> **Status:** Proposed. Prepared for Plan 6 implementation and release reconciliation. This document does not establish deployment, hosting verification or successful recovery.
> **Authority:** Consolidates the [approved v1 design](../designs/2026-10-02-v1-records-design.md), including its approved 2026-10-03 revision. The design remains active until the release checklist is completed and the specification is explicitly activated.
> **Scope:** Records, bilingual fields and values, status rules, access, evidence, printing and operational invariants. No new product scope is introduced.
> **Related documents:** [Architecture](../ARCHITECTURE.md), [stack ADR](../adr/0001-v1-stack-and-hosting.md), [access and evidence guide](../guides/share-key-management.md), [backup and restore guide](../guides/backup-restore.md), [release checklist](../guides/release-checklist.md).

Sections 1–14 preserve the approved contract numbering for traceability. Appendix A consolidates the implemented evidence and browser contract. Project-specific seed input remains private data rather than part of the application specification.

## 1. Purpose

BuiltBasis is a lightweight construction-control application for an owner-run project. At the close-out stage of a construction project two things happen continuously:

1. **Correcting problems in built work** — defects, nonconformances, incomplete work, damage.
2. **Instructing before work happens** — clarifying a detail before it is built, so that problems are prevented.

Plus ordinary work items that are neither (purchases, arrangements, checks).

v1 lets the owner record, classify, measure, decide, evidence and track these items in one place, on desktop and phone, in English and Greek, and share individual records with the architect, contractors and subcontractors. Anonymous links remain read-only; named users may contribute evidence or Log entries when the owner grants permission on that record.

The first project using it is Gennadi 822A (three villas, Rhodes). Nothing in this specification is specific to that project; project-specific content (locations, trades, tags, people) is data.

## 2. Users and access

| Who | How | Can |
|---|---|---|
| **Owner** (one account) | Logs in | Everything: create, edit, classify, decide, share, configure lists |
| **Named user** | Logs in | View granted records; upload evidence and/or add Log entries only when separately permitted on that record |
| **Anyone holding a share link** | Opens a link, no account | View one record, read-only, without private content |

- The owner alone creates/edits records, makes decisions, changes status, manages lists and access, and edits/deletes existing content. Named users receive access **per record**, never automatically across a project.
- Each record grant has two independent permissions: **Upload photos and attachments** (Μεταφόρτωση φωτογραφιών και συνημμένων) and **Add Log entries** (Προσθήκη καταχωρίσεων στο ημερολόγιο). A grant also permits reading that record's non-private content. Both permissions off gives read-only access; removing the grant removes authenticated access. Draft records remain unavailable to named users. Anonymous share-link access remains independent.
- A user with Add Log permission may create public entries, but cannot edit/delete any existing entry, even their own, or make an entry private. Upload permission does not grant Add Log permission. Files may be attached only to accessible, public entries. Private content is never disclosed through a write operation or its error response.
- **Both Notes fields are owner-editable only.** Users contribute text through the Log. There is no Notes permission.
- Login usernames are credentials and are not published in record content. Evidence and Log contributions identify their author by a separate display name; storage retains the user ID. Owner and contributor account administration remains owner-controlled.
- **Private content** is visible only to the logged-in owner and is never included in share links or PDFs: the _Outside contract scope_ flag, _Estimated cost_, the _Private Notes_ field (§5.1), and log entries marked private together with their attachments (§5.11).

## 3. Language

- **Every fixed value and every UI label exists in English and Greek.** The whole interface switches language at any time.
- **Every value in every fixed list has a short definition** in both languages (given in §7). Definitions must be accessible on phones and by keyboard; hover alone is insufficient.
- **Managed lists** (trades, tags, location nodes, zone types) have an English and a Greek name; if one is empty, the other is shown.
- **Text the user types** (titles, descriptions, instruction text, notes, log entries, measurement labels) is stored and shown exactly as typed. It is never translated.
- Values are stored as **language-neutral codes** (e.g. `in_progress`); labels and definitions are looked up from the code.
- Language preference: the owner's choice is remembered. Share-link pages open in Greek by default and offer a language switch.

## 4. Record model

### 4.1 One generic record, three subtypes

Every item in BuiltBasis is a **Record**. Each record has exactly one **subtype**:

| Subtype | ID prefix | What it is |
|---|---|---|
| **Quality Issue** | `QI-` | Something wrong with work that has already been built. |
| **Detail Clarification** | `DC-` | An instruction or detail agreed **before** something is built, to prevent problems. |
| **Task** | `T-` | Any other piece of work to track. |

All subtypes share one structure (§5). Each subtype adds a few fields of its own (§6).

**Boundary between Quality Issue and Detail Clarification** — the deciding question is _has it been built yet?_

- Nothing built yet; something needs to be defined or agreed → **Detail Clarification**.
- Already built, and something is wrong — including when the cause is the design → **Quality Issue**.
- A Detail Clarification stays a Detail Clarification for its whole life; only its status changes.

### 4.2 Identifiers

- Every record has an internal numeric ID (never shown, never reused).
- Every record has a **human ID**: subtype prefix + 4-digit sequence **per project per subtype**, e.g. `QI-0001`, `DC-0007`, `T-0012`. Assigned at creation (including Draft), never reused, never changed.

### 4.3 Relationships between records

Records are **not linked to each other** in v1, with one exception:

- **Must be done before** (_Να γίνει πριν_): a record can name one or more other records of the same project that it must precede. The other record shows the reverse as **Requires first** (_Απαιτείται πρώτα_).
  - Any subtype can precede any subtype. Downstream work that is not otherwise a record (e.g. "Basement tiling") is created as a **Task** so it can be selected.
  - A record cannot precede itself. A link that would create a cycle is rejected.
  - The relationship is informational in v1: it does not block status changes. It is visible on both records and filterable ("records that must be done before X", "records that still block something").

All other references to other records (the requirement a nonconformance breaks, the record that replaces a cancelled one) are written as text in the **Reference** field, e.g. "Deviates from DC-0012".

## 5. Shared fields (all subtypes)

Field privacy: **P** = private (owner only). Shared record pages show every non-private field. The A3 print view / PDF shows exactly the fields listed in §12.

**Required fields** marked "required in active statuses" must be filled in every status except Draft, Cancelled and Superseded, which may be incomplete. The server enforces this on every save (§8.2).

### 5.1 Core

| Field | Greek | Type | Rules |
|---|---|---|---|
| Subtype | Υποκατηγορία | code (§7.1) | Required. Cannot change after creation. |
| ID | Κωδικός | `QI-0001` etc. | Generated (§4.2). |
| Title | Τίτλος | text, ≤ 200 chars | Required in active statuses. |
| Description | Περιγραφή | long text | Optional. Describes the matter and, where relevant, the exact physical item (e.g. "left side of the west balcony door frame"). |
| Status | Κατάσταση | code (§7.2) | Required. Rules in §8. |
| Status reason | Αιτιολογία κατάστασης | code (§7.3 / §7.4) + note | Required when status is On hold or Cancelled. |
| Reference | Αναφορά | text | Free text: drawings, documents, other record IDs. |
| Public Notes | Δημόσιες σημειώσεις | long text | Optional. Visible to authorised record readers; editable only by the owner. |
| Private Notes | Ιδιωτικές σημειώσεις | long text | Optional. **P.** Visible and editable only by the owner. Existing Notes content migrates to this field without becoming public; Public Notes starts empty. |
| Created / updated | Δημιουργία / ενημέρωση | timestamps + user | Automatic. |

### 5.2 People and responsibility

| Field | Greek | Type | Rules |
|---|---|---|---|
| Ball in court | Επόμενη ενέργεια από | one entry from the people list (§9.1) | Optional. **Who must act next.** Set manually by the owner. Every change is logged with its date (§5.12), so the time someone has held the ball is visible. |
| Responsible | Υπεύθυνος | one entry from the people list | Optional. The company or person responsible for doing the work. |
| Trades | Ειδικότητες | one or more from the trades list (§9.2) | Optional. Several allowed: a record can need a combination of trades. |

### 5.3 Classification and planning

| Field | Greek | Type | Rules |
|---|---|---|---|
| Severity | Σοβαρότητα | code (§7.9) | Optional. How serious the consequences are. |
| Priority | Προτεραιότητα | code (§7.10) | Optional; empty means none. How soon to act. |
| Due date | Προθεσμία | date | Optional. |
| Completion | Ολοκλήρωση | 0–100, steps of 10 | Optional. Shown as a progress bar. Independent of status (e.g. a multi-part correction 60% done). |
| Safety implications | Θέμα ασφαλείας | checkbox | Shown as a badge; filterable. |
| Tags | Ετικέτες | zero or more from the tag list (§9.3) | Groupings ("thematic groups"). |
| Must be done before | Να γίνει πριν | zero or more other records | §4.3. |

### 5.4 Commercial (private)

| Field | Greek | Type | Rules |
|---|---|---|---|
| Outside contract scope | Εκτός σύμβασης | checkbox | **P.** Ticked when the work is outside the existing contract (extra work or change). |
| Estimated cost (€) | Εκτιμώμενο κόστος (€) | number, 2 decimals | **P.** Shown and editable only when _Outside contract scope_ is ticked. Unticking keeps the stored value but hides it and excludes it from totals; re-ticking shows it again. List totals sum non-empty estimates of records currently marked _Outside contract scope_ only. |

### 5.5 Location

| Field | Greek | Type | Rules |
|---|---|---|---|
| Location | Θέση | one or more nodes of the project's location tree (§9.4) | Optional (a project-wide record may leave it empty). |

Rules:

1. **Ticking a node means the record concerns that place as a whole** (or in general). Ticking "Villa 2" means the whole villa — not "somewhere inside it, unknown where".
2. **Filtering on a node returns records ticked on that node or on any node inside it.** A filter on "Villa 2" includes records ticked on Villa 2's kitchen.
3. A record ticked on several nodes appears **once** in any list and is **counted once**.
4. The location tree stops at room/space level. **Physical items** (a door frame, its left side, a step, a roof edge) are **not** modelled; they are described in the Description and in measurement item labels.

### 5.6 Decision and instruction

Shown for Quality Issues and Detail Clarifications; not shown for Tasks.

| Field | Greek | Type | Rules |
|---|---|---|---|
| Options considered | Εξεταζόμενες λύσεις | list of options: short label + description | Optional. Any number. Proposals (including cheaper alternatives) are kept even when rejected. |
| Chosen option | Επιλεγμένη λύση | one of the options | Optional. |
| Decided by | Αποφάσισε | one entry from the people list | Optional; **required** for a QI whose disposition is _Repair_ or _Accept as is_ (§6.1). May be the owner. |
| Decided on | Ημερομηνία απόφασης | date | Optional; **required** under the same condition as _Decided by_. |
| Instruction text | Κείμενο εντολής | long text | Optional. **Stored exactly as issued** (original language, original wording). Never rewritten by translation. Editable; every change is logged with the previous and the new text, author and time (§5.12). Record and PDF show the current text. |

### 5.7 Measurements

A record can hold any number of **measurement sets**; each set holds any number of **rows**. Nothing about _what_ is measured is predefined.

**Measurement set**

| Field | Greek | Type | Rules |
|---|---|---|---|
| Date | Ημερομηνία | date | Required. |
| Measured by | Μέτρησε | one entry from the people list | Optional. |
| Phase | Φάση | code (§7.13) | Required. Before / After / Other. |
| Note | Σημείωση | text | Optional. |

**Measurement row**

| Field | Greek | Type | Rules |
|---|---|---|---|
| Item | Αντικείμενο | free text | Required. What physical thing was measured, e.g. "Left side of frame", "Stair, 3rd step". |
| Quantity | Μέγεθος | free text | Required. What was measured, e.g. "Stone thickness", "Width", "Slope". |
| Value | Τιμή | number | Required. |
| Unit | Μονάδα | code (§7.14) | Required. |
| Note | Σημείωση | text | Optional. |

**Label suggestions.** When typing _Item_ and _Quantity_, the field suggests labels already used in the same record, so the same thing is labelled identically across sets.

**Rules:**

- **Matching:** labels match when equal after trimming, collapsing internal whitespace and ignoring letter case. Rows with different units are never compared.
- **Uniqueness:** within one measurement set, the normalised _Item + Quantity + Unit_ must be unique (a duplicate row is rejected).
- **Set order:** by measurement date, then by creation order (internal set ID).
- **Differences:** later value minus earlier value; between items, each item is compared with the first item in display order.

**Comparison views** (generated automatically; no configuration):

1. **Between items** — within one measurement set, for one _Quantity_ (and one unit), all items side by side as bars with their values and the differences between them. Example: _Stone thickness_ — Left 18 · Right 15.3 · Top 20.
2. **Before vs after** — the same _Item + Quantity_ (and unit) across measurement sets, in set order, with the change between consecutive sets.

### 5.8 Photos

| Field | Greek | Type | Rules |
|---|---|---|---|
| Image | Εικόνα | image file | Required. Uploaded from desktop or directly from the phone camera (online). |
| Phase | Φάση | code (§7.15) | Required. Before / During / After. |
| Caption | Λεζάντα | text | Optional. |
| Date taken | Ημερομηνία λήψης | date-time | Read automatically from the photo's metadata when present; editable. |

The record shows photos grouped by phase. The original file is always kept unchanged; storage and access rules in §11.4.

### 5.9 Attachments

Attachments have a file, optional title, original filename and upload date. Any number per record. The explicit accepted-format list is defined in Appendix A. Capabilities are separate from user permissions:

| Format category | Upload | View / play | Download |
|---|---|---|---|
| Images and PDF | Yes | Yes | Yes |
| Email (EML, MSG) | Yes | Yes — readable message | Yes — original file |
| Video and audio | Yes | Yes | Yes |
| Office documents, CAD, BIM and archives | Yes | No in v1 | Yes |

Email viewing shows sender/recipients, subject, date and message content. The original remains unchanged. Email rendering must not execute embedded active content or fetch remote tracking resources. Uploaded-content Blob URLs must never be opened or framed as documents. SVG share previews display a generated raster image rather than exposing an original SVG Blob URL; owner/contributor viewers may use the authorised server route with its protective headers. Media viewing uses supported browser encodings; the original remains downloadable when a browser cannot play an encoding. The server provides authorised bytes and capability descriptors; the browser provides readers and players. No CAD/BIM viewer, Office conversion or server video transcoding is included. Storage and access rules are in §11.4.

Attachments are added in two ways: **directly** to the record, or **through a log entry** (§5.11). The **Attachments pane lists all of the record's attachments**; those added through a log entry also show that entry's date and text (e.g. "Plans.pdf · 2026-05-01 · Architect sent plans"). Attachments of private log entries are private.

### 5.10 Verification

Recorded on exactly two transitions (§8.1): **Ready for verification → Closed** (outcome _passed_) and **Ready for verification → In progress** (outcome _failed_). No other transition creates a verification entry (e.g. a DC superseded while Ready for verification creates none). A record can have several verification entries over time (e.g. one failed, then one passed).

| Field | Greek | Type | Rules |
|---|---|---|---|
| Checked by | Ελέγχθηκε από | one entry from the people list | Required. |
| Date | Ημερομηνία | date | Required. |
| Method | Μέθοδος | code (§7.16) | Required. |
| Outcome | Αποτέλεσμα | code (§7.17) | Set by the transition: → Closed = _passed_; → In progress = _failed_. Not chosen separately. |
| Note | Σημείωση | text | Optional. |

### 5.11 Log (Ημερολόγιο)

A manual, dated record of what happened, entered by the user — e.g. "2026-05-01 · Architect sent plans", "2026-05-02 · Contractor confirmed receipt of plans". Any number of entries per record, shown newest first (by event date & time, then by logged-at).

| Field | Greek | Type | Rules |
|---|---|---|---|
| Event date & time | Ημερομηνία & ώρα γεγονότος | date-time | Required. When it happened. Defaults to now; editable. Shown in the UI. |
| Entry | Καταχώριση | long text | Required. |
| Logged by | Καταχώρισε | user | Automatic: the logged-in user. |
| Logged at | Χρόνος καταχώρισης | timestamp | Automatic: when the entry was created. **Always stored, never editable, not shown in the UI.** |
| Last edited at | Τελευταία επεξεργασία | timestamp | Automatic: when the entry was last changed; empty if never edited. Stored, not shown in the UI. |
| Attachments | Συνημμένα | zero or more files | Optional. Stored as record attachments linked to this entry (§5.9). |
| Private | Ιδιωτικό | checkbox | **P** when ticked: the entry and its attachments never appear in share links or PDFs. |

The owner may add public or private entries and edit/delete entries. A named user with the record’s Add Log grant may add public entries only; adding files also requires that record’s Upload grant. Upload alone permits adding an attachment to an existing public entry on that record; it does not permit editing the entry text or existing attachments. **Deleting an entry also deletes its attachment occurrences in the same transaction** (stored blobs and other occurrences of the same blob are untouched, §11.4), so deleting a private entry can never turn its attachments public. Removing an attachment from either the Log or the Attachments pane removes the same occurrence from both. The Log is separate from the automatic Activity log (§5.12), which records system changes.

### 5.12 Activity log

Automatic, append-only, per record. Logs: creation; every status change (with reason where required); changes to ball in court, responsible, severity, priority, due date, disposition, chosen option, decided by/on; every change to the instruction text (previous and new text); verification entries; share links created or revoked. Each entry: what changed, from → to, who, when. Activity entries about private fields and access management are visible only to the owner. Administrative bulk share-link revocation after key loss/change or restore emits a system reason and affected count instead of attributing an owner action to each record; owner-requested link revocation is still recorded per record.

## 6. Subtype-specific fields

### 6.1 Quality Issue

| Field | Greek | Type | Rules |
|---|---|---|---|
| Type of problem | Είδος προβλήματος | one or more codes (§7.5) | Required in active statuses. Several can apply at once (e.g. Defect + Nonconformance). When **Nonconformance** is ticked, the broken requirement should be written in _Reference_. |
| Stage | Στάδιο | code (§7.6) | Optional. When in the project the problem was found. |
| Disposition | Τρόπος αντιμετώπισης | code (§7.7) | Empty until decided. **Required before the status can become Issued or In progress, and for closing without verification.** _Repair_ and _Accept as is_ also require _Decided by_ and _Decided on_ (§5.6). _Accept as is_ allows closing without corrective work (§8.1). |
| Correction | Διόρθωση | long text | Optional. The work that fixes the problem. |

### 6.2 Detail Clarification

| Field | Greek | Type | Rules |
|---|---|---|---|
| Question | Ερώτημα | long text | Required in active statuses. What needs defining or agreeing, and where. |
| Route | Διαδικασία | code (§7.8) | Optional. How the clarification is handled. |
| Issued by | Εκδόθηκε από | one entry from the people list | Optional. Who issued the instruction (architect, engineer, owner…). |

The decision and instruction text use the shared fields (§5.6). Sketches and drawings are attachments (§5.9).

### 6.3 Task

No additional fields. Uses the shared structure only.

## 7. Value lists

Every value: code, English label, Greek label, English definition, Greek definition. Codes are stable; labels and definitions may be refined later without data changes.

### 7.1 Subtype (Υποκατηγορία)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `quality_issue` | Quality Issue | Ζήτημα ποιότητας | Something wrong with work that has already been built. | Πρόβλημα σε εργασία που έχει ήδη εκτελεστεί. |
| `detail_clarification` | Detail Clarification | Τεχνική διευκρίνιση | An instruction or detail agreed before something is built, to prevent problems. | Οδηγία ή λεπτομέρεια που συμφωνείται πριν από την κατασκευή, ώστε να προληφθούν προβλήματα. |
| `task` | Task | Εργασία | Any other piece of work to track. | Οποιαδήποτε άλλη εργασία προς παρακολούθηση. |

### 7.2 Status (Κατάσταση)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `draft` | Draft | Πρόχειρο | Not finished being written. Never shown in share links. | Η καταχώριση δεν έχει ολοκληρωθεί. Δεν εμφανίζεται ποτέ σε συνδέσμους κοινοποίησης. |
| `open` | Open | Ανοιχτό | Logged and complete, but nobody has yet been asked to decide or act. | Καταγράφηκε πλήρως, αλλά δεν έχει ζητηθεί ακόμη από κανέναν να αποφασίσει ή να ενεργήσει. |
| `awaiting_decision` | Awaiting decision | Αναμονή απόφασης | Someone (usually the architect) has been asked to decide what should be done. | Έχει ζητηθεί από κάποιον (συνήθως τον αρχιτέκτονα) να αποφασίσει τι πρέπει να γίνει. |
| `issued` | Issued | Εκδόθηκε | The decision is made and the instruction has gone to whoever does the work; the work has not started. | Η απόφαση πάρθηκε και η εντολή δόθηκε σε όποιον εκτελεί την εργασία· η εργασία δεν έχει ξεκινήσει. |
| `in_progress` | In progress | Σε εξέλιξη | The work has started. | Η εργασία έχει ξεκινήσει. |
| `ready_for_verification` | Ready for verification | Προς έλεγχο | Reported as done; waiting for someone to check it. | Δηλώθηκε ως ολοκληρωμένο· αναμένεται έλεγχος. |
| `on_hold` | On hold | Σε αναμονή | Paused by a decision or by circumstances. A reason is required. | Σε παύση λόγω απόφασης ή συνθηκών. Απαιτείται αιτιολογία. |
| `closed` | Closed | Κλειστό | Finished; nothing more to do. | Ολοκληρώθηκε· δεν απαιτείται άλλη ενέργεια. |
| `cancelled` | Cancelled | Ακυρώθηκε | Will not be pursued. A reason is required. | Δεν θα προχωρήσει. Απαιτείται αιτιολογία. |
| `superseded` | Superseded | Αντικαταστάθηκε | Replaced by a later clarification and kept as history. Detail Clarification only. | Αντικαταστάθηκε από μεταγενέστερη διευκρίνιση και διατηρείται ως ιστορικό. Μόνο για τεχνικές διευκρινίσεις. |

**Statuses per subtype:** Quality Issue and Task use all statuses except `superseded`. Detail Clarification uses all statuses.

### 7.3 On-hold reason (Αιτιολογία αναμονής)

A note is required with `other`; optional otherwise.

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `waiting_material` | Waiting for material | Αναμονή υλικού | Needed material or equipment has not arrived. | Δεν έχει φτάσει το απαιτούμενο υλικό ή εξοπλισμός. |
| `waiting_trade` | Waiting for another trade | Αναμονή άλλης ειδικότητας | Another trade must work first. | Πρέπει πρώτα να εργαστεί άλλη ειδικότητα. |
| `waiting_information` | Waiting for information | Αναμονή πληροφοριών | Information or documents are missing. | Λείπουν πληροφορίες ή έγγραφα. |
| `deferred` | Deferred | Αναβολή | Deliberately postponed, e.g. to winter or a later stage. | Μετατέθηκε σκόπιμα, π.χ. για τον χειμώνα ή για επόμενο στάδιο. |
| `weather` | Weather | Καιρικές συνθήκες | The weather prevents the work. | Οι καιρικές συνθήκες δεν επιτρέπουν την εργασία. |
| `other` | Other | Άλλο | Any other reason, explained in the note. | Άλλος λόγος, που εξηγείται στη σημείωση. |

### 7.4 Cancellation reason (Αιτιολογία ακύρωσης)

A note is required with `replaced` (the replacing record's ID) and `other`.

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `duplicate` | Duplicate | Διπλοεγγραφή | The same matter is already recorded. | Το ίδιο θέμα έχει ήδη καταχωριστεί. |
| `raised_in_error` | Raised in error | Λάθος καταχώριση | Recorded by mistake. | Καταχωρίστηκε κατά λάθος. |
| `no_longer_needed` | No longer needed | Δεν χρειάζεται πλέον | Circumstances changed; nothing needs doing. | Οι συνθήκες άλλαξαν· δεν απαιτείται ενέργεια. |
| `replaced` | Replaced by another record | Αντικαταστάθηκε από άλλη εγγραφή | Continued in another record, whose ID is written in the note. | Συνεχίζεται σε άλλη εγγραφή, ο κωδικός της οποίας σημειώνεται στη σημείωση. |
| `other` | Other | Άλλο | Any other reason, explained in the note. | Άλλος λόγος, που εξηγείται στη σημείωση. |

### 7.5 Type of problem (Είδος προβλήματος) — Quality Issue, multiple choice

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `nonconformance` | Nonconformance | Μη συμμόρφωση | Differs from an agreed requirement (drawing, specification, instruction or clarification). Write the requirement in _Reference_. | Διαφέρει από συμφωνημένη απαίτηση (σχέδιο, προδιαγραφή, εντολή ή διευκρίνιση). Η απαίτηση σημειώνεται στο πεδίο _Αναφορά_. |
| `defect` | Defect | Ελάττωμα | Faulty workmanship or material. | Κακοτεχνία ή ελαττωματικό υλικό. |
| `incomplete` | Incomplete work | Ημιτελής εργασία | Work that has not been finished. | Εργασία που δεν έχει ολοκληρωθεί. |
| `damage` | Damage | Φθορά / Ζημιά | Was fine, damaged afterwards. | Ήταν σε καλή κατάσταση και υπέστη ζημιά αργότερα. |
| `design_coordination` | Design / coordination issue | Σφάλμα μελέτης / συντονισμού | Built as drawn, but the design is wrong, incomplete, or clashes with other work. | Κατασκευάστηκε σύμφωνα με τα σχέδια, αλλά η μελέτη είναι λανθασμένη, ελλιπής ή συγκρούεται με άλλες εργασίες. |
| `other` | Other | Άλλο | None of the above. | Κανένα από τα παραπάνω. |

### 7.6 Stage (Στάδιο) — Quality Issue

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `construction` | Construction | Κατασκευή | Found while the works are still ongoing. | Εντοπίστηκε ενώ οι εργασίες βρίσκονται σε εξέλιξη. |
| `pre_handover` | Pre-handover | Προ-παράδοση | Found in the owner's own checks before the formal handover inspection ("pre-punch"). | Εντοπίστηκε σε ελέγχους του ιδιοκτήτη πριν από την επίσημη αυτοψία παράδοσης. |
| `handover` | Handover | Παράδοση | Found at the formal handover inspection (punch / snag list). | Εντοπίστηκε στην επίσημη αυτοψία παράδοσης (λίστα παρατηρήσεων). |
| `warranty` | Warranty | Περίοδος εγγύησης | Found after handover, during the defects liability period. | Εντοπίστηκε μετά την παράδοση, εντός της περιόδου εγγύησης. |

### 7.7 Disposition (Τρόπος αντιμετώπισης) — Quality Issue

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `rework` | Rework | Επανεκτέλεση | Modify the existing work until it matches what was agreed. | Τροποποίηση της υφιστάμενης εργασίας ώστε να συμφωνεί με τα συμφωνημένα. |
| `replace` | Replace | Αντικατάσταση | Remove and build again. | Αφαίρεση και εκ νέου κατασκευή. |
| `repair` | Repair | Επισκευή | Make it acceptable without fully matching what was agreed. Requires approval from the authorised decision-maker, recorded in _Decided by_ / _Decided on_. | Αποκατάσταση σε αποδεκτό επίπεδο χωρίς πλήρη συμφωνία με τα συμφωνημένα. Απαιτεί έγκριση από τον αρμόδιο, με καταγραφή του ονόματος και της ημερομηνίας απόφασης. |
| `accept_as_is` | Accept as is | Αποδοχή ως έχει | Leave it; the deviation is accepted by whoever has the authority. | Παραμένει ως έχει· η απόκλιση γίνεται αποδεκτή από τον αρμόδιο. |

### 7.8 Route (Διαδικασία) — Detail Clarification

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `rfi` | RFI | Αίτημα διευκρίνισης | The contractor asks the designer to clarify something before building. | Ο εργολάβος ζητά από τον μελετητή διευκρίνιση πριν από την κατασκευή. |
| `instruction` | Instruction | Εντολή | A detail or instruction is issued, on the issuer's own initiative or after discussion. | Εκδίδεται λεπτομέρεια ή εντολή, με πρωτοβουλία του εκδότη ή μετά από συζήτηση. |
| `submittal` | Submittal | Υποβολή προς έγκριση | The contractor submits a drawing, product or sample for approval before using it. | Ο εργολάβος υποβάλλει σχέδιο, προϊόν ή δείγμα προς έγκριση πριν από τη χρήση του. |
| `mockup` | Mock-up | Δείγμα / δοκιμαστική κατασκευή | One is built first and approved, then repeated. | Κατασκευάζεται πρώτα ένα δείγμα, εγκρίνεται και έπειτα επαναλαμβάνεται. |
| `other` | Other | Άλλο | Any other route. | Άλλη διαδικασία. |

### 7.9 Severity (Σοβαρότητα)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `critical` | Critical | Κρίσιμο | Serious safety risk, structural failure or major water ingress. | Σοβαρός κίνδυνος για την ασφάλεια, αστοχία του φέροντος οργανισμού ή εκτεταμένη εισροή νερού. |
| `major` | Major | Σημαντικό | Material impairment of function, durability or appearance. | Ουσιώδης υποβάθμιση της λειτουργίας, της ανθεκτικότητας ή της εμφάνισης. |
| `minor` | Minor | Μικρό | Local cosmetic imperfection, with no material effect on function or safety. | Τοπική αισθητική ατέλεια, χωρίς ουσιώδεις επιπτώσεις στη λειτουργία ή την ασφάλεια. |

Severity describes consequences only. Urgency belongs to _Priority_ (§7.10) and dependencies to _Must be done before_ (§4.3).

### 7.10 Priority (Προτεραιότητα) — empty means none

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `urgent` | Urgent | Επείγον | Act now: something is waiting on it today or this week. | Άμεση ενέργεια: κάτι εξαρτάται από αυτό σήμερα ή αυτή την εβδομάδα. |
| `high` | High | Υψηλή | Deal with it in the current work cycle (the next one to two weeks). | Αντιμετώπιση στον τρέχοντα κύκλο εργασιών (τις επόμενες μία έως δύο εβδομάδες). |
| `medium` | Medium | Μεσαία | Schedule normally, before the current stage ends. | Κανονικός προγραμματισμός, πριν ολοκληρωθεί το τρέχον στάδιο. |
| `low` | Low | Χαμηλή | No time pressure; whenever convenient. | Χωρίς χρονική πίεση· όποτε είναι βολικό. |

### 7.11 Person role (Ρόλος) — people list

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `owner` | Owner | Ιδιοκτήτης | The project owner. | Ο ιδιοκτήτης του έργου. |
| `owner_rep` | Owner's representative | Εκπρόσωπος ιδιοκτήτη | Acts on site or in decisions on the owner's behalf. | Ενεργεί στο έργο ή στις αποφάσεις για λογαριασμό του ιδιοκτήτη. |
| `architect` | Architect / designer | Αρχιτέκτονας / μελετητής | Designs the work and decides design questions. | Μελετά το έργο και αποφασίζει για θέματα μελέτης. |
| `engineer` | Engineer | Μηχανικός | Structural, mechanical or electrical engineer. | Στατικός, μηχανολόγος ή ηλεκτρολόγος μηχανικός. |
| `main_contractor` | Main contractor | Γενικός εργολάβος | Holds the main construction contract. | Έχει την κύρια σύμβαση κατασκευής. |
| `subcontractor` | Subcontractor | Υπεργολάβος | Carries out a specific trade or package. | Εκτελεί συγκεκριμένη ειδικότητα ή πακέτο εργασιών. |
| `supplier` | Supplier | Προμηθευτής | Supplies materials or equipment. | Προμηθεύει υλικά ή εξοπλισμό. |
| `other` | Other | Άλλος | Anyone else. | Οποιοσδήποτε άλλος. |

### 7.12 Location node kind (Είδος θέσης)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `building` | Building | Κτίριο | A building, or a group of works treated as one (e.g. "Site — shared infrastructure", "Off-site"). | Κτίριο ή ομάδα εργασιών που αντιμετωπίζεται ενιαία (π.χ. «Κοινόχρηστες υποδομές», «Εκτός έργου»). |
| `level` | Level | Επίπεδο | A floor or level (basement, ground, upper, roof, external). | Όροφος ή επίπεδο (υπόγειο, ισόγειο, όροφος, δώμα, εξωτερικός χώρος). |
| `space` | Space | Χώρος | A room or defined area within a level. | Δωμάτιο ή οριοθετημένος χώρος μέσα σε επίπεδο. |
| `other` | Other | Άλλο | Any other kind of place. | Άλλο είδος θέσης. |

### 7.13 Measurement phase (Φάση μέτρησης)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `before` | Before | Πριν | Measured before the correction or work. | Μέτρηση πριν από τη διόρθωση ή την εργασία. |
| `after` | After | Μετά | Measured after the correction or work. | Μέτρηση μετά τη διόρθωση ή την εργασία. |
| `other` | Other | Άλλο | Any other moment, e.g. an interim check. | Άλλη χρονική στιγμή, π.χ. ενδιάμεσος έλεγχος. |

### 7.14 Unit (Μονάδα)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `mm` | mm | χιλ. | Millimetre. | Χιλιοστό του μέτρου. |
| `cm` | cm | εκ. | Centimetre. | Εκατοστό του μέτρου. |
| `m` | m | μ. | Metre. | Μέτρο. |
| `m2` | m² | τ.μ. | Square metre. | Τετραγωνικό μέτρο. |
| `m3` | m³ | κ.μ. | Cubic metre. | Κυβικό μέτρο. |
| `percent` | % | % | Percentage, e.g. a slope. | Ποσοστό, π.χ. κλίση. |
| `degree` | ° | ° | Angle in degrees. | Γωνία σε μοίρες. |
| `pcs` | pcs | τεμ. | Number of pieces. | Αριθμός τεμαχίων. |

### 7.15 Photo phase (Φάση φωτογραφίας)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `before` | Before | Πριν | Shows the condition before the correction or work. | Δείχνει την κατάσταση πριν από τη διόρθωση ή την εργασία. |
| `during` | During | Κατά τη διάρκεια | Taken while the work is underway. | Λήφθηκε κατά την εκτέλεση της εργασίας. |
| `after` | After | Μετά | Shows the finished result. | Δείχνει το τελικό αποτέλεσμα. |

### 7.16 Verification method (Μέθοδος ελέγχου)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `visual` | Visual | Οπτικός | Checked by looking at the work, on site or in photos. | Έλεγχος με επιθεώρηση της εργασίας, επί τόπου ή μέσω φωτογραφιών. |
| `measurement` | Measurement | Μέτρηση | Checked with a recorded measurement set. | Έλεγχος με καταγεγραμμένες μετρήσεις. |
| `document` | Document | Έγγραφο | Checked against a certificate, declaration or report. | Έλεγχος μέσω πιστοποιητικού, δήλωσης ή έκθεσης. |
| `test` | Test | Δοκιμή | Checked by a functional test (e.g. water, pressure, electrical). | Έλεγχος με δοκιμή λειτουργίας (π.χ. στεγανότητας, πίεσης, ηλεκτρολογική). |

### 7.17 Verification outcome (Αποτέλεσμα ελέγχου)

Set by the transition (§5.10), never chosen directly.

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `passed` | Passed | Επιτυχής | The check confirmed the result is acceptable. | Ο έλεγχος επιβεβαίωσε ότι το αποτέλεσμα είναι αποδεκτό. |
| `failed` | Failed | Ανεπιτυχής | The check found that further work is required. | Ο έλεγχος έδειξε ότι απαιτούνται πρόσθετες εργασίες. |

## 8. Status rules

### 8.1 Allowed transitions

| From | To | Conditions |
|---|---|---|
| Draft | Open | Required fields complete (Title; _Type of problem_ for QI; _Question_ for DC). |
| Draft | Cancelled | Reason required. Required fields may remain incomplete. |
| Open | Awaiting decision · Issued · In progress · On hold · Cancelled | Issued or In progress (QI): disposition required. |
| Open | Closed | **QI only, with disposition _Accept as is_.** **Task** (done without further tracking). |
| Awaiting decision | Issued · On hold · Cancelled | Issued (QI): disposition required. |
| Awaiting decision | Closed | **QI only, with disposition _Accept as is_.** |
| Issued | In progress · On hold · Cancelled | — |
| Issued | Closed | **DC only** (instruction issued, nothing to check). **QI only with _Accept as is_.** |
| In progress | Ready for verification · On hold · Cancelled | — |
| In progress | Closed | **Task only** (no check required). |
| Ready for verification | Closed | A verification entry is recorded (outcome _passed_). |
| Ready for verification | In progress | A verification entry is recorded (outcome _failed_). |
| On hold | (status before the hold) | Resume returns the record to the status it had when put on hold. |
| Closed | Open | Reopen; a note is required. |
| any non-terminal (DC) | Superseded | **DC only.** A note naming the replacing record is required. No verification entry is created. Required fields may remain incomplete. |
| Cancelled, Superseded | — | Terminal. |

Non-terminal = every status except Closed, Cancelled, Superseded.

### 8.2 Behaviour tied to status

- **Draft** records are never shown through share links; a share link to a record that is currently Draft shows "not available".
- **On hold** and **Cancelled** require a reason (§7.3, §7.4).
- Every transition is logged (§5.12) with the reason or verification where applicable.
- The status the record had before _On hold_ is stored so _Resume_ can restore it.
- **Required fields** apply to every save in active statuses (all except Draft, Cancelled, Superseded).
- **The server enforces every rule** in §5–§8 (required fields, allowed transitions, disposition and decision conditions, measurement uniqueness), using the shared domain schemas. The browser's checks are a convenience only; a direct API call cannot bypass them.
- **A status change is one transaction:** the new status, its reason, any verification entry and the activity entries are written together or not at all.

## 9. Managed lists (per project)

All managed lists are per project and editable by the owner. Private project seed input follows Appendix B.

### 9.1 People list (Πρόσωπα & εταιρείες)

Fields: **code** (short, unique per project, e.g. `ARCH-MK`, `C-PB`), **name**, **company**, **role** (§7.11), **email**, **phone**, **active** flag. Used by: Ball in court, Responsible, Decided by, Issued by, Measured by, Checked by. An inactive person stays on existing records but is not offered for new selections.

### 9.2 Trades (Ειδικότητες)

Fields: **code**, **name EN**, **name EL**, **definition EN**, **definition EL**, **active** flag. Add, edit, retire (retired trades stay on existing records but are not offered for new selections).

### 9.3 Tags (Ετικέτες)

Fields: **name EL**, **name EN**. At least one name is required. Names are **unique within each language** after trimming and ignoring letter case — and, because Greek capitals drop their accents, ignoring accents and final sigma too («ΠΕΤΡΑ» = «Πέτρα»).

Operations:

- **Add** — from the tag management screen, or by typing a new tag on a record (the box suggests existing tags first).
- **Rename** — applies to every record carrying the tag.
- **Merge** — if a rename collides with exactly one existing tag (in either language), the owner is offered a merge into that existing tag, which keeps its own names. If the new names collide with two different tags, the rename is rejected.
- **Delete** — removes the tag from every record (after confirmation showing how many records are affected).

A tag owns nothing: no shared documents, status or responsibility. Filtering by tag gives the list of records and counts of open vs closed.

### 9.4 Location tree (Θέσεις)

A tree per project. Each node: **name EN**, **name EL**, **kind** (§7.12), **zone type** (optional, §9.5), **sort order**, parent, **active** flag.

Operations:

- Add, rename, move, delete (delete only if no record uses the node or its descendants; otherwise retire: the node stays on existing records but is not offered for new selections).
- **Copy branch** — duplicate a node with all its descendants under a new name (e.g. build "Villa 1" once, copy to "Villa 2" and "Villa 3").
- **Picker** — a tree with checkboxes, usable on a phone, with search by name; the record shows the selected nodes as paths (e.g. "Villa 2 › Ground › Kitchen").

Selection and filtering rules: §5.5.

### 9.5 Zone types (Τύποι χώρων)

A short per-project list of space types (name EN/EL), e.g. Kitchen, Bedroom, Bathroom. A node may carry one. **Filtering by zone type** returns records located on any node of that type (e.g. "all kitchens across villas").

## 10. Screens

Mobile-first responsive layout; every screen works on a phone. Language switch available everywhere.

1. **Login.**
2. **Record list** — the home screen.
   - Filters: subtype, status, location (tree; includes descendants), zone type, trade, tag, ball in court, responsible, severity, priority, stage, type of problem, safety implications, outside contract scope (owner only), "must be done before / requires first", due date range, text search (title, description, ID).
   - Sort: ID, due date, priority, severity, updated.
   - Columns/cards: ID, title, subtype, status, ball in court, due date, priority, severity, completion bar, safety badge.
   - Totals: count; sum of estimated cost for the filtered set, counting only records currently marked _Outside contract scope_ (owner only).
3. **New record** — quick capture: subtype, title, optional photo(s) and location; saved as **Draft**; completed later.
4. **Record page** — header (ID, title, subtype, status with allowed actions, ball in court, due date, severity, priority, completion bar, safety badge) and sections/tabs:
   - **Overview** — description, location paths, responsible, trades, tags, reference, must be done before / requires first; Public Notes; Private Notes and commercial fields (owner only). Both Notes fields are editable only by the owner.
   - **Classification** — subtype-specific fields (§6).
   - **Decision** — options considered, chosen option, decided by/on, instruction text (QI, DC).
   - **Measurements** — sets and rows; comparison views.
   - **Photos** — grouped by phase; full-screen viewer.
   - **Attachments** — view/play supported images, PDFs, email, video and audio; download originals for every accepted format.
   - **Verification** — entries.
   - **Log** — dated entries with attachments; private marker.
   - **Activity.**
   - **Share & print** — create, copy and revoke share links; open the A3 print/PDF view.
5. **Status change dialog** — shows only allowed transitions (§8.1) and asks for what each requires (reason, verification, disposition).
6. **Lists management** — people, trades, tags, location tree (with copy branch), zone types.
7. **Shared record view** (no login) — read-only record page without private content, language switch, "not available" for revoked/expired/draft. _Must be done before / Requires first_ entries show only the other record's ID and title, omit Draft records, and are not links (§11.5).
8. **A3 print view** (§12).
9. **Named-user access** — owner account setup and per-record grant controls; each user sees only granted, non-Draft records and the actions permitted there. A contributor screen uses the same private-content exclusions as a share page.

10. **Administration / Διαχείριση** — owner-only website page, linked alongside Projects and the project Records/Managed Lists navigation. Full backup and storage status is available here even when healthy. Other working screens show warnings only (§11.7).

## 11. Architecture and operations

### 11.1 Stack

React/Vite (browser) → Fastify/TypeScript (API + serving the built web app) → SQLite. See ADR 0001. No Python, no PostgreSQL, no offline mode in v1.

### 11.2 Code layout

| Folder | Contents |
|---|---|
| `src/domain` | Pure TypeScript, no I/O: Zod schemas, value lists (codes, labels, definitions in EN/EL), status transition rules, measurement comparison logic, ID formatting. Used by server and browser. |
| `src/server` | Fastify: API under `/api`, authentication, share links, data access (SQLite, hand-written SQL migrations), file storage and print projection. Serves the built web app. |
| `src/web` | React: screens in §10. |
| `scripts/` | Seed import, backup, deploy. |
| `tests/` | Unit, API and browser tests. |

All database access is confined to `src/server` data-access modules, so a later database change stays contained. No abstraction layer is built for that purpose.

### 11.3 Data

- **SQLite** in every environment: a local file for development/testing; a separate file in production holding the real data.
- **Fixed value lists live in code** (`src/domain`), not in database tables; records store codes.
- **Managed lists** (people, trades, tags, location nodes, zone types) live in tables.
- **Multi-value references to managed lists** (trades, tags, locations, must-be-done-before) use join tables. **Multi-value fixed codes** (type of problem) are stored as a validated list of codes on the record.
- Migrations run at application start, after an automatic backup of the database file.
- **Stored files are never deleted in v1.** Removing a photo or attachment from a record removes the record's reference, not the file. Every database backup therefore always has its files.

### 11.4 Files

- **Stored file (blob):** the bytes, stored once in the data folder and identified by their **SHA-256 content hash**, with size and content type.
- **Occurrence:** each photo or attachment on a record is its own row, holding the record, the blob reference, the original filename, title/caption, uploaded by/at and — for attachments added through the Log — the log entry. The same file uploaded to two records gives two occurrences sharing one blob.
- **Photos** reference three blobs: original, display copy and thumbnail. The browser produces the display copy and thumbnail at upload, so the server needs no image-processing module.
- **Originals are never modified or overwritten.** Corrections add new files.
- **Access:** files are served only through an authorised application route, addressed by **occurrence**, never by blob. The owner's session can fetch any occurrence. A named user must have a current grant for the non-Draft record and may fetch only its public occurrences. A share-token request must name a **non-private occurrence belonging to the linked record** (not attached to a private log entry); authorisation and the returned metadata (filename, title, log entry) come from that occurrence only. A private occurrence stays inaccessible even if another, public occurrence references the same blob. This applies to originals, display copies and thumbnails. Knowing a content hash grants no access.
- Upload ceiling: **100 MB = 100,000,000 bytes for the entire upload request**, including multipart boundaries, metadata and all files in a photo bundle. The UI accounts for envelope overhead; this is not a promise that a 100 MB file plus metadata fits. The server counts streamed bytes and rejects oversized requests, including requests without Content-Length, without leaving incomplete occurrences. Accepted formats and viewing capabilities follow §5.9. Total account storage is separate from this per-request limit.
- **Storage admission:** configure a total managed-file budget and a filesystem free-space reserve before starting the HTTP app. There is no per-user quota and no deletion of published blobs. Count retained files, including unreferenced blobs and stale temporary files, and reserve space for in-flight uploads before writing. Refuse new uploads when capacity is unavailable; reads and login remain available. A single HTTP process owns uploads in v1. The budget must be chosen below the actual hosting allowance, leaving room for the database, backups and other account use. Filesystem free-space checks do not establish the shared-hosting account quota or guarantee against external disk use.

### 11.5 Authentication and sharing

**Account login**

- Username + password; password hashed with Node's built-in `scrypt`; login rate-limited; HTTPS only. After password verification, recheck the active account and unchanged verified password hash and insert the session within one short write transaction. Password verification itself holds no write transaction. A concurrent password reset must prevent a session based on the old verification.
- Accounts are provisioned/reset by server-side commands (no self-registration or email reset service). The owner account is unique; named-user administration cannot replace or disable it. Disabling a named user or resetting their password ends that user’s sessions. Disabled users cannot log in. Enabling an account requires a fresh login and does not restore its old sessions. Per-record grants are owner-controlled and checked on every read/write; login alone grants no owner rights.
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, **host-only** (no `Domain` attribute, so it is never sent to `ktimanet.com` or other subdomains).
- The session identifier is a random token; the server stores only its **SHA-256 hash**, so a database or backup never contains a usable session. Sessions expire **30 days after login** (absolute) and are deleted on logout.
- **Forged-request protection** (`SameSite` alone is not relied on, because `ktimanet.com` (WordPress) counts as the same site). Every request below must carry an `Origin` header equal to the configured public base URL (`https://builtbasis.ktimanet.com` in production):
  - **Login:** valid credentials, matching `Origin`, JSON body.
  - **Data changes:** valid session, matching `Origin`, JSON body, and owner authority or the specific contributor grant required by that route.
  - **File uploads:** valid session, matching `Origin`, multipart form body, and owner authority or the record's Upload grant. Recheck the actual session token and current owner role or contributor grant inside the upload commit transaction. Do not hold that transaction while receiving or publishing files.
- **Reads:** GET requests never modify records, evidence or access permissions (including share links). The only exception: a successful, authorised share-page read updates that link's view count and last-viewed time.

**Share links**

- One record per link. Token = 32 random bytes, URL-safe. Each token is stored in two forms:
  - a **SHA-256 hash**, used to validate incoming links;
  - an **encrypted copy** (AES-256-GCM, a fresh nonce for every encryption, nonce and authentication tag stored with the ciphertext), so the owner can copy and resend a link at any time and the QR code can reuse it.
- The **share-link encryption key** is dedicated to this purpose and kept in the server configuration — **outside the database, the repository and the backups**. Deployment preserves it. If it is lost or replaced, all existing links are revoked and new ones issued.
- Raw tokens appear only in owner-authorised link management and in the chosen PDF QR code. They are **never written to activity entries or logs**.
- Database backups therefore contain neither usable share links nor usable sessions. They still contain the record data itself and must be protected accordingly.
- Each link: label (whom it is for), created at, optional expiry, revoked at, last viewed at and view count. Revoked or expired links, and links to a Draft record, show "not available". Share pages are marked `noindex`.
- **Private content (§2) is excluded by the server**, not merely hidden in the browser.
- A share token grants access to its record's page and that record's files (§11.4), nothing else. _Must be done before / Requires first_ entries on a shared page show only the other record's ID and title, omit Draft records, and grant no access to them.

### 11.6 Hosting

- Hetzner Webhosting L, addon domain **`builtbasis.ktimanet.com`**, Node.js enabled for that domain only. `ktimanet.com` and its WordPress installation are untouched.
- **Served through Cloudflare** (DNS for ktimanet.com is on Cloudflare): the `builtbasis` records are proxied, SSL/TLS mode Full (strict); the edge uses Cloudflare's Universal certificate and Hetzner serves the Cloudflare Origin Certificate for `*.ktimanet.com`. The server takes the visitor IP from `CF-Connecting-IP` when `BEHIND_CLOUDFLARE=1` (login rate limiting, logs). The application cannot check that a request really came through Cloudflare — Hetzner's web server is its direct peer — so the login limiter also caps failed logins globally. Origin reachability and any Cloudflare address restriction must be recorded and verified before release; a header alone does not prove Cloudflare provenance.
- **How the app listens:** `server.listen()` without arguments; Hetzner supplies a Unix socket and starts the app on demand (managed hosting). Locally a `PORT` is used.
- **Dependencies:** the server has no C++ compiler, and npm runs install scripts only for packages listed in `allowScripts`. Use only dependencies that ship prebuilt binaries or need no build step (better-sqlite3 13 does).
- Directory layout on the server:
  - **Application release** — built and staged separately, then selected for activation.
  - **Data folder** (separate path, outside the application folder) — `builtbasis.db`, `files/`, `backups/`. **Never touched by deployment.** Its path is given by an environment variable.
- Configuration via environment variables (data path, public base URL, share-link encryption key, Node environment). Configuration is kept outside the application and data folders and is preserved across deployments; the encryption key is never stored in the database, repository or backups.
- **Deployment:** build locally → stage an immutable application release over SSH → install production dependencies on the server (`npm ci --omit=dev`) → **activate the staged release and restart by stopping the running Node process**; the platform starts the new version on the next request (≈ 1.3 s cold start) → migrations run on start after a pre-migration backup.

### 11.7 Backups

- **On the server (nightly, cron):** consistent database copy using SQLite's own backup mechanism (`VACUUM INTO`), never a plain copy of the live file. The copy is written under a **temporary name**, checked with `PRAGMA integrity_check`, and only then renamed to its final name, so an interrupted or damaged backup never looks complete. Rotation: 14 daily + 8 weekly copies in `backups/`.
- **Off the server (nightly):** a Windows scheduled task on the owner's PC pulls over SSH to the X: drive in this order:
  1. **Select and pin one completed database backup** and copy it.
  2. **Copy the files.** Files are content-addressed, immutable and never deleted (§11.3), so every file the pinned backup references still exists on the server; only new files are copied.
  3. **Verify** that every file referenced by the pinned backup is present locally; only then mark that off-site copy complete.
- **Restore requirements**: stop the application and backup jobs first; restore a database together with its files; use application code compatible with that database's schema; **before access resumes, delete all sessions and revoke all share links** (a restored database can bring back links revoked after the backup was taken); disable all non-owner accounts and delete all record grants before access resumes; then issue new links where needed. Before restoring contributor access, the owner must reset their passwords, enable selected accounts and deliberately regrant records. Enabling alone must not revive credentials or permissions from an old backup.
- **One restore drill** from an off-site copy is performed before v1 is declared delivered.
- **Freshness:** exports and completion reports preserve the selected database backup's identity and creation timestamp, separately from transfer and verification times. Scheduled off-site verification rejects a source older than its configured tolerance (36 hours by default). Recopying an old backup never makes it current. Previously verified older recovery points remain available for deliberate restore.
- **Owner warnings and Administration:** normal owner website pages show a compact warning below navigation only when a completed server backup is missing or overdue (configurable 36-hour default), the remaining file allowance is below the configured threshold (5 GB / 5,000,000,000 bytes by default), storage capacity is unsafe, or status cannot be checked. The warning links to the owner-only **Administration / Διαχείριση** page, where the latest completed server backup age and full storage status are always available. Healthy status and loading indicators do not occupy the working pages. Neither the warning nor Administration is available to contributors or share-link visitors; both are excluded from print. Managed file-budget headroom and filesystem free space are distinct; neither claims to measure the hosting account quota.
- **PC pull failures:** the Windows pull reports failure with a nonzero exit and a desktop notification, including overdue-source and failed-transfer cases. Configure it for the owner's logged-on desktop and verify notification delivery during release acceptance. The website status describes server backups; it does not certify the PC copy. A stopped PC or a scheduled task that never starts cannot issue a failure notification.

### 11.8 PDF

- **v1: the owner prints the A3 print view to PDF from the desktop browser** (the print view has an A3-landscape print layout). There is no server-side PDF renderer in v1.

## 12. A3 print view and PDF

The owner can print or save a PDF of any record, including a Draft, without creating a share link. The single print screen has an **Include QR link** checkbox, off by default. Draft status is clearly shown on the printed sheet; Drafts cannot include a share-link QR because their shared pages are unavailable. Choosing QR output requires an active, non-expired link. Private-content exclusions apply in both cases.

One A3-landscape page per record (continuing to further pages if needed), in the chosen language, **without private content**. It shows exactly these fields:

- Header: ID, title, subtype, status, severity, priority, due date, ball in court, responsible.
- Location paths; trades; tags; reference.
- Description (QI, Task); question (DC).
- Classification (subtype fields).
- Decision: chosen option, decided by/on; current instruction text.
- Measurements: for each phase present, the latest set (by set order, §5.7) as a table, plus the comparison views.
- Photos: up to 4 _Before_ and 4 _After_ (most recent first).
- Verification entries.
- **Optional QR code**, only when the owner enables **Include QR link**, to an existing active, non-expired share link of the record chosen by the owner. If the record has none, the print view offers explicit link creation (§11.5). Reading or printing never creates a link automatically. Printing without QR does not depend on the sharing service.
- Footer: generated date-time, record last-updated date-time.

The Public Notes and Private Notes fields, the Log and the Activity log are not printed in the A3 layout. Public Notes remains visible on shared record pages.

## 13. Tests

- **Domain (Vitest):** status transitions and their conditions (§8); required fields per status, including Draft/Cancelled/Superseded exceptions; disposition and decision conditions; measurement comparison, label matching, uniqueness, set order and differences (§5.7); ID formatting; **every fixed-code list in §7 (including verification outcome) has an EN label, EL label, EN definition and EL definition for every value** (completeness test over all fixed-code lists, not a hand-picked subset).
- **API (Vitest + Fastify `inject`, temporary SQLite file):**
  - CRUD for records and managed lists; tag rename/merge/delete across records, including the two-tag collision rejection; location filter includes descendants and counts once; must-be-done-before cycle rejection.
  - **Security:** owner data changes and uploads without a valid session are rejected, while a valid login succeeds without an existing session; login, data changes and uploads with a wrong or missing `Origin` are rejected; GET requests change no records, evidence or access (only the share-page view count and last-viewed time); invalid direct API writes (rule violations) are rejected by the server; a password reset ends all sessions; session identifiers and share tokens are never stored in plain text, and raw share tokens never appear in activity entries or logs.
  - **Log and attachments:** attachments added through a log entry appear in the record's attachments list with the entry's date and text; directly added attachments appear without one.
  - **Sharing:** private fields (including Private Notes and private log entries) absent from share responses; attachments of private log entries cannot be fetched with a share token; **same blob, two occurrences:** with one public and one private occurrence of the same file on the shared record, the public one downloads and the private one is denied, and no private filename or log metadata is returned; **deleting a private log entry** deletes its attachment occurrences and never makes them public; Draft records not available; revoked and expired tokens rejected for pages **and files**; a token for one record cannot fetch another record's files; must-be-done-before entries on shared pages omit Draft records and expose only ID and title.
  - **Atomicity:** a failed status change leaves status, verification and activity unchanged.
- **Browser (Playwright):** login; quick capture on a phone-sized viewport; status changes with reasons/verification; measurements and comparison views; share link view (no private content); language switch; A3 print view contains no private content; ordinary and Draft records print without QR or share links by default; QR output requires explicit selection and a freshly checked valid link; printing uses the refreshed snapshot and waits for its resources.
- **Monitoring and Administration:** owner-only status API/page; healthy status hidden on working pages and visible in Administration; missing/overdue/unavailable warnings; low file allowance below, at and above the configured 5 GB default; warning disappears after recovery; no monitoring information on contributor/share/print pages.
- **Recovery drill:** one restore from an off-site copy (database + files) before delivery (§11.7), including session deletion and share-link revocation.

Additional required coverage: existing Notes stays private through migration; Public Notes is shared but owner-editable only; each contributor permission works independently; no grant, removed grant, disabled account and Draft status deny access; contributors cannot reach owner APIs, lists, private fields/files or other records; genuine contributor attribution; 100 MB request accounting with/without Content-Length; accepted-format capability matrix; authorised view/download/range paths; real HTTP oversized-upload and disconnect cleanup; safe diagnostic logs; storage admission across concurrent uploads, failed transactions and restarts; browser EML/MSG rendering and video/audio playback.

## 14. Out of scope for v1

- Links between records other than _Must be done before_.
- A structure or taxonomy of physical elements.
- General record editing by other users. Their contributions are limited to explicitly granted uploads and new public Log entries on individual records.
- Notifications (email, messaging).
- Pins on drawings; drawing viewer.
- Offline mode; native apps.
- AI and Python services; PostgreSQL.
- Commercial workflow beyond §5.4 (who pays, back-charges, quote lines).
- Function/System classification, procurement categories, procurement milestones.
- MS Project integration.
- Inspections, checklists, inspection & test plans.
- Deleting records: a record created by mistake is cancelled (reason _Raised in error_).
- Edit-conflict detection: when the same record is saved from two devices, the last save wins.

## Appendix A. Evidence and browser contract

The accepted attachment extensions are listed below without a leading dot. Acceptance permits storage and download; it does not imply viewing, full document validation or malware scanning. Office, CAD/BIM, archives and specialist formats remain download-only. `.a` and `.mat` are download-only. Native-view formats receive content-based screening before their response MIME is selected.

```text
3dm 3ds 3dxml a asm avi axm bmp bpm brd cam360 catpart catproduct cgr csv dae ddx ddz dgk dgn dlv3 dmt doc docx dwf dwfx dwg dwt dxf e57 eml emodel exp f3d fbx flv g gbxml gc3 gif glb gltf heic heif iam ico idw ifc ige iges igs ipt iwm jfif jpe jpeg jpg jt key kml kmz kof las laz ln3 m4a mat max mkv model mov mp3 mp4 mpeg mpp msg neu numbers nwc nwd obj odp ods odt ogg osb pages pan par pdf pmlprj pmlprjz png pps ppt pptx prt psm psmodel pts rar rcp rd3 rtf rvm rvt sab sat skp sldasm sldprt smb step stl stp stpz svg tif tiff tn3 tp3 txt usd usda usdc usdz vpb vue wav webm webp wire x_b x_t xas xer xls xlsm xlsx xlt xltx xpr zdd zip zipx
```

Each upload contains one attachment or one photo bundle. A photo bundle contains the immutable original and JPEG display and thumbnail variants. Display and thumbnail limits are 5,000,000 and 500,000 bytes respectively. All parts and their envelope share the 100,000,000-byte request ceiling. Missing or ambiguous EXIF capture dates remain null. HEIC decoding and preview creation occur in the browser; failure preserves an explicit fallback rather than inventing a capture date or modified original.

Authorised file/view GET supports one byte range, including suffix and open ranges. Unsupported multiple ranges and unsatisfiable ranges return 416. HEAD ignores Range and opens no stream. If-Range falls back to full 200 because these no-store routes provide no validator. Every request rechecks the occurrence's current authorisation. Known bytes or a content hash never grant access.

Share URLs use `${publicOrigin}/share#${token}`. The shell reads the fragment locally and sends the token only in an Authorization bearer header. Tokens never appear in query strings, route parameters, redirects or media URLs. The shared shell uses Greek by default, noindex, no-referrer and no third-party scripts. Private content is absent from its server projection. Public responses omit login usernames, internal audit identities, share administration metadata and storage hashes/paths. Visible contributions use display names.

Use authorised fetches for bearer-only media. Blob URLs may serve suitable image/video/audio elements or explicit downloads; they must never become documents, frames or newly opened tabs. Owner/contributor media uses authorised server URLs with protective response headers. Shared SVG previews rasterise to PNG before display; never place the original SVG Blob URL in the DOM. Shared PDF rendering disables scripting and automatic external resources or actions. Links and embedded attachments require deliberate user action. Close/cancel revokes temporary URLs and stops pending work. Unsupported media retains original download.

EML/MSG readers fetch the authorised original into a cancellable Worker and render reviewed headers and escaped readable text. HTML-only bodies use inert text extraction. They never insert email HTML into the live document or request remote tracking content. Embedded attachments are listed and downloaded only on explicit selection, with cleaned filenames and application/octet-stream. Do not automatically preview or recursively parse them. Malformed, encrypted, unsupported RTF-only or memory-constrained inputs show unavailable preview and retain original download.

Only successful public record GET updates link view count and last-viewed time. HEAD, file reads and descriptors do not. Private/no-store response and logging rules apply through the upstream proxy as well as inside the application. Logs must not expose credentials, Authorization, session tokens, share tokens or private request bodies.

Print includes no QR by default and requires no share link, including for Drafts. With **Include QR link** enabled, it uses an owner-selected existing active, unexpired share URL; Drafts cannot use this option. Reading or printing never creates a share link. A missing link requires an explicit owner action before a QR can be selected. Before native print, always adopt the refreshed printable snapshot and wait for its resources; when QR is selected, freshly validate its link too. The PDF contains no Notes, Log, Activity or other private data. Save-to-PDF remains a desktop browser operation.

## Appendix B. Seed and operational invariants

Project-specific people, trades, tags, zones and locations are imported through the explicit seed command from private CSV/workbook input. Contact details and source documents are never committed to the repository or bundled into a release. Seed data is not a bulk import of historical records. Run it only against the intended database and check the resulting lists before users begin work. Repeated import must not silently duplicate the lists.

Nightly backup publishes only after SQLite integrity checking and file sync. Export pins a completed database before any transfer. The immutable file pool remains available during rotation. Offsite completion requires database integrity, compatible schema and matching SHA-256 and byte size for every referenced blob. Restore rechecks the source and candidate before publishing a fresh destination. It never overwrites the live data directory. File I/O and network transfer hold no SQLite write transaction.

Storage budget and free-space reserve must be explicit positive byte counts selected against the actual hosting account allowance. The 384 MB hosting process limit is a release validation constraint, not a promise that every accepted document can be previewed on every phone. No production claim follows from a local fixture test. Release evidence is recorded in the [release checklist](../guides/release-checklist.md).
``````

- [ ] After Tasks 1–5 pass, activate the specification and operator guides; update README and Architecture to current print, compiled deployment, backup/export/restore behavior; link the maintained specification as the contract. Mark the design Historical with implementation commits, material deviations (or None), links to maintained documents and no current authority. Mark Plan 6 Completed/historical only after actual implementation and release acceptance; record test counts, actual off-site drill and merge/deployment state. Keep planning replay separate. Update roadmap status and complete the deferred Plan 0 spike-cleanup checkbox only after its identified artifacts are removed. Commit documentation closeout; do not rewrite other historical plans.

- [ ] Self-review the task diff, run `git diff --check`, and commit only this task’s files. Preserve synthetic PDF fixture whitespace from Plan 5.

## Full verification before hosted work

Run from the implemented checkout after Task 3:

```powershell
npm run build
npm run typecheck
npm test
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:browser
git diff --check
```

Do not rerun passing suites for documentation-only edits. Repeat affected checks after corrections. The inherited synthetic PDF cross-reference fixture deliberately contains trailing spaces; preserve its bytes if checking the entire branch diff.

### Production-only package probe

Create a fresh scratch directory outside the application data paths. Copy only `dist`, `package.json` and `package-lock.json`. In that directory run `npm ci --omit=dev --ignore-scripts` on the Windows replay machine, then `node dist/server/runtime-check.mjs`. Confirm tsx and bundled browser-only packages are absent. Start `node dist/server/main.mjs` using a new temporary data directory, synthetic share key, loopback PORT/origin and explicit test storage budget/reserve. Require `/api/health` and `/` to return 200 and the shell to load built assets. Stop the exact child process and remove only that disposable data directory. This checks package contents locally; it does not replace the normal hosting install or its Linux native-module check.

Parse both PowerShell files without executing their SSH operations:

```powershell
foreach ($file in @('scripts/stage-release.ps1','scripts/pull-backup.ps1')) {
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $file), [ref]$tokens, [ref]$errors) | Out-Null
  if ($errors.Count) { throw ($errors | Out-String) }
}
```

Their real remote and scheduled execution is checked in Tasks 4–5. Use PowerShell 7 and an OpenSSH alias already verified against the server host key. Never disable host-key verification. Run `npm audit --omit=dev` and record results rather than applying unrelated dependency upgrades.

## Implementation progress — 2026-10-04

Execution started from approved publication `472cf07` in the isolated `codex/plan-6` branch. The 464-test Plan 5 baseline passed before extraction. All runtime source snapshots were installed exactly as reviewed; no optional Draft banner or other product scope was added.

| Task | Implementation evidence | State |
|---|---|---|
| 1 — print and Administration | `e915b44`; RED on missing routes/module/capacity snapshot and Draft print control; GREEN: 19 focused tests, 475 unit/API tests, 20 print/status/record browser tests, build and typecheck | Complete locally |
| 2 — backups/export/restore | `83a869c`; RED on missing operations module; GREEN: 18 focused tests, 489 unit/API tests and typecheck; synthetic integrity/access-reset/rotation drill | Complete locally |
| 3 — release and Windows tools | `c21a279`; RED on missing build/pull scripts; GREEN: 12 focused tests, final 501 unit/API tests and 51 browser tests, builds and typecheck | Complete locally |
| 4 — hosted acceptance | Existing SSH alias verified read-only; remote BuiltBasis directory still contains trial data only. Hosting quota requested from owner; no production mutation or deployment performed | Pending |
| 5 — scheduled backups and real recovery | No cron or Windows scheduled task installed; no actual off-site drill or desktop notification delivery claimed | Pending |
| 6 — documentation closeout | Proposed specification and operating guides prepared; final activation, design Historical status and release acceptance await Tasks 4–5 | Pending |

The production-only package installed 78 packages, omitted tsx and browser libraries, passed native SQLite and real HTTP health/shell checks, and reported zero production dependency vulnerabilities. Existing four moderate development-only audit findings remain. PowerShell scripts and their harness parsed on Windows PowerShell 5.1; the operating guide's PowerShell 7 environment remains a deployment prerequisite. Browser tests used temporary loopback ports 3500/5184 to preserve the owner's preview, then restored their original source bytes. Print tests decoded QR output and checked Greek A3/multipage PDF text; the print screenshot was inspected. Physical-device and actual printed-output acceptance remain live gates.

Execution logs and the progress ledger are in the ignored worktree folder `.superpowers/sdd/2026-10-04-plan-6-print-and-operations/`. These are implementation results, separate from the earlier planning replay below. The external release checklist remains uncompleted.

## Planning replay evidence

On 2026-10-04 the initial publication was replayed from `59f04d0`, passing 480 unit/API tests and 42 browser tests. The first review corrections were replayed from `7997780`, passing 486 unit/API tests and 44 browser tests, and published as `9d937ac`. Optional QR printing and both backup warnings were then replayed task by task from `9d937ac`, passing 499 unit/API tests and 49 browser tests, and published as `a75c5f9`.

The owner subsequently requested warning-only notices on working pages, a separate Administration page and a configurable 5 GB remaining-file warning. All **41 full-file payloads** were extracted into another fresh detached checkout of `a75c5f9`, separately from authoring. The governing design amendment was copied there too. The runtime baseline of these commits is identical. All payloads were verified by hash. The checkout contains proposed code only; main still runs Plan 5. The table below reports the latest replay, identifying unchanged checks retained from the preceding replay.

| Check | Actual result |
|---|---|
| Task 1 RED/GREEN | Initial missing print route/module; stale-name and optional-QR browser regressions failed before fixes. The preceding task-by-task replay passed 17 focused tests and TypeScript before Task 2 extraction. This revision's two threshold tests and three affected browser cases failed before the changes. Five monitoring tests and four status/Administration browser tests then passed; the full replay covers all 19 print/monitoring/capacity tests and eight print browser tests |
| Task 2 RED/GREEN | Initial missing operations module. Review regressions failed on missing source metadata/freshness checks, then all eighteen focused operations/database tests passed |
| Task 3 RED/GREEN | Initial missing build script; notification regression observed no failure message before implementation. Fresh replay passed the real compiled-process HTTP test and all 11 Windows transfer/failure/exit tests |
| Full Node/browser production builds and TypeScript | Passed |
| Complete unit/API suite | **501 tests passed across 70 files** |
| Complete Chrome browser suite | **51 tests passed across 11 spec files** |
| Print output and monitoring UI | Independent QR decode, Greek A3 dimensions, 180-paragraph multipage text completeness and photo readiness passed. The warning-only Records view and Administration screen were visually inspected in the updated local preview |
| Production-only installation (preceding replay; package unchanged) | 78 packages installed with dev dependencies omitted, down from 126; tsx and bundled browser packages absent; native runtime check, real health request and built shell passed. The latest replay reran the compiled-process HTTP test |
| Existing dependency resolutions | All 316 existing package-path version/resolved/integrity values preserved |
| Production dependency audit (preceding replay; package unchanged) | Zero vulnerabilities reported; four existing moderate findings remain in the complete development dependency tree |
| Windows tooling | Release/pull scripts and test harness parsed without errors on PowerShell 5.1. Two SFTP batches covered 128 missing blobs; repeat used metadata only. Mocked notifications covered setup, lock, SSH/SFTP, integrity, stale-source, pin-release and delivery failures; an actual child process exited 1. `msg.exe` is installed on the replay PC, but delivery was mocked. Real remote execution, scheduled identity and visible desktop delivery remain Tasks 4–5 |

Environment: Windows, Node 24.12.0, npm 11.6.2, Playwright 1.63.0 and installed Chrome 154.0.8037.58. Browser tests start private local fixture servers. The latest replay temporarily substituted loopback ports 3500/5184 for 3490/5174 so the owner's preview stayed available; all source bytes were restored afterwards and payload hashes checked. No command connected to the hosting account or altered production. The synthetic restore is a local fixture drill, not the required actual off-site drill.

The review corrections preserve source backup identity and creation time, reject stale scheduled copies, always adopt fresh printable data before printing, batch missing-file transfers, keep the share key solely in the HTTP application settings, and align Greek field labels with the design. The approved additions permit printing Drafts without QR, provide owner-only Administration with full status and warning-only notices elsewhere, and notify the local Windows operator on a failed pull. The remaining-file warning defaults to the owner's chosen 5 GB. Long-lived recovery points remain restorable. The package change preserves every existing dependency version and integrity value. Code blocks use their correct language tags and contain no leading BOM.

Authoring caught and corrected one full-suite timeout: a rotation test originally made 74 VACUUM copies. It now uses validated historical snapshots and one real rotation, preserving the race/retention assertion without the unnecessary I/O. Restore diagnostics were reconciled with §5.12 to include only system reason and reset counts. A reviewer questioned the existing ignore-scripts installation workaround; the clean production-only native/runtime probe confirmed the pinned package includes usable prebuilds on this machine. Linux installation remains a separate hosted check.

The build retains existing dependency annotation and large-chunk warnings (main browser bundle approximately 936 kB before gzip). Local replay does not establish Cloudflare's request limit, account quota, upstream log/caching rules, 384 MB peak memory, Linux crash durability, physical phone capacity, actual recovery scheduling or desktop-message delivery. Those are explicit uncompleted release gates, not implied passing results. No additional service, offline mode, hosted PDF engine or evidence cleanup policy was introduced.

## References checked

- [esbuild packages option](https://esbuild.github.io/api/#packages) — external runtime packages in local Node builds.
- [Node environment-file option](https://nodejs.org/api/cli.html#--env-filefile) — explicit external configuration for cron and administrative entrypoints.
- [node-qrcode](https://github.com/soldair/node-qrcode) and [jsQR](https://github.com/cozmo/jsQR) — local QR generation and independent test decoding.
- [Microsoft msg command](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/msg) — named local-user desktop messages, display timeout and session permissions. Live delivery remains an acceptance gate.
- The installed pinned package source/types, project tests and actual Plan 0 results govern the concrete commands. Actual account capacity, upstream controls and physical-device behavior remain execution evidence.
