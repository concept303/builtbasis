# Plan 5 — Web interface

> **Document type:** Implementation plan
> **Status:** Draft
> **Retention:** Active execution instructions. Retain as historical evidence after implementation and documentation closeout.
> **Implements:** [Approved v1 design](../designs/2026-10-02-v1-records-design.md), §3, §5–10, §13, and the [Plan 4 browser contract](../guides/share-key-management.md).
> **Parent plan:** [v1 roadmap](2026-10-02-v1-roadmap.md)
> **Implemented by:** Not implemented
> **Verified:** Not yet verified as an implementation. Planning replay is recorded separately below.
> **Merged to main:** Browser implementation not merged
> **Checklist note:** Unchecked items are execution work. Authoring and replay do not complete them.

## Outcome and boundary

Deliver a usable React/Vite interface for the existing Plan 4 backend. The owner can capture and manage Quality Issues, Detail Clarifications and Tasks. Contributors can read assigned records and independently upload evidence or add public Log entries when granted. Share-link readers get the public record without signing in. Every fixed interface string has English and Greek wording. Typed content keeps its original text.

The owner approved the [wireframe layouts](../designs/2026-10-03-plan-5-wireframes.html) and asked for simple, easily interpreted views. Those wireframes are supporting material. Interface decisions belong in this execution plan; there is no second governing design. The approved v1 design and Plan 4 contracts remain authoritative.

This document contains the complete proposed source and tests, ordered so each file is introduced once. Binary test fixtures have complete base64 payloads. Dependency installation preserves the existing lockfile instead of replacing it with an embedded snapshot. The extraction helper verifies every payload hash. It does not run commands, install packages, commit or deploy.

Authoring used an isolated checkout of `e27a535`. That commit has the same runtime as Plan 4 on `71c9a33`; its extra changes are documentation. The implementation remains separate from the documentation commit publishing this plan. Use Astra Medium if delegating execution or review, as the owner requested.

## Interface decisions to implement

1. Use ordinary document navigation and React state. No router, global state library, offline cache or automatic save is needed. Fastify serves the compiled application and explicit browser routes. Vite proxies `/api` during development so cookie writes retain the required Origin.
2. Keep the summary visible above record sections. Desktop sections are Overview, Evidence, Measurements, Log, Activity and owner-only Sharing. Phones use a section selector. Overview includes classification, decisions and verification history; Evidence combines photos and attachments. This folds related material into fewer sections while retaining every required field. The wireframes establish layout and density, not a mandatory number of tabs.
3. Use compact record cards at both widths. Show human ID, title, subtype, status, next actor, due date, priority, severity, completion and safety. Search, sorting, result count and owner-only cost total remain visible. Secondary filters expand on demand. Applied filters have labeled removal buttons and persist in the URL. Returning from a record restores that query.
4. Keep explicit Save and Cancel. Dirty forms warn before leaving; language changes preserve entered values. Fixed values reuse the domain vocabulary and definitions. Other interface strings use adjacent English/Greek pairs, which makes missing translations a type error at each `t` call. Server validation remains authoritative, with localized known errors and a safe generic fallback. Do not translate or display raw server messages as interface text.
5. Save record fields and status transitions separately. Do not promise an atomic combined save. Ask only for transition-specific reason, note or verification fields. Verification outcome follows the transition. Existing inactive references stay readable; filters can still select retired locations.
6. Quick capture creates a Draft before uploading each selected photo. A later file failure retains the record and earlier successful files. Log creation and attachment uploads are also separate operations. Never automatically retry a creation or upload after an uncertain response. Network failures, unreadable successful responses and generic server errors leave the outcome unknown. Preserve input and block another submission until a successful reload presents the saved records, entries or attachments. A failed reload leaves the block in place. Known validation/capacity rejections are distinct from unknown outcomes. Do not infer request identity from a title or add an idempotency system in this plan.
7. Use the existing measurement comparison functions without rounding inputs or differences. Tables display the shortest round-trip representation of each JavaScript number, with a Greek decimal comma where applicable; small nonzero differences stay nonzero. Signed bars have a zero baseline. Date-only values remain calendar dates. Editing Log text/privacy preserves its exact original event timestamp, including seconds and milliseconds. Deliberate time edits use an explicit UTC offset, so repeated daylight-saving hours can be distinguished. Missing or ambiguous EXIF capture dates remain empty.
8. Keep the three access paths separate. Owner routes load owner detail. Assigned-record and share routes consume only public projections. Public and Private Notes are owner-edited. Upload and Add Log grants are independent. Owners may prepare links for Draft records and copy any stored non-null URL, including expired/revoked links. Label their availability clearly; recipient access stays denied for Draft, expired or revoked links. Account creation, passwords and account activation remain CLI operations.
9. Keep share tokens in the original fragment and request headers only. No tokens in resource URLs, storage, analytics or logs. Fresh shares start in Greek. Language and section changes reuse loaded data. Failed access refreshes clear record content and pending viewers; delivered bytes cannot be recalled.
10. Preserve original photo bytes and prepare JPEG display/thumbnail copies in the browser. Decode HEIC in a local worker. The complete multipart body, including copies and metadata, stays within 100,000,000 bytes. Display preparation/progress, cancellation, partial results, 413 and 507. No new quotas or file deletion policy.
11. Reuse the 145-extension catalog and server capabilities. Authorized native URLs serve owner/contributor image and media views. Shared media uses bearer fetches. Shared SVG is rasterized before a generated PNG enters the DOM. Original upload Blob URLs are never opened as documents or frames. Downloads are explicit and preserve original bytes.
12. Render PDF pages locally from bytes to canvas, without action, scripting, link or attachment layers. Parse EML/MSG in a cancellable local worker. Show escaped headers/text and explicit local attachment downloads. Never insert email HTML or request its remote resources. Unsupported/corrupt/too-complex previews retain an original-download option.
13. Bundle dependencies locally. The HTML shell is no-store, noindex and no-referrer, with a restrictive CSP. Only hashed build assets receive long caching. Unknown API routes, missing assets and data-directory paths never fall through to the SPA.

## Tasks and evidence map

| Task | Delivers | Main verification |
|---|---|---|
| 1 | Dependencies, static serving, API/language/form foundation | Shell/API isolation and request helper tests |
| 2 | Five managed lists | List rules, then actual CRUD/merge/tree browser flows in Task 5 |
| 3 | Upload preparation, transport, protected viewers and fixtures | Pure media/email tests, then real-browser media in Task 5 |
| 4 | Record editing, decisions, measurements, Log, Activity and access management | Domain integration helpers, then all subtype/permission browser flows |
| 5 | Application navigation, list/capture, responsive styling and full browser integration | Build, typecheck, entire unit/API suite and Playwright suite |
| 6 | Operating instructions and lifecycle closeout | Documentation consistency and implementation evidence |

The browser suite runs a real local Fastify server with a temporary seeded SQLite database and files. It uses synthetic owner/contributor accounts and evidence. A second local Vite server hosts narrow media probes. Actual-app tests use the production build and its CSP. The fixture runner creates no production data and never connects to Hetzner.

## Preflight

- [ ] Work in a separate implementation branch/worktree. Start from main containing Plan 4 and this plan. Preserve unrelated work.
- [ ] Check `git status --short`, `node --version` and `npm --version`. Node must satisfy `>=22.13.0`. Confirm the backend baseline before copying files.
- [ ] Run the baseline guard below. It compares existing code/configuration this plan replaces and every existing backend/domain/test file against `e27a535`. Documentation-only changes are allowed. Any runtime difference requires reconciling and replaying the affected plan, rather than overwriting it.
- [ ] Read the approved design and Plan 4 browser contract. Plan 6 still owns A3/PDF printing, production deployment, hosting capacity/proxy/memory checks, backup/restore and the release specification.

```powershell
git diff --exit-code e27a535 -- package.json package-lock.json tsconfig.json .gitignore src tests scripts vitest.config.ts
```

Use the checked-in extraction helper to write one phase at a time, or copy the complete blocks by hand. The helper accepts the plan path, target checkout, task number and phase (`setup`, `test`, `implementation`). It verifies SHA-256 and target-path containment. It never deletes files. The target must be your implementation checkout, not main while reviewing this plan.

```powershell
node docs/plans/tools/replay-plan5.mjs docs/plans/2026-10-04-plan-5-web-interface.md <implementation-checkout> 1 setup
```

Task 1 installs exact new direct dependencies through the supplied `package.json`; `npm install --ignore-scripts` resolves them against the existing lockfile. Inspect `git diff -- package.json package-lock.json`: existing direct dependency pins and unrelated resolutions must remain unchanged. Commit the resulting lockfile. Subsequent installs use `npm ci --ignore-scripts`, followed by `npm rebuild esbuild`. No install command changes application data.

Playwright uses installed Chrome when `PLAYWRIGHT_CHANNEL=chrome`. Alternatively, install the pinned Playwright Chromium with `npx playwright install chromium` and leave that variable unset. Never reuse a production application as the test server. Ports 3490 and 5174 must be free; the suite refuses to reuse existing servers.

Earlier tasks exercise their own modules while the browser entrypoint is still absent. The full browser build and integrated workflows start in Task 5. A missing module in a deliberate pre-implementation test run is expected; a syntax error, dependency installation failure or unrelated backend failure is not the intended red result.

## Task 1: Browser foundation and explicit static serving

**Depends on:** the verified Plan 4 baseline.

Install the pinned browser tooling and local viewers. Add the request/language/form primitives and serve only the compiled shell/assets. Existing API-only operation still works when no build exists.

- [ ] **Write the setup files and install dependencies.** Repeat the preflight baseline guard first. Preserve the existing lockfile.

#### File: `package.json`

<!-- replay task=1 phase=setup encoding=text sha256=24407422e9c9f9ec56801da2fcc7e9a63d27d3bb03f3e149db6dacb18f838548 -->

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
    "test:browser": "playwright test"
  },
  "allowScripts": {
    "better-sqlite3@13.0.3": true
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^22.20.5",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "exceljs": "^4.4.0",
    "tsx": "^4.23.15",
    "typescript": "^5.9.3",
    "vite": "7.3.6",
    "vitest": "^3.2.7"
  },
  "dependencies": {
    "@fastify/cookie": "^11.1.2",
    "@fastify/multipart": "9.3.0",
    "@fastify/static": "10.1.5",
    "@kenjiuno/msgreader": "1.28.0",
    "better-sqlite3": "13.0.3",
    "exifr": "7.1.3",
    "fastify": "^5.12.5",
    "heic-to": "1.6.5",
    "htmlparser2": "12.0.0",
    "pdfjs-dist": "6.3.289",
    "postal-mime": "4.0.2",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "zod": "^4.6.5"
  }
}
``````

#### File: `tsconfig.json`

<!-- replay task=1 phase=setup encoding=text sha256=4a8e4d585b18e26aa9fc401e7fe881899f76a88b79a0d34f2e1f5cc4038d3d7b -->

``````json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "types": [
      "node",
      "vite/client"
    ],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": [
    "src",
    "tests",
    "scripts/**/*.ts",
    "vitest.config.ts",
    "vite.config.ts",
    "playwright.config.ts",
    "vite.browser-test.config.ts"
  ]
}
``````

#### File: `.gitignore`

<!-- replay task=1 phase=setup encoding=text sha256=179d66e10e55202c11ad72b038ec4b4d66fb4cdc8feda4f6f115b1298db1c5cc -->

``````text
# Dependencies and builds
node_modules/
dist/
build/
coverage/

# Local data (databases, uploaded files, backups)
data/
*.db
*.db-journal
*.db-wal
*.db-shm

# Environment and secrets
.env
.env.*
!.env.example

# Private design notebook (DOCS-STANDARD §5)
_AI/DESIGN_NOTEBOOK.md

# OS / editor
.DS_Store
Thumbs.db
.vscode/

# Isolated implementation worktrees
.worktrees/

# Browser test output
test-results/
playwright-report/
``````

#### File: `vite.config.ts`

<!-- replay task=1 phase=setup encoding=text sha256=0db84f3deaf8741c20a207da986dd4168a5e3f336e16534d19739627b465242e -->

``````ts
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({ root: 'src/web', esbuild: { jsx: 'automatic' }, build: { outDir: resolve('dist/web'), emptyOutDir: true }, server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000' } }, worker: { format: 'es' } });
``````

#### File: `vite.browser-test.config.ts`

<!-- replay task=1 phase=setup encoding=text sha256=bd5c4ac16be549c90b9edd4b85972ec7c00c62c969e0f10ec9eff94d32b5dc77 -->

``````ts
import { defineConfig } from 'vite';
export default defineConfig({ root: '.', optimizeDeps: { include: ['exifr', 'heic-to/csp', 'postal-mime', '@kenjiuno/msgreader', 'htmlparser2'] }, esbuild: { jsx: 'automatic' }, server: { host: '127.0.0.1', port: 5174, strictPort: true }, worker: { format: 'es' } });
``````

#### File: `playwright.config.ts`

<!-- replay task=1 phase=setup encoding=text sha256=51eb1fef36b13b20ea9623cff88e0c76bcd0d1dbb6bb5bc99a83e2fd055dd206 -->

``````ts
import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', testMatch: '**/*.spec.ts', fullyParallel: false, workers: 1, retries: 0, timeout: 45_000, expect: { timeout: 10_000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3490', browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, trace: 'retain-on-failure' },
  webServer: [
    { command: 'node --import tsx tests/browser/server.ts', url: 'http://127.0.0.1:3490/api/health', reuseExistingServer: false, timeout: 60_000 },
    { command: 'vite --config vite.browser-test.config.ts', url: 'http://127.0.0.1:5174/tests/browser/fixtures/media-harness.html', reuseExistingServer: false, timeout: 60_000 },
  ],
});
``````

```powershell
npm install --ignore-scripts
npm rebuild esbuild
git diff -- package.json package-lock.json
```

Verify the new direct dependencies are exactly the versions in package.json and that unrelated existing resolutions were not changed. Commit the generated lockfile with this task.

- [ ] **Write the complete tests and fixtures below.**

#### File: `tests/server/web-app.test.ts`

<!-- replay task=1 phase=test encoding=text sha256=9fae9a58235ffff025e15f9737d3887c6bef19a4ac04c3448d525be39e8979fc -->

``````ts
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify from 'fastify';
import { expect, it } from 'vitest';
import { registerWeb } from '../../src/server/web';

it('serves explicit SPA routes and assets without replacing API errors or exposing arbitrary files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bb-web-'));
  const app = Fastify();
  try {
    await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, 'index.html'), '<!doctype html><title>BuiltBasis</title>');
    await writeFile(join(dir, 'assets', 'app.js'), 'export const ready=true');
    await writeFile(join(dir, 'secret.txt'), 'PRIVATE');
    app.get('/api/health', async () => ({ ok: true }));
    await registerWeb(app, dir);
    for (const url of ['/', '/login', '/projects/1/records/2', '/share', '/assigned/2']) {
      const response = await app.inject(url);
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['content-security-policy']).toContain("object-src 'none'");
      expect(response.headers['referrer-policy']).toBe('no-referrer');
    }
    expect((await app.inject('/assets/app.js')).statusCode).toBe(200);
    expect((await app.inject('/api/health')).json()).toEqual({ ok: true });
    for (const url of ['/api/missing', '/secret.txt', '/assets/missing.js', '/unknown']) {
      const response = await app.inject(url);
      expect(response.statusCode).toBe(404);
      expect(response.body).not.toContain('<title>');
      expect(response.body).not.toContain('PRIVATE');
    }
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});

it('keeps the backend usable before a browser build exists', async () => {
  const app = Fastify();
  try {
    await registerWeb(app, join(tmpdir(), `bb-missing-${Date.now()}`));
    expect((await app.inject('/')).statusCode).toBe(404);
  } finally { await app.close(); }
});
``````

#### File: `tests/web/core.test.ts`

<!-- replay task=1 phase=test encoding=text sha256=cbc8d6fef54bd6b607734a4598ceafe22bcc61eeb9c1601cda167f48c1f39178 -->

``````ts
import { afterEach, expect, it, vi } from 'vitest';
import { api, ApiError, errorText, isUnknownOutcome } from '../../src/web/core/api';
afterEach(() => vi.unstubAllGlobals());
it('treats an unreadable successful response as an unknown outcome', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{', { status: 201 })));
  await expect(api('/api/projects/1/records', { method: 'POST', body: { subtype: 'task' } })).rejects.toMatchObject({ status: 0, code: 'response_unknown' });
});
it('distinguishes unknown write outcomes from confirmed request rejections', () => {
  for (const failure of [new TypeError('Failed to fetch'), new DOMException('Aborted', 'AbortError'), new ApiError(0, 'request_failed'), new ApiError(500, 'internal_error'), new ApiError(503, 'request_failed')]) expect(isUnknownOutcome(failure)).toBe(true);
  for (const status of [400, 401, 403, 404, 409, 413, 415, 429]) expect(isUnknownOutcome(new ApiError(status, 'rejected'))).toBe(false);
  expect(isUnknownOutcome(new ApiError(507, 'storage_capacity'))).toBe(false);
});
it('sends JSON for logout and deletes to satisfy the authenticated write contract', async () => {
  const fetcher = vi.fn().mockImplementation(async () => new Response('{}'));
  vi.stubGlobal('fetch', fetcher);
  await api('/api/auth/logout', { method: 'POST' });
  await api('/api/projects/1/tags/2', { method: 'DELETE' });
  for (const call of fetcher.mock.calls) expect(call[1]).toMatchObject({ headers: { 'Content-Type': 'application/json' }, body: '{}' });
});
it('separates bearer reads from cookies and never retries failed writes', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
  vi.stubGlobal('fetch', fetcher);
  await api('/api/shared/record', { token: 'secret' });
  expect(fetcher.mock.calls[0]![1]).toMatchObject({ credentials: 'omit', headers: { Authorization: 'Bearer secret' } });
  fetcher.mockResolvedValue(new Response('{"error":"invalid_input","details":[{"path":"title","message":"private"}]}', { status: 400 }));
  await expect(api('/api/projects/1/records', { method: 'POST', body: { subtype: 'task' } })).rejects.toMatchObject({ status: 400, code: 'invalid_input' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1]![1]).toMatchObject({ credentials: 'same-origin', body: '{"subtype":"task"}' });
});
it('maps errors in both languages without exposing raw details or unknown codes', () => {
  for (const code of ['invalid_input', 'storage_capacity', 'upload_too_large', 'unexpected_private_detail']) {
    const error = new ApiError(400, code, { message: 'SECRET' });
    expect(errorText(error, 'en')).not.toBe(errorText(error, 'el'));
    expect(errorText(error, 'en')).not.toContain('SECRET');
    expect(errorText(error, 'el')).not.toContain(code);
  }
});
``````

- [ ] **Check the pre-implementation result.** Run `npx vitest run tests/server/web-app.test.ts tests/web/core.test.ts`. The tests fail because the browser API helper and static-serving module do not exist yet. Do not count dependency-installation errors as this result.

- [ ] **Write the complete implementation below.**

#### File: `src/server/web.ts`

<!-- replay task=1 phase=implementation encoding=text sha256=1e96abf7d332be25582fd4955214409f5fee5c8de4bb3802d0b8d101705e5e88 -->

``````ts
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import serveStatic from '@fastify/static';
export async function registerWeb(app: FastifyInstance, directory: string): Promise<void> {
  let html: string;
  try { html = await readFile(join(directory, 'index.html'), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  if ((await stat(join(directory, 'assets'))).isDirectory()) await app.register(serveStatic, { root: join(directory, 'assets'), prefix: '/assets/', index: false, redirect: false, dotfiles: 'deny', maxAge: '1y', immutable: true });
  for (const route of ['/', '/login', '/projects', '/projects/:projectId/records', '/projects/:projectId/records/:id', '/projects/:projectId/lists', '/assigned', '/assigned/:id', '/share']) {
    app.get(route, async (_request, reply) => reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer').header('X-Content-Type-Options', 'nosniff').header('X-Robots-Tag', 'noindex, nofollow')
      .header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
      .type('text/html; charset=utf-8').send(html));
  }
}
``````

#### File: `src/server/app.ts`

<!-- replay task=1 phase=implementation encoding=text sha256=b79629a85cad4bf1e4b1a185e71a0fd266ab6b8526df23dbdfba89a865f02948 -->

``````ts
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
  registerAuthRoutes(app, { config, db, limiter: deps.limiter ?? new LoginLimiter(DEFAULT_LOGIN_LIMITS) });
  registerProjectRoutes(app, db);
  registerPeopleRoutes(app, db);
  registerTradeRoutes(app, db);
  registerZoneTypeRoutes(app, db);
  registerTagRoutes(app, db);
  registerLocationRoutes(app, db);
  registerRecordRoutes(app, db);
  registerFileRoutes(app, db, config, capacity);
  registerSharingRoutes(app, db, config);
  registerAccessRoutes(app, db, config, capacity);
  await registerWeb(app, resolve('dist/web'));
  return app;
}
``````

#### File: `src/web/core/LocationPicker.tsx`

<!-- replay task=1 phase=implementation encoding=text sha256=628ac0c76f7f4541fa14d3cc4a705b65179f197d781a427224df1774565ab35e -->

``````tsx
import { useState } from 'react';
import type { LocationNode } from '../../server/lists/locations';
import { useI18n } from './i18n';
export function LocationPicker({ nodes, value, onChange, label, allowInactive = false }: { nodes: LocationNode[]; value: number[]; onChange(value: number[]): void; label?: string; allowInactive?: boolean }) {
  const { lang, t } = useI18n(); const [query, setQuery] = useState('');
  const name = (node: LocationNode) => lang === 'el' ? node.nameEl || node.nameEn : node.nameEn || node.nameEl;
  const path = (node: LocationNode): string => { const parent = nodes.find(item => item.id === node.parentId); return parent ? `${path(parent)} › ${name(node)}` : name(node); };
  const checkbox = (node: LocationNode, full = false) => <label className="check"><input type="checkbox" checked={value.includes(node.id)} disabled={!allowInactive && !node.active && !value.includes(node.id)} onChange={event => onChange(event.target.checked ? [...value, node.id] : value.filter(id => id !== node.id))}/>{full ? path(node) : name(node)}{!node.active && ` (${t('inactive', 'ανενεργό')})`}</label>;
  const branch = (parentId: number | null): React.ReactNode => nodes.filter(node => node.parentId === parentId).map(node => <li key={node.id}>{nodes.some(child => child.parentId === node.id) ? <details open={Boolean(query)}><summary>{name(node)}</summary>{checkbox(node)}<ul>{branch(node.id)}</ul></details> : checkbox(node)}</li>);
  return <fieldset className="location-picker"><legend>{label ?? t('Location', 'Θέση')}</legend><label className="field"><span>{t('Find a place', 'Αναζήτηση θέσης')}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)}/></label><small>{t('Selecting a place means that place as a whole. Children remain independent.', 'Η επιλογή μιας θέσης αφορά ολόκληρη τη θέση. Οι επιμέρους θέσεις επιλέγονται ανεξάρτητα.')}</small><ul>{query ? nodes.filter(node => path(node).toLocaleLowerCase(lang).includes(query.toLocaleLowerCase(lang))).map(node => <li key={node.id}>{checkbox(node, true)}</li>) : branch(null)}</ul></fieldset>;
}
``````

#### File: `src/web/core/api.ts`

<!-- replay task=1 phase=implementation encoding=text sha256=45c25943fc3d62dd99554e455e861f7d17f09a5c3488b710e2141d410c389ea5 -->

``````ts
import type { Lang } from '../../domain';
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly details?: unknown) { super(code); }
}
// A transport failure or server failure does not prove that a write was rolled back.
export function isUnknownOutcome(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 507 && error.code === 'storage_capacity') return false;
  return !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
}
export interface ApiOptions { method?: string; body?: unknown; token?: string; signal?: AbortSignal }
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const method = options.method ?? 'GET';
  const body = options.body ?? (['GET', 'HEAD'].includes(method) ? undefined : {});
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await fetch(path, { method: options.method ?? 'GET', headers,
    credentials: options.token ? 'omit' : 'same-origin', cache: 'no-store', signal: options.signal,
    body: body === undefined ? undefined : JSON.stringify(body) });
  const data: unknown = method === 'HEAD' || response.status === 204 ? undefined : await response.json().catch(() => {
    if (response.ok) throw new ApiError(0, 'response_unknown');
    return null;
  });
  if (!response.ok) {
    const problem = data as { error?: string; details?: unknown } | null;
    throw new ApiError(response.status, problem?.error ?? 'request_failed', problem?.details);
  }
  return data as T;
}
const messages: Record<string, [string, string]> = {
  photo_conversion_failed: ['This photo could not be prepared. Upload the original as an attachment instead.', 'Η φωτογραφία δεν ήταν δυνατό να προετοιμαστεί. Μεταφορτώστε το πρωτότυπο ως συνημμένο.'],
  rule_violation: ['Complete the required record fields before saving.', 'Συμπληρώστε τα απαιτούμενα πεδία της εγγραφής πριν την αποθήκευση.'],
  duplicate_measurement_rows: ['Each item, quantity and unit combination must appear only once in a measurement set. Check for labels that differ only by spaces or letter case.', 'Κάθε συνδυασμός αντικειμένου, μεγέθους και μονάδας πρέπει να εμφανίζεται μόνο μία φορά στο σύνολο. Ελέγξτε ονομασίες που διαφέρουν μόνο σε κενά ή πεζά και κεφαλαία.'],
  invalid_credentials: ['Username or password is incorrect.', 'Λανθασμένο όνομα χρήστη ή συνθηματικό.'],
  too_many_attempts: ['Too many attempts. Try again shortly.', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
  unauthenticated: ['Your session ended. Sign in again.', 'Η σύνδεσή σας έληξε. Συνδεθείτε ξανά.'],
  invalid_input: ['Check the entered values. Your changes have not been saved.', 'Ελέγξτε τις τιμές. Οι αλλαγές σας δεν αποθηκεύτηκαν.'],
  record_invalid: ['Complete the required fields before saving.', 'Συμπληρώστε τα απαιτούμενα πεδία πριν την αποθήκευση.'],
  transition_rejected: ['This status change is not allowed. Check the required fields.', 'Η αλλαγή κατάστασης δεν επιτρέπεται. Ελέγξτε τα απαιτούμενα πεδία.'],
  upload_too_large: ['The complete upload exceeds 100 MB, including metadata and photo copies.', 'Η συνολική μεταφόρτωση υπερβαίνει τα 100 MB, μαζί με τα μεταδεδομένα και τα αντίγραφα φωτογραφίας.'],
  storage_capacity: ['Storage is full or unavailable. Contact the owner.', 'Ο χώρος αποθήκευσης είναι πλήρης ή μη διαθέσιμος. Επικοινωνήστε με τον ιδιοκτήτη.'],
  unsupported_file_type: ['This file could not be accepted in this format.', 'Το αρχείο δεν έγινε αποδεκτό σε αυτή τη μορφή.'],
  permission_denied: ['You do not have permission for this action.', 'Δεν έχετε δικαίωμα για αυτή την ενέργεια.'],
  owner_required: ['This action is available only to the owner.', 'Αυτή η ενέργεια επιτρέπεται μόνο στον ιδιοκτήτη.'],
};
const ruleMessages: Record<string, [string, string]> = {
  'required:title': ['Enter a title.', 'Συμπληρώστε τίτλο.'],
  'required:problemTypes': ['Select at least one problem type.', 'Επιλέξτε τουλάχιστον έναν τύπο προβλήματος.'],
  'required:question': ['Enter the question.', 'Συμπληρώστε το ερώτημα.'],
  disposition_required: ['Select a disposition.', 'Επιλέξτε τρόπο αντιμετώπισης.'],
  decision_required: ['Record who decided and the decision date.', 'Συμπληρώστε ποιος αποφάσισε και την ημερομηνία απόφασης.'],
  accept_as_is_required: ['Closing without verification requires Accept as is.', 'Το κλείσιμο χωρίς επαλήθευση απαιτεί Αποδοχή ως έχει.'],
  transition_not_allowed: ['This status transition is unavailable.', 'Αυτή η αλλαγή κατάστασης δεν είναι διαθέσιμη.'],
  reason_required: ['Choose a reason.', 'Επιλέξτε αιτιολογία.'],
  reason_invalid: ['Choose a reason from the list.', 'Επιλέξτε αιτιολογία από τη λίστα.'],
  reason_note_required: ['Add a note explaining the reason.', 'Προσθέστε σημείωση που εξηγεί την αιτιολογία.'],
  note_required: ['Add a transition note. For supersession, name the replacement record.', 'Προσθέστε σημείωση αλλαγής. Για αντικατάσταση, αναφέρετε τη νέα εγγραφή.'],
  verification_required: ['Complete the checked-by person, date and verification method.', 'Συμπληρώστε ποιος έλεγξε, την ημερομηνία και τη μέθοδο επαλήθευσης.'],
};
export function errorText(error: unknown, lang: Lang): string {
  if (error instanceof ApiError && error.details && typeof error.details === 'object' && 'errors' in error.details && Array.isArray(error.details.errors)) {
    const translated = error.details.errors.filter((code): code is string => typeof code === 'string').map(code => ruleMessages[code]?.[lang === 'en' ? 0 : 1]).filter(Boolean);
    if (translated.length) return translated.join(' ');
  }
  const message = error instanceof ApiError ? messages[error.code] : undefined;
  if (message) return message[lang === 'en' ? 0 : 1];
  if (error instanceof ApiError && [403, 404].includes(error.status)) return lang === 'en' ? 'This item is not available.' : 'Το στοιχείο δεν είναι διαθέσιμο.';
  return lang === 'en' ? 'The request could not be completed. Your unsaved input is still here. Refresh before retrying a creation or upload.' : 'Το αίτημα δεν ολοκληρώθηκε. Οι μη αποθηκευμένες τιμές διατηρούνται. Ανανεώστε πριν επαναλάβετε δημιουργία ή μεταφόρτωση.';
}
``````

#### File: `src/web/core/forms.tsx`

<!-- replay task=1 phase=implementation encoding=text sha256=1f58beb45c5cb846c441d869c99d5cfeabe7c7bc3fe2b4156ca20cca6935bbf2 -->

``````tsx
import { useEffect, useId, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { definitionOf, entriesOf, labelOf, type ListKey } from '../../domain';
import { errorText } from './api';
import { useI18n } from './i18n';
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function VocabSelect({ list, value, onChange, label, required = false }: { list: ListKey; value: string | null; onChange(value: string | null): void; label?: string; required?: boolean }) {
  const { lang, t } = useI18n(); const id = useId();
  return <div><div className="field"><label htmlFor={id}>{label ?? list}</label><select id={id} value={value ?? ''} required={required} onChange={event => onChange(event.target.value || null)}>
    <option value="">{t('Not specified', 'Δεν έχει οριστεί')}</option>{entriesOf(list).map(entry => <option key={entry.code} value={entry.code}>{labelOf(list, entry.code, lang)}</option>)}
  </select></div><details className="help"><summary>{t('Definitions', 'Ορισμοί')}</summary><dl>{entriesOf(list).map(entry => <div key={entry.code}><dt>{labelOf(list, entry.code, lang)}</dt><dd>{definitionOf(list, entry.code, lang)}</dd></div>)}</dl></details></div>;
}
export function MultiPick({ label, items, value, onChange }: { label: string; items: { id: number; label: string; active?: boolean }[]; value: number[]; onChange(ids: number[]): void }) {
  const { t } = useI18n();
  return <fieldset className="multi"><legend>{label}</legend>{items.filter(item => item.active !== false || value.includes(item.id)).map(item => <label className="check" key={item.id}><input type="checkbox" checked={value.includes(item.id)} disabled={item.active === false && !value.includes(item.id)} onChange={event => onChange(event.target.checked ? [...value, item.id] : value.filter(id => id !== item.id))}/>{item.label}{item.active === false ? ` (${t('inactive', 'ανενεργό')})` : ''}</label>)}{items.length === 0 && <small>{t('No entries', 'Δεν υπάρχουν καταχωρίσεις')}</small>}</fieldset>;
}
export function PersonSelect({ label, people, value, onChange }: { label: string; people: { id: number; name: string; active?: boolean }[]; value: number | null; onChange(value: number | null): void }) {
  const { t } = useI18n();
  return <Field label={label}><select value={value ?? ''} onChange={event => onChange(event.target.value ? Number(event.target.value) : null)}><option value="">{t('Not specified', 'Δεν έχει οριστεί')}</option>{people.filter(person => person.active !== false || person.id === value).map(person => <option key={person.id} value={person.id} disabled={person.active === false}>{person.name}{person.active === false ? ` (${t('inactive', 'ανενεργό')})` : ''}</option>)}</select></Field>;
}
export function BusyButton({ busy, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy: boolean }) { return <button {...props} disabled={busy || props.disabled} aria-busy={busy}>{children}</button>; }
export function ErrorNotice({ error }: { error: unknown }) { const { lang } = useI18n(); return error ? <div role="alert" className="error">{errorText(error, lang)}</div> : null; }
export function useDirtyGuard(dirty: boolean): void {
  useEffect(() => { if (!dirty) return; const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
}
``````

#### File: `src/web/core/i18n.tsx`

<!-- replay task=1 phase=implementation encoding=text sha256=69b1b0c43d5ae669ac22b18513edd9698ded740e0d22cefb2c384dabc95c1a12 -->

``````tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Lang } from '../../domain';
interface Language { lang: Lang; setLang(lang: Lang): void; t(en: string, el: string): string }
const Context = createContext<Language | null>(null);
export function LanguageProvider({ children, shared = false }: { children: ReactNode; shared?: boolean }) {
  const [lang, set] = useState<Lang>(() => {
    if (shared) return 'el';
    try { return localStorage.getItem('bb-language') === 'el' ? 'el' : 'en'; } catch { return 'en'; }
  });
  const setLang = (next: Lang) => { set(next); if (!shared) { try { localStorage.setItem('bb-language', next); } catch { /* Preference storage is optional. */ } } };
  return <Context.Provider value={{ lang, setLang, t: (en, el) => lang === 'en' ? en : el }}>{children}</Context.Provider>;
}
export function useI18n(): Language { const value = useContext(Context); if (!value) throw new Error('LanguageProvider required'); return value; }
``````

#### File: `src/web/core/types.ts`

<!-- replay task=1 phase=implementation encoding=text sha256=87c13a293fe5fce4586161d21e75329cb1ea87a887eb7a5f33596b78ad7987a9 -->

``````ts
export interface ViewContext { mode: 'owner' | 'contributor' | 'shared'; base: string; projectId?: number; recordId?: number; token?: string }
``````

- [ ] **Verify this task.** Run `npx vitest run tests/server/web-app.test.ts tests/web/core.test.ts`, then `npm run typecheck`. The focused tests and TypeScript check must pass.

- [ ] **Commit the task.** Stage only the task files. For Task 6, also stage the maintained-document and lifecycle edits named above.

```powershell
git add 'package.json' 'tsconfig.json' '.gitignore' 'vite.config.ts' 'vite.browser-test.config.ts' 'playwright.config.ts' 'tests/server/web-app.test.ts' 'tests/web/core.test.ts' 'src/server/web.ts' 'src/server/app.ts' 'src/web/core/LocationPicker.tsx' 'src/web/core/api.ts' 'src/web/core/forms.tsx' 'src/web/core/i18n.tsx' 'src/web/core/types.ts' 'package-lock.json'
git commit -m "feat: add browser foundation and static shell"
```

## Task 2: Managed lists

**Depends on:** Task 1.

Build People, Trades, Tags, Locations and Zone types with the existing APIs. Retain retirement rules, single-collision merge, usage checks, branch copy/move and dirty-form protection.

- [ ] **Write the complete tests and fixtures below.**

#### File: `tests/web/lists-rules.test.ts`

<!-- replay task=2 phase=test encoding=text sha256=deaf6a39aa976742f106be18bc7cdc6acdd9d5de468be6545adb4feae73af4e8 -->

``````ts
import { describe, expect, it } from 'vitest';
import { collidingTags, locationRows, parentChoices } from '../../src/web/lists/rules';

