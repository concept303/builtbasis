# Web interface — local operation and browser checks

> **Document type:** Operator guide
> **Status:** Active for the implemented Plan 5 browser; not merged or deployed.
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
