# Web interface — local operation and browser checks

> **Document type:** Operator guide
> **Status:** Current for deployed release `a3ff3e1` (2026-10-04). Project administration, managed lists, the location tree and record location photos/notes passed local and hosted verification.
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

## Location photos and notes

Open a saved record, including a Draft. In Overview, Location photos accepts multiple photos, sketches or drawing snapshots. It also appears in Edit record, beside Location Notes. It works without selecting anything in the location tree. These images belong only to this record and remain separate from the Before/During/After evidence gallery.

Choose files and Upload location photos. Photos save immediately; Save record saves Location Notes and other edited text. Uploading or editing a caption preserves your unsaved record fields. Pending file selections must be uploaded or cleared before saving the record. Open a thumbnail to enlarge it or download the original. The owner can change captions and remove images. Contributors with Upload permission can add images, but cannot change Location Notes or existing photos.

Readers see the location notes and photos, and the printed sheet includes them. Location photos use the existing photo formats, conversion, 100 MB request limit, storage allowance and original-file retention rules. A failed or uncertain upload retains the pending selection; refresh successfully before retrying an uncertain result.

## Projects and managed lists

In Projects, choose New project or Edit. Give each project a name and a unique code. Choose Delete project to review its record/photo/attachment counts. Deletion requires typing the project's current name. It removes the project's records and lists, including shared access. It does not remove user accounts, other projects, retained files or backups.

Managed Lists has a search field and compact rows. Edit, Retire/Reactivate and Delete are directly visible where applicable. Retirement and deletion still require confirmation. Choose a name or Edit to open its fields beside the list. On a phone, use the List selector to switch lists and Back to list to leave an editor without losing the search. Unsaved changes require confirmation before leaving.

Locations has expandable branches. Search reveals matching locations and their parents. Select a location to see its full path and controls for editing, adding a child, copying, retiring or deleting the branch. Expand all and Collapse all control the hierarchy when no search is active.

## Print and Administration

Use Print / Save PDF from the record screen. Choose A3 landscape and disable browser headers/footers. Include QR link is off by default; enable it only when you want a selected active share link on the sheet. Drafts print without QR. Use the page’s Print / Save PDF button for each print; it refreshes the sheet and validates any QR link. Direct browser printing shows an instruction instead of an unrefreshed record.

Administration is available only to the owner and always shows server-backup/storage status. Working pages display only warnings, with a link to Administration. The default low-file-allowance warning is 5 GB; the default overdue-backup age is 36 hours. The website does not certify the separate PC copy.

## Release boundary

Production activation follows the deployment guide. The [release checklist](release-checklist.md) records completed hosting, backup and recovery checks and the remaining acceptance limitations. Deployment of this UI update does not close the deferred phone JPG investigation or unavailable current-day upstream-log verification. Retain the existing access/evidence guide for key, account, storage and restore rules.

Evidence previews use a consistent dialog width. Close and Download original remain above the independently scrolling preview. Media fills the available width, and email metadata wraps on narrow screens.

## Work packages and record editing

The 2026-10-07 implementation adds Work packages immediately after Records in owner project navigation. Its deployment is tracked separately in the release checklist. Create a package with a name; status defaults to Planned. Add its optional description, responsible person and target date. These values describe the package and do not populate member records.

Choose a package in a record's Work section, or use New record on the package page. A record can have one package or none. Use the Records filter to see all records, ungrouped records or one package. Completed/cancelled packages remain selectable. The owner can change package status without changing records. Completing or cancelling with outstanding records shows a confirmation. To delete a package, first move or ungroup its records; an empty package requires its exact name.

Record reading has Overview, Photos & files, Measurements and Log. Sharing and Activity history open from header actions. On a phone, use More for secondary actions. Printing remains in Sharing, including printing without a QR code. Open Verification history for every check and note. Open Sequence and dates for both outgoing work order and incoming prerequisites.

Edit record groups Work, Decision/instruction where applicable, People and timing, Location, Trades/tags, References/notes and Private fields. Save/Cancel remains at the bottom. Open Measurements or Open Log without saving the record first. Entries save separately; cancelling the record draft does not undo those entries. Location photo uploads also save independently. The plus beside Location photos opens file selection. Choose multiple files, add a caption and upload; failures retain the remaining selection.

Definitions are available from the small dotted info icon by hover, focus or click/tap. Escape or an outside interaction closes them. Trades/tags use searchable selectors with removable chips. Click outside the selector or press Escape to close it. Package selection uses the same control with one choice. Creating a package there saves it immediately; cancelling the record afterwards leaves that package in the project.

Delete record is owner-only and permanent. Type its human ID after checking the warning. If it has an incoming or outgoing sequence link, remove that relationship first. The operation removes its evidence entries, Log, measurements, history and access links, while retained file bytes and record counters remain. Use Cancelled when the history should stay available.