describe('managed list choices', () => {
  const nodes = [
    { id: 3, parentId: 2, sortOrder: 0, nameEn: 'Room', nameEl: '' },
    { id: 1, parentId: null, sortOrder: 2, nameEn: 'Building', nameEl: '' },
    { id: 2, parentId: 1, sortOrder: 0, nameEn: 'Floor', nameEl: '' },
    { id: 4, parentId: null, sortOrder: 1, nameEn: 'Site', nameEl: '' },
  ];
  it('orders parents before children while preserving sibling sort order', () => {
    expect(locationRows(nodes).map(({ node, depth }) => [node.id, depth])).toEqual([[4, 0], [1, 0], [2, 1], [3, 2]]);
  });
  it('excludes the edited or copied branch from possible parents', () => {
    expect(parentChoices(nodes, 2).map(({ node }) => node.id)).toEqual([4, 1]);
    expect(parentChoices(nodes, null)).toHaveLength(4);
  });
  it('matches accents and case without treating empty translations as collisions', () => {
    const tags = [{ id: 1, nameEn: 'Stone', nameEl: 'Πέτρα' }, { id: 2, nameEn: '', nameEl: 'Νερό' }];
    expect(collidingTags(tags, { nameEn: '', nameEl: ' ΠΕΤΡΑ ' }, null).map(t => t.id)).toEqual([1]);
    expect(collidingTags(tags, { nameEn: 'stone', nameEl: '' }, 1)).toEqual([]);
  });
  it('preserves two distinct collisions so the form rejects an ambiguous merge', () => {
    expect(collidingTags([{ id: 1, nameEn: 'Stone', nameEl: 'Πέτρα' }, { id: 2, nameEn: 'Water', nameEl: 'Νερό' }], { nameEn: 'Stone', nameEl: 'Νερό' }, null).map(t => t.id)).toEqual([1, 2]);
  });
});
``````

- [ ] **Check the pre-implementation result.** Run `npx vitest run tests/web/lists-rules.test.ts`. The list-rule module is missing. After adding it and the UI, the rule tests pass; actual list interactions are exercised in Task 5.

- [ ] **Write the complete implementation below.**

#### File: `src/web/lists/ManagedLists.tsx`

<!-- replay task=2 phase=implementation encoding=text sha256=41d0f1198b930638e1c115fa16805309d9fb6d612fb5bb1bc4241920aa19447d -->

``````tsx
import { useEffect, useRef, useState } from 'react';
import type { Person } from '../../server/lists/people';
import type { Trade } from '../../server/lists/trades';
import type { Tag } from '../../server/lists/tags';
import type { ZoneType } from '../../server/lists/zone-types';
import type { LocationNode } from '../../server/lists/locations';
import { api, ApiError } from '../core/api';
import { BusyButton, ErrorNotice, Field, VocabSelect, useDirtyGuard } from '../core/forms';
import { useI18n } from '../core/i18n';
import { collidingTags, listName, locationRows, parentChoices } from './rules';

type Section = 'people' | 'trades' | 'tags' | 'locations' | 'zone-types';
interface Lists { people: Person[]; trades: Trade[]; tags: Tag[]; locations: LocationNode[]; 'zone-types': ZoneType[] }
type Item = Person | Trade | Tag | LocationNode | ZoneType;
interface Draft {
  code: string; name: string; nameEn: string; nameEl: string;
  company: string; email: string; phone: string; role: string | null;
  defEn: string; defEl: string; kind: string | null;
  parentId: number | null; zoneTypeId: number | null; sortOrder: string;
}
const sections: Section[] = ['people', 'trades', 'tags', 'locations', 'zone-types'];
const emptyDraft = (): Draft => ({ code: '', name: '', nameEn: '', nameEl: '', company: '', email: '', phone: '', role: null, defEn: '', defEl: '', kind: null, parentId: null, zoneTypeId: null, sortOrder: '' });
function draftOf(item: Item | null): Draft {
  if (!item) return emptyDraft();
  return { ...emptyDraft(), ...item, company: 'company' in item ? item.company ?? '' : '', email: 'email' in item ? item.email ?? '' : '', phone: 'phone' in item ? item.phone ?? '' : '', sortOrder: 'sortOrder' in item ? String(item.sortOrder) : '' };
}

export function ManagedLists({ projectId }: { projectId: number }): React.JSX.Element {
  return <ListsProject key={projectId} projectId={projectId} />;
}

function ListsProject({ projectId }: { projectId: number }): React.JSX.Element {
  const { t, lang } = useI18n();
  const [section, setSection] = useState<Section>('people');
  const [data, setData] = useState<Lists | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ item: Item | null; copy: boolean } | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [initial, setInitial] = useState<Draft>(emptyDraft);
  const [collision, setCollision] = useState<Tag | null>(null);
  const [confirmation, setConfirmation] = useState<{ item: Item; records?: number } | null>(null);
  const alive = useRef(true);
  const base = `/api/projects/${projectId}`;
  const dirty = editor !== null && JSON.stringify(initial) !== JSON.stringify(draft);
  useDirtyGuard(dirty);
  const title = (key: Section) => ({ people: t('People', 'Πρόσωπα'), trades: t('Trades', 'Ειδικότητες'), tags: t('Tags', 'Ετικέτες'), locations: t('Locations', 'Τοποθεσίες'), 'zone-types': t('Zone types', 'Τύποι ζώνης') })[key];
  const name = (item: Item) => 'name' in item ? item.name : listName(item, lang);

  async function load(signal?: AbortSignal) {
    const [people, trades, tags, locations, zones] = await Promise.all([
      api<Person[]>(`${base}/people`, { signal }), api<Trade[]>(`${base}/trades`, { signal }),
      api<Tag[]>(`${base}/tags`, { signal }), api<LocationNode[]>(`${base}/locations`, { signal }),
      api<ZoneType[]>(`${base}/zone-types`, { signal }),
    ]);
    if (alive.current && !signal?.aborted) setData({ people, trades, tags, locations, 'zone-types': zones });
  }
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void load(controller.signal).catch(e => {
      if (!controller.signal.aborted) { setData(null); setError(e); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { alive.current = false; controller.abort(); };
  }, [projectId]);

  function discard(): boolean {
    return !dirty || window.confirm(t('Discard unsaved changes?', 'Απόρριψη μη αποθηκευμένων αλλαγών;'));
  }
  function close() { setEditor(null); setCollision(null); setError(null); setValidation(null); }
  function edit(item: Item | null, copy = false, parentId?: number) {
    if (!discard()) return;
    const next = draftOf(item);
    if (copy) { next.nameEn = ''; next.nameEl = ''; }
    if (parentId !== undefined) next.parentId = parentId;
    setDraft(next); setInitial(next); setEditor({ item, copy }); setCollision(null); setConfirmation(null); setError(null); setValidation(null);
  }
  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [key]: value })); setCollision(null); setError(null); setValidation(null);
  }
  async function act(path: string, method: string, body?: unknown) {
    if (busy) return;
    setBusy(true); setError(null); setValidation(null);
    try {
      await api(path, { method, body });
      if (!alive.current) return;
      setEditor(null); setCollision(null); setConfirmation(null);
      try { await load(); } catch (e) { setData(null); throw e; }
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { setData(null); setEditor(null); setConfirmation(null); }
      setError(e);
      if (e instanceof ApiError && e.code === 'tag_name_taken') {
        const details = e.details as { existingTagId?: number } | undefined;
        try {
          const tags = await api<Tag[]>(`${base}/tags`);
          if (alive.current) {
            setData(current => current ? { ...current, tags } : current);
            setCollision(tags.find(tag => tag.id === details?.existingTagId) ?? null);
          }
        } catch (refreshError) {
          if (alive.current) {
            if (refreshError instanceof ApiError && [401, 403].includes(refreshError.status)) { setData(null); setEditor(null); }
            setError(refreshError);
          }
        }
      }
    } finally { if (alive.current) setBusy(false); }
  }
  async function save() {
    if (!editor || !data) return;
    const names = { nameEn: draft.nameEn.trim(), nameEl: draft.nameEl.trim() };
    if (section !== 'people' && !names.nameEn && !names.nameEl) { setValidation(t('Enter an English or Greek name.', 'Συμπληρώστε ελληνικό ή αγγλικό όνομα.')); return; }
    if (section === 'tags') {
      const matches = collidingTags(data.tags, names, editor.item?.id ?? null);
      if (matches.length > 1) { setCollision(null); setValidation(t('These names belong to two different tags. Change a name before saving.', 'Τα ονόματα ανήκουν σε δύο διαφορετικές ετικέτες. Αλλάξτε ένα όνομα πριν την αποθήκευση.')); return; }
      if (matches[0]) { setCollision(matches[0]); return; }
    }
    let body: unknown = names;
    if (section === 'people') body = { code: draft.code.trim(), name: draft.name.trim(), company: draft.company.trim() || null, email: draft.email.trim() || null, phone: draft.phone.trim() || null, role: draft.role };
    if (section === 'trades') body = { ...names, code: draft.code.trim(), defEn: draft.defEn.trim(), defEl: draft.defEl.trim() };
    if (section === 'locations') body = editor.copy ? { ...names, parentId: draft.parentId } : { ...names, kind: draft.kind, parentId: draft.parentId, zoneTypeId: draft.zoneTypeId, ...(draft.sortOrder === '' ? {} : { sortOrder: Number(draft.sortOrder) }) };
    const suffix = editor.item ? `/${editor.item.id}${editor.copy ? '/copy' : ''}` : '';
    await act(`${base}/${section}${suffix}`, editor.item && !editor.copy ? 'PATCH' : 'POST', body);
  }
  async function askDelete(item: Item) {
    if (!discard() || busy) return;
    setEditor(null); setCollision(null); setError(null); setValidation(null);
    if (section !== 'tags') { setConfirmation({ item }); return; }
    setBusy(true);
    try {
      const usage = await api<{ records: number }>(`${base}/tags/${item.id}/usage`);
      if (alive.current) setConfirmation({ item, records: usage.records });
    } catch (e) {
      if (alive.current) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setData(null);
        setError(e);
      }
    } finally { if (alive.current) setBusy(false); }
  }
  const textField = (key: 'code' | 'name' | 'nameEn' | 'nameEl' | 'company' | 'email' | 'phone', label: string, required = false) => <Field label={label}><input value={draft[key]} required={required} maxLength={key === 'code' ? 20 : key === 'phone' ? 50 : 200} onChange={e => update(key, e.target.value)} /></Field>;
  const listErrors: Record<string, string> = {
    code_taken: t('This code is already in use. Choose a different code.', 'Αυτός ο κωδικός χρησιμοποιείται ήδη. Επιλέξτε διαφορετικό κωδικό.'),
    name_required: t('Enter an English or Greek name.', 'Συμπληρώστε ελληνικό ή αγγλικό όνομα.'),
    tag_name_taken: t('A tag already has this name. Use the existing tag or merge into it.', 'Υπάρχει ετικέτα με αυτό το όνομα. Χρησιμοποιήστε την υπάρχουσα ή συγχωνεύστε σε αυτή.'),
    tag_names_conflict: t('These names belong to two different tags. Change a name before saving.', 'Τα ονόματα ανήκουν σε δύο διαφορετικές ετικέτες. Αλλάξτε ένα όνομα πριν την αποθήκευση.'),
    location_in_use: t('Records use this branch. Cancel deletion and retire the location instead.', 'Εγγραφές χρησιμοποιούν αυτόν τον κλάδο. Ακυρώστε τη διαγραφή και απενεργοποιήστε την τοποθεσία.'),
    zone_type_in_use: t('Locations use this zone type. Change those locations before deleting it.', 'Τοποθεσίες χρησιμοποιούν αυτόν τον τύπο ζώνης. Αλλάξτε τις πριν τον διαγράψετε.'),
    location_cycle: t('A location cannot be moved inside its own branch.', 'Μια τοποθεσία δεν μπορεί να μετακινηθεί μέσα στον δικό της κλάδο.'),
    copy_into_own_branch: t('Choose a destination outside the copied branch.', 'Επιλέξτε προορισμό εκτός του κλάδου που αντιγράφεται.'),
  };
  const listError = error instanceof ApiError ? listErrors[error.code] : undefined;

  return <section aria-label={t('Managed lists', 'Διαχείριση λιστών')}>
    <h1>{t('Managed lists', 'Διαχείριση λιστών')}</h1>
    <nav aria-label={t('List selection', 'Επιλογή λίστας')} className="tabs">
      {sections.map(key => <button key={key} type="button" aria-pressed={key === section} disabled={busy} onClick={() => { if (discard()) { close(); setConfirmation(null); setSection(key); } }}>{title(key)}</button>)}
    </nav>
    {validation && <p role="alert" className="error">{validation}</p>}
    {listError ? <p role="alert" className="error">{listError}</p> : <ErrorNotice error={error} />}
    {loading && <p role="status">{t('Loading lists…', 'Φόρτωση λιστών…')}</p>}
    {!loading && !data && <button type="button" disabled={busy} onClick={() => { setBusy(true); setError(null); void load().catch(setError).finally(() => setBusy(false)); }}>{t('Retry', 'Επανάληψη')}</button>}
    {data && <>
      <h2>{title(section)}</h2>
      <button type="button" disabled={busy} onClick={() => edit(null)}>{t('Add', 'Προσθήκη')}</button>
      {editor && <form onSubmit={e => { e.preventDefault(); void save(); }} className="panel">
        <h3>{editor.copy ? t('Copy branch', 'Αντιγραφή κλάδου') : editor.item ? t('Edit entry', 'Επεξεργασία στοιχείου') : t('Add entry', 'Προσθήκη στοιχείου')}</h3>
        <fieldset disabled={busy}>
          {(section === 'people' || section === 'trades') && textField('code', t('Code', 'Κωδικός'), true)}
          {section === 'people' ? <>
            {textField('name', t('Name', 'Όνομα'), true)}
            <VocabSelect list="personRole" label={t('Role', 'Ρόλος')} value={draft.role} onChange={value => update('role', value)} required />
            {textField('company', t('Company', 'Εταιρεία'))}{textField('email', t('Email', 'Email'))}{textField('phone', t('Phone', 'Τηλέφωνο'))}
          </> : <>
            <p>{t('Provide at least one name. The other language is optional.', 'Συμπληρώστε τουλάχιστον ένα όνομα. Η άλλη γλώσσα είναι προαιρετική.')}</p>
            {textField('nameEn', t('English name', 'Αγγλικό όνομα'))}{textField('nameEl', t('Greek name', 'Ελληνικό όνομα'))}
          </>}
          {section === 'trades' && <>
            <Field label={t('English definition', 'Αγγλικός ορισμός')}><textarea value={draft.defEn} maxLength={2000} onChange={e => update('defEn', e.target.value)} /></Field>
            <Field label={t('Greek definition', 'Ελληνικός ορισμός')}><textarea value={draft.defEl} maxLength={2000} onChange={e => update('defEl', e.target.value)} /></Field>
          </>}
          {section === 'locations' && <>
            <Field label={t('Parent location', 'Γονική τοποθεσία')}><select value={draft.parentId ?? ''} onChange={e => update('parentId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">{t('Project root', 'Ρίζα έργου')}</option>
              {parentChoices(data.locations, editor.item?.id ?? null).map(({ node, depth }) => <option key={node.id} value={node.id}>{'— '.repeat(depth)}{name(node)}{!node.active ? t(' (retired)', ' (ανενεργό)') : ''}</option>)}
            </select></Field>
            {!editor.copy && <>
              <VocabSelect list="locationNodeKind" label={t('Location kind', 'Είδος τοποθεσίας')} value={draft.kind} onChange={value => update('kind', value)} required />
              <Field label={t('Zone type', 'Τύπος ζώνης')}><select value={draft.zoneTypeId ?? ''} onChange={e => update('zoneTypeId', e.target.value ? Number(e.target.value) : null)}><option value="">{t('None', 'Κανένας')}</option>{data['zone-types'].map(zone => <option key={zone.id} value={zone.id}>{name(zone)}</option>)}</select></Field>
              <Field label={t('Sort order', 'Σειρά ταξινόμησης')} hint={t('Lower numbers appear first among siblings. Leave blank to keep the current order or append a new entry.', 'Οι μικρότεροι αριθμοί εμφανίζονται πρώτοι στο ίδιο επίπεδο. Κενό διατηρεί τη σειρά ή προσθέτει νέο στοιχείο στο τέλος.')}><input type="number" step="1" value={draft.sortOrder} onChange={e => update('sortOrder', e.target.value)} /></Field>
            </>}
          </>}
          {collision && <div role="alert">
            <p>{t('This name already belongs to', 'Αυτό το όνομα ανήκει ήδη σε')}: <strong>{name(collision)}</strong> ({collision.nameEn} / {collision.nameEl}).</p>
            {editor.item ? <><p>{t('Merging replaces this tag on every record with the existing tag. The existing tag keeps its names.', 'Η συγχώνευση αντικαθιστά αυτή την ετικέτα σε όλες τις εγγραφές με την υπάρχουσα. Η υπάρχουσα ετικέτα διατηρεί τα ονόματά της.')}</p>
              <button type="button" onClick={() => { if (window.confirm(t(`Merge “${name(editor.item!)}” into “${name(collision)}”?`, `Συγχώνευση «${name(editor.item!)}» στην «${name(collision)}»;`))) void act(`${base}/tags/${editor.item!.id}/merge`, 'POST', { intoId: collision.id }); }}>{t('Merge into existing tag', 'Συγχώνευση στην υπάρχουσα ετικέτα')}</button></>
              : <button type="button" onClick={close}>{t('Keep existing tag', 'Διατήρηση υπάρχουσας ετικέτας')}</button>}
          </div>}
          <BusyButton busy={busy} type="submit">{t('Save', 'Αποθήκευση')}</BusyButton>
          <button type="button" onClick={() => { if (discard()) close(); }}>{t('Cancel', 'Ακύρωση')}</button>
        </fieldset>
      </form>}
      {confirmation && <div role="alertdialog" aria-modal="false" aria-label={t('Confirm deletion', 'Επιβεβαίωση διαγραφής')} className="panel">
        <p>{t('Delete', 'Διαγραφή')} “{name(confirmation.item)}”?</p>
        {section === 'tags' && <p>{t(`This tag is used by ${confirmation.records} records. Deleting removes it from all of them.`, `Αυτή η ετικέτα χρησιμοποιείται σε ${confirmation.records} εγγραφές. Η διαγραφή την αφαιρεί από όλες.`)}</p>}
        {section === 'locations' && <p>{t('This deletes the entire branch. A branch used by records cannot be deleted; retire it instead.', 'Διαγράφεται ολόκληρος ο κλάδος. Κλάδος που χρησιμοποιείται σε εγγραφές δεν διαγράφεται· απενεργοποιήστε τον.')}</p>}
        {section === 'zone-types' && <p>{t('A zone type used by a location cannot be deleted.', 'Τύπος ζώνης που χρησιμοποιείται σε τοποθεσία δεν μπορεί να διαγραφεί.')}</p>}
        <BusyButton busy={busy} type="button" onClick={() => void act(`${base}/${section}/${confirmation.item.id}`, 'DELETE')}>{t('Delete permanently', 'Οριστική διαγραφή')}</BusyButton>
        <button type="button" disabled={busy} onClick={() => { setConfirmation(null); setError(null); }}>{t('Cancel', 'Ακύρωση')}</button>
      </div>}
      {data[section].length === 0 && <p>{t('No entries yet.', 'Δεν υπάρχουν ακόμη στοιχεία.')}</p>}
      <ul className="managed-list">
        {(section === 'locations' ? locationRows(data.locations) : data[section].map(node => ({ node, depth: 0 }))).map(({ node, depth }) => <li key={node.id} style={{ marginInlineStart: `${depth * 1.25}rem` }}>
          <strong>{name(node)}</strong>{'code' in node && <span> ({node.code})</span>}
          {'active' in node && !node.active && <span> — {t('Retired', 'Ανενεργό')}</span>}
          {'company' in node && node.company && <span> · {node.company}</span>}
          {'defEn' in node && (node.defEn || node.defEl) && <details><summary>{t('Definition', 'Ορισμός')}</summary><p>{lang === 'en' ? node.defEn || node.defEl : node.defEl || node.defEn}</p></details>}
          <div className="actions">
            <button type="button" disabled={busy} onClick={() => edit(node)}>{t('Edit', 'Επεξεργασία')}</button>
            {'active' in node && <button type="button" disabled={busy} onClick={() => { if (discard() && window.confirm(node.active ? t(`Retire “${name(node)}”? Existing records keep this entry.`, `Απενεργοποίηση «${name(node)}»; Οι υπάρχουσες εγγραφές διατηρούν το στοιχείο.`) : t(`Reactivate “${name(node)}”?`, `Επανενεργοποίηση «${name(node)}»;`))) void act(`${base}/${section}/${node.id}`, 'PATCH', { active: !node.active }); }}>{node.active ? t('Retire', 'Απενεργοποίηση') : t('Reactivate', 'Επανενεργοποίηση')}</button>}
            {section === 'locations' && <><button type="button" disabled={busy} onClick={() => edit(null, false, node.id)}>{t('Add child', 'Προσθήκη θυγατρικού')}</button><button type="button" disabled={busy} onClick={() => edit(node, true)}>{t('Copy branch', 'Αντιγραφή κλάδου')}</button></>}
            {(section === 'tags' || section === 'zone-types' || section === 'locations') && <button type="button" disabled={busy} onClick={() => void askDelete(node)}>{t('Delete', 'Διαγραφή')}</button>}
          </div>
        </li>)}
      </ul>
    </>}
  </section>;
}
``````

#### File: `src/web/lists/rules.ts`

<!-- replay task=2 phase=implementation encoding=text sha256=9e5111f08cd9b9c04e856f4c03a49fa8d44283513b2301e60a096fbe3278b3bb -->

``````ts
import { tagKey } from '../../domain/lists';

export interface Named { id: number; nameEn: string; nameEl: string }
export interface TreeNode extends Named { parentId: number | null; sortOrder: number }

export function listName(item: Pick<Named, 'nameEn' | 'nameEl'>, lang: 'en' | 'el'): string {
  return lang === 'en' ? item.nameEn || item.nameEl : item.nameEl || item.nameEn;
}

export function collidingTags<T extends Named>(tags: T[], names: Omit<Named, 'id'>, exceptId: number | null): T[] {
  const en = tagKey(names.nameEn);
  const el = tagKey(names.nameEl);
  return tags.filter(tag => tag.id !== exceptId && ((en !== null && en === tagKey(tag.nameEn)) || (el !== null && el === tagKey(tag.nameEl))));
}

export function locationRows<T extends TreeNode>(nodes: T[]): { node: T; depth: number }[] {
  const result: { node: T; depth: number }[] = [];
  const seen = new Set<number>();
  const walk = (parentId: number | null, depth: number) => {
    for (const node of nodes.filter(n => n.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      result.push({ node, depth });
      walk(node.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

export function parentChoices<T extends TreeNode>(nodes: T[], sourceId: number | null): { node: T; depth: number }[] {
  const excluded = new Set<number>();
  if (sourceId !== null) excluded.add(sourceId);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId !== null && excluded.has(node.parentId) && !excluded.has(node.id)) {
        excluded.add(node.id);
        changed = true;
      }
    }
  }
  return locationRows(nodes).filter(({ node }) => !excluded.has(node.id));
}
``````

- [ ] **Verify this task.** Run `npx vitest run tests/web/lists-rules.test.ts`, then `npm run typecheck`. The focused tests and TypeScript check must pass.

- [ ] **Commit the task.** Stage only the task files. For Task 6, also stage the maintained-document and lifecycle edits named above.

```powershell
git add 'tests/web/lists-rules.test.ts' 'src/web/lists/ManagedLists.tsx' 'src/web/lists/rules.ts'
git commit -m "feat: add managed-list screens"
```

## Task 3: Evidence preparation, upload and safe viewers

**Depends on:** Task 2.

Add original-preserving photos, HEIC conversion, exact multipart sizing, progress/cancellation, authorized occurrence views/downloads, data-fed PDF and safe email workers. All fixture data is synthetic.

- [ ] **Write the complete tests and fixtures below.**

#### File: `tests/web/media-email.test.ts`

<!-- replay task=3 phase=test encoding=text sha256=6a52dd08fb12ca2a0da8ce29440c7c9da5be7891f0452c045810605b2c29a4f9 -->

``````ts
import { describe, expect, it } from 'vitest';
import { parseEmail } from '../../src/web/media/email';
import { burn } from '@kenjiuno/msgreader/lib/Burner';

const arrayBuffer = (text: string) => new TextEncoder().encode(text).buffer;
describe('email parsing', () => {
  it('reads encoded headers, strips active HTML and exposes embedded original bytes only', async () => {
    const message = ['From: Sender <sender@example.test>', 'To: Reader <reader@example.test>', 'Subject: =?UTF-8?B?U3ludGhldGljIOKckw==?=', 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary=outer', '', '--outer', 'Content-Type: text/html; charset=utf-8', '', '<p>Hello &amp; safe</p><script>evil()</script><img src="https://tracker.invalid/pixel">', '--outer', 'Content-Type: message/rfc822', 'Content-Disposition: attachment; filename="nested.eml"', '', 'Subject: Nested', '', 'Nested original body', '--outer--', ''].join('\r\n');
    const parsed = await parseEmail(arrayBuffer(message), 'eml');
    expect(parsed.subject).toBe('Synthetic ✓');
    expect(parsed.body).toBe('Hello & safe');
    expect(parsed.attachments[0]?.name).toBe('nested.eml');
    expect(new TextDecoder().decode(parsed.attachments[0]?.bytes)).toContain('Nested original body');
  });
  it('reads a genuine compound MSG with Unicode fields', async () => {
    const values = [['__substg1.0_0037001F', 'Synthetic MSG ✓'], ['__substg1.0_1000001F', 'Message body'], ['__substg1.0_0C1A001F', 'Sender']];
    const entries = [{ name: 'Root Entry', type: 5, children: [1, 2, 3], length: 0 }, ...values.map(([name, value]) => {
      const bytes = new Uint8Array(Buffer.from(value! + '\0', 'utf16le')); return { name: name!, type: 2, length: bytes.length, binaryProvider: () => bytes };
    })];
    const bytes = burn(entries);
    const result = await parseEmail(new Uint8Array(bytes).buffer, 'msg');
    expect(result.subject).toBe('Synthetic MSG ✓'); expect(result.body).toBe('Message body');
  });
  it('rejects malformed MSG and unsupported RTF-only or encrypted EML', async () => {
    await expect(parseEmail(arrayBuffer('broken'), 'msg')).rejects.toThrow();
    await expect(parseEmail(arrayBuffer('Subject: Encrypted\r\nContent-Type: application/pkcs7-mime\r\n\r\nYWJj'), 'eml')).rejects.toThrow('preview_unavailable');
  });
});
``````

#### File: `tests/web/media-transport.test.ts`

<!-- replay task=3 phase=test encoding=text sha256=8d696fd84345a5219ad6e68c8d5193b46d8e5aeac1be63f2c4a050483f3eac4e -->

``````ts
import { afterEach, expect, it, vi } from 'vitest';
import { uploadEvidence } from '../../src/web/media/transport';

afterEach(() => vi.unstubAllGlobals());
it('keeps a successful upload with unreadable JSON in the unknown-outcome path', async () => {
  class TruncatedResponse {
    upload = { onprogress: null }; status = 201; responseText = '{';
    onload?: () => void;
    open() {} setRequestHeader() {} abort() {}
    send() { queueMicrotask(() => this.onload?.()); }
  }
  vi.stubGlobal('XMLHttpRequest', TruncatedResponse);
  await expect(uploadEvidence({ mode: 'owner', base: '/api/projects/1/records/1' }, 'attachments', { file: new File(['synthetic'], 'note.txt') }, {})).rejects.toMatchObject({ status: 0, code: 'response_unknown' });
});
``````

#### File: `tests/web/media.test.ts`

<!-- replay task=3 phase=test encoding=text sha256=ec555289518e02f1073f388c2204a8c0819f10ae9fdc0614927904baa460e993 -->

``````ts
import { describe, expect, it } from 'vitest';
import { captureTimestamp, cleanFilename, buildMultipart } from '../../src/web/media/helpers';
import { htmlToText } from '../../src/web/media/emailText';

describe('media capture dates', () => {
  it('requires a real date and explicit offset, preserving the instant', () => {
    expect(captureTimestamp('2026:10:04 13:15:16', '+11:00')).toBe('2026-10-04T02:15:16.000Z');
    expect(captureTimestamp('2026:10:04 13:15:16', undefined)).toBeNull();
    expect(captureTimestamp(new Date(), '+11:00')).toBeNull();
    expect(captureTimestamp('2026:02:30 13:15:16', '+11:00')).toBeNull();
    expect(captureTimestamp('2026:10:04 13:15:16', '+25:00')).toBeNull();
    expect(captureTimestamp('2026:10:04 13:15:16', '-00:00')).toBeNull();
  });
});
describe('media multipart', () => {
  it('counts headers, UTF-8 metadata, copies and closing boundary in the actual body', async () => {
    const original = new File(['original'], 'Ελληνικά.jpg', { type: 'image/jpeg' });
    const body = buildMultipart('photos', { original, display: new Blob(['display']), thumbnail: new Blob(['thumb']) }, { phase: 'before', caption: 'Ελληνικά' }, 'boundary');
    const text = await body.blob.text();
    expect(body.blob.size).toBe(new TextEncoder().encode(text).length);
    expect(text).toContain('name="original"; filename="Ελληνικά.jpg"');
    expect(text).toContain('name="display"; filename="display.jpg"');
    expect(text).toContain('name="metadata"');
    expect(text.endsWith('--boundary--\r\n')).toBe(true);
    expect(() => buildMultipart('attachments', { file: original, extra: original }, {})).toThrow();
  });
  it('rejects actual envelope overflow even when original alone fits', () => {
    const file = new File(['1234567890'], 'test.txt');
    const exact = buildMultipart('attachments', { file }, {}, 'boundary').blob.size;
    expect(() => buildMultipart('attachments', { file }, {}, 'boundary', exact - 1)).toThrow('upload_too_large');
    expect(buildMultipart('attachments', { file }, {}, 'boundary', exact).blob.size).toBe(exact);
  });
  it('cleans embedded filenames without exposing directory or control text', () => {
    expect(cleanFilename('../a\\bad\r\n".eml')).toBe('bad___.eml');
    expect(cleanFilename('')).toBe('download');
  });
});
describe('inert email HTML', () => {
  it('extracts text without script, style, template, or remote fetching', () => {
    expect(htmlToText('<p>Hello &amp; safe</p><img src="https://tracker.invalid/pixel"><script>evil()</script><style>secret</style><template>hidden</template><p>Next</p>')).toBe('Hello & safe\nNext');
  });
});
``````

#### File: `tests/browser/fixtures/media-LICENSE.md`

<!-- replay task=3 phase=test encoding=text sha256=930ef70aaad394d49096ad5b404858220d0d2d3ebac163b2a23228c65c619729 -->

``````markdown
# Media test fixtures

All media-* fixtures in this directory are original synthetic test data created for BuiltBasis. They contain no real correspondence, people, photographs, or project data. The synthetic images and messages are dedicated to the public domain under CC0-1.0. No upstream sample image is copied.

media-synthetic.heic is a genuine HEVC-encoded HEIF, generated with pillow-heif 1.3.0 (libheif encoder) from a 96 by 64 image containing red, green, blue and yellow quadrants. media-synthetic.png is the same image without compression. media-oriented.jpg stores the same pixels with EXIF Orientation 6, DateTimeOriginal 2026:10:04 13:15:16 and OffsetTimeOriginal +11:00. Browser tests must decode the HEIC and verify the JPEG appears as 64 by 96, with capture time 2026-10-04T02:15:16.000Z, while retaining identical original bytes.

media-html.eml is an HTML-only MIME message with encoded UTF-8 subject, inert hostile markup and a nested original EML attachment. media-compound.msg is a real compound file generated with the pinned msgreader test Burner and synthetic Unicode streams. media-active.svg is an original hostile SVG test fixture. Any tracker.invalid reference is intentional test content and must produce zero network requests.

The fixture generator uses Pillow and pillow-heif only as authoring tools. Neither is an application dependency. Encoding does not establish browser support; the Playwright conversion test does.
``````

#### File: `tests/browser/fixtures/media-active.svg`

<!-- replay task=3 phase=test encoding=text sha256=0a73c5d6fbd51edaeb7caaa5a9c39d5c7eef49b41a3b56adf020c225eca4c0df -->

``````text
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><script>fetch('https://tracker.invalid/svg-script')</script><rect width="80" height="60" fill="green"/><image href="https://tracker.invalid/svg-image" width="20" height="20"/></svg>
``````

#### File: `tests/browser/fixtures/media-audio.wav`

<!-- replay task=3 phase=test encoding=base64 sha256=56d4af65701c26df20bd4021eda95b6e830348ce3a746086079fe89285548dc9 -->

``````text
UklGRqQ+AABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYA+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
``````

#### File: `tests/browser/fixtures/media-compound.msg`

<!-- replay task=3 phase=test encoding=base64 sha256=8b200512a2873ff98aef9116ef17ba4ab1aeef1d1d6d6156c2081f5dfb093cda -->

``````text
0M8R4KGxGuEAAAAAAAAAAAAAAAAAAAAAPgADAP7/CQAGAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAEAAAAQAAAAEAAAD+////AAAA
AAMAAAD/////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////9SAG8AbwB0ACAARQBu
AHQAcgB5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFgAFAf//////////AwAAAAsNAgAAAAAA
wAAAAAAAAEYAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAADAAAAAAAAAAF8AXwBzAHUAYgBzAHQAZwAxAC4AMABfADAAMAAzADcAMAAw
ADEARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqAAIA////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAACAAAAAAAAAAXwBfAHMAdQBiAHMAdABnADEALgAwAF8AMQAwADAAMAAwADAAMQBGAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAACoAAgD///////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAJgAAAAAAAABfAF8A
cwB1AGIAcwB0AGcAMQAuADAAXwAwAEMAMQBBADAAMAAxAEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKgACAQEAAAACAAAA////
/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAiAAAAAAAAAP7////+/////v//////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////UwB5AG4AdABoAGUAdABpAGMAIABNAFMARwAgABMnAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFMAeQBuAHQAaABlAHQAaQBjACAATQBTAEcAIABiAG8AZAB5AAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAABTAHkAbgB0AGgAZQB0AGkAYwAgAHMAZQBuAGQAZQByAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/////v////7////9////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////w==
``````

#### File: `tests/browser/fixtures/media-design.dwg`

<!-- replay task=3 phase=test encoding=text sha256=0875743d791af95110db4a13b171ffbcd4efc9106f125ec521b69fd1db458dfd -->

``````text
AC1032 Synthetic storage-only CAD fixture
``````

#### File: `tests/browser/fixtures/media-document.pdf`

<!-- replay task=3 phase=test encoding=base64 sha256=50ce886f4211471bf99e28766ef1f18eaf0e6050b97efd71967a14fa02bce81b -->

``````text
JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgL09wZW5BY3Rpb24gPDwgL1MgL1VSSSAvVVJJ
IChodHRwczovL3RyYWNrZXIuaW52YWxpZC9wZGYtYWN0aW9uKSA+PiA+PgplbmRvYmoKMiAwIG9iago8PCAvVHlwZSAvUGFnZXMg
L0tpZHMgWzMgMCBSXSAvQ291bnQgMSA+PgplbmRvYmoKMyAwIG9iago8PCAvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRp
YUJveCBbMCAwIDIwMCAxMjBdIC9SZXNvdXJjZXMgPDwgPj4gL0NvbnRlbnRzIDQgMCBSID4+CmVuZG9iago0IDAgb2JqCjw8IC9M
ZW5ndGggMjUgPj4Kc3RyZWFtCjAgMSAwIHJnIDEwIDEwIDgwIDYwIHJlIGYKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAw
MDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDEyNiAwMDAwMCBuIAowMDAwMDAwMTgzIDAwMDAwIG4g
CjAwMDAwMDAyODcgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA1IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgozNjIKJSVFT0YK
``````

#### File: `tests/browser/fixtures/media-harness.html`

<!-- replay task=3 phase=test encoding=text sha256=93c9374fa24544291bbb61cc0c91cff386708a32f224357050c9e9f78c874a79 -->

``````html
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'none'"></head><body><div id="root"></div><script type="module" src="./media-harness.tsx"></script></body></html>
``````

#### File: `tests/browser/fixtures/media-harness.tsx`

<!-- replay task=3 phase=test encoding=text sha256=e660ea0769e6aab51adcb3460a8c4d23f399acd4a6fdef6ec96ddb22c78dc9ad -->

``````tsx
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from '../../../src/web/core/i18n';
import { EvidencePane } from '../../../src/web/media';
import { preparePhoto, rasterImage, workerJob } from '../../../src/web/media/photos';
import { uploadEvidence } from '../../../src/web/media/transport';
import { buildMultipart } from '../../../src/web/media/helpers';
import type { EvidenceAttachment } from '../../../src/web/media/types';
const names = ['media-active.svg', 'media-html.eml', 'media-compound.msg', 'media-document.pdf', 'media-video.webm', 'media-audio.wav', 'media-design.dwg'];
const kinds = ['image', 'email', 'email', 'pdf', 'video', 'audio', 'document'] as const;
const types = ['image/svg+xml','message/rfc822','application/vnd.ms-outlook','application/pdf','video/webm','audio/wav','application/octet-stream'];
const attachments: EvidenceAttachment[] = names.map((name, index) => ({ id:index+1, originalFilename:name,title:null,size:100,contentType:types[index]!,uploadedBy:'Synthetic owner',uploadedAt:'2026-10-04T00:00:00Z',logEntry:null,capabilities:{kind:kinds[index]!,view:index===6?'download':index===1||index===2?'email':'native',download:true,mediaType:types[index],reader:index===1?'eml':index===2?'msg':undefined} }));
Object.assign(window, { mediaTest: { preparePhoto, rasterImage, workerJob, uploadEvidence, buildMultipart, attachments } });
const photoMode = new URLSearchParams(location.search).has('photo');
const photos = photoMode ? [{ id:1,originalFilename:'media-oriented.jpg',phase:'before' as const,caption:null,takenAt:null,uploadedBy:'Synthetic owner',uploadedAt:'2026-10-04T00:00:00Z' }] : [];
createRoot(document.getElementById('root')!).render(<LanguageProvider><EvidencePane context={photoMode ? {mode:'owner',base:'/api/projects/1/records/1'} : {mode:'shared',base:'/api/shared',token:'synthetic-test-only'}} photos={photos} attachments={attachments} canUpload={false} owner={false} onChange={()=>{}} onAccessLost={()=>document.getElementById('root')!.replaceChildren(document.createTextNode('Access lost'))}/></LanguageProvider>);
``````

#### File: `tests/browser/fixtures/media-html.eml`

<!-- replay task=3 phase=test encoding=text sha256=54643d8edf81ef25587e7cd529cc1160d05a0d878bfd4fc214197a42d81ce8ec -->

``````text
From: Sender <sender@example.test>
To: Reader <reader@example.test>
Subject: =?UTF-8?B?U3ludGhldGljIOKckw==?=
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary=outer

--outer
Content-Type: text/html; charset=utf-8

<p>Hello &amp; safe</p><img src="https://tracker.invalid/pixel"><script>fetch('https://tracker.invalid/script')</script><iframe src="https://tracker.invalid/frame"></iframe><p>Visible body</p>
--outer
Content-Type: message/rfc822
Content-Disposition: attachment; filename="nested.eml"

Subject: Nested synthetic
Content-Type: text/plain

Nested original body
--outer--
``````

#### File: `tests/browser/fixtures/media-oriented.jpg`

<!-- replay task=3 phase=test encoding=base64 sha256=2691324e317018e207ad23e97de18286ce1dc507c5a3f87d3acceeaa2e6cc66d -->

``````text
/9j/4AAQSkZJRgABAQAAAQABAAD/4QBoRXhpZgAATU0AKgAAAAgAAgESAAMAAAABAAYAAIdpAAQAAAABAAAAJgAAAAAAApADAAIA
AAAUAAAARJARAAIAAAAHAAAAWAAAAAAyMDI2OjEwOjA0IDEzOjE1OjE2ACsxMTowMAAA/9sAQwACAQEBAQECAQEBAgICAgIEAwIC
AgIFBAQDBAYFBgYGBQYGBgcJCAYHCQcGBggLCAkKCgoKCgYICwwLCgwJCgoK/9sAQwECAgICAgIFAwMFCgcGBwoKCgoKCgoKCgoK
CgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoK/8AAEQgAQABgAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAA
AAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJ
ChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeo
qaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgME
BQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBka
JicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2
t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A+L6KKK/lM/38CiiigAooooAjooor
Q/5KwooooAKKKKAJKKKKzP8ArUCiiigAooooAjooorQ/5KwooooAKKKKAPkeiiiv+qQ/oQKKKKACiiigD+xSiiiv+AM/qgKKKKAC
iiigD+Ouiiiv+/w/lcKKKKACiiigD+xSiiiv+AM/qgKKKKACiiigD//Z
``````

#### File: `tests/browser/fixtures/media-synthetic.heic`

<!-- replay task=3 phase=test encoding=base64 sha256=e663124e38634bba84ba5b7cec57c984ca8a37d0560e5268cfebcaa8bfac9bd4 -->

``````text
AAAAHGZ0eXBoZWljAAAAAG1pZjFoZWljbWlhZgAAAUJtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAA
AA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAFmAAEAAAAAAAAA7gAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEA
AGh2YzEAAAAAwmlwcnAAAACkaXBjbwAAAHhodmNDAQNwAAAAAAAAAAAAHvAA/P34+AAADwNgAAEAGEABDAH//wNwAAADAJAAAAMA
AAMAHroCQGEAAQArQgEBA3AAAAMAkAAAAwAAAwAeoDCBBZbqSSmubgIaDAgAAAMAyAAAAwAIQGIAAQAHRAHBcrAiQAAAABRpc3Bl
AAAAAAAAAGAAAABAAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAD2bWRhdAAAAOooAa8GOFr8/Tf5ne//
/8r13of72Bwu+VqVQQb4MP/+8p/ic7XAtDA3Jv3MfpXEzVIL38q5CR/0H56N/TLDf/+PsQU9IvwA7sK4eWE6WSTKkpyOQleYkdO2
+Gv5Kr/d4tYhmf3vzYf2bIf/8/FL5zq5WQxRGBq8k9vcYeen/7cNUYlrjbBNgEqNBgX79PS/+bAUf9c36mLBh2Td+KPuTDyQUf8J
zpuoldYvZdkSNiyHacZvIkbr+2WOKmHdyboWGhB7fRGlbn7aKDAO7OUMNRsGlEHn6yFruBB7jkSRs1jPJr4m+ECGWY/zdm8=
``````

#### File: `tests/browser/fixtures/media-synthetic.png`

<!-- replay task=3 phase=test encoding=base64 sha256=000e3f181b9e1439586e84e2bcfafd9b697bfbd75bb17a28a0998ef738b446aa -->

``````text
iVBORw0KGgoAAAANSUhEUgAAAGAAAABACAIAAABqVuVZAAAApklEQVR4nO3asQ3EMAwEQeord+dyB7+hGcxUQCwu5Lmzy3lmld/X
B2wnUBAoCBQECgIFgYJAQaAgUBAoCBQECgIFgYJAQaAgUBAoCBQECgIFgYJAQaAgUBAoCBQECgIFgcKZ2fUhdO+ZTSwoCBQECgIF
gYJAQaAgUBAoCBQECgIFgYJAQaAgUBAoCBQECgIFgYJAQaAgUBAoCBQECgIFgYJAQaD57wVJigT9+urS8wAAAABJRU5ErkJggg==
``````

#### File: `tests/browser/fixtures/media-video.webm`

<!-- replay task=3 phase=test encoding=base64 sha256=e93109528c59340afd60b02254b36c880761673346df43b4f351ca90eb360330 -->

``````text
GkXfowEAAAAAAAAfQoaBAUL3gQFC8oEEQvOBCEKChHdlYm1Ch4ECQoWBAhhTgGcBAAAAAAAE6RFNm3RAO027i1OrhBVJqWZTrIHl
TbuMU6uEFlSua1OsggEjTbuMU6uEElTDZ1OsggFqTbuMU6uEHFO7a1OsggTM7AEAAAAAAACbAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmAQAAAAAAADIq17GD
D0JATYCNTGF2ZjU4LjEyLjEwMFdBjUxhdmY1OC4xMi4xMDBEiYhAj0AAAAAAABZUrmsBAAAAAAAAO64BAAAAAAAAMteBAXPFgQGc
gQAitZyDdW5khoVWX1ZQOIOBASPjg4QCYloA4AEAAAAAAAAGsIFguoFAElTDZwEAAAAAAAC/c3MBAAAAAAAALmPAAQAAAAAAAABn
yAEAAAAAAAAaRaOHRU5DT0RFUkSHjUxhdmY1OC4xMi4xMDBzcwEAAAAAAAA5Y8ABAAAAAAAABGPFgQFnyAEAAAAAAAAhRaOHRU5D
T0RFUkSHlExhdmM1OC4xOC4xMDAgbGlidnB4c3MBAAAAAAAAOmPAAQAAAAAAAARjxYEBZ8gBAAAAAAAAIkWjiERVUkFUSU9ORIeU
MDA6MDA6MDEuMDAwMDAwMDAwAAAfQ7Z1AQAAAAAAAovngQCjxoEAAIAwBACdASpgAEAAAEcIhYWIhYSIAgICdaoD+AP6AgbybNPq
HDhw4cOHDhkA/v1u8//itYdZxf+K3//TZPFXjP/piwCjloEAKADRAQABEBAAGAAYWC/0AAiFKACjloEAUADRAQABEBAAGAAYWC/0
AAiFKACjloEAeADRAQABEBAAGAAYWC/0AAiFKACjloEAoADRAQABEBAAGAAYWC/0AAiFKACjloEAyADRAQABEBAAGAAYWC/0AAiF
KACjloEA8ADRAQABEBAAGAAYWC/0AAiFKACjloEBGADRAQABEBAUYABhYL/QACIUoACjloEBQADRAQABEBAAGAAYWC/0AAiFKACj
loEBaADRAQABEBAAGAAYWC/0AAiFKACjloEBkADRAQABEBAAGAAYWC/0AAiFKACjloEBuADRAQABEBAAGAAYWC/0AAiFKACjloEB
4ADRAQABEBAAGAAYWC/0AAiFKACjloECCADRAQABEBAAGAAYWC/0AAiFKACjloECMADRAQABEBAAGAAYWC/0AAiFKACjloECWADR
AQABEBAAGAAYWC/0AAiFKACjloECgADRAQABEBAAGAAYWC/0AAiFKACjloECqADRAQABEBAAGAAYWC/0AAiFKACjloEC0ADRAQAB
EBAUYABhYL/QACIUoACjloEC+ADRAQABEBAAGAAYWC/0AAiFKACjloEDIADRAQABEBAAGAAYWC/0AAiFKACjloEDSADRAQABEBAA
GAAYWC/0AAiFKACjloEDcADRAQABEBAAGAAYWC/0AAiFKACjloEDmADRAQABEBAAGAAYWC/0AAiFKACjloEDwADRAQABEBAAGAAY
WC/0AAiFKAAcU7trAQAAAAAAABG7j7OBALeK94EB8YICNfCBAw==
``````

- [ ] **Check the pre-implementation result.** Run `npx vitest run tests/web/media`. Media helper/parser modules are missing. Browser decoding, CSP, transport and viewer behavior are exercised against real browser engines in Task 5; unit tests alone are not that evidence.

- [ ] **Write the complete implementation below.**

#### File: `src/web/media/EvidencePane.tsx`

<!-- replay task=3 phase=implementation encoding=text sha256=cd57eeeb50c78a091a6114f8e30ea518d4ee3bf1d74ec3c1d278519ecd3bb284 -->

``````tsx
import { useEffect, useRef, useState } from 'react';
import { ACCEPTED_ATTACHMENT_EXTENSIONS, entriesOf, labelOf, type PhotoOut, type PhotoPhase } from '../../domain';
import type { ViewContext } from '../core/types';
import { api, isUnknownOutcome } from '../core/api';
import { ErrorNotice, Field, VocabSelect, useDirtyGuard } from '../core/forms';
import { useI18n } from '../core/i18n';
import { EvidenceViewer, PhotoThumbnail, type EvidenceSelection } from './EvidenceViewer';
import { preparePhoto } from './photos';
import { isAccessLost, uploadEvidence } from './transport';
import type { EvidenceAttachment } from './types';

interface Props { context: ViewContext; photos: PhotoOut[]; attachments: EvidenceAttachment[]; canUpload: boolean; owner: boolean; onChange(): void; onAccessLost(): void; onDirty?(dirty: boolean): void }
export function EvidencePane(props: Props) {
  return <EvidenceContent key={`${props.context.mode}:${props.context.base}:${props.context.token ?? ''}`} {...props} />;
}
function EvidenceContent({ context, photos, attachments, canUpload, owner, onChange, onAccessLost, onDirty }: Props) {
  const { lang, t } = useI18n();
  const [selection, setSelection] = useState<EvidenceSelection | null>(null);
  const [editing, setEditing] = useState<EvidenceSelection | null>(null);
  const [error, setError] = useState<unknown>();
  const [kind, setKind] = useState<'photos' | 'attachments'>('photos');
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<PhotoPhase>('before');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryBlocked, setRetryBlocked] = useState(false);
  const retryRefresh = useRef(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState<'' | 'complete' | 'stopped'>('');
  const scope = useRef<AbortController | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const lifetime = useRef(new AbortController());
  useEffect(() => { onDirty?.(files.length > 0 || caption.length > 0 || editing !== null || busy); }, [files.length, caption, editing, busy, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);
  useEffect(() => { lifetime.current = new AbortController(); return () => { lifetime.current.abort(); scope.current?.abort(); }; }, []);
  useEffect(() => { if (!canUpload) { scope.current?.abort(); setFiles([]); } }, [canUpload]);
  useEffect(() => {
    if (selection && !(selection.kind === 'photos' ? photos : attachments).some(item => item.id === selection.item.id)) setSelection(null);
  }, [photos, attachments, selection]);
  useEffect(() => { if (retryRefresh.current) { retryRefresh.current = false; setRetryBlocked(false); } }, [photos, attachments]);
  const failed = (value: unknown) => { if (isAccessLost(value)) { scope.current?.abort(); setSelection(null); setEditing(null); onAccessLost(); } else setError(value); };
  const upload = async () => {
    if (retryBlocked) return;
    const controller = new AbortController(); scope.current?.abort(); scope.current = controller;
    setBusy(true); setError(undefined); setMessage('');
    let completed = 0;
    try {
      // Process files one at a time. Do not prepare all copies or load all originals.
      for (const file of files) {
        setCurrent(file.name); setProgress(0);
        if (kind === 'photos') {
          const photo = await preparePhoto(file, controller.signal);
          await uploadEvidence(context, 'photos', { original: photo.original, display: photo.display, thumbnail: photo.thumbnail }, { phase, caption: caption || null, takenAt: photo.takenAt }, controller.signal, setProgress);
        } else await uploadEvidence(context, 'attachments', { file }, { title: caption || null }, controller.signal, setProgress);
        completed++; onChange();
      }
      setCaption('');
      setMessage('complete');
    } catch (value) {
      if (!controller.signal.aborted) { if (isUnknownOutcome(value)) setRetryBlocked(true); failed(value); }
      else { setRetryBlocked(true); setMessage('stopped'); }
    } finally {
      if (!lifetime.current.signal.aborted) {
        setFiles(previous => previous.slice(completed)); setBusy(false); setCurrent('');
        if (completed === files.length && picker.current) picker.current.value = '';
      }
    }
  };
  const remove = async (entry: EvidenceSelection) => {
    if (!confirm(t('Delete this evidence occurrence? The original stored file is retained.', 'Διαγραφή αυτής της καταχώρισης τεκμηρίου; Το αποθηκευμένο πρωτότυπο διατηρείται.'))) return;
    setError(undefined);
    try { await api(`${context.base}/${entry.kind}/${entry.item.id}`, { method: 'DELETE', body: {}, signal: lifetime.current.signal }); setSelection(null); onChange(); }
    catch (value) { if (!lifetime.current.signal.aborted) failed(value); }
  };
  return <section className="evidence-pane" aria-label={t('Evidence', 'Τεκμήρια')}><h2>{t('Evidence', 'Τεκμήρια')}</h2><ErrorNotice error={error} />
    <h3>{t('Photos', 'Φωτογραφίες')}</h3>{photos.length === 0 && <p>{t('No photos.', 'Δεν υπάρχουν φωτογραφίες.')}</p>}
    <div>{entriesOf('photoPhase').filter(entry => photos.some(photo => photo.phase === entry.code)).map(entry => <section key={entry.code}><h4>{labelOf('photoPhase', entry.code, lang)}</h4><div className="photo-grid">{photos.filter(photo => photo.phase === entry.code).map(item => <article className="evidence-card" key={item.id}><PhotoThumbnail context={context} photo={item} onOpen={() => setSelection({ kind: 'photos', item })} onAccessLost={onAccessLost}/><p>{labelOf('photoPhase', item.phase, lang)}{item.caption ? ` · ${item.caption}` : ''}</p><small>{item.uploadedBy} · {new Date(item.uploadedAt).toLocaleString(lang)}{item.takenAt && <> · {t('Taken', 'Λήψη')} {new Date(item.takenAt).toLocaleString(lang)}</>}</small>{owner && <div className="actions"><button onClick={() => setEditing({ kind: 'photos', item })}>{t('Edit photo', 'Επεξεργασία φωτογραφίας')}</button><button onClick={() => void remove({ kind: 'photos', item })}>{t('Delete photo', 'Διαγραφή φωτογραφίας')}</button></div>}</article>)}</div></section>)}</div>
    <h3>{t('Attachments', 'Συνημμένα')}</h3>{attachments.length === 0 && <p>{t('No attachments.', 'Δεν υπάρχουν συνημμένα.')}</p>}
    <div className="attachments">{attachments.map(item => <article className="evidence-card" key={item.id}><button onClick={() => setSelection({ kind: 'attachments', item })}>{item.title ?? item.originalFilename}</button><p>{item.originalFilename} · {item.size.toLocaleString(lang)} {t('bytes', 'byte')}</p><small>{item.uploadedBy} · {new Date(item.uploadedAt).toLocaleString(lang)}</small>{item.logEntry && <p>{t('Log entry', 'Καταχώριση ημερολογίου')} · {new Date(item.logEntry.eventAt).toLocaleString(lang)} · {item.logEntry.text}</p>}{owner && <div className="actions"><button onClick={() => setEditing({ kind: 'attachments', item })}>{t('Edit attachment', 'Επεξεργασία συνημμένου')}</button><button onClick={() => void remove({ kind: 'attachments', item })}>{t('Delete attachment', 'Διαγραφή συνημμένου')}</button></div>}</article>)}</div>
    {canUpload && <form className="evidence-upload" onSubmit={event => { event.preventDefault(); void upload(); }}><h3>{t('Add evidence', 'Προσθήκη τεκμηρίων')}</h3><fieldset disabled={busy}><Field label={t('Upload type', 'Τύπος μεταφόρτωσης')}><select value={kind} onChange={event => { setKind(event.target.value as typeof kind); setFiles([]); if (picker.current) picker.current.value = ''; }}><option value="photos">{t('Photos', 'Φωτογραφίες')}</option><option value="attachments">{t('Attachments', 'Συνημμένα')}</option></select></Field>{kind === 'photos' && <VocabSelect label={t('Photo phase', 'Φάση φωτογραφίας')} list="photoPhase" value={phase} onChange={value => { if (value) setPhase(value as PhotoPhase); }} required />}<Field label={kind === 'photos' ? t('Caption', 'Λεζάντα') : t('Attachment title', 'Τίτλος συνημμένου')}><input value={caption} maxLength={2000} onChange={event => setCaption(event.target.value)} /></Field><Field label={t('Files', 'Αρχεία')} hint={t('Each complete upload must fit within 100 MB, including metadata and photo copies. Files upload sequentially.', 'Κάθε συνολική μεταφόρτωση πρέπει να χωρά σε 100 MB μαζί με μεταδεδομένα και αντίγραφα φωτογραφίας. Τα αρχεία μεταφορτώνονται διαδοχικά.')}><input ref={picker} aria-label={t('Files', 'Αρχεία')} type="file" multiple accept={kind === 'photos' ? 'image/*,.heic,.heif' : ACCEPTED_ATTACHMENT_EXTENSIONS.map(value => `.${value}`).join(',')} onChange={event => setFiles(Array.from(event.target.files ?? []))} /></Field><button type="submit" disabled={files.length === 0 || retryBlocked}>{t('Upload evidence', 'Μεταφόρτωση τεκμηρίων')}</button></fieldset>{busy && <div role="status"><span>{current}</span><progress max={100} value={progress} aria-label={t('Upload progress', 'Πρόοδος μεταφόρτωσης')} /><button type="button" onClick={() => scope.current?.abort()}>{t('Cancel upload', 'Ακύρωση μεταφόρτωσης')}</button></div>}{retryBlocked && !busy && <button type="button" onClick={() => { retryRefresh.current = true; onChange(); }}>{t('Refresh evidence before retrying', 'Ανανεώστε τα τεκμήρια πριν δοκιμάσετε ξανά')}</button>}{message && <p role="status">{message === 'complete' ? t('Upload complete.', 'Η μεταφόρτωση ολοκληρώθηκε.') : t('Upload stopped. Refresh the record before retrying; the last file may have reached the server.', 'Η μεταφόρτωση διακόπηκε. Ανανεώστε την εγγραφή πριν δοκιμάσετε ξανά· το τελευταίο αρχείο μπορεί να έχει φτάσει στον διακομιστή.')}</p>}</form>}
    {selection && <EvidenceViewer key={`${selection.kind}:${selection.item.id}`} context={context} selection={selection} onClose={() => setSelection(null)} onAccessLost={onAccessLost} />}
    {editing && owner && <EvidenceEditor key={`${editing.kind}:${editing.item.id}`} context={context} entry={editing} onClose={() => setEditing(null)} onChange={onChange} onAccessLost={onAccessLost} />}
  </section>;
}
function EvidenceEditor({ context, entry, onClose, onChange, onAccessLost }: { context: ViewContext; entry: EvidenceSelection; onClose(): void; onChange(): void; onAccessLost(): void }) {
  const { t } = useI18n();
  const [text, setText] = useState((entry.kind === 'photos' ? entry.item.caption : entry.item.title) ?? '');
  const [phase, setPhase] = useState<PhotoPhase>(entry.kind === 'photos' ? entry.item.phase : 'before');
  const [takenAt, setTakenAt] = useState(entry.kind === 'photos' ? entry.item.takenAt ?? '' : '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>();
  const dirty = text !== ((entry.kind === 'photos' ? entry.item.caption : entry.item.title) ?? '') || (entry.kind === 'photos' && (phase !== entry.item.phase || takenAt !== (entry.item.takenAt ?? '')));
  useDirtyGuard(dirty);
  const close = () => { if (!busy && (!dirty || confirm(t('Discard unsaved evidence changes?', 'Να απορριφθούν οι μη αποθηκευμένες αλλαγές τεκμηρίου;')))) onClose(); };
  const dialog = useRef<HTMLDialogElement>(null); const control = useRef(new AbortController());
  useEffect(() => { control.current = new AbortController(); const previous = document.activeElement as HTMLElement | null; dialog.current?.showModal(); return () => { control.current.abort(); previous?.focus(); }; }, []);
  const save = async () => {
    setBusy(true); setError(undefined);
    try { await api(`${context.base}/${entry.kind}/${entry.item.id}`, { method: 'PATCH', body: entry.kind === 'photos' ? { caption: text || null, phase, takenAt: takenAt || null } : { title: text || null }, signal: control.current.signal }); onChange(); onClose(); }
    catch (value) { if (!control.current.signal.aborted) { if (isAccessLost(value)) onAccessLost(); else setError(value); } }
    finally { setBusy(false); }
  };
  return <dialog ref={dialog} aria-label={t('Edit evidence', 'Επεξεργασία τεκμηρίου')} onCancel={event => { event.preventDefault(); close(); }}><form onSubmit={event => { event.preventDefault(); void save(); }}><h3>{entry.item.originalFilename}</h3><ErrorNotice error={error} /><Field label={entry.kind === 'photos' ? t('Caption', 'Λεζάντα') : t('Attachment title', 'Τίτλος συνημμένου')}><input autoFocus value={text} maxLength={2000} onChange={event => setText(event.target.value)} /></Field>{entry.kind === 'photos' && <><VocabSelect list="photoPhase" label={t('Photo phase', 'Φάση φωτογραφίας')} value={phase} onChange={value => { if (value) setPhase(value as PhotoPhase); }} required /><Field label={t('Capture timestamp', 'Χρόνος λήψης')} hint={t('Use an ISO timestamp with an explicit timezone, or leave blank.', 'Χρησιμοποιήστε χρόνο ISO με ρητή ζώνη ώρας ή αφήστε κενό.')}><input value={takenAt} onChange={event => setTakenAt(event.target.value)} placeholder="2026-10-04T13:00:00+03:00" /></Field></>}<button disabled={busy} type="submit">{t('Save evidence', 'Αποθήκευση τεκμηρίου')}</button><button type="button" disabled={busy} onClick={close}>{t('Cancel', 'Ακύρωση')}</button></form></dialog>;
}
``````

#### File: `src/web/media/EvidenceViewer.tsx`

<!-- replay task=3 phase=implementation encoding=text sha256=e65a0fed923d144ca5e41b8a1a024e252fd18b7c3f5da2fea7c0e6b83aaa6e76 -->

``````tsx
import { useEffect, useRef, useState } from 'react';
import type { PhotoOut } from '../../domain/files';
import type { EvidenceAttachment as AttachmentOut } from './types';
import type { ViewContext } from '../core/types';
import { api } from '../core/api';
import { useI18n } from '../core/i18n';
import { downloadBlob, downloadOriginal, fetchBytes, isAccessLost } from './transport';
import { rasterImage, workerJob } from './photos';
import type { EmailPreview } from './email';
import { PdfViewer } from './PdfViewer';

export type EvidenceSelection = { kind: 'photos'; item: PhotoOut } | { kind: 'attachments'; item: AttachmentOut };
export function EvidenceViewer({ context, selection, onClose, onAccessLost }: { context: ViewContext; selection: EvidenceSelection; onClose(): void; onAccessLost(): void }) {
  const { t } = useI18n();
  const [source, setSource] = useState('');
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [email, setEmail] = useState<EmailPreview | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const scope = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const suffix = `/${selection.kind}/${selection.item.id}`;
  const original = suffix + (selection.kind === 'photos' ? '/original' : '/file');
  const kind = selection.kind === 'photos' ? 'image' : selection.item.capabilities.kind;
  const checkError = (error: unknown) => { if (isAccessLost(error)) onAccessLost(); };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const control = new AbortController(); scope.current = control;
    let url = '';
    setSource(''); setPdf(null); setEmail(null); setFailed(false); setLoading(true);
    const run = async () => {
      const capabilities = selection.kind === 'attachments' ? (await api<{ capabilities: AttachmentOut['capabilities'] }>(context.base + suffix + '/preview', { token: context.token, signal: control.signal })).capabilities : null;
      if (capabilities?.view === 'download') { setFailed(true); return; }
      if (capabilities?.kind === 'email') {
        if (!capabilities.reader) throw new Error('preview_unavailable');
        const bytes = await (await fetchBytes(context, original, control.signal)).arrayBuffer();
        control.signal.throwIfAborted();
        const result = await workerJob<EmailPreview>(new Worker(new URL('./email.worker.ts', import.meta.url), { type: 'module' }), { bytes, reader: capabilities.reader }, [bytes], control.signal);
        if (!control.signal.aborted) setEmail(result);
        return;
      }
      const path = suffix + (selection.kind === 'photos' ? '/display' : '/view');
      if (kind !== 'pdf' && context.mode !== 'shared') { setSource(context.base + path); return; }
      let blob = await fetchBytes(context, path, control.signal);
      if (kind === 'pdf') { setPdf(blob); return; }
      if (capabilities?.mediaType === 'image/svg+xml' || blob.type === 'image/svg+xml') blob = await rasterImage(blob, 'image/png', 2400, 5_000_000, control.signal);
      control.signal.throwIfAborted();
      url = URL.createObjectURL(blob); setSource(url);
    };
    void run().catch(error => { if (!control.signal.aborted) { checkError(error); setFailed(true); } }).finally(() => { if (!control.signal.aborted) setLoading(false); });
    return () => { control.abort(); if (url) URL.revokeObjectURL(url); setSource(''); setPdf(null); setEmail(null); };
  }, [context.base, context.token, selection.kind, selection.item.id]);
  const download = async () => {
    setDownloading(true); setDownloadFailed(false);
    try { await downloadOriginal(context, original, selection.item.originalFilename, scope.current?.signal); }
    catch (error) { if (!scope.current?.signal.aborted) { checkError(error); setDownloadFailed(true); } }
    finally { setDownloading(false); }
  };
  const mediaFailure = () => {
    setFailed(true);
    // A native cookie player cannot report HTTP status. Recheck occurrence access.
    if (context.mode !== 'shared') void api(context.base + suffix + (selection.kind === 'photos' ? '/display' : '/preview'), { method: selection.kind === 'photos' ? 'HEAD' : 'GET', signal: scope.current?.signal }).catch(checkError);
  };
  return <dialog ref={dialog} className="evidence-viewer" aria-label={t('Evidence viewer', 'Προβολή τεκμηρίου')} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h3>{selection.item.originalFilename}</h3><button autoFocus onClick={onClose}>{t('Close', 'Κλείσιμο')}</button></header>
    <button disabled={downloading} onClick={() => void download()}>{downloading ? t('Downloading…', 'Λήψη…') : t('Download original', 'Λήψη πρωτοτύπου')}</button>
    {downloadFailed && <p role="alert">{t('Download failed. Try again.', 'Η λήψη απέτυχε. Δοκιμάστε ξανά.')}</p>}
    {loading && <p role="status">{t('Opening preview…', 'Άνοιγμα προεπισκόπησης…')}</p>}
    {failed && <p role="status">{t('Preview unavailable. Download the original to open it with a compatible application.', 'Η προεπισκόπηση δεν είναι διαθέσιμη. Κατεβάστε το πρωτότυπο και ανοίξτε το με συμβατή εφαρμογή.')}</p>}
    {!failed && source && kind === 'image' && <img className="evidence-image" src={source} alt={selection.kind === 'photos' ? selection.item.caption ?? selection.item.originalFilename : selection.item.title ?? selection.item.originalFilename} onError={mediaFailure} />}
    {!failed && source && kind === 'video' && <video controls playsInline preload="metadata" src={source} onError={mediaFailure} />}
    {!failed && source && kind === 'audio' && <audio controls preload="metadata" src={source} onError={mediaFailure} />}
    {!failed && pdf && <PdfViewer bytes={pdf} onFailure={() => setFailed(true)} />}
    {!failed && email && <article className="email-preview"><dl><dt>{t('Subject', 'Θέμα')}</dt><dd>{email.subject}</dd><dt>{t('From', 'Από')}</dt><dd>{email.from}</dd><dt>{t('To', 'Προς')}</dt><dd>{email.to}</dd><dt>{t('Date', 'Ημερομηνία')}</dt><dd>{email.date}</dd></dl><pre>{email.body}</pre>{email.attachments.length > 0 && <h4>{t('Embedded attachments', 'Ενσωματωμένα συνημμένα')}</h4>}{email.attachments.map((item, index) => <button key={index} onClick={() => downloadBlob(new Blob([item.bytes]), item.name, scope.current?.signal)}>{t('Download', 'Λήψη')} {item.name}</button>)}</article>}
  </dialog>;
}

export function PhotoThumbnail({ context, photo, onOpen, onAccessLost }: { context: ViewContext; photo: PhotoOut; onOpen(): void; onAccessLost(): void }) {
  const [source, setSource] = useState('');
  const { t } = useI18n();
  useEffect(() => {
    const controller = new AbortController(); let url = '';
    void fetchBytes(context, `/photos/${photo.id}/thumbnail`, controller.signal).then(blob => {
      if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setSource(url); }
    }).catch(error => { if (!controller.signal.aborted && isAccessLost(error)) onAccessLost(); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); setSource(''); };
  }, [context.base, context.token, photo.id]);
  return <button className="photo-thumbnail" onClick={onOpen} aria-label={`${t('Open photo', 'Άνοιγμα φωτογραφίας')} ${photo.originalFilename}`}>{source ? <img src={source} loading="lazy" alt={photo.caption ?? photo.originalFilename} /> : photo.originalFilename}</button>;
}
``````

#### File: `src/web/media/PdfViewer.tsx`

<!-- replay task=3 phase=implementation encoding=text sha256=45d63712fda3f0d06259b16618e7e3ecc142cc8ada20d9316ea74a9e6b456fde -->

``````tsx
import { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useI18n } from '../core/i18n';
GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function PdfViewer({ bytes, onFailure }: { bytes: Blob; onFailure(): void }) {
  const { t } = useI18n();
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    let task: ReturnType<typeof getDocument> | undefined;
    setDoc(null); setPage(1);
    void bytes.arrayBuffer().then(data => {
      if (!active) return;
      // Data-fed only. Canvas pages omit actions, scripting, forms, attachments,
      // annotation links, and any automatic document navigation.
      task = getDocument({ data, useWorkerFetch: false, useWasm: false, disableAutoFetch: true,
        disableStream: true, disableFontFace: true, useSystemFonts: true, stopAtErrors: true });
      return task.promise.then(value => { if (active) setDoc(value); });
    }).catch(() => { if (active) onFailure(); });
    return () => { active = false; setDoc(null); if (task) void task.destroy(); };
  }, [bytes]);
  useEffect(() => {
    if (!doc || !canvas.current) return;
    let active = true;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    const target = canvas.current;
    void doc.getPage(page).then(pdfPage => {
      if (!active) return;
      const original = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: Math.min(1.5, 1200 / original.width, 1800 / original.height) });
      target.width = viewport.width; target.height = viewport.height;
      const context = target.getContext('2d');
      if (!context) throw new Error('preview_unavailable');
      task = pdfPage.render({ canvas: target, canvasContext: context, viewport });
      return task.promise;
    }).catch(() => { if (active) onFailure(); });
    return () => { active = false; task?.cancel(); target.width = target.height = 0; };
  }, [doc, page]);
  return <div className="pdf-viewer">{doc && <div className="actions"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{t('Previous page', 'Προηγούμενη σελίδα')}</button><span>{t('Page', 'Σελίδα')} {page} / {doc.numPages}</span><button disabled={page >= doc.numPages} onClick={() => setPage(value => value + 1)}>{t('Next page', 'Επόμενη σελίδα')}</button></div>}<canvas ref={canvas} aria-label={t('PDF page', 'Σελίδα PDF')} /></div>;
}
``````

#### File: `src/web/media/email.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=2eb71f340023a3660599062f217b9a0d1150a95291c0211711b27802a412f388 -->

``````ts
import PostalMime from 'postal-mime';
import MsgModule from '@kenjiuno/msgreader';
import { htmlToText } from './emailText';
import { cleanFilename } from './helpers';
export interface EmailPreview { subject: string; from: string; to: string; date: string; body: string; attachments: { name: string; bytes: ArrayBuffer }[] }
export async function parseEmail(bytes: ArrayBuffer, reader: 'eml' | 'msg'): Promise<EmailPreview> {
  if (reader === 'eml') {
    const message = await PostalMime.parse(bytes, { forceRfc822Attachments: true, maxRfc822NestingDepth: 0 });
    const body = message.text?.trim() || htmlToText(message.html ?? '');
    if (!body) throw new Error('preview_unavailable');
    return { subject: message.subject ?? '', from: [message.from?.name, message.from?.address].filter(Boolean).join(' '),
      to: (message.to ?? []).map(value => 'address' in value ? [value.name, value.address].filter(Boolean).join(' ') : value.name).join(', '),
      date: message.date ?? '', body,
      attachments: message.attachments.map(value => ({ name: cleanFilename(value.filename ?? 'attachment'), bytes: typeof value.content === 'string' ? new TextEncoder().encode(value.content).buffer : value.content instanceof ArrayBuffer ? value.content : new Uint8Array(value.content).buffer })) };
  }
  // CJS interop differs between Node's tests and the browser bundle.
  const MsgReader = (MsgModule as unknown as { default?: typeof MsgModule }).default ?? MsgModule;
  const parser = new MsgReader(bytes);
  const message = parser.getFileData();
  if (message.error) throw new Error('preview_unavailable');
  const body = message.body?.trim() || htmlToText(message.bodyHtml ?? (message.html ? new TextDecoder().decode(message.html) : ''));
  if (!body) throw new Error('preview_unavailable');
  return { subject: message.subject ?? '', from: [message.senderName, message.senderEmail].filter(Boolean).join(' '),
    to: (message.recipients ?? []).map(value => [value.name, value.email].filter(Boolean).join(' ')).join(', '), date: message.messageDeliveryTime ?? '', body,
    attachments: (message.attachments ?? []).map(value => { const item = parser.getAttachment(value); return { name: cleanFilename(item.fileName), bytes: new Uint8Array(item.content).buffer }; }) };
}
``````

#### File: `src/web/media/email.worker.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=bfeb42cfc83e2f0fcc31829276d16c3d9492929dc3e4afa8525b5429d5906fe8 -->

``````ts
import { parseEmail } from './email';
self.onmessage = async (event: MessageEvent<{ bytes: ArrayBuffer; reader: 'eml' | 'msg' }>) => {
  try {
    const result = await parseEmail(event.data.bytes, event.data.reader);
    self.postMessage({ result }, { transfer: result.attachments.map(item => item.bytes) });
  } catch { self.postMessage({ error: true }); }
};
``````

#### File: `src/web/media/emailText.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=246961aa0422ec57cfe4b46315e81fc59e3ed83a192e042184dc894ab4a3bd4b -->

``````ts
import { Parser } from 'htmlparser2';
/** Tokenization only. No DOM, resource loading, links, or active HTML. */
export function htmlToText(html: string): string {
  let hidden = 0;
  const chunks: string[] = [];
  const inert = new Set(['script', 'style', 'template', 'head']);
  const blocks = new Set(['p', 'div', 'br', 'li', 'tr', 'h1', 'h2', 'h3', 'blockquote']);
  const parser = new Parser({
    onopentag(name) { if (inert.has(name)) hidden++; if (!hidden && blocks.has(name)) chunks.push('\n'); },
    ontext(value) { if (!hidden) chunks.push(value); },
    onclosetag(name) { if (inert.has(name)) hidden = Math.max(0, hidden - 1); if (!hidden && blocks.has(name)) chunks.push('\n'); },
  }, { decodeEntities: true });
  parser.end(html);
  return chunks.join('').replace(/\n[ \t]*\n+/g, '\n').trim();
}
``````

#### File: `src/web/media/heic.worker.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=768d8cfd99f5bc1d7adace8617082472d655503daef7b3704f918e0eb2fe95e5 -->

``````ts
import { heicTo } from 'heic-to/csp';
self.onmessage = async (event: MessageEvent<Blob>) => {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await heicTo({ blob: event.data, type: 'bitmap' });
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('preview_unavailable');
    context.drawImage(bitmap, 0, 0);
    const result = await canvas.convertToBlob({ type: 'image/jpeg', quality: .9 });
    canvas.width = canvas.height = 0;
    self.postMessage({ result });
  } catch { self.postMessage({ error: true }); }
  finally { bitmap?.close(); }
};
``````

#### File: `src/web/media/helpers.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=c7eda18ede6ed612c5b1a1ae365c5ae755949f08f024f7251c1de1c5a607f097 -->

``````ts
import { FILE_LIMITS, UPLOAD_REQUEST_LIMIT } from '../../domain/files';

export function captureTimestamp(date: unknown, offset: unknown): string | null {
  if (typeof date !== 'string' || typeof offset !== 'string' || offset === '-00:00') return null;
  const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(date);
  if (!match || !/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset) || (/^[+-]14:/.test(offset) && !offset.endsWith(':00'))) return null;
  const local = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
  const check = new Date(`${local}Z`);
  if (Number.isNaN(check.getTime()) || check.toISOString().slice(0, 19) !== local) return null;
  const instant = new Date(local + offset);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}
export function cleanFilename(value: string): string {
  return (value.split(/[\\/]/).at(-1) ?? '').replace(/[\x00-\x1f\x7f"]/g, '_').slice(0, 255) || 'download';
}
export function buildMultipart(kind: 'photos' | 'attachments', files: Record<string, Blob>, metadata: unknown, boundary = `builtbasis-${crypto.randomUUID()}`, limit = UPLOAD_REQUEST_LIMIT): { blob: Blob; contentType: string } {
  const names = kind === 'photos' ? ['original', 'display', 'thumbnail'] : ['file'];
  if (Object.keys(files).length !== names.length || names.some(name => !files[name])) throw new Error('invalid_upload');
  const parts: BlobPart[] = [`--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n${JSON.stringify(metadata)}\r\n`];
  for (const name of names) {
    const file = files[name]!;
    const purpose = kind === 'photos' ? `photo-${name}` as keyof typeof FILE_LIMITS : 'attachment';
    if (file.size > FILE_LIMITS[purpose]) throw new Error('upload_too_large');
    const filename = cleanFilename(file instanceof File ? file.name : `${name}.jpg`);
    const type = /^[\w.+-]+\/[\w.+-]+$/.test(file.type) ? file.type : 'application/octet-stream';
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`, file, '\r\n');
  }
  parts.push(`--${boundary}--\r\n`);
  const blob = new Blob(parts);
  if (blob.size > limit) throw new Error('upload_too_large');
  return { blob, contentType: `multipart/form-data; boundary=${boundary}` };
}
export function abortCheck(signal?: AbortSignal): void { signal?.throwIfAborted(); }
``````

#### File: `src/web/media/index.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=b4c807083344d844eb1ed9b5e41b973547548d8c2c3ea9f922bcd36c890b7bd9 -->

``````ts
export { EvidencePane } from './EvidencePane';
export { preparePhoto } from './photos';
export { uploadEvidence } from './transport';
``````

#### File: `src/web/media/photos.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=05098bb1ee3393e1d6a7813e29693fdedcb8dd397cdc28cae34da521e2794a16 -->

``````ts
import { ApiError } from '../core/api';
import { abortCheck, captureTimestamp } from './helpers';

export function workerJob<T>(worker: Worker, value: unknown, transfer: Transferable[] = [], signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const done = () => { worker.terminate(); signal?.removeEventListener('abort', cancel); };
    const cancel = () => { done(); reject(new DOMException('Aborted', 'AbortError')); };
    worker.onmessage = event => { done(); event.data.error ? reject(new Error('preview_unavailable')) : resolve(event.data.result as T); };
    worker.onerror = () => { done(); reject(new Error('preview_unavailable')); };
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) { cancel(); return; }
    worker.postMessage(value, transfer);
  });
}
export function decodeImage(blob: Blob, signal?: AbortSignal): Promise<HTMLImageElement> {
  abortCheck(signal);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const done = () => { URL.revokeObjectURL(url); img.onload = null; img.onerror = null; signal?.removeEventListener('abort', cancel); };
    const cancel = () => { done(); img.src = ''; reject(new DOMException('Aborted', 'AbortError')); };
    img.onload = () => { done(); resolve(img); };
    img.onerror = () => { done(); reject(new Error('preview_unavailable')); };
    signal?.addEventListener('abort', cancel, { once: true });
    // Detached Image only; original SVG sources must never enter the DOM.
    img.src = url;
  });
}
export async function rasterImage(blob: Blob, mime = 'image/png', maxSide = 2400, byteLimit = 5_000_000, signal?: AbortSignal): Promise<Blob> {
  const img = await decodeImage(blob, signal);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  try {
    for (;;) {
      abortCheck(signal);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('preview_unavailable');
      if (mime === 'image/jpeg') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const result = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('preview_unavailable')), mime, .85));
      abortCheck(signal);
      if (result.size <= byteLimit) return result;
      if (canvas.width === 1 && canvas.height === 1) throw new Error('upload_too_large');
      canvas.width = Math.max(1, Math.floor(canvas.width * .75));
      canvas.height = Math.max(1, Math.floor(canvas.height * .75));
    }
  } finally { canvas.width = canvas.height = 0; img.src = ''; }
}
async function preparePhotoInternal(file: File, signal?: AbortSignal): Promise<{ original: File; display: Blob; thumbnail: Blob; takenAt: string | null }> {
  abortCheck(signal);
  const exifr = await import('exifr');
  let takenAt: string | null = null;
  try {
    const tags = await exifr.parse(file, { pick: ['DateTimeOriginal', 'OffsetTimeOriginal'], reviveValues: false, translateValues: false });
    takenAt = captureTimestamp(tags?.DateTimeOriginal, tags?.OffsetTimeOriginal);
  } catch { /* No unambiguous EXIF date is a valid outcome. */ }
  abortCheck(signal);
  let source: Blob = file;
  const head = new TextDecoder().decode(await file.slice(4, 40).arrayBuffer());
  if (/ftyp(?:heic|heix|hevc|hevx|mif1|msf1)/.test(head)) {
    source = await workerJob<Blob>(new Worker(new URL('./heic.worker.ts', import.meta.url), { type: 'module' }), file, [], signal);
  }
  // Browsers apply EXIF orientation when decoding an Image. Do not rotate again.
  const display = await rasterImage(source, 'image/jpeg', 2400, 5_000_000, signal);
  const thumbnail = await rasterImage(display, 'image/jpeg', 360, 500_000, signal);
  return { original: file, display, thumbnail, takenAt };
}

export async function preparePhoto(file: File, signal?: AbortSignal): Promise<{ original: File; display: Blob; thumbnail: Blob; takenAt: string | null }> {
  try { return await preparePhotoInternal(file, signal); }
  catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw new ApiError(415, 'photo_conversion_failed');
  }
}
``````

#### File: `src/web/media/transport.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=abf70a619452eb3b909084d9994f757b7951cbb909f0c16ffcbade1e69ee4130 -->

``````ts
import { ApiError } from '../core/api';
import type { ViewContext } from '../core/types';
import { abortCheck, buildMultipart, cleanFilename } from './helpers';

export function isAccessLost(error: unknown): boolean { return error instanceof ApiError && [401, 403, 404].includes(error.status); }
export async function fetchBytes(context: ViewContext, suffix: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(context.base + suffix, { credentials: context.token ? 'omit' : 'same-origin',
    headers: context.token ? { Authorization: `Bearer ${context.token}` } : {}, cache: 'no-store', signal });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, data.error ?? 'request_failed');
  }
  return response.blob();
}
export function downloadBlob(blob: Blob, filename: string, signal?: AbortSignal): void {
  abortCheck(signal);
  // Original bytes and embedded attachments are always explicit downloads.
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url; link.download = cleanFilename(filename); link.rel = 'noopener';
  const release = () => { URL.revokeObjectURL(url); clearTimeout(timer); signal?.removeEventListener('abort', release); };
  const timer = setTimeout(release, 1000);
  signal?.addEventListener('abort', release, { once: true });
  document.body.append(link); link.click(); link.remove();
}
export async function downloadOriginal(context: ViewContext, suffix: string, filename: string, signal?: AbortSignal): Promise<void> {
  downloadBlob(await fetchBytes(context, suffix, signal), filename, signal);
}
export async function uploadEvidence(context: ViewContext, kind: 'photos' | 'attachments', files: Record<string, Blob>, metadata: unknown, signal?: AbortSignal, onProgress?: (percent: number) => void): Promise<unknown> {
  abortCheck(signal);
  if (context.mode === 'shared') throw new ApiError(403, 'permission_denied');
  let envelope: ReturnType<typeof buildMultipart>;
  try { envelope = buildMultipart(kind, files, metadata); }
  catch (error) { throw new ApiError(error instanceof Error && error.message === 'upload_too_large' ? 413 : 400, error instanceof Error ? error.message : 'invalid_upload'); }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const cancel = () => xhr.abort();
    const done = () => signal?.removeEventListener('abort', cancel);
    xhr.open('POST', `${context.base}/${kind}`);
    xhr.setRequestHeader('Content-Type', envelope.contentType);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => {
      done(); let data: { error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch {
        if (xhr.status >= 200 && xhr.status < 300) { reject(new ApiError(0, 'response_unknown')); return; }
        // A non-success status still supplies a controlled rejection below.
      }
      if (xhr.status >= 200 && xhr.status < 300) { onProgress?.(100); resolve(data); }
      else reject(new ApiError(xhr.status, data.error ?? 'request_failed'));
    };
    xhr.onerror = () => { done(); reject(new ApiError(0, 'request_failed')); };
    xhr.onabort = () => { done(); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', cancel, { once: true });
    xhr.send(envelope.blob);
  });
}
``````

#### File: `src/web/media/types.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=6329494deb8d23f96b93133fe3f48b19047f6570b28fd9cf28512aa0d715347c -->

``````ts
import type { SharedRecord } from '../../domain';
export type EvidenceAttachment = SharedRecord['attachments'][number];
``````

#### File: `src/web/media/upload.ts`

<!-- replay task=3 phase=implementation encoding=text sha256=e3fa07a3e8d2c17c1406a471cc9936ebc7bd9f3d3df56f4b76f352e42380dc88 -->

``````ts
export { preparePhoto } from './photos';
export { uploadEvidence } from './transport';
``````

- [ ] **Verify this task.** Run `npx vitest run tests/web/media`, then `npm run typecheck`. The focused tests and TypeScript check must pass.

- [ ] **Commit the task.** Stage only the task files. For Task 6, also stage the maintained-document and lifecycle edits named above.

```powershell
git add 'tests/web/media-email.test.ts' 'tests/web/media-transport.test.ts' 'tests/web/media.test.ts' 'tests/browser/fixtures/media-LICENSE.md' 'tests/browser/fixtures/media-active.svg' 'tests/browser/fixtures/media-audio.wav' 'tests/browser/fixtures/media-compound.msg' 'tests/browser/fixtures/media-design.dwg' 'tests/browser/fixtures/media-document.pdf' 'tests/browser/fixtures/media-harness.html' 'tests/browser/fixtures/media-harness.tsx' 'tests/browser/fixtures/media-html.eml' 'tests/browser/fixtures/media-oriented.jpg' 'tests/browser/fixtures/media-synthetic.heic' 'tests/browser/fixtures/media-synthetic.png' 'tests/browser/fixtures/media-video.webm' 'src/web/media/EvidencePane.tsx' 'src/web/media/EvidenceViewer.tsx' 'src/web/media/PdfViewer.tsx' 'src/web/media/email.ts' 'src/web/media/email.worker.ts' 'src/web/media/emailText.ts' 'src/web/media/heic.worker.ts' 'src/web/media/helpers.ts' 'src/web/media/index.ts' 'src/web/media/photos.ts' 'src/web/media/transport.ts' 'src/web/media/types.ts' 'src/web/media/upload.ts'
git commit -m "feat: add evidence uploads and protected viewers"
```

## Task 4: Record sections, editing and record access

**Depends on:** Task 3.

Build the owner/contributor/share record page, subtype fields, options, status/verification, measurements, Log, Activity, public/private Notes and owner share/grant controls. Inline tag creation preserves the current record draft.

- [ ] **Write the complete tests and fixtures below.**

#### File: `tests/web/record-data.test.ts`

<!-- replay task=4 phase=test encoding=text sha256=d2820da5d7a515b9f97433adf5c278de39056950ac67183cbc6ae69e1a32a270 -->

``````ts
import { beforeEach, expect, it, vi } from 'vitest';
import { api } from '../../src/web/core/api';
import { loadRecord } from '../../src/web/record/data';
vi.mock('../../src/web/core/api', () => ({ api: vi.fn() }));
const request = vi.mocked(api);
beforeEach(() => { request.mockReset(); });
it('loads shared content exclusively through the token projection', async () => {
  request.mockResolvedValue({ record: { humanId: 'T-0001' } });
  const signal = new AbortController().signal;
  const data = await loadRecord({ mode: 'shared', base: '/api/shared', token: 'test-token' }, signal);
  expect(request.mock.calls).toEqual([['/api/shared/record', { signal, token: 'test-token' }]]);
  expect(data.permissions).toEqual({ canUpload: false, canAddLog: false });
  expect(data.owner).toBeUndefined();
});
it('keeps contributor upload and Log permissions independent', async () => {
  request.mockResolvedValue({ record: {}, permissions: { canUpload: true, canAddLog: false } });
  const signal = new AbortController().signal;
  const data = await loadRecord({ mode: 'contributor', base: '/api/assigned-records/8' }, signal);
  expect(request.mock.calls).toEqual([['/api/assigned-records/8', { signal }]]);
  expect(data.permissions).toEqual({ canUpload: true, canAddLog: false });
  expect(data.owner).toBeUndefined();
});
it('does not convert a failed access refresh into stale content', async () => {
  request.mockRejectedValue(new Error('revoked'));
  await expect(loadRecord({ mode: 'shared', base: '/api/shared', token: 'test-token' }, new AbortController().signal)).rejects.toThrow('revoked');
});
``````

#### File: `tests/web/record-errors.test.ts`

<!-- replay task=4 phase=test encoding=text sha256=ec5919f3b0e1379cf1baef279c2f1023d6f2a31a38da0d3368b6c87971432955 -->

``````ts
import { expect, it } from 'vitest';
import { ApiError, errorText } from '../../src/web/core/api';

it('explains rejected record conditions in each interface language', () => {
  const error = new ApiError(422, 'transition_rejected', { errors: ['required:title', 'decision_required', 'verification_required'] });
  expect(errorText(error, 'en')).toContain('Record who decided');
  expect(errorText(error, 'el')).toContain('ημερομηνία απόφασης');
  expect(errorText(error, 'el')).not.toContain('decision_required');
});
it('does not render arbitrary error-detail payload as record content', () => {
  const error = new ApiError(422, 'rule_violation', { errors: ['INTERNAL_SENTINEL', { privateText: 'PRIVATE_SENTINEL' }] });
  expect(errorText(error, 'en')).not.toMatch(/INTERNAL_SENTINEL|PRIVATE_SENTINEL/);
});
``````

#### File: `tests/web/record-format.test.ts`

<!-- replay task=4 phase=test encoding=text sha256=252fab527a8296ea56d071c44ef117ace93d6d26cc88f5f5c0c4d6f07715986c -->

``````ts
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../src/web/core/i18n';
import { Measurements } from '../../src/web/record/Measurements';
import type { SharedRecord } from '../../src/domain';
import { measurementNumber } from '../../src/web/record/number-format';
import { Sharing } from '../../src/web/record/Sharing';

it('permits the owner to create a link for a Draft record', () => {
  const html = renderToStaticMarkup(createElement(LanguageProvider, { children: createElement(Sharing, { base: '/api/projects/1/records/1', draft: true, onAccessLost() {}, onDirty() {} }) }));
  expect(html).toContain('Create link');
  expect(html).not.toContain('<fieldset disabled');
});

describe('measurement numeric display', () => {
  for (const lang of ['en', 'el'] as const) {
    it(`round trips finite doubles, including subnormal values and exponents, in ${lang}`, () => {
      for (const value of [0, -0, Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE, 1e-12, -1e-12, 1e21, 1.000000001, 1.000000001 - 1, 0.12345678901234568]) {
        const text = measurementNumber(value, lang);
        expect(Number(text.replace(',', '.'))).toBe(value === 0 ? 0 : value);
        if (lang === 'el') expect(text).not.toContain('.');
      }
      expect(measurementNumber(0.12345678901234568, lang)).toBe(lang === 'el' ? '0,12345678901234568' : '0.12345678901234568');
    });
    it(`preserves small nonzero differences and precise values in ${lang}`, () => {
      const sets: SharedRecord['measurements'] = [{ id: 1, date: '2026-01-01', phase: 'before', measuredById: null, note: null, rows: [
        { item: 'First', quantity: 'Width', unit: 'mm', value: 1, note: null },
        { item: 'Second', quantity: 'Width', unit: 'mm', value: 1.000000001, note: null },
        { item: 'Small', quantity: 'Depth', unit: 'mm', value: 1e-12, note: null },
      ] }];
      const html = renderToStaticMarkup(createElement(LanguageProvider, { shared: lang === 'el', children: createElement(Measurements, { sets, people: [], owner: false, onEdit() {}, onDelete() {} }) }));
      expect(html).toContain(lang === 'el' ? '1,000000001' : '1.000000001');
      expect(html).toContain(lang === 'el' ? '1,000000082740371e-9' : '1.000000082740371e-9');
      expect(html).toContain('1e-12');
    });
  }
});
``````

#### File: `tests/web/record-helpers.test.ts`

<!-- replay task=4 phase=test encoding=text sha256=8551279821e6549ebfd6a55672eb1b6e9351d4e513020869f9e26001a669480e -->

``````ts
import { describe, expect, it } from 'vitest';
import { changedPatch, localInput, measurementGroups, displayValue, signedBar } from '../../src/web/record/helpers';

describe('record form boundaries', () => {
  it('preserves text and omits unchanged hidden estimates', () => {
    expect(changedPatch({ title: 'old', outsideScope: true, estimatedCost: 12 }, { title: '  New\ntext ', outsideScope: false, estimatedCost: 12 })).toEqual({ title: '  New\ntext ', outsideScope: false });
  });
  it('does not clear arrays merely because their identities differ', () => {
    expect(changedPatch({ tagIds: [4, 8] }, { tagIds: [4, 8] })).toEqual({});
  });
  it('retains the saved estimate when an edited amount is hidden by unticking scope', () => {
    expect(changedPatch({ outsideScope: true, estimatedCost: 12 }, { outsideScope: false, estimatedCost: 25 })).toEqual({ outsideScope: false });
  });
  it('groups comparisons by normalized labels and exact units', () => {
    expect(measurementGroups([{ item: ' Left ', quantity: ' Stone  width ', unit: 'mm', value: 1 }, { item: 'left', quantity: 'stone width', unit: 'mm', value: 2 }, { item: 'left', quantity: 'stone width', unit: 'cm', value: 3 }])).toHaveLength(2);
  });
  it('formats person and vocabulary values without internal IDs', () => {
    expect(displayValue('ballInCourtId', 4, 'en', [{ id: 4, name: 'Alex' }])).toBe('Alex');
    expect(displayValue('status', 'in_progress', 'en', [])).toBe('In progress');
    expect(displayValue('instructionText', 'Keep  spacing\nexactly', 'en', [])).toBe('Keep  spacing\nexactly');
  });
  it('builds local datetime input without losing minutes', () => {
    expect(localInput(new Date(2026, 4, 2, 12, 34))).toBe('2026-05-02T12:34');
  });
  it('draws negative values to the left and positive values to the right of zero', () => {
    expect(signedBar(-5, 10)).toEqual({ left: 25, width: 25 });
    expect(signedBar(5, 10)).toEqual({ left: 50, width: 25 });
    expect(signedBar(0, 1)).toEqual({ left: 50, width: 0 });
  });
});
``````

#### File: `tests/web/record-log.test.ts`

<!-- replay task=4 phase=test encoding=text sha256=5b29461b3a8531203cd56915b309b555b34e4be352747f08f83e90687d881ce3 -->

``````ts
import { expect, it } from 'vitest';
import { logDateFields, logTimestamp } from '../../src/web/record/helpers';

it.each(['2026-04-04T16:30:47.123Z', '2026-10-04T02:15:16.789Z'])('preserves exact original milliseconds when displayed event time is unchanged: %s', original => {
  const fields = logDateFields(original);
  expect(logTimestamp(fields.local, fields.offset, { original, ...fields })).toBe(original);
});
it('distinguishes both Melbourne repeated-hour instants using an explicit offset', () => {
  expect(logTimestamp('2026-04-05T02:30:47.123', '+11:00')).toBe('2026-04-04T15:30:47.123Z');
  expect(logTimestamp('2026-04-05T02:30:47.123', '+10:00')).toBe('2026-04-04T16:30:47.123Z');
});
it('rejects missing, invalid and impossible offsets or calendar dates', () => {
  for (const offset of ['', '+25:00', '+14:01', '+10:65']) expect(() => logTimestamp('2026-04-05T02:30', offset)).toThrow(RangeError);
  expect(() => logTimestamp('2026-02-30T02:30', '+10:00')).toThrow(RangeError);
});
``````

- [ ] **Check the pre-implementation result.** Run `npx vitest run tests/web/record-`. Record helper and loader modules are missing. Existing domain rules are reused rather than redefined in the UI. Task 5 exercises complete record flows.

- [ ] **Write the complete implementation below.**

#### File: `src/web/record/Activity.tsx`

<!-- replay task=4 phase=implementation encoding=text sha256=789e03e3005e1b8bde9f6df285befd59b23b6181f606e643e11f710db84fdcfd -->

``````tsx
import { isCode, labelOf } from '../../domain';
import { useI18n } from '../core/i18n';
import type { RecordData } from './data';
import { dateText, displayValue } from './helpers';

const fields: Record<string, [string, string]> = { ballInCourtId: ['Ball in court', 'Επόμενη ενέργεια από'], responsibleId: ['Responsible', 'Υπεύθυνος'], severity: ['Severity', 'Σοβαρότητα'], priority: ['Priority', 'Προτεραιότητα'], dueDate: ['Due date', 'Προθεσμία'], disposition: ['Disposition', 'Τρόπος αντιμετώπισης'], chosenOptionId: ['Chosen option', 'Επιλεγμένη λύση'], decidedById: ['Decided by', 'Αποφάσισε'], decidedOn: ['Decided on', 'Ημερομηνία απόφασης'], instructionText: ['Instruction text', 'Κείμενο εντολής'], status: ['Status', 'Κατάσταση'] };
const actions: Record<string, [string, string]> = { created: ['Record created', 'Δημιουργία εγγραφής'], field_changed: ['Field changed', 'Αλλαγή πεδίου'], status_changed: ['Status changed', 'Αλλαγή κατάστασης'], share_created: ['Share link created', 'Δημιουργία συνδέσμου κοινοποίησης'], share_revoked: ['Share link revoked', 'Ανάκληση συνδέσμου κοινοποίησης'], grant_changed: ['Record access changed', 'Αλλαγή πρόσβασης εγγραφής'], grant_revoked: ['Record access removed', 'Αφαίρεση πρόσβασης εγγραφής'] };
export function Activity({ data }: { data: RecordData }) {
  const { t, lang } = useI18n();
  const option = (value: unknown) => value && typeof value === 'object' && 'label' in value && typeof value.label === 'string' ? value.label : '—';
  return <section><h2>{t('Activity', 'Ιστορικό ενεργειών')}</h2>{data.activity.length === 0 && <p>{t('No activity yet.', 'Δεν υπάρχουν ακόμη ενέργειες.')}</p>}{data.activity.map(entry => {
    const action = actions[entry.action] ?? ['Activity', 'Ενέργεια']; const field = entry.field ? fields[entry.field] : undefined; const detail = entry.detail;
    const detailValue = (key: string): unknown => detail && key in detail ? (detail as Record<string, unknown>)[key] : null;
    const reason = detailValue('reasonCode'); const reasonList = entry.to === 'on_hold' ? 'onHoldReason' : 'cancellationReason';
    const verification = detailValue('verification') as { outcome?: string; method?: string; checkedById?: number; date?: string } | null;
    return <article key={entry.id}><h3>{dateText(entry.at, lang)} · {t(...action)}</h3>{'by' in entry && <p>{entry.by}</p>}{field && <p>{t(...field)}</p>}{(entry.action === 'field_changed' || entry.action === 'status_changed') && <dl><div><dt>{t('Previous', 'Προηγούμενο')}</dt><dd className="user-text">{entry.field === 'chosenOptionId' ? option(detailValue('fromOption')) : displayValue(entry.field, entry.from, lang, data.labels.people)}</dd></div><div><dt>{t('New', 'Νέο')}</dt><dd className="user-text">{entry.field === 'chosenOptionId' ? option(detailValue('toOption')) : displayValue(entry.field, entry.to, lang, data.labels.people)}</dd></div></dl>}
      {isCode(reasonList, reason) && <p>{t('Reason', 'Αιτιολογία')}: {labelOf(reasonList, reason, lang)}</p>}{['reasonNote', 'note', 'label'].map(key => typeof detailValue(key) === 'string' ? <p key={key} className="user-text">{String(detailValue(key))}</p> : null)}
      {verification && <p>{verification.date ? dateText(verification.date, lang) : ''} · {data.labels.people.find(person => person.id === verification.checkedById)?.name} · {isCode('verificationMethod', verification.method) ? labelOf('verificationMethod', verification.method, lang) : ''} · {isCode('verificationOutcome', verification.outcome) ? labelOf('verificationOutcome', verification.outcome, lang) : ''}</p>}
      {typeof detailValue('canUpload') === 'boolean' && <p>{t('Upload evidence', 'Μεταφόρτωση τεκμηρίων')}: {detailValue('canUpload') ? t('Allowed', 'Επιτρέπεται') : t('Not allowed', 'Δεν επιτρέπεται')}</p>}{typeof detailValue('canAddLog') === 'boolean' && <p>{t('Add Log entries', 'Προσθήκη καταχωρίσεων στο ημερολόγιο')}: {detailValue('canAddLog') ? t('Allowed', 'Επιτρέπεται') : t('Not allowed', 'Δεν επιτρέπεται')}</p>}
    </article>;
  })}</section>;
}
``````

#### File: `src/web/record/Log.tsx`

<!-- replay task=4 phase=implementation encoding=text sha256=822f98395d5805494531a637f02b68f5a8f8e6ebbf0ccf41a7f75746e9cd724c -->

``````tsx
import { useState } from 'react';
import type { LogEntryInput } from '../../domain';
import { BusyButton, Field } from '../core/forms';
import { useI18n } from '../core/i18n';
import type { Log } from './data';
import { logDateFields, logTimestamp } from './helpers';

export function LogEditor({ initial, owner, busy, retryBlocked, reviewed, onReload, onSave, onCancel, onDirty }: { initial?: Log; owner: boolean; busy: boolean; retryBlocked: boolean; reviewed: boolean; onReload: () => Promise<boolean>; onSave: (body: LogEntryInput) => Promise<void>; onCancel: () => void; onDirty: () => void }) {
  const { t } = useI18n();
  const [original] = useState(() => initial?.eventAt ?? new Date().toISOString());
  const [originalFields] = useState(() => logDateFields(original));
  const [eventAt, setEventAt] = useState(originalFields.local); const [offset, setOffset] = useState(originalFields.offset);
  const [text, setText] = useState(initial?.text ?? ''); const [privateEntry, setPrivate] = useState(initial?.private ?? false); const [invalidTime, setInvalidTime] = useState(false);
  return <form onChange={onDirty} onSubmit={e => { e.preventDefault(); if (retryBlocked) return; let timestamp: string; try { timestamp = logTimestamp(eventAt, offset, { original, ...originalFields }); setInvalidTime(false); } catch { setInvalidTime(true); return; } void onSave({ eventAt: timestamp, text, ...(owner ? { private: privateEntry } : {}) }); }}><fieldset disabled={busy}><legend>{t('Log entry', 'Καταχώριση ημερολογίου')}</legend>
    {invalidTime && <p role="alert">{t('Enter a valid event date and UTC offset, such as +10:00.', 'Συμπληρώστε έγκυρη ημερομηνία γεγονότος και απόκλιση UTC, όπως +10:00.')}</p>}
    <Field label={t('Event date and time', 'Ημερομηνία και ώρα γεγονότος')}><input required type="datetime-local" step="0.001" value={eventAt} onChange={e => setEventAt(e.target.value)} /></Field>
    <Field label={t('UTC offset', 'Απόκλιση UTC')}><input required placeholder="+10:00" value={offset} onChange={e => setOffset(e.target.value)} /></Field>
    <p>{t('The offset identifies the exact instant, including repeated hours when daylight saving ends. When changing the date or time, check its offset. Unchanged event times keep their original precision.', 'Η απόκλιση προσδιορίζει την ακριβή χρονική στιγμή, ακόμη και στις επαναλαμβανόμενες ώρες κατά τη λήξη της θερινής ώρας. Όταν αλλάζετε ημερομηνία ή ώρα, ελέγξτε την απόκλιση. Οι αμετάβλητοι χρόνοι διατηρούν την αρχική ακρίβειά τους.')}</p>
    <Field label={t('Entry', 'Καταχώριση')}><textarea required maxLength={20000} value={text} onChange={e => setText(e.target.value)} /></Field>{owner && <label><input type="checkbox" checked={privateEntry} onChange={e => setPrivate(e.target.checked)} />{t('Private · owner only', 'Ιδιωτική · μόνο για τον ιδιοκτήτη')}</label>}<p>{t('Save the entry, then attach files to it.', 'Αποθηκεύστε την καταχώριση και μετά προσθέστε τα αρχεία της.')}</p>
    {retryBlocked && <p>{t('The entry may already be saved. Refresh the saved Log before retrying. Your draft will stay here.', 'Η καταχώριση μπορεί να έχει ήδη αποθηκευτεί. Ανανεώστε το αποθηκευμένο ημερολόγιο πριν δοκιμάσετε ξανά. Το πρόχειρό σας θα παραμείνει εδώ.')}</p>}
    {reviewed && <p>{t('Check the saved entries below before saving again to avoid a duplicate. Your draft is unchanged.', 'Ελέγξτε τις αποθηκευμένες καταχωρίσεις παρακάτω πριν αποθηκεύσετε ξανά, για να αποφύγετε διπλότυπο. Το πρόχειρό σας δεν άλλαξε.')}</p>}
    {retryBlocked && <button type="button" onClick={() => void onReload()}>{t('Refresh saved Log', 'Ανανέωση αποθηκευμένου ημερολογίου')}</button>}
    <BusyButton busy={busy} disabled={retryBlocked} type="submit">{t('Save entry', 'Αποθήκευση καταχώρισης')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button></fieldset></form>;
}

export function LogAttachment({ busy, retryBlocked, onReload, onUpload, onDirty }: { busy: boolean; retryBlocked: boolean; onReload: () => Promise<boolean>; onUpload: (file: File) => Promise<void>; onDirty: (dirty: boolean) => void }) {
  const { t } = useI18n(); const [file, setFile] = useState<File | null>(null); const [key, setKey] = useState(0); const [reviewed, setReviewed] = useState(false);
  return <details><summary>{t('Attach a file to this entry', 'Επισύναψη αρχείου σε αυτή την καταχώριση')}</summary><form onSubmit={e => { e.preventDefault(); if (file && !retryBlocked) void onUpload(file).then(() => { setFile(null); onDirty(false); setKey(old => old + 1); }).catch(() => {}); }}><Field label={t('Attachment file', 'Αρχείο συνημμένου')}><input key={key} type="file" required disabled={busy} onChange={e => { const next = e.target.files?.[0] ?? null; setFile(next); onDirty(next !== null); }} /></Field>
    {retryBlocked && <><p>{t('This file may already be saved. Refresh the saved attachments before retrying. Your selection will stay here.', 'Το αρχείο μπορεί να έχει ήδη αποθηκευτεί. Ανανεώστε τα αποθηκευμένα συνημμένα πριν δοκιμάσετε ξανά. Η επιλογή σας θα παραμείνει εδώ.')}</p><button disabled={busy} type="button" onClick={() => { void onReload().then(ok => { if (ok) setReviewed(true); }); }}>{t('Refresh saved attachments', 'Ανανέωση αποθηκευμένων συνημμένων')}</button></>}
    {reviewed && <p>{t('Check the attachment list above before uploading again to avoid a duplicate.', 'Ελέγξτε τη λίστα συνημμένων παραπάνω πριν μεταφορτώσετε ξανά, για να αποφύγετε διπλότυπο.')}</p>}
    <BusyButton type="submit" busy={busy} disabled={!file || retryBlocked}>{t('Upload attachment', 'Μεταφόρτωση συνημμένου')}</BusyButton></form></details>;
}
``````

#### File: `src/web/record/Measurements.tsx`

<!-- replay task=4 phase=implementation encoding=text sha256=c01770fb1f2f6aca9bf26810b5878e33aa0defbc53811ba1abfcb3946aa2c75f -->

``````tsx
import { useState } from 'react';
import { compareItems, compareOverTime, labelOf, normalizeLabel, orderSets, type MeasurementSetInput, type SharedRecord, type Unit, type MeasurementPhase } from '../../domain';
import { BusyButton, Field, PersonSelect, VocabSelect } from '../core/forms';
import { useI18n } from '../core/i18n';
import { dateText, localInput, measurementGroups, signedBar } from './helpers';
import { measurementNumber } from './number-format';

type Set = SharedRecord['measurements'][number];
function SignedBar({ value, max }: { value: number; max: number }) {
  const bar = signedBar(value, max);
  return <span aria-hidden="true" style={{ display: 'inline-block', position: 'relative', width: 120, height: 14, marginInlineEnd: 8 }}><span style={{ position: 'absolute', left: '50%', top: 0, height: 14, borderLeft: '1px solid currentColor' }} /><span style={{ position: 'absolute', left: `${bar.left}%`, width: `${bar.width}%`, top: 3, height: 8, background: 'currentColor' }} /></span>;
}
type DraftRow = { item: string; quantity: string; unit: Unit; value: string; note: string };
const emptyRow = (): DraftRow => ({ item: '', quantity: '', unit: 'mm', value: '', note: '' });
export function MeasurementEditor({ initial, sets, people, busy, onSave, onCancel, onDirty }: { initial?: Set; sets: Set[]; people: { id: number; name: string; active?: boolean }[]; busy: boolean; onSave: (body: MeasurementSetInput) => Promise<void>; onCancel: () => void; onDirty: () => void }) {
  const { t } = useI18n(); const [date, setDate] = useState(initial?.date ?? localInput().slice(0, 10)); const [phase, setPhase] = useState<MeasurementPhase>(initial?.phase ?? 'before'); const [person, setPerson] = useState(initial?.measuredById ?? null); const [note, setNote] = useState(initial?.note ?? '');
  const [rows, setRows] = useState<DraftRow[]>(initial?.rows.map(row => ({ ...row, value: String(row.value), note: row.note ?? '' })) ?? [emptyRow()]);
  const update = (index: number, patch: Partial<DraftRow>) => { setRows(old => old.map((row, i) => i === index ? { ...row, ...patch } : row)); onDirty(); };
  return <form onChange={onDirty} onSubmit={e => { e.preventDefault(); void onSave({ date, phase, measuredById: person, note, rows: rows.map(row => ({ ...row, value: Number(row.value) })) }); }}><fieldset disabled={busy}><legend>{t('Measurement set', 'Σύνολο μετρήσεων')}</legend>
    <Field label={t('Date', 'Ημερομηνία')}><input type="date" required value={date} onChange={e => setDate(e.target.value)} /></Field><VocabSelect list="measurementPhase" required label={t('Phase', 'Φάση')} value={phase} onChange={value => { setPhase(value as MeasurementPhase); onDirty(); }} /><PersonSelect label={t('Measured by', 'Μέτρησε')} people={people} value={person} onChange={value => { setPerson(value); onDirty(); }} /><Field label={t('Set note', 'Σημείωση συνόλου')}><textarea value={note} onChange={e => setNote(e.target.value)} /></Field>
    <datalist id="measurement-items">{[...new Set(sets.flatMap(set => set.rows.map(row => row.item)))].map(item => <option key={item} value={item} />)}</datalist><datalist id="measurement-quantities">{[...new Set(sets.flatMap(set => set.rows.map(row => row.quantity)))].map(item => <option key={item} value={item} />)}</datalist>
    {rows.map((row, index) => <fieldset key={index}><legend>{t('Row', 'Γραμμή')} {index + 1}</legend><div className="form-grid"><Field label={t('Item', 'Αντικείμενο')}><input required maxLength={200} list="measurement-items" value={row.item} onChange={e => update(index, { item: e.target.value })} /></Field><Field label={t('Quantity', 'Μέγεθος')}><input required maxLength={200} list="measurement-quantities" value={row.quantity} onChange={e => update(index, { quantity: e.target.value })} /></Field><Field label={t('Value', 'Τιμή')}><input type="number" step="any" required value={row.value} onChange={e => update(index, { value: e.target.value })} /></Field><VocabSelect list="unit" required label={t('Unit', 'Μονάδα')} value={row.unit} onChange={value => update(index, { unit: value as Unit })} /><Field label={t('Note', 'Σημείωση')}><input value={row.note} onChange={e => update(index, { note: e.target.value })} /></Field></div><button type="button" onClick={() => { setRows(old => old.filter((_, i) => index !== i)); onDirty(); }}>{t('Remove row', 'Αφαίρεση γραμμής')}</button></fieldset>)}
    <button type="button" onClick={() => { setRows(old => [...old, emptyRow()]); onDirty(); }}>{t('Add row', 'Προσθήκη γραμμής')}</button><BusyButton busy={busy} type="submit">{t('Save measurements', 'Αποθήκευση μετρήσεων')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button>
  </fieldset></form>;
}

export function Measurements({ sets, people, owner, onEdit, onDelete }: { sets: Set[]; people: { id: number; name: string }[]; owner: boolean; onEdit: (set: Set) => void; onDelete: (id: number) => void }) {
  const { t, lang } = useI18n(); const number = (value: number) => measurementNumber(value, lang);
  return <><h2>{t('Measurements', 'Μετρήσεις')}</h2>{sets.length === 0 && <p>{t('No measurements yet.', 'Δεν υπάρχουν ακόμη μετρήσεις.')}</p>}
    {orderSets(sets).map(set => <article key={set.id}><h3>{dateText(set.date, lang)} · {labelOf('measurementPhase', set.phase, lang)}</h3><p>{people.find(person => person.id === set.measuredById)?.name}</p><p className="user-text">{set.note}</p><div className="table-scroll"><table><thead><tr>{[t('Item', 'Αντικείμενο'), t('Quantity', 'Μέγεθος'), t('Value', 'Τιμή'), t('Unit', 'Μονάδα'), t('Note', 'Σημείωση')].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{set.rows.map((row, i) => <tr key={i}><td>{row.item}</td><td>{row.quantity}</td><td>{number(row.value)}</td><td>{labelOf('unit', row.unit, lang)}</td><td className="user-text">{row.note}</td></tr>)}</tbody></table></div>
      {owner && <><button onClick={() => onEdit(set)}>{t('Edit measurements', 'Επεξεργασία μετρήσεων')}</button><button onClick={() => onDelete(set.id)}>{t('Delete measurement set', 'Διαγραφή συνόλου μετρήσεων')}</button></>}
      {[...new Map(set.rows.map(row => [JSON.stringify([normalizeLabel(row.quantity), row.unit]), row])).values()].map(row => { const comparisons = compareItems(set, row.quantity, row.unit); const max = Math.max(...comparisons.map(item => Math.abs(item.value)), 1); return <details key={`${row.quantity}-${row.unit}`}><summary>{t('Between items', 'Μεταξύ αντικειμένων')} · {row.quantity} ({labelOf('unit', row.unit, lang)})</summary><p>{t('Difference from the first item in display order.', 'Διαφορά από το πρώτο αντικείμενο στη σειρά εμφάνισης.')}</p><div className="table-scroll"><table><thead><tr><th>{t('Item', 'Αντικείμενο')}</th><th>{t('Value', 'Τιμή')}</th><th>{t('Difference', 'Διαφορά')}</th></tr></thead><tbody>{comparisons.map((item, i) => <tr key={i}><td>{item.item}</td><td><SignedBar value={item.value} max={max} />{number(item.value)}</td><td>{number(item.diffFromFirst)}</td></tr>)}</tbody></table></div></details>; })}
    </article>)}
    {measurementGroups(sets.flatMap(set => set.rows)).map(row => <details key={JSON.stringify([row.item, row.quantity, row.unit])}><summary>{t('Before vs after', 'Πριν και μετά')} · {row.item} · {row.quantity} ({labelOf('unit', row.unit, lang)})</summary><p>{t('Each change is the later value minus the previous value.', 'Κάθε μεταβολή είναι η νεότερη τιμή μείον την προηγούμενη.')}</p><div className="table-scroll"><table><thead><tr><th>{t('Date', 'Ημερομηνία')}</th><th>{t('Phase', 'Φάση')}</th><th>{t('Value', 'Τιμή')}</th><th>{t('Change', 'Μεταβολή')}</th></tr></thead><tbody>{compareOverTime(sets, row.item, row.quantity, row.unit).map(point => <tr key={point.setId}><td>{dateText(point.date, lang)}</td><td>{labelOf('measurementPhase', point.phase, lang)}</td><td>{number(point.value)}</td><td>{point.changeFromPrevious === null ? '—' : number(point.changeFromPrevious)}</td></tr>)}</tbody></table></div></details>)}
  </>;
}
``````

#### File: `src/web/record/Options.tsx`

<!-- replay task=4 phase=implementation encoding=text sha256=0bf60e57bacca8a4576a3ff3115556e07199ac3b29504ec941d2d0bdf9cb1804 -->

``````tsx
import { useState } from 'react';
import type { OptionInput, SharedRecord } from '../../domain';
import { BusyButton, Field } from '../core/forms';
import { useI18n } from '../core/i18n';

export function OptionEditor({ initial, busy, onSave, onCancel, onDirty }: { initial?: SharedRecord['options'][number]; busy: boolean; onSave: (body: OptionInput) => Promise<void>; onCancel: () => void; onDirty: () => void }) {
  const { t } = useI18n(); const [label, setLabel] = useState(initial?.label ?? ''); const [description, setDescription] = useState(initial?.description ?? '');
  return <form onChange={onDirty} onSubmit={e => { e.preventDefault(); void onSave({ label, description }); }}><fieldset disabled={busy}><legend>{t('Option considered', 'Εξεταζόμενη λύση')}</legend><Field label={t('Option label', 'Τίτλος λύσης')}><input required maxLength={200} value={label} onChange={e => setLabel(e.target.value)} /></Field><Field label={t('Description', 'Περιγραφή')}><textarea maxLength={20000} value={description} onChange={e => setDescription(e.target.value)} /></Field><BusyButton busy={busy} type="submit">{t('Save option', 'Αποθήκευση λύσης')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button></fieldset></form>;
}
``````

#### File: `src/web/record/Overview.tsx`

<!-- replay task=4 phase=implementation encoding=text sha256=50a6a965bf18d3d865a98113b4c383af0e241794d10757292c0546c716803087 -->

``````tsx
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
    <section><h2>{t('Classification', 'Ταξινόμηση')}</h2><dl>{r.subtype === 'quality_issue' && <>{value('Problem types', 'Τύποι προβλήματος', r.problemTypes.map(code => <details key={code}><summary>{labelOf('problemType', code, lang)}</summary>{definitionOf('problemType', code, lang)}</details>))}{vocab('Stage', 'Στάδιο', 'stage', r.stage)}{vocab('Disposition', 'Τρόπος αντιμετώπισης', 'disposition', r.disposition)}{value('Correction', 'Διόρθωση', r.correction)}</>}{r.subtype === 'detail_clarification' && <>{value('Question', 'Ερώτημα', r.question)}{vocab('Route', 'Διαδρομή', 'route', r.route)}{value('Issued by', 'Εκδόθηκε από', person(r.issuedById))}</>}{r.subtype === 'task' && value('Subtype', 'Υποκατηγορία', labelOf('subtype', r.subtype, lang))}</dl></section>
    {r.subtype !== 'task' && <section><h2>{t('Decision and instruction', 'Απόφαση και εντολή')}</h2><dl>{value('Chosen option', 'Επιλεγμένη λύση', data.options.find(option => option.id === r.chosenOptionId)?.label)}{value('Decided by', 'Αποφάσισε', person(r.decidedById))}{value('Decided on', 'Ημερομηνία απόφασης', dateText(r.decidedOn, lang))}{value('Instruction text', 'Κείμενο εντολής', r.instructionText)}</dl></section>}
    <details><summary>{t('Sequence and dates', 'Σειρά εργασιών και ημερομηνίες')}</summary><dl>{value('Must be done before', 'Να γίνει πριν', r.mustBeDoneBefore.map(item => `${item.humanId} ${item.title ?? ''}`).join('\n'))}{value('Requires first', 'Απαιτείται πρώτα', r.requiresFirst.map(item => `${item.humanId} ${item.title ?? ''}`).join('\n'))}{value('Created', 'Δημιουργία', dateText(r.createdAt, lang))}{value('Updated', 'Ενημέρωση', dateText(r.updatedAt, lang))}</dl></details>
    <section><h2>{t('Public Notes', 'Δημόσιες σημειώσεις')}</h2><p className="user-text">{r.publicNotes || '—'}</p></section>
    {data.owner && <details><summary>{t('Private · owner only', 'Ιδιωτικά · μόνο για τον ιδιοκτήτη')}</summary><dl>{value('Private Notes', 'Ιδιωτικές σημειώσεις', (r as RecordDetail).notes)}{value('Outside contract scope', 'Εκτός σύμβασης', (r as RecordDetail).outsideScope ? t('Yes', 'Ναι') : t('No', 'Όχι'))}{(r as RecordDetail).outsideScope && value('Estimated cost', 'Εκτιμώμενο κόστος', (r as RecordDetail).estimatedCost === null ? '—' : new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format((r as RecordDetail).estimatedCost!))}</dl></details>}
    <details><summary>{t('Verification history', 'Ιστορικό επαλήθευσης')} ({data.verifications.length})</summary>{data.verifications.map(entry => <article key={entry.id}><h3>{dateText(entry.date, lang)} · {labelOf('verificationOutcome', entry.outcome, lang)}</h3><p>{person(entry.checkedById)} · {labelOf('verificationMethod', entry.method, lang)}</p><p className="user-text">{entry.note}</p><details><summary>{t('Definitions', 'Ορισμοί')}</summary><p>{definitionOf('verificationMethod', entry.method, lang)}</p><p>{definitionOf('verificationOutcome', entry.outcome, lang)}</p></details></article>)}</details>
  </>;
}
``````

#### File: `src/web/record/RecordEditor.tsx`

<!-- replay task=4 phase=implementation encoding=text sha256=e8fdb07b350e04d5dafaa509c290ec528f0e1e278f40cecfaa4110835a41dc3d -->

``````tsx
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
      {record.subtype === 'quality_issue' && <><fieldset><legend>{t('Problem types', 'Τύποι προβλήματος')}</legend>{entriesOf('problemType').map(item => <div key={item.code}><label><input type="checkbox" checked={draft.problemTypes?.includes(item.code as never)} onChange={e => set('problemTypes', (e.target.checked ? [...draft.problemTypes ?? [], item.code] : draft.problemTypes?.filter(code => code !== item.code)) as RecordDetail['problemTypes'])} />{labelOf('problemType', item.code, lang)}</label><details><summary>{t('Definition', 'Ορισμός')}</summary>{definitionOf('problemType', item.code, lang)}</details></div>)}</fieldset>{vocab('stage', 'stage', 'Stage', 'Στάδιο')}{vocab('disposition', 'disposition', 'Disposition', 'Τρόπος αντιμετώπισης')}{text('correction', 'Correction', 'Διόρθωση', true)}</>}
      {record.subtype === 'detail_clarification' && <>{text('question', 'Question', 'Ερώτημα', true)}{vocab('route', 'route', 'Route', 'Διαδρομή')}{person('issuedById', 'Issued by', 'Εκδόθηκε από')}</>}
      {record.subtype !== 'task' && <><Field label={t('Chosen option', 'Επιλεγμένη λύση')}><select value={draft.chosenOptionId ?? ''} onChange={e => set('chosenOptionId', e.target.value ? Number(e.target.value) : null)}><option value="">{t('None', 'Καμία')}</option>{data.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field>{person('decidedById', 'Decided by', 'Αποφάσισε')}{date('decidedOn', 'Decided on', 'Ημερομηνία απόφασης')}{text('instructionText', 'Instruction text', 'Κείμενο εντολής', true)}</>}
      {text('publicNotes', 'Public Notes', 'Δημόσιες σημειώσεις', true)}
      <fieldset><legend>{t('Private · owner only', 'Ιδιωτικά · μόνο για τον ιδιοκτήτη')}</legend>{text('notes', 'Private Notes', 'Ιδιωτικές σημειώσεις', true)}<label><input type="checkbox" checked={draft.outsideScope} onChange={e => set('outsideScope', e.target.checked)} />{t('Outside contract scope', 'Εκτός σύμβασης')}</label>{draft.outsideScope && <Field label={t('Estimated cost (€)', 'Εκτιμώμενο κόστος (€)')}><input type="number" min="0" step="0.01" value={draft.estimatedCost ?? ''} onChange={e => set('estimatedCost', e.target.value === '' ? null : Number(e.target.value))} /></Field>}</fieldset>
      <BusyButton busy={busy} type="submit">{t('Save record', 'Αποθήκευση εγγραφής')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button>
    </fieldset>
  </form>;
}
``````

#### File: `src/web/record/RecordPage.tsx`

<!-- replay task=4 phase=implementation encoding=text sha256=0cac8eeb747df400ff446d4a607fbf82fdb748de74cebceeac439522d694b277 -->

``````tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SharedRecord } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import { api, ApiError, isUnknownOutcome } from '../core/api';
import { ErrorNotice, useDirtyGuard } from '../core/forms';
import { useI18n } from '../core/i18n';
import type { ViewContext } from '../core/types';
import { EvidencePane } from '../media/EvidencePane';
import { uploadEvidence } from '../media/upload';
import { loadRecord, type Log, type RecordData } from './data';
import { RecordEditor } from './RecordEditor';
import { Overview, RecordSummary } from './Overview';
import { StatusDialog } from './StatusDialog';
import { MeasurementEditor, Measurements } from './Measurements';
import { OptionEditor } from './Options';
import { LogAttachment, LogEditor } from './Log';
import { Activity } from './Activity';
import { Sharing } from './Sharing';
import { dateText } from './helpers';

type Editor = { kind: 'record' | 'status' } | { kind: 'measurement'; initial?: SharedRecord['measurements'][number] } | { kind: 'option'; initial?: SharedRecord['options'][number] } | { kind: 'log'; initial?: Log };
type Tab = 'overview' | 'evidence' | 'measurements' | 'log' | 'activity' | 'sharing';
export function RecordPage(props: { context: ViewContext; onBack: () => void }) {
  return <RecordSession key={`${props.context.mode}:${props.context.base}:${props.context.token ?? ''}`} {...props} />;
}
function RecordSession({ context, onBack }: { context: ViewContext; onBack: () => void }) {
  const { t } = useI18n(); const [data, setData] = useState<RecordData | null>(null); const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [tab, setTab] = useState<Tab>('overview'); const [editor, setEditor] = useState<Editor | null>(null); const [dirty, setDirty] = useState(false); const [notice, setNotice] = useState('');
  const controller = useRef<AbortController | null>(null); const writeController = useRef<AbortController | null>(null); const mounted = useRef(true); const owner = context.mode === 'owner';
  const [logRetryBlocked, setLogRetryBlocked] = useState(false); const [logReviewed, setLogReviewed] = useState(false); const [attachmentBlocked, setAttachmentBlocked] = useState<number[]>([]);
  useDirtyGuard(dirty);
  const refresh = useCallback(async () => {
    controller.current?.abort(); const current = new AbortController(); controller.current = current; setLoading(true);
    try { const next = await loadRecord(context, current.signal); if (!current.signal.aborted) { setData(next); setError(null); return true; } }
    catch (reason) { if (!current.signal.aborted) { if (reason instanceof ApiError && [401, 403, 404].includes(reason.status)) { setData(null); setEditor(null); setDirty(false); } setError(reason); } }
    finally { if (!current.signal.aborted) setLoading(false); }
    return false;
  }, [context.base, context.mode, context.projectId, context.token]);
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; controller.current?.abort(); writeController.current?.abort(); }; }, [refresh]);
  const accessLost = useCallback((reason?: unknown) => {
    if (reason !== undefined && (!(reason instanceof ApiError) || ![401, 403, 404].includes(reason.status))) return;
    controller.current?.abort(); setData(null); setEditor(null); setDirty(false); setLoading(false); setError(reason ?? new ApiError(403, 'not_available', null));
  }, []);
  const leave = () => !dirty || window.confirm(t('Discard unsaved changes?', 'Απόρριψη μη αποθηκευμένων αλλαγών;'));
  const open = (next: Editor) => { if (!busy && leave()) { setEditor(next); setDirty(false); setError(null); setNotice(''); } };
  const cancel = () => { if (!busy && leave()) { setEditor(null); setDirty(false); setError(null); } };
  const mutate = async (path: string, method: string, body?: unknown) => {
    if (path === '/log' && method === 'POST' && logRetryBlocked) return;
    writeController.current = new AbortController();
    setBusy(true); setError(null); setNotice('');
    try { await api(context.base + path, { method, signal: writeController.current.signal, ...(body === undefined ? {} : { body }) }); if (!mounted.current) return; setEditor(null); setDirty(false); await refresh(); setNotice(t('Saved.', 'Αποθηκεύτηκε.')); }
    catch (reason) { if (mounted.current) { if (path === '/log' && method === 'POST' && isUnknownOutcome(reason)) { setLogRetryBlocked(true); setLogReviewed(false); } setError(reason); accessLost(reason); } }
    finally { if (mounted.current) setBusy(false); }
  };
  const remove = (path: string, message: string) => { if (!busy && leave() && window.confirm(message)) void mutate(path, 'DELETE'); };
  const upload = async (entryId: number, file: File) => {
    if (attachmentBlocked.includes(entryId)) throw new Error('refresh_required');
    writeController.current = new AbortController();
    setBusy(true); setError(null);
    try { await uploadEvidence(context, 'attachments', { file }, { logEntryId: entryId }, writeController.current.signal); if (mounted.current) await refresh(); }
    catch (reason) { if (mounted.current) { if (isUnknownOutcome(reason)) setAttachmentBlocked(old => [...new Set([...old, entryId])]); setError(reason); accessLost(reason); } throw reason; }
    finally { if (mounted.current) setBusy(false); }
  };
  const sections: [Tab, string, string][] = [['overview', 'Overview', 'Επισκόπηση'], ['evidence', 'Evidence', 'Τεκμήρια'], ['measurements', 'Measurements', 'Μετρήσεις'], ['log', 'Log', 'Ημερολόγιο'], ['activity', 'Activity', 'Ιστορικό ενεργειών'], ...(owner ? [['sharing', 'Sharing', 'Κοινοποίηση'] as [Tab, string, string]] : [])];
  const changeTab = (next: Tab) => { if (leave()) { setTab(next); setEditor(null); setDirty(false); setError(null); setNotice(''); } };
  return <section className="record-page"><div className="toolbar">{context.mode !== 'shared' && <button disabled={busy} onClick={() => { if (leave()) onBack(); }}>{t('Back', 'Πίσω')}</button>}{!editor && <button disabled={busy || loading} onClick={() => { if (leave()) { setDirty(false); void refresh(); } }}>{t('Refresh', 'Ανανέωση')}</button>}</div><ErrorNotice error={editor?.kind === 'status' ? null : error} />{loading && <p role="status">{t('Loading record…', 'Φόρτωση εγγραφής…')}</p>}{notice && <p role="status">{notice}</p>}
    {data && <><header><p>{data.record.humanId}</p><h1>{data.record.title || t('Untitled draft', 'Πρόχειρο χωρίς τίτλο')}</h1>{owner && !editor && <div className="toolbar"><button disabled={busy || loading} onClick={() => open({ kind: 'record' })}>{t('Edit record', 'Επεξεργασία εγγραφής')}</button><button disabled={busy || loading || (data.record as RecordDetail).allowedTransitions.length === 0} onClick={() => open({ kind: 'status' })}>{t('Change status', 'Αλλαγή κατάστασης')}</button></div>}</header>
      <RecordSummary data={data} />
      <nav className="record-tabs" aria-label={t('Record sections', 'Ενότητες εγγραφής')}>{sections.map(([key, en, el]) => <button key={key} aria-current={tab === key ? 'page' : undefined} disabled={busy} onClick={() => changeTab(key)}>{t(en, el)}</button>)}</nav>
      <label className="phone-sections">{t('Record section', 'Ενότητα εγγραφής')}<select value={tab} disabled={busy} onChange={e => changeTab(e.target.value as Tab)}>{sections.map(([key, en, el]) => <option key={key} value={key}>{t(en, el)}</option>)}</select></label>
      {editor?.kind === 'record' && owner && <RecordEditor data={data} busy={busy} onDirty={() => setDirty(true)} onCancel={cancel} onSave={patch => mutate('', 'PATCH', patch)} />}
      {editor?.kind === 'status' && owner && <div onChange={() => setDirty(true)}><StatusDialog record={data.record as RecordDetail} people={data.owner!.people} busy={busy} error={error} onCancel={cancel} onSave={body => mutate('/transitions', 'POST', body)} /></div>}
      {editor?.kind === 'measurement' && owner && <MeasurementEditor {...(editor.initial ? { initial: editor.initial } : {})} sets={data.measurements} people={data.owner!.people} busy={busy} onDirty={() => setDirty(true)} onCancel={cancel} onSave={body => mutate('/measurement-sets' + (editor.initial ? `/${editor.initial.id}` : ''), editor.initial ? 'PATCH' : 'POST', body)} />}
      {editor?.kind === 'option' && owner && <OptionEditor {...(editor.initial ? { initial: editor.initial } : {})} busy={busy} onDirty={() => setDirty(true)} onCancel={cancel} onSave={body => mutate('/options' + (editor.initial ? `/${editor.initial.id}` : ''), editor.initial ? 'PATCH' : 'POST', body)} />}
      {editor?.kind === 'log' && data.permissions.canAddLog && <><LogEditor {...(editor.initial ? { initial: editor.initial } : {})} owner={owner} busy={busy || loading} retryBlocked={!editor.initial && logRetryBlocked} reviewed={logReviewed} onReload={async () => { const ok = await refresh(); if (ok) { setLogReviewed(true); setLogRetryBlocked(false); } return ok; }} onDirty={() => setDirty(true)} onCancel={cancel} onSave={body => mutate('/log' + (editor.initial ? `/${editor.initial.id}` : ''), editor.initial ? 'PATCH' : 'POST', body)} />{logReviewed && <section role="region" aria-label={t('Saved Log entries', 'Αποθηκευμένες καταχωρίσεις ημερολογίου')}><h2>{t('Saved Log entries', 'Αποθηκευμένες καταχωρίσεις ημερολογίου')}</h2>{data.log.length === 0 && <p>{t('No saved entries.', 'Δεν υπάρχουν αποθηκευμένες καταχωρίσεις.')}</p>}{data.log.map(entry => <article key={entry.id}><p>{entry.loggedBy}</p><p className="user-text">{entry.text}</p></article>)}</section>}</>}
      {!editor && <>
        {tab === 'overview' && <><Overview data={data} />{data.record.subtype !== 'task' && <section><h2>{t('Options considered', 'Εξεταζόμενες λύσεις')}</h2>{data.options.map(option => <article key={option.id}><h3>{option.label}{option.id === data.record.chosenOptionId ? ` · ${t('Chosen', 'Επιλεγμένη')}` : ''}</h3><p className="user-text">{option.description}</p>{owner && <><button disabled={busy} onClick={() => open({ kind: 'option', initial: option })}>{t('Edit option', 'Επεξεργασία λύσης')}</button><button disabled={busy || option.id === data.record.chosenOptionId} onClick={() => remove(`/options/${option.id}`, t('Delete this option?', 'Διαγραφή αυτής της λύσης;'))}>{t('Delete option', 'Διαγραφή λύσης')}</button></>}</article>)}{owner && <button disabled={busy || loading} onClick={() => open({ kind: 'option' })}>{t('Add option', 'Προσθήκη λύσης')}</button>}</section>}</>}
        {tab === 'evidence' && <EvidencePane context={context} photos={data.photos} attachments={data.attachments} canUpload={data.permissions.canUpload} owner={owner} onChange={() => void refresh()} onAccessLost={() => accessLost()} onDirty={setDirty} />}
        {tab === 'measurements' && <><Measurements sets={data.measurements} people={data.labels.people} owner={owner} onEdit={set => open({ kind: 'measurement', initial: set })} onDelete={id => remove(`/measurement-sets/${id}`, t('Delete this measurement set and all its rows?', 'Διαγραφή αυτού του συνόλου και όλων των μετρήσεών του;'))} />{owner && <button disabled={busy || loading} onClick={() => open({ kind: 'measurement' })}>{t('Add measurement set', 'Προσθήκη συνόλου μετρήσεων')}</button>}</>}
        {tab === 'log' && <LogSection data={data} owner={owner} busy={busy || loading} open={open} remove={remove} upload={upload} onDirty={setDirty} attachmentBlocked={attachmentBlocked} onReload={async () => { const ok = await refresh(); if (ok) setAttachmentBlocked([]); return ok; }} />}
        {tab === 'activity' && <Activity data={data} />}
        {tab === 'sharing' && owner && <Sharing base={context.base} draft={data.record.status === 'draft'} onAccessLost={accessLost} onDirty={setDirty} />}
      </>}
    </>}
  </section>;
}
function LogSection({ data, owner, busy, open, remove, upload, onDirty, attachmentBlocked, onReload }: { data: RecordData; owner: boolean; busy: boolean; open: (editor: Editor) => void; remove: (path: string, message: string) => void; upload: (id: number, file: File) => Promise<void>; onDirty: (dirty: boolean) => void; attachmentBlocked: number[]; onReload: () => Promise<boolean> }) {
  const { t, lang } = useI18n();
  const [pending, setPending] = useState<number[]>([]);
  useEffect(() => { onDirty(pending.length > 0 || busy); }, [pending, busy, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  return <section><h2>{t('Log', 'Ημερολόγιο')}</h2>{data.permissions.canAddLog && <button disabled={busy} onClick={() => open({ kind: 'log' })}>{t('Add Log entry', 'Προσθήκη καταχώρισης')}</button>}{data.log.length === 0 && <p>{t('No entries yet.', 'Δεν υπάρχουν ακόμη καταχωρίσεις.')}</p>}{data.log.map(entry => <article key={entry.id}><h3>{dateText(entry.eventAt, lang)} · {entry.loggedBy}</h3>{entry.private && <p className="badge">{t('Private · owner only', 'Ιδιωτική · μόνο για τον ιδιοκτήτη')}</p>}<p className="user-text">{entry.text}</p>{data.attachments.filter(file => file.logEntry?.id === entry.id).map(file => <p key={file.id}>{t('Attachment', 'Συνημμένο')}: {file.title || file.originalFilename}</p>)}{data.attachments.some(file => file.logEntry?.id === entry.id) && <p>{t('Open these files in Evidence.', 'Ανοίξτε αυτά τα αρχεία στα Τεκμήρια.')}</p>}{owner && <><button disabled={busy} onClick={() => open({ kind: 'log', initial: entry })}>{t('Edit entry', 'Επεξεργασία καταχώρισης')}</button><button disabled={busy} onClick={() => remove(`/log/${entry.id}`, t('Delete this entry and all its attachments?', 'Διαγραφή αυτής της καταχώρισης και όλων των συνημμένων της;'))}>{t('Delete entry', 'Διαγραφή καταχώρισης')}</button></>}{data.permissions.canUpload && <LogAttachment busy={busy} retryBlocked={attachmentBlocked.includes(entry.id)} onReload={onReload} onUpload={file => upload(entry.id, file)} onDirty={value => setPending(old => value ? [...new Set([...old, entry.id])] : old.filter(id => id !== entry.id))} />}</article>)}</section>;
}
``````

#### File: `src/web/record/Sharing.tsx`

<!-- replay task=4 phase=implementation encoding=text sha256=5c7ab8b64e3037aa892af9fdcbead491250e4abba01e1d2902204f233572cf8e -->

``````tsx
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
    <h3>{t('Read-only links', 'Σύνδεσμοι μόνο για ανάγνωση')}</h3><p>{t('Anyone holding a link can read the public record until it expires or is revoked.', 'Όποιος έχει τον σύνδεσμο μπορεί να διαβάσει τη δημόσια εγγραφή μέχρι τη λήξη ή την ανάκλησή του.')}</p>
    {links.map(link => { const expired = !!link.expiresAt && Date.parse(link.expiresAt) <= Date.now(); return <article key={link.id}><h4>{link.label}</h4><dl><div><dt>{t('Created', 'Δημιουργία')}</dt><dd>{dateText(link.createdAt, lang)}</dd></div><div><dt>{t('Expires', 'Λήξη')}</dt><dd>{dateText(link.expiresAt, lang)}</dd></div><div><dt>{t('Last viewed', 'Τελευταία προβολή')}</dt><dd>{dateText(link.lastViewedAt, lang)}</dd></div><div><dt>{t('Views', 'Προβολές')}</dt><dd>{link.viewCount}</dd></div></dl><p>{link.revokedAt ? t('Revoked', 'Ανακλήθηκε') : expired ? t('Expired', 'Έληξε') : draft ? t('Draft — unavailable', 'Πρόχειρο — μη διαθέσιμο') : t('Active', 'Ενεργός')}</p>{link.url && <><Field label={t('Share URL', 'Διεύθυνση κοινοποίησης')}><input readOnly value={link.url} onFocus={e => e.target.select()} /></Field><button disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(link.url!); setCopied(link.id); })}>{t('Copy link', 'Αντιγραφή συνδέσμου')}</button>{copied === link.id && <span role="status">{t('Copied', 'Αντιγράφηκε')}</span>}</>}{!link.revokedAt && <button disabled={busy} onClick={() => { if (window.confirm(t('Revoke this link? People using it will lose access.', 'Ανάκληση αυτού του συνδέσμου; Οι χρήστες του θα χάσουν την πρόσβαση.'))) void run(async () => { await api(base + `/share-links/${link.id}/revoke`, { method: 'POST', body: {} }); setLinks(await api(base + '/share-links')); }); }}>{t('Revoke link', 'Ανάκληση συνδέσμου')}</button>}</article>; })}
    <details><summary>{t('Create a share link', 'Δημιουργία συνδέσμου κοινοποίησης')}</summary><form onChange={() => onDirty(true)} onSubmit={e => { e.preventDefault(); void run(async () => { const link = await api<ShareLinkOut>(base + '/share-links', { method: 'POST', body: { label, expiresAt: expiry ? new Date(expiry).toISOString() : null } }); setLinks(old => [link, ...old]); setLabel(''); setExpiry(''); onDirty(false); }); }}><fieldset disabled={busy}><Field label={t('Link label', 'Τίτλος συνδέσμου')}><input required maxLength={200} value={label} onChange={e => setLabel(e.target.value)} /></Field><Field label={t('Expiry (optional)', 'Λήξη (προαιρετική)')}><input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} /></Field><BusyButton busy={busy} type="submit">{t('Create link', 'Δημιουργία συνδέσμου')}</BusyButton></fieldset></form></details>
    <h3>{t('Named users', 'Ονομαστικοί χρήστες')}</h3><p>{t('Reading, uploading evidence and adding Log entries are separate permissions. Both switches off gives read-only access.', 'Η ανάγνωση, η μεταφόρτωση τεκμηρίων και η προσθήκη καταχωρίσεων είναι ανεξάρτητα δικαιώματα. Με τους δύο διακόπτες κλειστούς επιτρέπεται μόνο η ανάγνωση.')}</p>
    {grants.map(grant => <article key={grant.userId}><h4>{people.find(person => person.id === grant.userId)?.displayName ?? t('Unavailable user', 'Μη διαθέσιμος χρήστης')}</h4><p>{t('Upload evidence', 'Μεταφόρτωση τεκμηρίων')}: {grant.canUpload ? t('Yes', 'Ναι') : t('No', 'Όχι')} · {t('Add Log', 'Προσθήκη στο ημερολόγιο')}: {grant.canAddLog ? t('Yes', 'Ναι') : t('No', 'Όχι')}</p><button disabled={busy} onClick={() => { setSelected(String(grant.userId)); setUpload(grant.canUpload); setLog(grant.canAddLog); }}>{t('Edit access', 'Επεξεργασία πρόσβασης')}</button><button disabled={busy} onClick={() => { if (window.confirm(t('Remove this user’s access to the record?', 'Αφαίρεση πρόσβασης αυτού του χρήστη στην εγγραφή;'))) void run(async () => { await api(base + `/grants/${grant.userId}`, { method: 'DELETE' }); setGrants(old => old.filter(item => item.userId !== grant.userId)); }); }}>{t('Remove access', 'Αφαίρεση πρόσβασης')}</button></article>)}
    <form onChange={() => onDirty(true)} onSubmit={e => { e.preventDefault(); void run(async () => { const grant = await api<Grant>(base + `/grants/${selected}`, { method: 'PUT', body: { canUpload: upload, canAddLog: log } }); setGrants(old => [...old.filter(item => item.userId !== grant.userId), grant]); setSelected(''); setUpload(false); setLog(false); onDirty(false); }); }}><fieldset disabled={busy}><legend>{t('Grant or update record access', 'Παραχώρηση ή ενημέρωση πρόσβασης εγγραφής')}</legend><Field label={t('User', 'Χρήστης')}><select required value={selected} onChange={e => { setSelected(e.target.value); const grant = grants.find(item => item.userId === Number(e.target.value)); setUpload(grant?.canUpload ?? false); setLog(grant?.canAddLog ?? false); }}><option value="">{t('Choose', 'Επιλέξτε')}</option>{people.filter(person => person.active).map(person => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></Field><label><input type="checkbox" checked={upload} onChange={e => setUpload(e.target.checked)} />{t('Upload photos and attachments', 'Μεταφόρτωση φωτογραφιών και συνημμένων')}</label><label><input type="checkbox" checked={log} onChange={e => setLog(e.target.checked)} />{t('Add Log entries', 'Προσθήκη καταχωρίσεων στο ημερολόγιο')}</label><BusyButton type="submit" busy={busy}>{t('Save access', 'Αποθήκευση πρόσβασης')}</BusyButton></fieldset></form>
  </section>;
}
``````

#### File: `src/web/record/StatusDialog.tsx`

<!-- replay task=4 phase=implementation encoding=text sha256=d39ef17efb21f27cf8fe99bb1a3cced0e68580a9931c55547037643f46d225c5 -->

``````tsx
import { useEffect, useRef, useState } from 'react';
import { definitionOf, labelOf, type Status, type TransitionBodyInput } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import { BusyButton, ErrorNotice, Field, PersonSelect, VocabSelect } from '../core/forms';
import { useI18n } from '../core/i18n';
import { localInput } from './helpers';

export function StatusDialog({ record, people, busy, error, onSave, onCancel }: { record: RecordDetail; people: { id: number; name: string; active?: boolean }[]; busy: boolean; error?: unknown; onSave: (body: TransitionBodyInput) => Promise<void>; onCancel: () => void }) {
  const { t, lang } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const [to, setTo] = useState<Status | ''>(''); const [reason, setReason] = useState<string | null>(null); const [reasonNote, setReasonNote] = useState(''); const [note, setNote] = useState('');
  const [checkedById, setPerson] = useState<number | null>(null); const [date, setDate] = useState(localInput().slice(0, 10)); const [method, setMethod] = useState<string | null>(null); const [verificationNote, setVerificationNote] = useState('');
  const verify = record.status === 'ready_for_verification' && (to === 'closed' || to === 'in_progress');
  const reasonList = to === 'on_hold' ? 'onHoldReason' : to === 'cancelled' ? 'cancellationReason' : null;
  return <dialog ref={dialog} aria-labelledby="status-heading" className="dialog" onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}><h2 id="status-heading">{t('Change status', 'Αλλαγή κατάστασης')}</h2>
    <ErrorNotice error={error} />
    <form onSubmit={e => { e.preventDefault(); if (!to) return; void onSave({ to, ...(reasonList ? { reasonCode: reason, reasonNote } : {}), note, ...(verify ? { verification: { checkedById, date, method, note: verificationNote } } : {}) }); }}><fieldset disabled={busy}>
      <Field label={t('New status', 'Νέα κατάσταση')}><select required value={to} onChange={e => { setTo(e.target.value as Status); setReason(null); }}><option value="">{t('Choose', 'Επιλέξτε')}</option>{record.allowedTransitions.map(status => <option key={status} value={status}>{labelOf('status', status, lang)}</option>)}</select></Field>
      {to && <p>{definitionOf('status', to, lang)}</p>}
      {reasonList && <><VocabSelect list={reasonList} label={t('Reason', 'Αιτιολογία')} required value={reason} onChange={setReason} /><Field label={t('Reason note', 'Σημείωση αιτιολογίας')}><textarea required={reason === 'other' || (to === 'cancelled' && reason === 'replaced')} value={reasonNote} onChange={e => setReasonNote(e.target.value)} /></Field></>}
      <Field label={to === 'superseded' ? t('Replacement record and reason', 'Εγγραφή αντικατάστασης και αιτιολογία') : t('Transition note', 'Σημείωση αλλαγής')}><textarea required={to === 'superseded' || (record.status === 'closed' && to === 'open')} value={note} onChange={e => setNote(e.target.value)} /></Field>
      {verify && <fieldset><legend>{t('Verification', 'Επαλήθευση')}</legend><p>{t('Outcome', 'Αποτέλεσμα')}: {labelOf('verificationOutcome', to === 'closed' ? 'passed' : 'failed', lang)}</p><PersonSelect label={t('Checked by', 'Ελέγχθηκε από')} people={people} value={checkedById} onChange={setPerson} /><Field label={t('Date', 'Ημερομηνία')}><input required type="date" value={date} onChange={e => setDate(e.target.value)} /></Field><VocabSelect list="verificationMethod" label={t('Method', 'Μέθοδος')} required value={method} onChange={setMethod} /><Field label={t('Verification note', 'Σημείωση επαλήθευσης')}><textarea value={verificationNote} onChange={e => setVerificationNote(e.target.value)} /></Field></fieldset>}
      <BusyButton busy={busy} disabled={!to || (verify && !checkedById)} type="submit">{t('Apply status', 'Εφαρμογή κατάστασης')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button>
    </fieldset></form>
  </dialog>;
}
``````

#### File: `src/web/record/TagPicker.tsx`

<!-- replay task=4 phase=implementation encoding=text sha256=5c4d80576f6bc70248871046a6e0844747d2173eb16f5f4e2bd2ec61426e1e98 -->

``````tsx
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../core/api';
import { BusyButton, ErrorNotice, Field, MultiPick } from '../core/forms';
import { useI18n } from '../core/i18n';
import type { Named } from './data';

export function TagPicker({ projectId, initial, value, onChange, onDirty }: { projectId: number; initial: Named[]; value: number[]; onChange: (ids: number[]) => void; onDirty: () => void }) {
  const { t, lang } = useI18n(); const [tags, setTags] = useState(initial); const [nameEn, setEn] = useState(''); const [nameEl, setEl] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [existing, setExisting] = useState<number | null>(null);
  const lifetime = useRef(new AbortController());
  useEffect(() => { lifetime.current = new AbortController(); return () => lifetime.current.abort(); }, []);
  const name = (tag: Named) => lang === 'el' ? tag.nameEl || tag.nameEn : tag.nameEn || tag.nameEl;
  const select = (id: number) => { onChange([...new Set([...value, id])]); setEn(''); setEl(''); setExisting(null); setError(null); };
  const create = async () => {
    setBusy(true); setError(null); setExisting(null); const signal = lifetime.current.signal;
    try {
      const tag = await api<Named>(`/api/projects/${projectId}/tags`, { method: 'POST', body: { nameEn, nameEl }, signal });
      if (signal.aborted) return;
      setTags(old => [...old.filter(item => item.id !== tag.id), tag]); select(tag.id);
      setTags(await api<Named[]>(`/api/projects/${projectId}/tags`, { signal }));
    } catch (reason) {
      if (signal.aborted) return;
      setError(reason);
      if (reason instanceof ApiError && reason.code === 'tag_name_taken' && reason.details && typeof reason.details === 'object' && 'existingTagId' in reason.details && typeof reason.details.existingTagId === 'number') {
        setExisting(reason.details.existingTagId);
        try { setTags(await api<Named[]>(`/api/projects/${projectId}/tags`, { signal })); } catch { /* Keep the current draft and choices. */ }
      }
    } finally { if (!signal.aborted) setBusy(false); }
  };
  return <><MultiPick label={t('Tags', 'Ετικέτες')} items={tags.map(tag => ({ ...tag, label: name(tag) }))} value={value} onChange={onChange} />
    <details><summary>{t('Add a new tag', 'Προσθήκη νέας ετικέτας')}</summary><p>{t('New tags are added to the project immediately. Save the record to keep its tag selections.', 'Οι νέες ετικέτες προστίθενται αμέσως στο έργο. Αποθηκεύστε την εγγραφή για να διατηρηθούν οι επιλογές της.')}</p><ErrorNotice error={error} />
      <Field label={t('Tag name in English', 'Όνομα ετικέτας στα αγγλικά')}><input list="record-tag-en" maxLength={200} disabled={busy} value={nameEn} onChange={e => { setEn(e.target.value); onDirty(); }} /></Field>
      <Field label={t('Tag name in Greek', 'Όνομα ετικέτας στα ελληνικά')}><input list="record-tag-el" maxLength={200} disabled={busy} value={nameEl} onChange={e => { setEl(e.target.value); onDirty(); }} /></Field>
      <datalist id="record-tag-en">{tags.filter(tag => tag.nameEn).map(tag => <option key={tag.id} value={tag.nameEn} />)}</datalist><datalist id="record-tag-el">{tags.filter(tag => tag.nameEl).map(tag => <option key={tag.id} value={tag.nameEl} />)}</datalist>
      <BusyButton type="button" busy={busy} disabled={!nameEn.trim() && !nameEl.trim()} onClick={() => void create()}>{t('Create and select tag', 'Δημιουργία και επιλογή ετικέτας')}</BusyButton>
      {existing !== null && <button type="button" disabled={busy} onClick={() => select(existing)}>{t('Use existing tag', 'Χρήση υπάρχουσας ετικέτας')}{tags.find(tag => tag.id === existing) ? ` · ${name(tags.find(tag => tag.id === existing)!)}` : ''}</button>}
    </details>
  </>;
}
``````

#### File: `src/web/record/data.ts`

<!-- replay task=4 phase=implementation encoding=text sha256=e489384926d3ad2c12b6dc0be5eb46282fa3003b3c5224686985361c7145dfd6 -->

``````ts
import type { SharedRecord } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import type { ActivityEntry } from '../../server/records/activity';
import type { Person } from '../../server/lists/people';
import type { LocationNode } from '../../server/lists/locations';
import { api } from '../core/api';
import type { ViewContext } from '../core/types';

export type Named = { id: number; nameEn: string; nameEl: string; active?: boolean };
export type Log = SharedRecord['log'][number] & { private?: boolean };
export interface RecordData extends Omit<SharedRecord, 'record' | 'log' | 'activity'> {
  record: SharedRecord['record'] | RecordDetail;
  log: Log[];
  activity: (SharedRecord['activity'][number] | ActivityEntry)[];
  permissions: { canUpload: boolean; canAddLog: boolean };
  owner?: { people: Person[]; trades: Named[]; tags: Named[]; locations: LocationNode[]; records: { id: number; humanId: string; title: string | null }[] };
}
export async function loadRecord(context: ViewContext, signal: AbortSignal): Promise<RecordData> {
  const get = <T,>(path: string) => api<T>(path, { signal, ...(context.token ? { token: context.token } : {}) });
  if (context.mode !== 'owner') {
    const result = await get<SharedRecord & { permissions?: RecordData['permissions'] }>(context.base + (context.mode === 'shared' ? '/record' : ''));
    return { ...result, permissions: result.permissions ?? { canUpload: false, canAddLog: false } };
  }
  const project = `/api/projects/${context.projectId}`;
  const [record, options, measurements, verifications, photos, attachments, log, activity, people, trades, tags, locations, records] = await Promise.all([
    get<RecordDetail>(context.base), get<SharedRecord['options']>(context.base + '/options'), get<SharedRecord['measurements']>(context.base + '/measurement-sets'), get<SharedRecord['verifications']>(context.base + '/verifications'), get<SharedRecord['photos']>(context.base + '/photos'), get<SharedRecord['attachments']>(context.base + '/attachments'), get<Log[]>(context.base + '/log'), get<ActivityEntry[]>(context.base + '/activity'), get<Person[]>(project + '/people'), get<Named[]>(project + '/trades'), get<Named[]>(project + '/tags'), get<LocationNode[]>(project + '/locations'), get<{ records: { id: number; humanId: string; title: string | null }[] }>(project + '/records'),
  ]);
  const pathOf = (node: LocationNode): LocationNode[] => {
    const path = [node]; const seen = new Set([node.id]); let parent = node.parentId;
    while (parent !== null) { const next = locations.find(item => item.id === parent); if (!next || seen.has(next.id)) break; path.unshift(next); seen.add(next.id); parent = next.parentId; }
    return path;
  };
  return { record, options, measurements, verifications, photos, attachments, log, activity, permissions: { canUpload: true, canAddLog: true }, labels: { people, trades, tags, locations: locations.map(node => ({ id: node.id, path: pathOf(node) })), zoneTypes: [] }, owner: { people, trades, tags, locations, records: records.records } };
}
``````

#### File: `src/web/record/helpers.ts`

<!-- replay task=4 phase=implementation encoding=text sha256=1e816df6d2aed39379b7109efac327665fb9d8db20aaf32318c2fdd4571d4cb7 -->

``````ts
import { isCode, labelOf, normalizeLabel, type Lang, type ListKey, type MeasurementRow, type RecordPatchInput } from '../../domain';

export function changedPatch(before: RecordPatchInput, after: RecordPatchInput): RecordPatchInput {
  return Object.fromEntries(Object.entries(after).filter(([key, value]) => !(key === 'estimatedCost' && after.outsideScope === false) && JSON.stringify(value) !== JSON.stringify(before[key as keyof RecordPatchInput])));
}
export function localInput(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function logDateFields(original: string): { local: string; offset: string } {
  const date = new Date(original); const minutes = -date.getTimezoneOffset();
  const pad = (value: number) => String(value).padStart(2, '0');
  return { local: `${localInput(date)}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, '0')}`, offset: `${minutes < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}` };
}
export function logTimestamp(local: string, offset: string, initial?: { original: string; local: string; offset: string }): string {
  if (initial && local === initial.local && offset === initial.offset) return initial.original;
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!match || Number(match[2]) > 14 || Number(match[3]) > 59 || (Number(match[2]) === 14 && Number(match[3]) !== 0)) throw new RangeError('invalid_event_time');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(local)) throw new RangeError('invalid_event_time');
  const wall = new Date(local + 'Z');
  if (!Number.isFinite(wall.getTime()) || wall.toISOString().slice(0, 16) !== local.slice(0, 16)) throw new RangeError('invalid_event_time');
  const result = new Date(local + offset);
  if (!Number.isFinite(result.getTime())) throw new RangeError('invalid_event_time');
  return result.toISOString();
}
export function signedBar(value: number, maxAbsolute: number): { left: number; width: number } {
  const width = Math.abs(value) / Math.max(maxAbsolute, Number.EPSILON) * 50;
  return { left: value < 0 ? 50 - width : 50, width };
}
export function measurementGroups(rows: readonly MeasurementRow[]): MeasurementRow[] {
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = JSON.stringify([normalizeLabel(row.item), normalizeLabel(row.quantity), row.unit]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function dateText(value: string | null, lang: Lang): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(lang === 'el' ? 'el-GR' : 'en-GB', value.length === 10 ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value));
}
export function displayValue(field: string | null, value: unknown, lang: Lang, people: { id: number; name: string }[]): string {
  if (value == null || value === '') return '—';
  if (field?.endsWith('ById') || field === 'ballInCourtId' || field === 'responsibleId') return people.find(person => person.id === value)?.name ?? (lang === 'en' ? 'Unavailable person' : 'Μη διαθέσιμο άτομο');
  const vocab: Record<string, ListKey> = { status: 'status', severity: 'severity', priority: 'priority', disposition: 'disposition' };
  const list = field ? vocab[field] : undefined;
  if (list && isCode(list, value)) return labelOf(list, value, lang);
  if (field === 'dueDate' || field === 'decidedOn') return dateText(String(value), lang);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '—';
}
``````

#### File: `src/web/record/index.ts`

<!-- replay task=4 phase=implementation encoding=text sha256=ccf30ffb1e44fa6fdcf37f602fc783675cdad533c68d9c718bbc0b2049ff0e24 -->

``````ts
export { RecordPage } from './RecordPage';
``````

#### File: `src/web/record/number-format.ts`

<!-- replay task=4 phase=implementation encoding=text sha256=2d7ad0d6adf8e54954d3c1692b5a6220030d85df796b45ff14a3b7bbd0fc9b9e -->

``````ts
import type { Lang } from '../../domain';

/** JS's shortest round-trip spelling preserves the stored double and nonzero deltas. */
export function measurementNumber(value: number, lang: Lang): string {
  const text = String(value);
  return lang === 'el' ? text.replace('.', ',') : text;
}
``````

- [ ] **Verify this task.** Run `npx vitest run tests/web/record-`, then `npm run typecheck`. The focused tests and TypeScript check must pass.

- [ ] **Commit the task.** Stage only the task files. For Task 6, also stage the maintained-document and lifecycle edits named above.

```powershell
git add 'tests/web/record-data.test.ts' 'tests/web/record-errors.test.ts' 'tests/web/record-format.test.ts' 'tests/web/record-helpers.test.ts' 'tests/web/record-log.test.ts' 'src/web/record/Activity.tsx' 'src/web/record/Log.tsx' 'src/web/record/Measurements.tsx' 'src/web/record/Options.tsx' 'src/web/record/Overview.tsx' 'src/web/record/RecordEditor.tsx' 'src/web/record/RecordPage.tsx' 'src/web/record/Sharing.tsx' 'src/web/record/StatusDialog.tsx' 'src/web/record/TagPicker.tsx' 'src/web/record/data.ts' 'src/web/record/helpers.ts' 'src/web/record/index.ts' 'src/web/record/number-format.ts'
git commit -m "feat: add record editing and contributor screens"
```

## Task 5: Navigation, capture and full browser integration

**Depends on:** Task 4.

Connect the components through the application shell, owner list/capture and contributor home. Finish responsive styling and real-browser regression cases, including the fixes discovered during authoring review.

- [ ] **Write the complete tests and fixtures below.**

#### File: `tests/browser/app.spec.ts`

<!-- replay task=5 phase=test encoding=text sha256=59f37d99425f6e042bfc055eb56cf5d433c9729ddfb4bf8585789e98cf364448 -->

``````ts
import { test, expect, login, seed } from './fixture';
test('owner login, desktop list, deep reload and phone quick capture retain language and saved draft', async ({ page }, testInfo) => {
  await login(page); const { projectId } = seed();
  await page.getByRole('link', { name: 'Browser test project' }).click();
  await expect(page.getByRole('heading', { name: 'Records', exact: true })).toBeVisible();
  await expect(page.getByLabel('Language', { exact: true })).toHaveCSS('color', 'rgb(36, 55, 71)');
  await page.screenshot({ path: testInfo.outputPath('desktop-record-list.png'), fullPage: true });
  await page.getByLabel('Search title, description or ID').fill('Public sample');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Public sample task' })).toBeVisible();
  await page.reload(); await expect(page.getByLabel('Search title, description or ID')).toHaveValue('Public sample');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'New record', exact: true }).click();
  await page.getByLabel('Subtype', { exact: true }).selectOption('task');
  await page.getByLabel('Title', { exact: true }).fill('Phone capture exact text');
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  await expect(page.getByLabel('Τίτλος', { exact: true })).toHaveValue('Phone capture exact text');
  await page.getByRole('button', { name: 'Αποθήκευση προχείρου' }).click();
  await expect(page.getByText('Το πρόχειρο αποθηκεύτηκε.')).toBeVisible();
  const recordLink = page.locator(`a[href^="/projects/${projectId}/records/"]`).filter({ hasText: /^T-/ }).first();
  await recordLink.click(); await expect(page.getByRole('heading', { name: 'Phone capture exact text' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('phone-record.png'), fullPage: true });
});
test('public share renders only public projection, uses Greek initially and preserves token on language changes', async ({ page }) => {
  const { shareUrl } = seed(); const requested: string[] = []; page.on('request', request => requested.push(request.url()));
  await page.goto(shareUrl); await expect(page.getByRole('heading', { name: 'Public sample task' })).toBeVisible();
  await expect(page.getByLabel('Γλώσσα')).toHaveValue('el');
  await expect(page.locator('body')).not.toContainText('PRIVATE_SENTINEL');
  await expect(page.locator('body')).not.toContainText('PRIVATE_LOG_SENTINEL');
  await page.getByLabel('Γλώσσα').selectOption('en');
  await expect(page.locator('body')).toContainText('Public site note');
  expect(page.url()).toBe(shareUrl);
  expect(requested.filter(url => url.includes('/api/shared/record'))).toHaveLength(1);
  expect(requested.some(url => url.includes('/api/projects/') || url.includes('/api/auth/'))).toBe(false);
  await expect(page.getByRole('button', { name: 'Edit record' })).toHaveCount(0);
});
test('contributor sees granted record without private notes or owner controls', async ({ page }) => {
  await login(page, 'reader'); await expect(page.getByRole('heading', { name: 'Assigned records' })).toBeVisible();
  await page.getByRole('link', { name: /Public sample task/ }).click();
  await expect(page.getByRole('heading', { name: 'Public sample task' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('PRIVATE_SENTINEL');
  await expect(page.getByRole('button', { name: 'Edit record' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Managed lists' })).toHaveCount(0);
});
``````

#### File: `tests/browser/fixture.ts`

<!-- replay task=5 phase=test encoding=text sha256=677d91aa2f874c92262f9b1019d06c3eaf8375c440e1c292d5b58a3fc8052995 -->

``````ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
export { test, expect };
export interface Seed { projectId: number; recordId: number; shareUrl: string; dbPath: string; architectId: number; users: Record<'uploader' | 'logger' | 'reader', number> }
export function seed(): Seed { return JSON.parse(readFileSync(resolve('test-results/browser-seed.json'), 'utf8')) as Seed; }
export async function login(page: Page, username = 'owner'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
}
``````

#### File: `tests/browser/home.spec.ts`

<!-- replay task=5 phase=test encoding=text sha256=e9c13e097a42f39db8d9bc2b0f4027253e19f4d93ce009df44ce0f85b67ba371 -->

``````ts
import { test, expect, login, seed } from './fixture';
import { resolve } from 'node:path';

test('applied filters have translated removable chips and survive record back navigation', async ({ page }) => {
  await login(page); const { projectId } = seed();
  await page.goto(`/projects/${projectId}/records`);
  await page.getByLabel('Search title, description or ID', { exact: true }).fill('Public sample');
  await page.locator('.filters summary').filter({ hasText: /^Filters/ }).click();
  await page.getByRole('listbox', { name: 'Status', exact: true }).selectOption(['open']);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove filter: Status', exact: true })).toContainText('Open');
  await page.getByRole('link', { name: /T-\d+Public sample task|T-\d+ Public sample task/ }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove filter: Status', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove filter: Status', exact: true }).click();
  expect(new URL(page.url()).searchParams.has('status')).toBe(false);
  expect(new URL(page.url()).searchParams.get('q')).toBe('Public sample');
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  await expect(page.getByRole('button', { name: 'Αφαίρεση φίλτρου: Αναζήτηση', exact: true })).toContainText('Public sample');
});

test('invalid bookmarked vocabulary filters show an error and remain recoverable', async ({ page }) => {
  await login(page); const { projectId } = seed(); const crashes: string[] = [];
  page.on('pageerror', error => crashes.push(error.message));
  await page.goto(`/projects/${projectId}/records?status=bogus`);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Public sample task', exact: true })).toBeVisible();
  expect(crashes).toEqual([]);
});

test('quick capture keeps its saved draft when a later photo fails without repeating creation', async ({ page }) => {
  await login(page); const { projectId } = seed(); let creates = 0; let photos = 0;
  page.on('request', request => { if (request.method() !== 'POST') return; if (request.url().endsWith(`/api/projects/${projectId}/records`)) creates++; if (/\/photos$/.test(request.url())) photos++; });
  await page.goto(`/projects/${projectId}/records`);
  await page.getByRole('button', { name: 'New record', exact: true }).click();
  await page.getByLabel('Subtype', { exact: true }).selectOption('task');
  await page.getByLabel('Title', { exact: true }).fill('Partial photo capture');
  await page.getByText('Location and photos (optional)', { exact: true }).click();
  await page.getByLabel('Photos', { exact: true }).setInputFiles([
    { name: 'valid.png', mimeType: 'image/png', buffer: await (await import('node:fs/promises')).readFile(resolve('tests/browser/fixtures/media-synthetic.png')) },
    { name: 'corrupt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not a photograph') },
  ]);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Draft saved.', { exact: false })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'valid.png' })).toContainText('Uploaded');
  await expect(page.getByRole('listitem').filter({ hasText: 'corrupt.jpg' })).toContainText('Not uploaded');
  await expect(page.getByRole('alert')).toContainText('Upload the original as an attachment');
  expect(creates).toBe(1); expect(photos).toBe(1);
  await page.locator(`a[href^="/projects/${projectId}/records/"]`).filter({ hasText: /^T-/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Partial photo capture', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Evidence', exact: true }).click();
  await expect(page.locator('.photo-grid .evidence-card')).toHaveCount(1);
});

test('changing a share fragment clears the old record instead of retaining its previous token', async ({page})=>{
  await page.goto(seed().shareUrl);
  await expect(page.getByRole('heading',{name:'Public sample task',exact:true})).toBeVisible();
  await page.evaluate(()=>{location.hash='invalid-fragment';});
  await expect(page.getByRole('heading',{name:'Public sample task',exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:/Record not available|Η καταγραφή δεν είναι διαθέσιμη/})).toBeVisible();
});
``````

#### File: `tests/browser/lists.spec.ts`

<!-- replay task=5 phase=test encoding=text sha256=d628e03f805665cfcc881c1cbecae50e19063a8d10851c6313d32630a8dc407c -->

``````ts
import type { Page } from '@playwright/test';
import { test, expect, login, seed } from './fixture';

const entry = (page: Page, name: string) => page.locator('.managed-list > li').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${name}$`) }) });
async function openLists(page: Page) {
  await login(page);
  await page.goto(`/projects/${seed().projectId}/lists`);
  await expect(page.getByRole('heading', { name: 'People', exact: true })).toBeVisible();
}
async function tab(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'List selection' }).getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}
async function save(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('section[aria-label="Managed lists"] form')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
}
async function addNamed(page: Page, english: string, greek = '') {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('English name', { exact: true }).fill(english);
  await page.getByLabel('Greek name', { exact: true }).fill(greek);
  await save(page);
  await expect(entry(page, english)).toBeVisible();
}
async function rows<T>(page: Page, list: string): Promise<T[]> {
  const response = await page.request.get(`/api/projects/${seed().projectId}/${list}`);
  expect(response.ok()).toBe(true);
  return await response.json() as T[];
}
async function linkedDraft(page: Page, links: { tagIds?: number[]; locationIds?: number[] }): Promise<number> {
  const response = await page.request.post(`/api/projects/${seed().projectId}/records`, {
    headers: { Origin: new URL(page.url()).origin }, data: { subtype: 'task', title: 'Managed list usage fixture', ...links },
  });
  expect(response.status()).toBe(201);
  return (await response.json() as { id: number }).id;
}
async function record(page: Page, id: number): Promise<{ tagIds: number[]; locationIds: number[] }> {
  const response = await page.request.get(`/api/projects/${seed().projectId}/records/${id}`);
  expect(response.ok()).toBe(true);
  return await response.json() as { tagIds: number[]; locationIds: number[] };
}

test('five managed lists expose named controls; people and trades preserve fields through retirement and reactivation', async ({ page }) => {
  await openLists(page);
  page.on('dialog', dialog => dialog.accept());
  for (const name of ['Trades', 'Tags', 'Locations', 'Zone types', 'People']) await tab(page, name);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Code', { exact: true }).fill('UI-PERSON');
  await page.getByLabel('Name', { exact: true }).fill('List test engineer');
  await page.getByLabel('Role', { exact: true }).selectOption({ label: 'Engineer' });
  await page.getByText('Definitions', { exact: true }).click();
  await expect(page.getByText('Structural, mechanical or electrical engineer.', { exact: true })).toBeVisible();
  await page.getByLabel('Company', { exact: true }).fill('Test engineering');
  await page.getByLabel('Email', { exact: true }).fill('engineer@example.test');
  await page.getByLabel('Phone', { exact: true }).fill('+30 210 1234567');
  await save(page);
  const person = entry(page, 'List test engineer');
  await person.getByRole('button', { name: 'Retire', exact: true }).click();
  await expect(person.getByText('— Retired', { exact: true })).toBeVisible();
  await person.getByRole('button', { name: 'Reactivate', exact: true }).click();
  await expect(person.getByRole('button', { name: 'Retire', exact: true })).toBeVisible();
  await person.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Company', { exact: true })).toHaveValue('Test engineering');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('engineer@example.test');
  await expect(page.getByLabel('Phone', { exact: true })).toHaveValue('+30 210 1234567');
  await page.getByLabel('Company', { exact: true }).fill('Updated engineering');
  await save(page);
  await expect(person).toContainText('Updated engineering');

  await tab(page, 'Trades');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Code', { exact: true }).fill('UI-TRADE');
  await page.getByLabel('English name', { exact: true }).fill('List test masonry');
  await page.getByLabel('Greek name', { exact: true }).fill('Δοκιμαστική τοιχοποιία');
  await page.getByLabel('English definition', { exact: true }).fill('Builds and repairs walls.');
  await page.getByLabel('Greek definition', { exact: true }).fill('Κατασκευάζει και επισκευάζει τοίχους.');
  await save(page);
  const trade = entry(page, 'List test masonry');
  await trade.getByText('Definition', { exact: true }).click();
  await expect(trade.getByText('Builds and repairs walls.', { exact: true })).toBeVisible();
  await trade.getByRole('button', { name: 'Retire', exact: true }).click();
  await expect(trade.getByRole('button', { name: 'Reactivate', exact: true })).toBeVisible();
  await trade.getByRole('button', { name: 'Reactivate', exact: true }).click();
  await expect(trade.getByRole('button', { name: 'Retire', exact: true })).toBeVisible();
  await trade.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'English definition', exact: true }).fill('Builds new walls.');
  await save(page);
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  const greekTrade = entry(page, 'Δοκιμαστική τοιχοποιία');
  await expect(greekTrade).toBeVisible();
  await expect(greekTrade.getByText('Κατασκευάζει και επισκευάζει τοίχους.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Προσθήκη', exact: true })).toBeVisible();
});

test('tag rename offers one named merge target, rejects two collisions, and deletes only after showing usage', async ({ page }) => {
  await openLists(page);
  await tab(page, 'Tags');
  await addNamed(page, 'List stone', 'Δοκιμαστική πέτρα');
  await addNamed(page, 'List water', 'Δοκιμαστικό νερό');
  await addNamed(page, 'List source', 'Δοκιμαστική πηγή');
  const tags = await rows<{ id: number; nameEn: string }>(page, 'tags');
  const sourceId = tags.find(tag => tag.nameEn === 'List source')!.id;
  const stoneId = tags.find(tag => tag.nameEn === 'List stone')!.id;
  const recordId = await linkedDraft(page, { tagIds: [sourceId] });
  await entry(page, 'List source').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('English name', { exact: true }).fill('List stone');
  await page.getByLabel('Greek name', { exact: true }).fill('Δοκιμαστικό νερό');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('two different tags');
  await expect(page.getByRole('button', { name: 'Merge into existing tag' })).toHaveCount(0);
  expect((await record(page, recordId)).tagIds).toEqual([sourceId]);
  await page.getByLabel('Greek name', { exact: true }).fill('Δοκιμαστική πηγή');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('List stone');
  const mergeDialog = page.waitForEvent('dialog');
  const mergeClick = page.getByRole('button', { name: 'Merge into existing tag' }).click();
  const dialog = await mergeDialog;
  expect(dialog.message()).toContain('Merge “List source” into “List stone”');
  await dialog.accept();
  await mergeClick;
  await expect(entry(page, 'List source')).toHaveCount(0);
  await expect(entry(page, 'List stone')).toHaveCount(1);
  expect((await record(page, recordId)).tagIds).toEqual([stoneId]);
  await entry(page, 'List stone').getByRole('button', { name: 'Delete', exact: true }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Confirm deletion' });
  await expect(confirm).toContainText('used by 1 records');
  expect((await record(page, recordId)).tagIds).toEqual([stoneId]);
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(entry(page, 'List stone')).toBeVisible();
  await entry(page, 'List stone').getByRole('button', { name: 'Delete', exact: true }).click();
  await confirm.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(entry(page, 'List stone')).toHaveCount(0);
  expect((await record(page, recordId)).tagIds).toEqual([]);
});

test('locations copy full branches, exclude descendants from moves, save order and zone type, and retire used nodes', async ({ page }) => {
  await openLists(page);
  page.on('dialog', dialog => dialog.accept());
  await tab(page, 'Zone types');
  await addNamed(page, 'List service zone');
  await tab(page, 'Locations');
  for (const name of ['List building A', 'List building B']) {
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('English name', { exact: true }).fill(name);
    await page.getByLabel('Location kind', { exact: true }).selectOption({ label: 'Building' });
    await save(page);
  }
  await entry(page, 'List building A').getByRole('button', { name: 'Add child' }).click();
  await page.getByLabel('English name', { exact: true }).fill('List room');
  await page.getByLabel('Location kind', { exact: true }).selectOption({ label: 'Space' });
  await page.getByRole('combobox', { name: 'Zone type', exact: true }).selectOption({ label: 'List service zone' });
  await page.getByLabel('Sort order').fill('-5');
  await save(page);
  await entry(page, 'List building A').getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Parent location').getByRole('option', { name: 'List building A', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Parent location').getByRole('option', { name: /List room/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await entry(page, 'List building A').getByRole('button', { name: 'Copy branch' }).click();
  await page.getByLabel('English name', { exact: true }).fill('List building copy');
  await save(page);
  await expect(entry(page, 'List room')).toHaveCount(2);
  const nodes = await rows<{ id: number; nameEn: string; parentId: number | null; zoneTypeId: number; sortOrder: number }>(page, 'locations');
  const copiedRoot = nodes.find(node => node.nameEn === 'List building copy')!;
  const copiedRoom = nodes.find(node => node.nameEn === 'List room' && node.parentId === copiedRoot.id)!;
  expect(copiedRoom.sortOrder).toBe(-5);
  expect(copiedRoom.zoneTypeId).toBeGreaterThan(0);
  const sourceRoom = nodes.find(node => node.nameEn === 'List room' && node.parentId !== copiedRoot.id)!;
  await entry(page, 'List building A').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Parent location').selectOption({ label: 'List building B' });
  await save(page);
  await page.reload();
  await tab(page, 'Locations');
  const movedNodes = await rows<{ id: number; nameEn: string; parentId: number | null }>(page, 'locations');
  expect(movedNodes.find(node => node.nameEn === 'List building A')!.parentId).toBe(movedNodes.find(node => node.nameEn === 'List building B')!.id);
  const recordId = await linkedDraft(page, { locationIds: [sourceRoom.id] });
  await entry(page, 'List building A').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByRole('alert')).toContainText('Records use this branch');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await entry(page, 'List building A').getByRole('button', { name: 'Retire', exact: true }).click();
  await expect(entry(page, 'List building A').getByRole('button', { name: 'Reactivate', exact: true })).toBeVisible();
  expect((await record(page, recordId)).locationIds).toEqual([sourceRoom.id]);
  await entry(page, 'List building copy').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(entry(page, 'List building copy')).toHaveCount(0);
  await expect(entry(page, 'List room')).toHaveCount(1);
  await tab(page, 'Zone types');
  await entry(page, 'List service zone').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByRole('alert')).toContainText('Locations use this zone type');
});

test('zone types rename and delete; unsaved bilingual names survive rejected discard and require a name', async ({ page }) => {
  await openLists(page);
  await tab(page, 'Zone types');
  await addNamed(page, 'List temporary zone');
  await entry(page, 'List temporary zone').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('English name', { exact: true }).fill('List renamed zone');
  await save(page);
  await expect(entry(page, 'List temporary zone')).toHaveCount(0);
  await entry(page, 'List renamed zone').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(entry(page, 'List renamed zone')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter an English or Greek name');
  await page.getByLabel('Greek name', { exact: true }).fill('Μη αποθηκευμένη ζώνη');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Greek name', { exact: true })).toHaveValue('Μη αποθηκευμένη ζώνη');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('section[aria-label="Managed lists"] form')).toHaveCount(0);
});
``````

#### File: `tests/browser/media-app.spec.ts`

<!-- replay task=5 phase=test encoding=text sha256=bbbdcd1d19a288ec64301c80fcb9902aa1fcc1be19d6691db0ab63e5e40a9155 -->

``````ts
import { test, expect, login, seed } from './fixture';
import { resolve } from 'node:path';
test('owner uploads genuine photo and CAD attachment, edits metadata and deletes occurrences', async({page})=>{
  await login(page);const {projectId,recordId}=seed();
  await page.goto(`/projects/${projectId}/records/${recordId}`);
  await page.getByRole('button',{name:'Evidence',exact:true}).click();
  await page.getByLabel('Files',{exact:true}).setInputFiles(resolve('tests/browser/fixtures/media-synthetic.heic'));
  await page.getByLabel('Caption',{exact:true}).fill('Oriented test capture');
  await page.getByRole('button',{name:'Upload evidence',exact:true}).click();
  await expect(page.getByText('Upload complete.',{exact:true})).toBeVisible();
  await expect(page.locator('.photo-grid')).toContainText('Oriented test capture');
  await page.getByRole('button',{name:'Edit photo',exact:true}).click();
  await page.locator('dialog').getByLabel('Caption',{exact:true}).fill('Revised caption');
  page.once('dialog', dialog => dialog.dismiss());
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog').getByLabel('Caption',{exact:true})).toHaveValue('Revised caption');
  await page.locator('dialog').getByRole('button',{name:'Save evidence',exact:true}).click();
  await expect(page.locator('.photo-grid')).toContainText('Revised caption');
  await page.getByRole('combobox',{name:'Upload type',exact:true}).selectOption('attachments');
  await page.getByLabel('Attachment title',{exact:true}).fill('CAD design');
  await page.getByLabel('Files',{exact:true}).setInputFiles(resolve('tests/browser/fixtures/media-design.dwg'));
  await page.getByRole('button',{name:'Upload evidence',exact:true}).click();
  await expect(page.getByRole('button',{name:'CAD design',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'CAD design',exact:true}).click();
  await expect(page.locator('dialog')).toContainText('Preview unavailable');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download original',exact:true}).click();
  expect((await download).suggestedFilename()).toBe('media-design.dwg');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Delete attachment',exact:true}).click();
  await expect(page.getByRole('button',{name:'CAD design',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Delete photo',exact:true}).click();
  await expect(page.locator('.photo-grid .evidence-card')).toHaveCount(0);
});
test('upload failures retain selections and localize capacity and envelope errors', async({page})=>{
  await login(page);const {projectId,recordId}=seed();await page.goto(`/projects/${projectId}/records/${recordId}`);await page.getByRole('button',{name:'Evidence',exact:true}).click();
  await page.getByRole('combobox',{name:'Upload type',exact:true}).selectOption('attachments');
  await page.getByLabel('Files',{exact:true}).setInputFiles(resolve('tests/browser/fixtures/media-design.dwg'));
  await page.route(`**/api/projects/${projectId}/records/${recordId}/attachments`,route=>route.request().method()==='POST'?route.fulfill({status:507,json:{error:'storage_capacity'}}):route.continue());
  await page.getByRole('button',{name:'Upload evidence',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Storage is full or unavailable');
  await expect(page.getByRole('button',{name:'Upload evidence',exact:true})).toBeEnabled();
  await page.getByLabel('Language',{exact:true}).selectOption('el');
  await expect(page.getByRole('alert')).toContainText('Ο χώρος αποθήκευσης');
  await page.unroute(`**/api/projects/${projectId}/records/${recordId}/attachments`);
  await page.route(`**/api/projects/${projectId}/records/${recordId}/attachments`,route=>route.request().method()==='POST'?route.fulfill({status:413,json:{error:'upload_too_large'}}):route.continue());
  await page.getByRole('button',{name:'Μεταφόρτωση τεκμηρίων',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('100 MB');
});


test('uncertain upload failure requires evidence refresh before a user retry', async({page})=>{
  await login(page);const {projectId,recordId}=seed();await page.goto(`/projects/${projectId}/records/${recordId}`);await page.getByRole('button',{name:'Evidence',exact:true}).click();
  await page.getByRole('combobox',{name:'Upload type',exact:true}).selectOption('attachments');
  await page.getByLabel('Files',{exact:true}).setInputFiles(resolve('tests/browser/fixtures/media-design.dwg'));
  await page.route(`**/api/projects/${projectId}/records/${recordId}/attachments`,route=>route.request().method()==='POST'?route.abort():route.continue());
  await page.getByRole('button',{name:'Upload evidence',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button',{name:'Upload evidence',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Refresh evidence before retrying',exact:true}).click();
  await expect(page.getByRole('button',{name:'Upload evidence',exact:true})).toBeEnabled();
});
``````

#### File: `tests/browser/media.spec.ts`

<!-- replay task=5 phase=test encoding=text sha256=c55cbe063bec1ec236443a29d0d1f80cc2fa91ce190eab62aacf64acd0faf9a4 -->

``````ts
import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const harness = 'http://127.0.0.1:5174/tests/browser/fixtures/media-harness.html';
const fixture = (name: string) => resolve('tests/browser/fixtures', name);
async function openHarness(page: Page) {
  await page.goto(harness);
  await page.waitForFunction(() => 'mediaTest' in window);
}
async function routeFiles(page: Page) {
  const descriptors = [
    {kind:'image',view:'native',mediaType:'image/svg+xml'}, {kind:'email',view:'email',reader:'eml'},
    {kind:'email',view:'email',reader:'msg'}, {kind:'pdf',view:'native',mediaType:'application/pdf'},
    {kind:'video',view:'native',mediaType:'video/webm'}, {kind:'audio',view:'native',mediaType:'audio/wav'}, {kind:'document',view:'download'},
  ];
  const names = ['media-active.svg','media-html.eml','media-compound.msg','media-document.pdf','media-video.webm','media-audio.wav','media-design.dwg'];
  await page.route('**/api/shared/attachments/*/*', async route => {
    const match = /attachments\/(\d+)\/(\w+)/.exec(route.request().url())!;
    const index = Number(match[1])-1;
    expect(route.request().headers().authorization).toBe('Bearer synthetic-test-only');
    if (match[2] === 'preview') await route.fulfill({ json: { id:index+1, capabilities:{...descriptors[index],download:true} } });
    else await route.fulfill({ body: await readFile(fixture(names[index]!)), contentType: descriptors[index]?.mediaType ?? 'application/octet-stream' });
  });
}
test('genuine HEIC converts; oriented JPEG keeps bytes and explicit capture instant', async ({page}) => {
  await openHarness(page);
  const result = await page.evaluate(async () => {
    const media = (window as any).mediaTest;
    const results=[];
    for (const name of ['media-synthetic.heic','media-oriented.jpg']) {
      const original = new File([await (await fetch('./'+name)).blob()],name);
      const photo = await media.preparePhoto(original);
      const image = await createImageBitmap(photo.display);
      results.push({name,width:image.width,height:image.height,takenAt:photo.takenAt,originalSame:photo.original===original,displayType:photo.display.type,thumbnail:photo.thumbnail.size}); image.close();
    }
    return results;
  });
  expect(result[0]).toMatchObject({width:96,height:64,originalSame:true,displayType:'image/jpeg'});
  expect(result[1]).toMatchObject({width:64,height:96,takenAt:'2026-10-04T02:15:16.000Z',originalSame:true});
});
test('shared SVG is rasterized before DOM exposure and has no external requests', async ({page}) => {
  const external:string[]=[]; page.on('request',request=>{if(request.url().includes('tracker.invalid'))external.push(request.url());});
  await page.addInitScript(() => { const create = URL.createObjectURL; (window as any).blobTypes = {}; URL.createObjectURL = (blob: Blob | MediaSource) => { const url=create(blob); (window as any).blobTypes[url] = blob instanceof Blob ? blob.type : ''; return url; }; });
  await routeFiles(page); await openHarness(page);
  await page.getByRole('button',{name:'media-active.svg',exact:true}).click();
  const img=page.locator('dialog img'); await expect(img).toBeVisible();
  expect(await img.evaluate(el => (window as any).blobTypes[(el as HTMLImageElement).src])).toBe('image/png');
  expect(external).toEqual([]);
  expect(await page.locator('iframe, object, embed').count()).toBe(0);
  await page.getByRole('button',{name:/Close|Κλείσιμο/,exact:true}).click(); await expect(page.locator('dialog')).toHaveCount(0);
});
test('EML and MSG workers render escaped text and embedded downloads without remote fetches', async ({page}) => {
  const external:string[]=[]; page.on('request',request=>{if(request.url().includes('tracker.invalid'))external.push(request.url());});
  await routeFiles(page); await openHarness(page);
  await page.getByRole('button',{name:'media-html.eml',exact:true}).click();
  await expect(page.locator('.email-preview')).toContainText('Synthetic ✓');
  await expect(page.locator('.email-preview')).toContainText('Hello & safe');
  expect(await page.locator('.email-preview script,.email-preview img,.email-preview iframe').count()).toBe(0);
  const download=page.waitForEvent('download'); await page.getByRole('button',{name:/nested.eml/}).click();
  expect((await download).suggestedFilename()).toBe('nested.eml');
  await page.getByRole('button',{name:/Close|Κλείσιμο/,exact:true}).click();
  await page.getByRole('button',{name:'media-compound.msg',exact:true}).click();
  await expect(page.locator('.email-preview')).toContainText('Synthetic MSG ✓');
  await expect(page.locator('.email-preview')).toContainText('Synthetic MSG body');
  expect(external).toEqual([]);
});
test('worker cancellation terminates parsing and releases the pending operation', async ({page}) => {
  await openHarness(page);
  const result=await page.evaluate(async()=>{
    const controller=new AbortController();
    const worker=new Worker(new URL('../../../src/web/media/email.worker.ts',location.href),{type:'module'});
    const bytes=new TextEncoder().encode('Subject: Synthetic\r\n\r\n'+'a'.repeat(1_000_000)).buffer;
    const pending=(window as any).mediaTest.workerJob(worker,{bytes,reader:'eml'},[bytes],controller.signal);
    controller.abort(); try{await pending;return 'resolved';}catch(error){return (error as Error).name;}
  });
  expect(result).toBe('AbortError');
});
test('malformed email falls back to forced original download', async ({page}) => {
  await routeFiles(page);
  await page.route('**/api/shared/attachments/3/file',route=>route.fulfill({body:Buffer.from('invalid compound file'),contentType:'application/octet-stream'}));
  await openHarness(page); await page.getByRole('button',{name:'media-compound.msg',exact:true}).click();
  await expect(page.locator('dialog')).toContainText(/Preview unavailable|προεπισκόπηση δεν είναι διαθέσιμη/);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:/Download original|Λήψη πρωτοτύπου/}).click();
  expect((await download).suggestedFilename()).toBe('media-compound.msg');
});
test('PDF uses a local worker and data-fed canvas with no documents or external actions', async({page})=>{
  const external:string[]=[];page.on('request',request=>{if(request.url().includes('tracker.invalid'))external.push(request.url());});
  await routeFiles(page);await openHarness(page);await page.getByRole('button',{name:'media-document.pdf',exact:true}).click();
  await expect(page.locator('dialog canvas')).toBeVisible();
  await expect.poll(()=>page.locator('dialog canvas').evaluate(el=>(el as HTMLCanvasElement).width)).toBeGreaterThan(0);
  expect(await page.locator('iframe,object,embed').count()).toBe(0);expect(external).toEqual([]);
});

test('native video and audio play from authorized blobs, unsupported codecs retain download', async({page})=>{
  await routeFiles(page);await openHarness(page);
  for(const [name,tag] of [['media-video.webm','video'],['media-audio.wav','audio']]) {
    await page.getByRole('button',{name:name!,exact:true}).click();
    await expect(page.locator(`dialog ${tag}`)).toBeVisible();
    await expect.poll(()=>page.locator(`dialog ${tag}`).evaluate(el=>(el as HTMLMediaElement).readyState)).toBeGreaterThanOrEqual(1);
    await page.getByRole('button',{name:/Close|Κλείσιμο/,exact:true}).click();
  }
  await page.route('**/api/shared/attachments/5/view',route=>route.fulfill({body:Buffer.from('unsupported codec'),contentType:'video/webm'}));
  await page.getByRole('button',{name:'media-video.webm',exact:true}).click();
  await expect(page.locator('dialog')).toContainText(/Preview unavailable|προεπισκόπηση δεν είναι διαθέσιμη/);
  await expect(page.getByRole('button',{name:/Download original|Λήψη πρωτοτύπου/})).toBeEnabled();
});
test('private occurrence denial clears content without guessed hash fallback', async({page})=>{
  const requests:string[]=[];page.on('request',request=>{if(request.url().includes('/api/'))requests.push(request.url());});
  await routeFiles(page);
  await page.route('**/api/shared/attachments/1/view',route=>route.fulfill({status:404,json:{error:'not_found'}}));
  await openHarness(page);await page.getByRole('button',{name:'media-active.svg',exact:true}).click();
  await expect(page.locator('body')).toContainText('Access lost');
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(requests.every(url=>/\/api\/shared\/attachments\/1\/(preview|view)$/.test(url))).toBe(true);
});

test('native photo failure rechecks occurrence access and clears the viewer after revocation', async({page})=>{
  let heads=0;
  await page.route('**/api/projects/1/records/1/photos/1/thumbnail',async route=>route.fulfill({body:await readFile(fixture('media-synthetic.png')),contentType:'image/png'}));
  await page.route('**/api/projects/1/records/1/photos/1/display',async route=>{if(route.request().method()==='HEAD')heads++;await route.fulfill({status:403,json:{error:'permission_denied'}});});
  await page.goto(harness+'?photo=1');
  await page.getByRole('button',{name:'Open photo media-oriented.jpg',exact:true}).click();
  await expect(page.locator('body')).toContainText('Access lost');
  await expect(page.locator('dialog')).toHaveCount(0);expect(heads).toBe(1);
});
``````

#### File: `tests/browser/record.spec.ts`

<!-- replay task=5 phase=test encoding=text sha256=11b410722c5b7716ef62b28bb6b6c4a57d6fc44d454dcc0b04013c4911afb627 -->

``````ts
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
  await page.getByRole('group', { name: 'Problem types', exact: true }).getByRole('checkbox').first().check();
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

#### File: `tests/browser/review-capture.spec.ts`

<!-- replay task=5 phase=test encoding=text sha256=32fc4a438cb79c39a3d1f3b74bad0c3b8bb712a24087c36037471be351f7621b -->

``````ts
import { test, expect, login, seed } from './fixture';
import { resolve } from 'node:path';

test('capture blocks another creation after the server commits but the POST response is lost', async ({ page }) => {
  await login(page);
  const { projectId } = seed();
  const endpoint = `/api/projects/${projectId}/records`;
  const title = 'Capture committed before response loss';
  await page.goto(`/projects/${projectId}/records`);
  await page.getByRole('button', { name: 'New record', exact: true }).click();
  const capture = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'New record', exact: true }) });
  await capture.getByLabel('Subtype', { exact: true }).selectOption('task');
  await capture.getByLabel('Title', { exact: true }).fill(title);
  await capture.getByText('Location and photos (optional)', { exact: true }).click();
  await capture.getByLabel('Photos', { exact: true }).setInputFiles(resolve('tests/browser/fixtures/media-synthetic.png'));
  await capture.getByLabel('Photo phase', { exact: true }).selectOption('during');
  await capture.locator('.location-picker summary').filter({ hasText: 'Villa 1' }).click();
  await capture.getByRole('checkbox', { name: 'Villa 1', exact: true }).check();
  let creates = 0;
  let failReload = true;
  let committedId = 0;
  await page.route(`**${endpoint}*`, async route => {
    if (route.request().method() === 'POST') {
      creates++;
      const response = await route.fetch({ maxRetries: 0 });
      expect(response.status()).toBe(201);
      committedId = (await response.json()).id;
      await route.abort('failed');
    } else if (failReload) await route.fulfill({ status: 503, json: { error: 'request_failed' } });
    else await route.continue();
  });
  await capture.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(capture.getByRole('alert')).toBeVisible();
  const actual = await page.request.get(endpoint);
  const records = (await actual.json()).records as { id: number; title: string }[];
  expect(records.filter(item => item.title === title)).toHaveLength(1);
  expect(committedId).toBeGreaterThan(0);
  await expect(capture.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
  await expect(capture.getByLabel('Title', { exact: true })).toHaveValue(title);
  await expect(capture.getByLabel('Subtype', { exact: true })).toHaveValue('task');
  await expect(capture.getByLabel('Photo phase', { exact: true })).toHaveValue('during');
  await expect(capture.getByRole('checkbox', { name: 'Villa 1', exact: true })).toBeChecked();
  expect(await capture.getByLabel('Photos', { exact: true }).evaluate(el => (el as HTMLInputElement).files?.[0]?.name)).toBe('media-synthetic.png');
  await capture.getByRole('button', { name: 'Reload saved records', exact: true }).click();
  await expect(capture.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
  await expect(capture.getByRole('region', { name: 'Saved records to review', exact: true })).toHaveCount(0);
  failReload = false;
  await capture.getByRole('button', { name: 'Reload saved records', exact: true }).click();
  const review = capture.getByRole('region', { name: 'Saved records to review', exact: true });
  await expect(review.locator(`a[href="/projects/${projectId}/records/${committedId}"]`)).toContainText(title);
  await expect(review).toContainText('Public sample task');
  await expect(capture.getByRole('button', { name: 'Create another draft', exact: true })).toBeEnabled();
  expect(creates).toBe(1);
  const final = (await (await page.request.get(endpoint)).json()).records as { title: string }[];
  expect(final.filter(item => item.title === title)).toHaveLength(1);
});
``````

#### File: `tests/browser/review-log.spec.ts`

<!-- replay task=5 phase=test encoding=text sha256=68ec144b148c7d39025dc6f266af377e97d1d579e9db1b951f74978589f49c4b -->

``````ts
import { test, expect, login, seed } from './fixture';
import type { Page } from '@playwright/test';
const origin = 'http://127.0.0.1:3490';
async function record(page: Page) {
  await login(page); const { projectId } = seed();
  const response = await page.request.post(`/api/projects/${projectId}/records`, { headers: { origin }, data: { subtype: 'task', title: `Log review ${Date.now()}` } });
  const { id } = await response.json() as { id: number };
  const base = `/api/projects/${projectId}/records/${id}`;
  await page.goto(`/projects/${projectId}/records/${id}`);
  await page.getByRole('button', { name: 'Log', exact: true }).click();
  return base;
}
test('editing only Log text preserves milliseconds and the second Melbourne repeated hour', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'Australia/Melbourne' }); const page = await context.newPage();
  try {
    const base = await record(page); const original = '2026-04-04T16:30:47.123Z';
    await page.request.post(base + '/log', { headers: { origin }, data: { eventAt: original, text: 'Before edit' } });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
    await page.getByRole('textbox', { name: 'Entry', exact: true }).fill('Text edited only');
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await expect(page.getByText('Text edited only', { exact: true })).toBeVisible();
    const log = await (await page.request.get(base + '/log')).json() as { eventAt: string }[];
    expect(log[0]?.eventAt).toBe(original);
    await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
    await page.getByLabel('Private · owner only', { exact: true }).check();
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toHaveCount(0);
    expect((await (await page.request.get(base + '/log')).json())[0]).toMatchObject({ eventAt: original, private: true });
    await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'UTC offset', exact: true })).toHaveValue('+10:00');
    await page.getByRole('textbox', { name: 'UTC offset', exact: true }).fill('+11:00');
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toHaveCount(0);
    expect((await (await page.request.get(base + '/log')).json())[0].eventAt).toBe('2026-04-04T15:30:47.123Z');
  } finally { await context.close(); }
});
test('unknown Log creation outcome blocks retries through failed refresh and retains draft beside saved results', async ({ page }) => {
  const base = await record(page); let posts = 0;
  await page.getByRole('button', { name: 'Add Log entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Entry', exact: true }).fill('Committed once despite lost response');
  await page.route(`**${base}/log`, async route => {
    if (route.request().method() !== 'POST') return route.continue();
    posts++; const result = await route.fetch(); expect(result.ok()).toBeTruthy(); await route.abort();
  });
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Entry', exact: true })).toHaveValue('Committed once despite lost response');
  await page.route(`**${base}`, route => route.fulfill({ status: 503, json: { error: 'temporary_failure' } }));
  await page.getByRole('button', { name: 'Refresh saved Log', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toBeDisabled();
  await page.unroute(`**${base}`);
  await page.getByRole('button', { name: 'Refresh saved Log', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Saved Log entries', exact: true })).toContainText('Committed once despite lost response');
  await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toBeEnabled();
  await expect(page.getByRole('textbox', { name: 'Entry', exact: true })).toHaveValue('Committed once despite lost response');
  expect(posts).toBe(1); expect(await (await page.request.get(base + '/log')).json()).toHaveLength(1);
});
for (const outcome of ['lost', 'truncated'] as const) test(`unknown Log attachment ${outcome} response blocks retries until a successful refresh shows the committed file`, async ({ page }) => {
  const base = await record(page); await page.request.post(base + '/log', { headers: { origin }, data: { text: 'Attachment destination' } });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByText('Attach a file to this entry', { exact: true }).click();
  await page.getByLabel('Attachment file', { exact: true }).setInputFiles({ name: 'saved-once.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic log attachment') });
  let posts = 0;
  await page.route(`**${base}/attachments`, async route => { if (route.request().method() !== 'POST') return route.continue(); posts++; const result = await route.fetch(); expect(result.ok()).toBeTruthy(); if (outcome === 'lost') await route.abort(); else await route.fulfill({ status: 201, contentType: 'application/json', body: '{' }); });
  await page.getByRole('button', { name: 'Upload attachment', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload attachment', exact: true })).toBeDisabled();
  await page.route(`**${base}`, route => route.fulfill({ status: 503, json: { error: 'temporary_failure' } }));
  await page.getByRole('button', { name: 'Refresh saved attachments', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Upload attachment', exact: true })).toBeDisabled();
  await page.unroute(`**${base}`);
  await page.getByRole('button', { name: 'Refresh saved attachments', exact: true }).click();
  await expect(page.getByText('Attachment: saved-once.txt', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload attachment', exact: true })).toBeEnabled();
  expect(posts).toBe(1); expect(await (await page.request.get(base + '/attachments')).json()).toHaveLength(1);
});
``````

#### File: `tests/browser/review-sharing.spec.ts`

<!-- replay task=5 phase=test encoding=text sha256=1ae912f2cd60b958e7f14862e5c3584a3e64d9e576eb1b9e83ea104a286dc3c4 -->

``````ts
import Database from 'better-sqlite3';
import type { Page } from '@playwright/test';
import { test, expect, login, seed } from './fixture';

const origin = 'http://127.0.0.1:3490';
async function tab(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Record sections' }).getByRole('button', { name, exact: true }).click();
}
async function draft(page: Page) {
  const base = `/api/projects/${seed().projectId}/records`;
  const response = await page.request.post(base, { headers: { origin }, data: { subtype: 'task', title: 'Review synthetic draft' } });
  expect(response.status()).toBe(201);
  const record = await response.json() as { id: number };
  return { base: `${base}/${record.id}`, url: `/projects/${seed().projectId}/records/${record.id}` };
}
const article = (page: Page, label: string) => page.getByRole('article').filter({ has: page.getByRole('heading', { name: label, exact: true }) });

test('owner creates and copies a Draft share link while its public record stays unavailable', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await login(page); const record = await draft(page);
  await page.goto(record.url); await tab(page, 'Sharing');
  await page.getByText('Create a share link', { exact: true }).click();
  const label = page.getByRole('textbox', { name: 'Link label', exact: true });
  await expect(label).toBeEnabled();
  await label.fill('Draft review link');
  await page.getByRole('button', { name: 'Create link', exact: true }).click();
  const link = article(page, 'Draft review link');
  await expect(link).toContainText('Draft — unavailable');
  const url = await link.getByRole('textbox', { name: 'Share URL', exact: true }).inputValue();
  await link.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(link.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  const publicPage = await context.newPage();
  await publicPage.goto(url);
  await expect(publicPage.getByRole('alert')).toHaveText('Το στοιχείο δεν είναι διαθέσιμο.');
  await expect(publicPage.getByRole('heading', { name: 'Review synthetic draft', exact: true })).toHaveCount(0);
  await publicPage.close();
});

test('revoked and expired links remain copyable but a null URL never exposes a copy control', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await login(page);
  const { projectId, recordId, dbPath } = seed();
  const base = `/api/projects/${projectId}/records/${recordId}`;
  const links: { id: number; label: string; url: string }[] = [];
  for (const label of ['Review revoked', 'Review expired', 'Review unavailable URL']) {
    const response = await page.request.post(base + '/share-links', { headers: { origin }, data: { label } });
    expect(response.status()).toBe(201); links.push(await response.json());
  }
  const db = new Database(dbPath);
  try {
    db.prepare('UPDATE share_links SET expires_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', links[1]!.id);
    db.prepare('UPDATE share_links SET key_fingerprint = ? WHERE id = ?').run('synthetic-old-key', links[2]!.id);
  } finally { db.close(); }
  await page.goto(`/projects/${projectId}/records/${recordId}`); await tab(page, 'Sharing');
  const revoked = article(page, 'Review revoked');
  page.once('dialog', dialog => dialog.accept());
  await revoked.getByRole('button', { name: 'Revoke link', exact: true }).click();
  await expect(revoked).toContainText('Revoked');
  for (const target of [links[0]!, links[1]!]) {
    const row = article(page, target.label);
    await expect(row.getByRole('button', { name: 'Copy link', exact: true })).toBeVisible();
    await row.getByRole('button', { name: 'Copy link', exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(target.url);
    const response = await page.request.get('/api/shared/record', { headers: { Authorization: `Bearer ${new URL(target.url).hash.slice(1)}` } });
    expect(response.status()).toBe(404);
  }
  await expect(article(page, 'Review expired')).toContainText('Expired');
  const unavailable = article(page, 'Review unavailable URL');
  await expect(unavailable.getByRole('button', { name: 'Copy link', exact: true })).toHaveCount(0);
  await expect(unavailable.getByRole('textbox', { name: 'Share URL', exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('el');
  await expect(revoked).toContainText('Ανακλήθηκε');
  await expect(article(page, 'Review expired')).toContainText('Έληξε');
});

test('measurement tables preserve precise values and nonzero differences in English and Greek', async ({ page }) => {
  await login(page); const record = await draft(page);
  for (const [date, phase, value] of [['2026-01-01', 'before', 1], ['2026-01-02', 'after', 1.000000001]] as const) {
    const response = await page.request.post(record.base + '/measurement-sets', { headers: { origin }, data: { date, phase, rows: [
      { item: 'Reference', quantity: 'Width', unit: 'mm', value: 1 },
      { item: 'Measured', quantity: 'Width', unit: 'mm', value },
      { item: 'Small', quantity: 'Depth', unit: 'mm', value: 1e-12 },
    ] } });
    expect(response.status()).toBe(201);
  }
  await page.goto(record.url); await tab(page, 'Measurements');
  await expect(page.getByRole('cell', { name: '1.000000001', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '1e-12', exact: true }).first()).toBeVisible();
  const after = page.getByRole('article').filter({ has: page.getByRole('heading', { name: /2 Jan 2026/ }) });
  await after.locator('summary').filter({ hasText: /^Between items · Width/ }).click();
  await expect(after.getByRole('cell', { name: '1.000000082740371e-9', exact: true })).toBeVisible();
  const history = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: /^Before vs after · Measured · Width/ }) });
  await history.locator('summary').click();
  await expect(history.getByRole('cell', { name: '1.000000082740371e-9', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('el');
  await expect(page.getByRole('cell', { name: '1,000000001', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: '1,000000082740371e-9', exact: true }).first()).toBeVisible();
});
``````

#### File: `tests/browser/server.ts`

<!-- replay task=5 phase=test encoding=text sha256=ac26d4034de775b677ac46e0c4d7deab0f96f57bbb1b0c32eed1fc1f7ad89e2c -->

``````ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeContext, OWNER } from '../server/helpers';
import { setOwnerPassword } from '../../src/server/auth/users';
import { createContributor } from '../../src/server/auth/contributors';
import { createProject } from '../../src/server/lists/projects';
import { createPerson } from '../../src/server/lists/people';
import { createTrade } from '../../src/server/lists/trades';
import { createTag } from '../../src/server/lists/tags';
import { createLocation } from '../../src/server/lists/locations';
import { createZoneType } from '../../src/server/lists/zone-types';
import { createRecord } from '../../src/server/records/records';
import { changeStatus } from '../../src/server/records/transitions';
import { addLogEntry } from '../../src/server/records/log';
import { createShareLink } from '../../src/server/sharing/links';

const ctx = await makeContext({ publicBaseUrl: 'http://127.0.0.1:3490' });
const owner = setOwnerPassword(ctx.db, OWNER.username, OWNER.password, new Date(), 'Project owner').userId;
const projectId = createProject(ctx.db, { code: 'BROWSER', name: 'Browser test project' }).id;
const architectId = createPerson(ctx.db, projectId, { code: 'ARCH', name: 'Sample architect', role: 'architect' }).id;
createTrade(ctx.db, projectId, { code: 'MAS', nameEn: 'Stonework', nameEl: 'Λιθοδομές' });
createTag(ctx.db, projectId, { nameEn: 'Stone', nameEl: 'Πέτρα' });
const zone = createZoneType(ctx.db, projectId, { nameEn: 'Kitchen', nameEl: 'Κουζίνα' }).id;
const villa = createLocation(ctx.db, projectId, { kind: 'building', nameEn: 'Villa 1', nameEl: 'Βίλα 1' }).id;
createLocation(ctx.db, projectId, { parentId: villa, kind: 'space', nameEn: 'Kitchen', nameEl: 'Κουζίνα', zoneTypeId: zone });
const recordId = createRecord(ctx.db, projectId, owner, { subtype: 'task', title: 'Public sample task', publicNotes: 'Public site note', notes: 'PRIVATE_SENTINEL', outsideScope: true, estimatedCost: 9876.54, ballInCourtId: architectId }).id;
changeStatus(ctx.db, projectId, recordId, owner, { to: 'open' });
addLogEntry(ctx.db, projectId, recordId, owner, { eventAt: new Date().toISOString(), text: 'Public log entry', private: false });
addLogEntry(ctx.db, projectId, recordId, owner, { eventAt: new Date().toISOString(), text: 'PRIVATE_LOG_SENTINEL', private: true });
const users: Record<string, number> = {};
for (const [name, upload, log] of [['uploader', 1, 0], ['logger', 0, 1], ['reader', 0, 0]] as const) {
  users[name] = createContributor(ctx.db, name, `Sample ${name}`, OWNER.password);
  ctx.db.prepare('INSERT INTO record_grants VALUES (?,?,?,?)').run(recordId, users[name], upload, log);
}
const shareUrl = createShareLink(ctx.db, ctx.config, projectId, recordId, owner, { label: 'Browser synthetic reader' }).url!;
mkdirSync(resolve('test-results'), { recursive: true });
writeFileSync(resolve('test-results/browser-seed.json'), JSON.stringify({ projectId, recordId, shareUrl, dbPath: ctx.config.dbPath, architectId, users }));
await ctx.app.listen({ host: '127.0.0.1', port: 3490 });
let stopping = false;
const stop = async () => { if (stopping) return; stopping = true; await ctx.close(); process.exit(0); };
process.on('SIGINT', () => { void stop(); }); process.on('SIGTERM', () => { void stop(); });
``````

- [ ] **Check the pre-implementation result.** Run `npm run web:build`. The production build fails because src/web/index.html and the application entrypoint have not yet been written. After writing the implementation, run the complete verification below, not just the build.

- [ ] **Write the complete implementation below.**

#### File: `src/web/App.tsx`

<!-- replay task=5 phase=implementation encoding=text sha256=6ebe2c430be765f2587c49ac4368b16e7c50ec47b2acb3879b9df8eb709845ab -->

``````tsx
import { useEffect, useState } from 'react';
import type { Project } from '../server/lists/projects';
import { api, ApiError } from './core/api';
import { useI18n } from './core/i18n';
import { BusyButton, ErrorNotice, Field } from './core/forms';
import { RecordList } from './home/RecordList';
import { RecordPage } from './record/RecordPage';
import { ManagedLists } from './lists/ManagedLists';
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
  const assignedId = /^\/assigned\/(\d+)$/.exec(location.pathname)?.[1];
  const project = projects.find(item => item.id === projectId);
  const from = new URLSearchParams(location.search).get('from') ?? ''; const safeFrom = from.startsWith('?') ? from : '';
  return <><header className="site-header"><a className="brand" href={shared ? undefined : user?.isOwner ? '/projects' : '/assigned'}>BuiltBasis</a>{project && <span>{project.name}</span>}<div className="header-actions"><label>{t('Language', 'Γλώσσα')} <select aria-label={t('Language', 'Γλώσσα')} value={lang} onChange={event => setLang(event.target.value as 'en' | 'el')}><option value="en">English</option><option value="el">Ελληνικά</option></select></label>{user && <><span>{user.displayName}</span><button onClick={async () => { try { await api('/api/auth/logout', { method: 'POST', body: {} }); location.assign('/login'); } catch (failure) { setError(failure); } }}>{t('Sign out', 'Αποσύνδεση')}</button></>}</div></header>
  {user?.isOwner && projectId && <nav className="site-nav"><a href={`/projects/${projectId}/records`}>{t('Records', 'Καταγραφές')}</a><a href={`/projects/${projectId}/lists`}>{t('Managed lists', 'Διαχείριση λιστών')}</a><a href="/projects">{t('Projects', 'Έργα')}</a></nav>}
  <main><ErrorNotice error={error}/>{shared ? (/^[A-Za-z0-9_-]{43}$/.test(token) ? <RecordPage context={{ mode: 'shared', base: '/api/shared', token }} onBack={() => {}}/> : <h1>{t('Record not available', 'Η καταγραφή δεν είναι διαθέσιμη')}</h1>) : !ready ? <p role="status">{t('Loading…', 'Φόρτωση…')}</p> : !user ? <Login onLogin={() => { location.assign(location.pathname === '/login' || location.pathname === '/' ? '/projects' : location.pathname + location.search); }}/> : !user.isOwner ? (assignedId ? <RecordPage context={{ mode: 'contributor', base: `/api/assigned-records/${assignedId}`, recordId: Number(assignedId) }} onBack={() => location.assign('/assigned')}/> : <Assigned/>) : projectId && project ? (match?.[2] === 'lists' ? <ManagedLists projectId={projectId}/> : recordId ? <RecordPage context={{ mode: 'owner', base: `/api/projects/${projectId}/records/${recordId}`, projectId, recordId }} onBack={() => location.assign(`/projects/${projectId}/records${safeFrom}`)}/> : <RecordList projectId={projectId}/>) : <><h1>{t('Projects', 'Έργα')}</h1>{projects.length ? <div className="record-list">{projects.map(item => <a className="panel" key={item.id} href={`/projects/${item.id}/records`}>{item.name}</a>)}</div> : <p>{t('No project has been set up yet. Ask the owner to load the project data.', 'Δεν έχει καταχωριστεί έργο. Ζητήστε από τον ιδιοκτήτη να φορτώσει τα δεδομένα.')}</p>}</>}</main></>;
}
``````

#### File: `src/web/main.tsx`

<!-- replay task=5 phase=implementation encoding=text sha256=a2255ebe29c65e1965cc616414ae1d9757a741a4207a3ae21059f8ec5de50ab9 -->

``````tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LanguageProvider } from './core/i18n';
import './styles.css';
createRoot(document.getElementById('root')!).render(<LanguageProvider shared={location.pathname === '/share'}><App/></LanguageProvider>);
``````

#### File: `src/web/index.html`

<!-- replay task=5 phase=implementation encoding=text sha256=837f31c99ffdf4dbe19cf3c4c58871f0985150eab203b28300bbe1c1a10255a4 -->

``````html
<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>BuiltBasis</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>
``````

#### File: `src/web/styles.css`

<!-- replay task=5 phase=implementation encoding=text sha256=6d5e0d4827bc105ccda67aa1f0153d7afef6490dce99dcd13e43bf39da6588c7 -->

``````css
:root{font-family:system-ui,-apple-system,sans-serif;color:#243747;background:#f2f5f7;line-height:1.5;font-size:16px}*{box-sizing:border-box}body{margin:0}a{color:#225c7b;text-underline-offset:3px}button,input,select,textarea{font:inherit}button,a,input,select,summary{touch-action:manipulation}button{border:1px solid #9cabb7;background:white;color:#243747;border-radius:5px;padding:.55rem .85rem;cursor:pointer;min-height:42px}button:disabled{opacity:.6;cursor:default}button.primary,.primary{background:#245e79;color:white;border-color:#245e79}input,select,textarea{border:1px solid #b1c0cc;border-radius:4px;background:white;color:inherit;max-width:100%;min-height:42px;padding:.45rem .6rem}input:not([type=checkbox]):not([type=radio]),textarea{width:100%}input[type=checkbox],input[type=radio]{width:20px;height:20px;min-height:20px}textarea{min-height:100px;resize:vertical}select[multiple]{min-height:116px}h1{font-size:1.7rem;line-height:1.2}h2{font-size:1.25rem}h3{font-size:1.05rem}small,.muted{color:#596d7c}fieldset{border:1px solid #ced8e0;border-radius:5px;margin:12px 0;min-width:0}legend{padding:0 6px}label{overflow-wrap:anywhere}.site-header{display:flex;align-items:center;gap:24px;background:#203b50;color:white;padding:15px 28px;flex-wrap:wrap}.brand{font-size:1.3rem;color:white;font-weight:750;text-decoration:none}.header-actions{margin-left:auto;display:flex;align-items:center;gap:15px;flex-wrap:wrap}.header-actions label{font-size:.85rem}.header-actions select{font-size:.85rem}.site-nav{display:flex;gap:24px;padding:12px 28px;background:white;border-bottom:1px solid #d4dfe5}main{max-width:1280px;margin:auto;padding:28px}.panel,.filters,.record-card{background:white;border:1px solid #d1dce4;border-radius:7px;padding:20px;margin:16px 0}.panel a{overflow-wrap:anywhere}.grid,.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}.field{display:flex;flex-direction:column;gap:5px;margin:12px 0}.field>span{font-size:.87rem;font-weight:600}.field select{width:100%}.check{display:flex;align-items:center;gap:8px;margin:7px 0;font-size:.9rem}.multi{max-height:240px;overflow:auto}.title-row,.actions,.toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between}.actions,.toolbar{justify-content:flex-start;margin:14px 0}.error{background:#fff0ed;color:#8a3028;border:1px solid #e6b4ab;padding:12px;margin:12px 0;border-radius:5px;white-space:pre-wrap}.success{background:#e7f4ed;padding:12px}.badge{display:inline-block;background:#e6eff5;border-radius:4px;padding:3px 9px;font-size:.85rem}.safety{background:#f8e7de;color:#893d27;padding:3px 8px;border-radius:4px}.record-list{display:grid;gap:10px}.record-card{margin:0}.record-card>a{text-decoration:none}.record-card h2{display:inline;margin-left:16px;font-size:1.05rem}.record-facts{display:flex;gap:16px;flex-wrap:wrap;font-size:.86rem;margin-top:12px}.record-facts progress{width:65px;height:8px}.totals{font-size:.9rem}.tabs,.record-tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #c4d4df;margin:16px 0;padding-bottom:8px}.tabs button,.record-tabs button{border-color:transparent;background:transparent;font-size:.88rem}.tabs button[aria-selected=true],.record-tabs button[aria-selected=true]{border-bottom:3px solid #245e79;color:#245e79;font-weight:700}.phone-sections{display:none}.record-summary{display:flex;gap:20px;flex-wrap:wrap}.private{border-color:#d8c8a6;background:#fcf9f1}.help{font-size:.85rem;margin:5px 0 12px}.help summary{color:#315e77}.help dd{margin:3px 0 12px}details>summary{cursor:pointer;min-height:38px;padding:7px 0}.location-picker ul{list-style:none;padding-left:16px}.location-picker>ul{padding-left:0}.location-picker .field{max-width:450px}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{border-bottom:1px solid #dbe4e9;padding:10px;text-align:left;vertical-align:top}th{background:#f4f7f9}.table-wrap{overflow-x:auto}img,video,canvas{max-width:100%;height:auto}audio{max-width:100%}dialog{max-width:min(1000px,95vw);max-height:92vh;border:1px solid #9eb2c0;border-radius:8px;padding:24px}dialog::backdrop{background:#1c2d4090}.login{max-width:450px;margin:40px auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #c38320;outline-offset:3px}.viewer{overflow:auto}.photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}@media(max-width:650px){main{padding:16px}.site-header{padding:12px 16px;gap:12px}.header-actions{gap:8px}.header-actions>span{display:none}.site-nav{padding:10px 16px;gap:15px;font-size:.9rem}.panel,.filters,.record-card{padding:14px}.grid,.form-grid{grid-template-columns:1fr}.record-card h2{display:block;margin:5px 0}.record-facts{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tabs,.record-tabs{display:none}.phone-sections{display:block}.record-summary{gap:12px}h1{font-size:1.4rem}dialog{padding:15px}.actions button{flex-grow:1}table{min-width:500px}}

.user-text{white-space:pre-wrap;overflow-wrap:anywhere}.table-scroll{overflow-x:auto}.filter-chips{display:flex;flex-wrap:wrap;gap:8px}.record-tabs button[aria-current=page]{border-bottom:3px solid #245e79;color:#245e79;font-weight:700}
.summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;background:white;border:1px solid #d1dce4;border-radius:7px;padding:16px}.summary-grid dt{font-size:.82rem;color:#596d7c}.summary-grid dd{margin:0}.summary-grid small{display:block}.summary-grid progress{width:80px}.record-page details{max-width:100%;overflow-x:auto}.record-page section>dl dd{margin:3px 0 14px}.record-page section>dl dt{font-weight:600}.record-page article{border-bottom:1px solid #d1dce4;padding:12px 0}
.site-header select{color:#243747}@media(max-width:650px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.phone-sections{display:flex;flex-direction:column;gap:6px}.summary-grid>div{min-width:0;overflow-wrap:anywhere}}
``````

#### File: `src/web/home/Capture.tsx`

<!-- replay task=5 phase=implementation encoding=text sha256=4914c29d0e239656914eac81fdf2025930c1c121d0855e1012a4a115cfb9623d -->

``````tsx
import { useEffect, useRef, useState } from 'react';
import type { RecordDetail } from '../../server/records/records';
import type { RecordList } from '../../server/records/list';
import type { LocationNode } from '../../server/lists/locations';
import type { Subtype, PhotoPhase } from '../../domain';
import { api, ApiError, isUnknownOutcome } from '../core/api';
import { useI18n } from '../core/i18n';
import { BusyButton, ErrorNotice, Field, VocabSelect, useDirtyGuard } from '../core/forms';
import { LocationPicker } from '../core/LocationPicker';
import { preparePhoto, uploadEvidence } from '../media/upload';
export function Capture({ projectId, nodes, onClose }: { projectId: number; nodes: LocationNode[]; onClose(): void }) {
  const { t } = useI18n(); const [subtype, setSubtype] = useState<Subtype>('quality_issue'); const [title, setTitle] = useState(''); const [locations, setLocations] = useState<number[]>([]);
  const [phase, setPhase] = useState<PhotoPhase>('before'); const [files, setFiles] = useState<File[]>([]); const [record, setRecord] = useState<RecordDetail | null>(null);
  const [outcomes, setOutcomes] = useState<{ name: string; ok: boolean }[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [controller, setController] = useState<AbortController | null>(null);
  const [currentFile, setCurrentFile] = useState(''); const [progress, setProgress] = useState<number | null>(null);
  const activeUpload = useRef<AbortController | null>(null);
  const activeReview = useRef<AbortController | null>(null);
  const [unknownCreation, setUnknownCreation] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewedRecords, setReviewedRecords] = useState<RecordList['records'] | null>(null);
  useEffect(() => () => { activeUpload.current?.abort(); activeReview.current?.abort(); }, []);
  const reloadSavedRecords = async () => {
    if (busy || reviewing) return;
    activeReview.current?.abort();
    const abort = new AbortController(); activeReview.current = abort;
    setReviewing(true); setReviewedRecords(null); setError(null);
    try {
      const saved = await api<RecordList>(`/api/projects/${projectId}/records?sort=updated&dir=desc`, { signal: abort.signal });
      if (!saved || !Array.isArray(saved.records)) throw new ApiError(0, 'request_failed');
      if (!abort.signal.aborted) setReviewedRecords(saved.records);
    } catch (failure) { if (!abort.signal.aborted) setError(failure); }
    finally { if (!abort.signal.aborted) setReviewing(false); }
  };
  const dirty = busy || (!record && Boolean(unknownCreation || title || locations.length || files.length));
  useDirtyGuard(dirty);
  return <section className="panel"><h2>{t('New record', 'Νέα καταγραφή')}</h2>{record ? <><p>{t('Draft saved.', 'Το πρόχειρο αποθηκεύτηκε.')} <a href={`/projects/${projectId}/records/${record.id}`}>{record.humanId}</a></p><ul>{outcomes.map((item, index) => <li key={index}>{item.name}: {item.ok ? t('Uploaded', 'Μεταφορτώθηκε') : t('Not uploaded. Open the record before retrying.', 'Δεν μεταφορτώθηκε. Ανοίξτε την καταγραφή πριν δοκιμάσετε ξανά.')}</li>)}</ul></> : <form onSubmit={async event => {
    event.preventDefault(); if (busy || reviewing || (unknownCreation && reviewedRecords === null)) return; setBusy(true); setError(null); const abort = new AbortController(); activeUpload.current = abort; setController(abort);
    try {
      const saved = await api<RecordDetail>(`/api/projects/${projectId}/records`, { method: 'POST', body: { subtype, title, locationIds: locations } });
      if (!saved || !Number.isSafeInteger(saved.id) || saved.id <= 0 || typeof saved.humanId !== 'string') throw new ApiError(0, 'request_failed');
      setRecord(saved); setUnknownCreation(false); setReviewedRecords(null);
      for (const file of files) {
        setCurrentFile(file.name); setProgress(null);
        if (abort.signal.aborted) { setOutcomes(items => [...items, { name: file.name, ok: false }]); continue; }
        try { const bundle = await preparePhoto(file, abort.signal); await uploadEvidence({ mode: 'owner', base: `/api/projects/${projectId}/records/${saved.id}`, projectId, recordId: saved.id }, 'photos', { original: bundle.original, display: bundle.display, thumbnail: bundle.thumbnail }, { phase, takenAt: bundle.takenAt }, abort.signal, setProgress); setOutcomes(items => [...items, { name: file.name, ok: true }]); }
        catch (failure) { setError(failure); if (failure instanceof ApiError && [401, 403, 404].includes(failure.status)) abort.abort(); setOutcomes(items => [...items, { name: file.name, ok: false }]); }
      }
    } catch (failure) { setError(failure); if (isUnknownOutcome(failure)) { setUnknownCreation(true); setReviewedRecords(null); } } finally { setBusy(false); setController(null); }
  }}><VocabSelect list="subtype" label={t('Subtype', 'Υποκατηγορία')} required value={subtype} onChange={value => { if (value) setSubtype(value as Subtype); }}/><Field label={t('Title', 'Τίτλος')}><input value={title} maxLength={200} onChange={event => setTitle(event.target.value)}/></Field><details><summary>{t('Location and photos (optional)', 'Θέση και φωτογραφίες (προαιρετικά)')}</summary><LocationPicker nodes={nodes} value={locations} onChange={setLocations}/><Field label={t('Photos', 'Φωτογραφίες')}><input type="file" multiple accept="image/*,.heic,.heif" onChange={event => setFiles(Array.from(event.target.files ?? []))}/></Field><VocabSelect label={t('Photo phase', 'Φάση φωτογραφιών')} list="photoPhase" value={phase} onChange={value => { if (value) setPhase(value as PhotoPhase); }}/><small>{t('A photo bundle, including its copies and metadata, must fit within 100 MB.', 'Η φωτογραφία μαζί με τα αντίγραφα και τα μεταδεδομένα πρέπει να χωρά σε 100 MB.')}</small></details>{unknownCreation && <div>
    <p role="status">{t('The creation result is unknown. The draft may already have been saved. Reload and review the saved records before creating another draft. Selected photos have not been uploaded.', 'Το αποτέλεσμα της δημιουργίας είναι άγνωστο. Το πρόχειρο μπορεί να έχει ήδη αποθηκευτεί. Ανανεώστε και ελέγξτε τις αποθηκευμένες καταγραφές πριν δημιουργήσετε άλλο πρόχειρο. Οι επιλεγμένες φωτογραφίες δεν έχουν μεταφορτωθεί.')}</p>
    <BusyButton type="button" busy={reviewing} disabled={busy} onClick={() => void reloadSavedRecords()}>{t('Reload saved records', 'Ανανέωση αποθηκευμένων καταγραφών')}</BusyButton>
    {reviewedRecords !== null && <section aria-label={t('Saved records to review', 'Αποθηκευμένες καταγραφές για έλεγχο')}>
      <h3>{t('Saved records to review', 'Αποθηκευμένες καταγραφές για έλεγχο')}</h3>
      <p>{t('Check the saved records and open your draft to continue. Creating another draft may create a duplicate.', 'Ελέγξτε τις αποθηκευμένες καταγραφές και ανοίξτε το πρόχειρό σας για να συνεχίσετε. Η δημιουργία άλλου προχείρου μπορεί να δημιουργήσει διπλότυπο.')}</p>
      {reviewedRecords.length === 0 ? <p>{t('No saved records were returned.', 'Δεν επιστράφηκαν αποθηκευμένες καταγραφές.')}</p> : <ul>{reviewedRecords.map(item => <li key={item.id}><a href={`/projects/${projectId}/records/${item.id}`}>{item.humanId} · {item.title || t('Untitled draft', 'Πρόχειρο χωρίς τίτλο')}</a></li>)}</ul>}
    </section>}
  </div>}<BusyButton busy={busy} disabled={reviewing || (unknownCreation && reviewedRecords === null)} className="primary">{unknownCreation && reviewedRecords !== null ? t('Create another draft', 'Δημιουργία άλλου προχείρου') : t('Save draft', 'Αποθήκευση προχείρου')}</BusyButton></form>}
  {busy && currentFile && <p role="status">{currentFile} · {progress === null ? t('Preparing photo…', 'Προετοιμασία φωτογραφίας…') : `${progress}%`} {progress !== null && <progress max={100} value={progress}/>}</p>}{busy && <button onClick={() => controller?.abort()}>{t('Cancel remaining uploads', 'Ακύρωση υπόλοιπων μεταφορτώσεων')}</button>}<ErrorNotice error={error}/>{!busy && <button onClick={() => { if (!dirty || confirm(t('Discard unsaved changes?', 'Να απορριφθούν οι μη αποθηκευμένες αλλαγές;'))) onClose(); }}>{t('Close', 'Κλείσιμο')}</button>}</section>;
}
``````

#### File: `src/web/home/RecordList.tsx`

<!-- replay task=5 phase=implementation encoding=text sha256=14e8699ccc90975126a9f0b980baebd1e6790354ec966dd0de021c12f854a62a -->

``````tsx
import { useEffect, useState } from 'react';
import type { RecordList as ListData } from '../../server/records/list';
import type { LocationNode } from '../../server/lists/locations';
import { entriesOf, isCode, labelOf, type ListKey } from '../../domain';
import { api } from '../core/api';
import { useI18n } from '../core/i18n';
import { ErrorNotice, Field, MultiPick } from '../core/forms';
import { LocationPicker } from '../core/LocationPicker';
import { Capture } from './Capture';
type Named = { id: number; name?: string; nameEn?: string; nameEl?: string; active?: boolean };
export function RecordList({ projectId }: { projectId: number }) {
  const { lang, t } = useI18n(); const [data, setData] = useState<ListData | null>(null); const [error, setError] = useState<unknown>(null); const [capture, setCapture] = useState(false);
  const [allRecords, setAllRecords] = useState<ListData['records']>([]);
  const [lists, setLists] = useState<Record<string, Named[]>>({}); const [nodes, setNodes] = useState<LocationNode[]>([]);
  const [query, setQuery] = useState(() => new URLSearchParams(location.search)); const [applied, setApplied] = useState(location.search);
  const name = (item: Partial<Named>) => item.name ?? (lang === 'el' ? item.nameEl || item.nameEn : item.nameEn || item.nameEl) ?? '';
  useEffect(() => { const abort = new AbortController(); Promise.all(['people', 'trades', 'tags', 'zone-types', 'locations'].map(async kind => [kind, await api<Named[]>(`/api/projects/${projectId}/${kind}`, { signal: abort.signal })] as const)).then(result => { setLists(Object.fromEntries(result)); setNodes(Object.fromEntries(result).locations as LocationNode[]); }).catch(failure => { if (!abort.signal.aborted) setError(failure); }); return () => abort.abort(); }, [projectId]);
  useEffect(() => { const abort = new AbortController(); setData(null); setError(null); api<ListData>(`/api/projects/${projectId}/records${applied}`, { signal: abort.signal }).then(setData).catch(failure => { if (!abort.signal.aborted) setError(failure); }); return () => abort.abort(); }, [projectId, applied]);
  useEffect(() => { const abort = new AbortController(); api<ListData>(`/api/projects/${projectId}/records`, { signal: abort.signal }).then(result => setAllRecords(result.records)).catch(failure => { if (!abort.signal.aborted) setError(failure); }); return () => abort.abort(); }, [projectId]);
  const set = (key: string, value: string) => setQuery(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next; });
  const fixed = (key: string, vocabulary: ListKey, label: string) => <Field label={label}><select multiple value={(query.get(key) ?? '').split(',').filter(Boolean)} onChange={event => set(key, Array.from(event.target.selectedOptions, option => option.value).join(','))}>{entriesOf(vocabulary).map(entry => <option key={entry.code} value={entry.code}>{labelOf(vocabulary, entry.code, lang)}</option>)}</select></Field>;
  const managed = (key: string, list: string, label: string) => <MultiPick label={label} items={(lists[list] ?? []).map(item => ({ id: item.id, label: name(item) }))} value={(query.get(key) ?? '').split(',').filter(Boolean).map(Number)} onChange={ids => set(key, ids.join(','))}/>;
  const filterLabels: Record<string, string> = { q: t('Search', 'Αναζήτηση'), subtype: t('Subtype', 'Υποκατηγορία'), status: t('Status', 'Κατάσταση'), priority: t('Priority', 'Προτεραιότητα'), severity: t('Severity', 'Σοβαρότητα'), stage: t('Stage', 'Στάδιο'), problemType: t('Type of problem', 'Είδος προβλήματος'), tradeId: t('Trade', 'Ειδικότητα'), tagId: t('Tag', 'Ετικέτα'), zoneTypeId: t('Zone type', 'Τύπος χώρου'), ballInCourtId: t('Next action by', 'Επόμενη ενέργεια από'), responsibleId: t('Responsible', 'Υπεύθυνος'), locationId: t('Location', 'Θέση'), safety: t('Safety', 'Ασφάλεια'), outsideScope: t('Outside contract', 'Εκτός σύμβασης'), blocking: t('Unfinished prerequisites', 'Ανολοκλήρωτες προαπαιτούμενες εργασίες'), dueFrom: t('Due from', 'Προθεσμία από'), dueTo: t('Due to', 'Προθεσμία έως'), before: t('Must be done before', 'Να γίνει πριν'), after: t('Requires first', 'Απαιτείται πρώτα') };
  const filterValue = (key: string, raw: string) => {
    const vocabs: Record<string, ListKey> = { subtype: 'subtype', status: 'status', priority: 'priority', severity: 'severity', stage: 'stage', problemType: 'problemType' };
    const managedKeys: Record<string, string> = { tradeId: 'trades', tagId: 'tags', zoneTypeId: 'zone-types', ballInCourtId: 'people', responsibleId: 'people', locationId: 'locations' };
    if (vocabs[key]) return raw.split(',').map(value => isCode(vocabs[key]!, value) ? labelOf(vocabs[key]!, value, lang) : t('Invalid filter', 'Μη έγκυρο φίλτρο')).join(', ');
    if (managedKeys[key]) return raw.split(',').map(value => name((key === 'locationId' ? nodes : lists[managedKeys[key]!] ?? []).find(item => item.id === Number(value)) ?? {})).join(', ');
    if (['safety', 'outsideScope', 'blocking'].includes(key)) return raw === 'true' ? t('Yes', 'Ναι') : t('No', 'Όχι');
    if (key === 'before' || key === 'after') return allRecords.find(record => record.id === Number(raw))?.humanId ?? t('Record', 'Καταγραφή');
    return raw;
  };
  return <><div className="title-row"><h1>{t('Records', 'Καταγραφές')}</h1><button className="primary" disabled={capture} onClick={() => setCapture(true)}>{t('New record', 'Νέα καταγραφή')}</button></div>{capture && <Capture projectId={projectId} nodes={nodes} onClose={() => { setCapture(false); location.reload(); }}/>}<form className="filters" onSubmit={event => { event.preventDefault(); const next = query.size ? `?${query}` : ''; history.replaceState(null, '', `${location.pathname}${next}`); setApplied(next); }}>
  <div className="grid"><Field label={t('Search title, description or ID', 'Αναζήτηση τίτλου, περιγραφής ή κωδικού')}><input type="search" value={query.get('q') ?? ''} maxLength={200} onChange={event => set('q', event.target.value)}/></Field><Field label={t('Sort', 'Ταξινόμηση')}><select value={query.get('sort') ?? 'id'} onChange={event => set('sort', event.target.value)}>{[['id', t('ID', 'Κωδικός')], ['due', t('Due date', 'Προθεσμία')], ['priority', t('Priority', 'Προτεραιότητα')], ['severity', t('Severity', 'Σοβαρότητα')], ['updated', t('Last updated', 'Τελευταία ενημέρωση')]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label={t('Order', 'Σειρά')}><select value={query.get('dir') ?? ''} onChange={event => set('dir', event.target.value)}><option value="">{t('Default', 'Προεπιλογή')}</option><option value="asc">{t('Ascending', 'Αύξουσα')}</option><option value="desc">{t('Descending', 'Φθίνουσα')}</option></select></Field></div>
  <details><summary>{t('Filters', 'Φίλτρα')}{query.size > 0 && ` (${query.size})`}</summary><div className="grid">{fixed('subtype', 'subtype', t('Subtype', 'Υποκατηγορία'))}{fixed('status', 'status', t('Status', 'Κατάσταση'))}{fixed('priority', 'priority', t('Priority', 'Προτεραιότητα'))}{fixed('severity', 'severity', t('Severity', 'Σοβαρότητα'))}{fixed('stage', 'stage', t('Stage', 'Στάδιο'))}{fixed('problemType', 'problemType', t('Type of problem', 'Είδος προβλήματος'))}
  {managed('tradeId', 'trades', t('Trades', 'Ειδικότητες'))}{managed('tagId', 'tags', t('Tags', 'Ετικέτες'))}{managed('zoneTypeId', 'zone-types', t('Zone type', 'Τύπος χώρου'))}{managed('ballInCourtId', 'people', t('Next action by', 'Επόμενη ενέργεια από'))}{managed('responsibleId', 'people', t('Responsible', 'Υπεύθυνος'))}
  <LocationPicker allowInactive nodes={nodes} value={(query.get('locationId') ?? '').split(',').filter(Boolean).map(Number)} onChange={ids => set('locationId', ids.join(','))}/>{[['safety', t('Safety implications', 'Θέμα ασφαλείας')], ['outsideScope', t('Outside contract scope', 'Εκτός σύμβασης')], ['blocking', t('Unfinished prerequisites', 'Ανολοκλήρωτες προαπαιτούμενες εργασίες')]].map(([key, label]) => <Field key={key} label={label!}><select value={query.get(key!) ?? ''} onChange={event => set(key!, event.target.value)}><option value="">{t('Any', 'Όλα')}</option><option value="true">{t('Yes', 'Ναι')}</option><option value="false">{t('No', 'Όχι')}</option></select></Field>)}{[['dueFrom', t('Due from', 'Προθεσμία από')], ['dueTo', t('Due to', 'Προθεσμία έως')]].map(([key, label]) => <Field key={key} label={label!}><input type="date" value={query.get(key!) ?? ''} onChange={event => set(key!, event.target.value)}/></Field>)}
  {(['before', 'after'] as const).map(key => <Field key={key} label={key === 'before' ? t('Must be done before', 'Να γίνει πριν') : t('Requires first', 'Απαιτείται πρώτα')}><select value={query.get(key) ?? ''} onChange={event => set(key, event.target.value)}><option value="">{t('Any record', 'Οποιαδήποτε καταγραφή')}</option>{allRecords.map(record => <option key={record.id} value={record.id}>{record.humanId} · {record.title}</option>)}</select></Field>)}
  </div></details><div className="actions"><button className="primary">{t('Apply', 'Εφαρμογή')}</button><button type="button" onClick={() => { setQuery(new URLSearchParams()); setApplied(''); history.replaceState(null, '', location.pathname); }}>{t('Clear filters', 'Καθαρισμός φίλτρων')}</button></div></form><div className="filter-chips">{[...new URLSearchParams(applied)].filter(([key]) => filterLabels[key]).map(([key, value]) => <button key={key} type="button" aria-label={`${t('Remove filter', 'Αφαίρεση φίλτρου')}: ${filterLabels[key]}`} onClick={() => { const next = new URLSearchParams(applied); next.delete(key); const search = next.size ? `?${next}` : ''; setQuery(next); setApplied(search); history.replaceState(null, '', location.pathname + search); }}>{filterLabels[key]}: {filterValue(key, value)} ×</button>)}</div><ErrorNotice error={error}/>
  {data && <><p className="totals">{data.totals.count} {t('records', 'καταγραφές')} · {t('Estimated extras (owner only)', 'Εκτιμώμενα πρόσθετα (μόνο ιδιοκτήτης)')}: {new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(data.totals.estimatedCost)}</p><div className="record-list">{data.records.map(record => <article className="record-card" key={record.id}><a href={`/projects/${projectId}/records/${record.id}?from=${encodeURIComponent(applied)}`}><strong>{record.humanId}</strong><h2>{record.title || t('Untitled draft', 'Πρόχειρο χωρίς τίτλο')}</h2></a><div className="record-facts"><span>{labelOf('subtype', record.subtype, lang)}</span><span className="badge">{labelOf('status', record.status, lang)}</span><span>{t('Next action by', 'Επόμενη ενέργεια από')}: {name((lists.people ?? []).find(item => item.id === record.ballInCourtId) ?? {}) || '—'}</span><span>{t('Due', 'Προθεσμία')}: {record.dueDate ?? '—'}</span><span>{t('Priority', 'Προτεραιότητα')}: {record.priority ? labelOf('priority', record.priority, lang) : '—'}</span><span>{t('Severity', 'Σοβαρότητα')}: {record.severity ? labelOf('severity', record.severity, lang) : '—'}</span>{record.completion !== null && <label>{t('Completion', 'Ολοκλήρωση')} <progress max={100} value={record.completion}/> {record.completion}%</label>}{record.safety && <span className="safety">{t('Safety implications', 'Θέμα ασφαλείας')}</span>}</div></article>)}</div>{data.records.length === 0 && <p>{t('No matching records.', 'Δεν βρέθηκαν καταγραφές.')}</p>}</>}{!data && !error && <p role="status">{t('Loading…', 'Φόρτωση…')}</p>}</>;
}
``````

- [ ] **Run the full integrated verification.**

```powershell
npm run web:build
npm run typecheck
npm test
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:browser
```

Use the installed Chrome option shown, or install Playwright Chromium and omit the environment assignment. Check actual test counts and failures. Browser tests must use this just-built bundle. Inspect phone and desktop screenshots, keyboard focus, long Greek labels, filter state and private-field absence. Do not pass a test by weakening an access assertion or replacing real transport with mocks. Deliberately injected fault cases remain separate from real successful workflows.

- [ ] **Commit the task.** Stage only the task files. For Task 6, also stage the maintained-document and lifecycle edits named above.

```powershell
git add 'tests/browser/app.spec.ts' 'tests/browser/fixture.ts' 'tests/browser/home.spec.ts' 'tests/browser/lists.spec.ts' 'tests/browser/media-app.spec.ts' 'tests/browser/media.spec.ts' 'tests/browser/record.spec.ts' 'tests/browser/review-capture.spec.ts' 'tests/browser/review-log.spec.ts' 'tests/browser/review-sharing.spec.ts' 'tests/browser/server.ts' 'src/web/App.tsx' 'src/web/main.tsx' 'src/web/index.html' 'src/web/styles.css' 'src/web/home/Capture.tsx' 'src/web/home/RecordList.tsx'
git commit -m "feat: integrate browser workflows and regression coverage"
```

## Task 6: Local operating guide and closeout

**Depends on:** Task 5.

Document local build/dev/browser-test commands and update delivery metadata from actual implementation evidence. The published planning replay is not an implementation result.

- [ ] **Write the complete tests and fixtures below.**

This documentation task adds no test files.

- [ ] **Check the pre-implementation result.** Documentation-only task; no artificial failing test is required.

- [ ] **Write the complete implementation below.**

#### File: `docs/guides/web-interface.md`

<!-- replay task=6 phase=implementation encoding=text sha256=0ebd9d551a4056c7416f7a29ebc57ce5ccbaa00ff5ce400bcb4c5f270fff2db2 -->

``````markdown
# Web interface — local operation and browser checks

> **Document type:** Operator guide
> **Status:** Active when Plan 5 is implemented
> **Governing contracts:** [v1 design](../designs/2026-10-02-v1-records-design.md) and [access/evidence guide](share-key-management.md)

## Run the compiled interface locally

Use Node 22.13 or newer. Install locked packages with `npm ci --ignore-scripts`, then run `npm rebuild esbuild`. Configure the existing `.env` as described in the access guide. Use a local data directory, an owner account, a project, a private share key and explicitly chosen storage budget/reserve. Do not copy test credentials or fixture settings into a live environment.

From the repository root:

```sh
npm run web:build
npm start
```

Open the exact `PUBLIC_BASE_URL` configured for that process. With the example port and origin this is `http://localhost:3000`. Fastify serves the hashed assets and application pages from `dist/web`. Restart after rebuilding because the HTML shell is loaded at startup. Start from the repository root so that the build directory resolves correctly. The data directory is never exposed through static routes.

## Develop the browser interface

For the Vite development workflow, set `PUBLIC_BASE_URL=http://127.0.0.1:5173` and `PORT=3000` in the local backend environment. Start `npm run dev` in one terminal. Start `npm run web:dev` in another. Browse `http://127.0.0.1:5173`; Vite proxies `/api` to the backend. The public origin must match the browser address or writes are correctly rejected. Keep production Origin checks enabled.

Use the compiled-app workflow for CSP verification. The Vite development server and media test harness are local development tools, not deployment servers. Deployment and hosting limits remain Plan 6 work.

## Verify the interface

```sh
npm run web:build
npm run typecheck
npm test
npx playwright install chromium
npm run test:browser
```

An installed Chrome can be used instead of downloading Chromium. In PowerShell set `$env:PLAYWRIGHT_CHANNEL='chrome'` before `npm run test:browser`; remove it with `Remove-Item Env:PLAYWRIGHT_CHANNEL` to return to bundled Chromium.

The browser suite needs free loopback ports 3490 and 5174. It starts its own isolated application with a temporary database/files and synthetic users, plus a narrow media harness. It refuses to reuse existing servers. It never loads the local `.env` or accesses the production application. `test-results` and `playwright-report` are ignored. Failed traces may contain synthetic fixture tokens and should still be treated as test artifacts.

The suite covers phone capture, desktop edits, both languages, filters, all subtypes, decisions/status/verification, measurements, managed lists, independent contributor grants, read-only sharing, file errors and safe viewers. HEIC and oriented-JPEG fixtures establish actual conversion behavior in the tested browser. Browser codec support and physical-device memory still vary. If a preview cannot be prepared or decoded, use the original download; accepted originals can also be uploaded as attachments.

## Using the screens

Choose an existing project, then open Records. Filters are explicit and removable. Open a record to see its summary and sections. Public and Private Notes can be edited only by the owner. Sharing selects existing CLI-provisioned contributors and grants Upload and Add Log independently. A grant with neither write permission still allows reading.

New record saves a Draft before uploading optional photos. Each file is separate. Keep the saved record if a later upload fails. For an uncertain request, refresh its evidence before trying again; the server may already have completed the earlier request. There is no automatic write retry or offline queue.

An uncertain record or Log creation, or a Log attachment upload, keeps its input but blocks another submission until saved results have been reloaded and shown. Check those results before deciding to create or upload again. A failed reload does not enable retry.

Editing only a Log entry's text or privacy keeps its exact event timestamp. When changing its time deliberately, check the displayed UTC offset. During a repeated daylight-saving hour, the offset distinguishes the two possible instants.

Share recipients open the full `/share#token` URL. The fragment is used locally for bearer requests. Removing it makes the link unusable. Shared pages start in Greek and can switch to English. Typed record text is never translated. Public views never receive Private Notes, commercial fields or private Log evidence.

## Release boundary

This guide does not authorize production deployment. Plan 6 owns A3/PDF printing, hosting/proxy/capacity and memory checks, backup/restore procedures and drill, deployment and the maintained v1 specification. Retain the existing access/evidence guide for key, account, storage and restore rules.
``````

- [ ] **Reconcile maintained documentation.** Update README with the browser guide link, actual delivery status and commands. Update Architecture to describe the delivered React/Vite entrypoint, Fastify static assets, local workers and three access paths. In the access/evidence guide, change future-tense Plan 5 statements to delivered behavior; preserve all security, quota and restore rules. No maintained specification currently exists to update. The approved v1 design remains active until Plan 6 consolidates the release specification and closes the design.

- [ ] **Record actual implementation evidence.** Update this plan and roadmap with implementation commits, test counts/date and merge state. Preserve the separate planning-replay record. Mark Completed only after required checks and documentation reconciliation are done. Do not mark production deployment complete.

- [ ] **Review and commit closeout.** Run `git diff --check`. Inspect the final changed-file list and links. Review implementation against this plan and the approved design. Resolve substantive findings before integration. Build/unit/API/browser checks from Task 5 remain valid unless code changes; rerun affected checks after fixes.

- [ ] **Commit the task.** Stage only the task files. For Task 6, also stage the maintained-document and lifecycle edits named above.

```powershell
git add 'docs/guides/web-interface.md'
git commit -m "docs: document browser operation and Plan 5 delivery"
```

## Planning replay and review evidence

**Current revised planning replay, 2026-10-04: 464 unit/API tests across 64 files and 39 browser tests across 9 spec files passed. Build and typecheck passed. This is not an implementation completion claim.**

### Revision after the four-point review of `0cb7470`

All four findings were verified and corrected in the existing tasks, without changing the backend or adding scope:

- Log text-only and privacy-only edits preserve the original event timestamp, including seconds/milliseconds and the second occurrence of a daylight-saving repeated hour. Deliberate event-time changes use an explicit UTC offset. Tests cover ordinary and repeated-hour timestamps and distinguish both offsets in Australia/Melbourne.
- Quick capture, new Log entries and Log attachments retain input and block another submission after an unknown outcome. An explicit successful reload must show saved results before retry becomes available; a failed reload keeps it blocked. The regressions let the real backend commit, then suppress the response, and verify that only one record/entry/attachment exists. An additional committed-upload case truncates a successful JSON response. Both fetch and XHR treat unreadable successful responses as unknown, rather than successful empty results. Existing Evidence uploads reuse the same outcome classifier.
- Owners can create links for Draft records and copy non-null stored URLs for revoked/expired links. Browser tests verify recipient denial remains intact, exact copied URLs match, and an actual old-key `url:null` response offers no copy control.
- Measurement tables preserve JavaScript's available numeric precision through shortest round-trip formatting, with a Greek decimal comma. Tests cover more than eight decimal places, nonzero differences, scientific notation and extreme finite values. Calculations and storage are unchanged.

The timestamp drift, enabled retry after a committed-but-lost response, Draft/inactive controls and rounded numeric display were reproduced before fixing them. A bounded independent review then checked the corrections and identified the XHR truncated-response gap; it was corrected and regression-tested before publication.

The amended Markdown's **84 complete payloads** were extracted into a new checkout of `0cb7470`, with dependencies installed independently. That checkout has the same Plan 4 runtime baseline as `e27a535`. The complete unit/API and browser suites ran against these extracted files and the newly built production bundle. No source files or node_modules were copied from the authoring checkout. The browser suite finished with **39/39 passing**, including the eight new review regressions. All payload hashes were checked against the replayed files. Execution remains unstarted on main.

### Original authoring replay retained for provenance

**Original planning replay, 2026-10-04, before the four-point review.** The counts below describe the initially published plan, not the revised final totals above.

The complete Markdown payloads were extracted, with all SHA-256 checks passing, into a second detached checkout of `e27a535`. No source files or node_modules were copied from the authoring checkout. New dependencies were installed against the baseline lockfile using the plan's commands. The checked-in extraction helper was the one used for this replay.

| Check | Observed result |
|---|---|
| Task 1 before implementation | Two suites failed because the new core/static modules were missing |
| Task 1 after implementation | 5 tests passed; typecheck passed |
| Task 2 before/after | Missing list module, then 4 tests passed; typecheck passed |
| Task 3 before/after | Missing media modules, then 8 tests passed; typecheck passed |
| Task 4 before/after | Two missing-module suites failed; the existing core-error tests already passed; then all 12 tests passed and typecheck passed |
| Task 5 before implementation | Build failed because `src/web/index.html` did not exist |
| Final build and typecheck | Both passed |
| Complete unit/API suite | **452 tests passed across 61 files** |
| Complete browser suite | **31 tests passed across 6 spec files** against the replayed build |
| Visual follow-up | Desktop/phone screenshots inspected; fixed language-selector contrast and phone summary density; rebuilt and reran all 3 app browser cases successfully |
| Production dependency audit | `npm audit --omit=dev`: **0 vulnerabilities reported** |
| Lockfile comparison | No existing resolved package version changed at a retained baseline package path; new direct dependencies are exact pins |

Environment: Windows, Node **24.12.0**, npm **11.6.2**, Playwright **1.63.0**, installed Chrome **154.0.8037.58**, desktop 1280×720 and phone viewport 390×844. The phone check is browser viewport emulation, not a claim of testing physical iOS/Android hardware, Safari or Firefox.

The browser run covered capture with a failed later photo, query/filter recovery, Greek changes during edits, all record subtypes, decision rules, reasons and verification, measurement precision and duplicates, all managed lists, inline tags, independent contributor permissions, Log privacy, link copying/revocation, share-fragment replacement, transient refresh recovery, real HEIC/photo/CAD uploads, metadata edits/deletes, safe email/PDF/SVG viewers, codec fallback and access-denial clearing. Deliberate failure responses and narrow media harnesses are identified in the tests; they supplement the real-application flows. They do not prove production network/proxy behavior.

Independent read-only review found five issues before publication: transient refreshes discarded pending evidence; evidence cancellation lacked a dirty check; native photo failures did not recheck access; inline tag creation was absent; and Log-linked attachment labels omitted the event date. The final snapshots correct all five. Corresponding browser cases cover the behavioral fixes. Additional authoring checks caught malformed-filter rendering, empty JSON DELETE requests, share-token changes within one document, and the need to refresh before retrying an uncertain upload.

The initial PDF/static pins were replaced before the final replay. Task 1 now pins **pdfjs-dist 6.3.289** and **@fastify/static 10.1.5**, following the upstream [PDF.js advisory](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j) and [static-route advisory](https://github.com/fastify/fastify-static/security/advisories/GHSA-83w8-p2f5-377r). The minimum Node version becomes 22.13 to satisfy the PDF package. The complete audit still reports four moderate findings in the baseline development/import dependency chains (`vitest`/`@vitest/mocker` and `exceljs`/`uuid`); this plan does not silently upgrade that existing tooling.

Vite reports a large-chunk warning. The main bundle is approximately 886 kB before gzip, with separately loaded PDF, HEIC and email workers. That warning is recorded rather than hidden. The replay proves the tested integrations and synthetic fixtures, not every possible codec, malformed document or 100 MB message on a phone. Original-download fallback remains part of the delivered behavior. Physical-device capacity and production hosting/proxy/memory/durability checks remain release work in Plan 6, together with printing, backup/restore and documentation closeout.

The six execution tasks remain unchecked. Main still contains the Plan 4 runtime; this commit publishes the plan, helper and supporting documentation only.

## References checked during authoring

- [Vite guide](https://vite.dev/guide/) — build/server and supported Node versions.
- [Playwright web servers](https://playwright.dev/docs/test-webserver) and [fixtures](https://playwright.dev/docs/test-fixtures) — isolated local application tests.
- [PDF.js examples](https://mozilla.github.io/pdf.js/examples/) and [API](https://mozilla.github.io/pdf.js/api/) — data-fed page rendering and worker lifecycle.
- Installed package source and types at the exact versions in Task 1 were used for HEIC, EXIF, EML/MSG and worker integration. The real-browser tests provide the compatibility evidence for those integrations.
