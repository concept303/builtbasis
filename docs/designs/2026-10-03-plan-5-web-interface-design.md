# Plan 5 — Web interface presentation and implementation brief

> **Document type:** Design document (presentation supplement)
> **Status:** Draft for review
> **Retention:** Planning input for Plan 5. The approved v1 design governs product behavior.
> **Governing design:** [BuiltBasis v1](2026-10-02-v1-records-design.md), particularly §3, §5–10, §13 and §16.
> **Implementation baseline:** `71c9a33` on main; Plans 0–4 complete. Plan 4 verification passed 423 tests across 53 files.
> **Scope:** Browser presentation, interaction, and integration with the existing API. This is not the full-code implementation plan or evidence of an implemented UI.

## Purpose and review boundary

The owner needs to use the existing construction-control backend on a desktop and on site with a phone. Named contributors need to read their assigned records and perform only their granted Upload and Add Log actions. Share-link recipients need a readable, private-safe record without signing in. Every interface label and definition has English and Greek versions. User-entered text is never translated.

The approved scope, backend access policy, 145-format catalog and 100 MB complete-request limit remain unchanged. The new decision for review is presentation. The recommended layout is a compact record summary with section tabs on desktop and a section selector on phones. The accompanying [wireframes](2026-10-03-plan-5-wireframes.html) show the record list and a record page at both sizes. All displayed records are synthetic. Styling is provisional; this is a layout review, not a production preview.

Alternative: a single page with collapsible sections reduces section switching but produces a long page for records with many measurements, photos and Log entries. The tabbed layout keeps one task visible at a time. A split list/detail workspace is deferred because it would add a second navigation model without a v1 requirement.

## Navigation and screens

The owner signs in, chooses an existing project and lands on its record list. The project name is always visible. Returning from a record restores the list's filters and sorting. Record URLs may contain internal IDs for routing, but the interface displays only human IDs. A contributor lands on Assigned records, without a project directory or owner-managed lists. Share links use the existing `/share#token` contract.

The record list has a search field, New record action, filter controls, result count and owner-only estimated-cost total. Desktop rows show ID/title, subtype, status, next actor, due date, priority, severity, completion and safety. Phone cards carry the same information with secondary fields wrapping below the title. Filters cover the complete approved list; common controls stay visible and the rest open in an accessible panel. Every active filter has a visible label and can be removed. No hidden initial filter excludes records.

The record header shows human ID, title, subtype, status, next actor, due date, priority, severity, completion and safety. Owner actions include Change status and access to sharing. The sections are Overview, Classification, Decision, Measurements, Photos, Attachments, Verification, Log, Activity and Sharing. Decision is absent for Tasks. Owner-only Sharing contains links and contributor grants; printing is assigned to Plan 6. Readers have no empty owner-only tabs.

Overview groups description/question, responsibility, location, trades, tags, reference and precedence relationships. Public Notes has a distinct label. Private Notes and commercial fields sit in a clearly marked owner-only group. Both Notes fields remain owner-edited. Classification contains only the current subtype's fields. Decision retains rejected options alongside the selected option and exact instruction text.

The Overview editor also includes title, due date, priority, severity, completion and the safety flag displayed in the summary. The wireframes illustrate grouping and density, not every input in its expanded state. Form controls retain the exact approved vocabulary; prototypes do not introduce new status, severity or priority values.

Lists management offers People, Trades, Tags, Locations and Zone types. All existing operations remain available: activation/retirement, tag collision/merge and usage-confirmed deletion, location moves and branch copying. Location controls are a searchable expandable tree with independent checkboxes. Selecting a parent means that place as a whole; it does not silently select every child. Existing inactive references remain readable and can be retained during unrelated edits.

## Editing and saves

Use explicit Save and Cancel actions for record edits. Keep typed values on validation/network failure. Render field errors next to their controls and an error summary that can move focus to the first affected field. Do not discard a dirty form on a language switch. Warn before navigating away from unsaved changes; do not introduce local persistence of record contents or an offline queue.

Client validation reuses pure domain schemas and rules. The server remains authoritative. Browser code must not import server runtime modules merely to obtain a type or list schema; any necessary shared contract extraction belongs in the plan with backend regression checks.

Status changes are explicit actions using the existing transition endpoint. If edits are unsaved, offer Save first or return to editing. Do not imply that a field save and a later transition are one atomic request. A rejected transition leaves the saved record visible with the server's reason. Ask only for the applicable status reason, reopening/superseding note, or verification fields. The transition fixes verification outcome; users do not select it independently.

Quick capture collects subtype, optional title/location and optional photos, then creates a Draft. After creation, upload selected photo bundles individually. If an upload fails, retain the created record and show which files succeeded and which failed. Do not automatically repeat a record creation, Log creation or file POST after an uncertain response; the API has no idempotency key. A user-directed retry follows a visible refresh of the saved evidence so the user can see whether the earlier attempt completed.

Each measurement set is edited and saved as a set with its rows. Provide existing-record suggestions for item and quantity labels. Display comparisons from the shared domain functions, preserving precision in calculations. Bars supplement an accessible values/differences table; negative values need a visible zero baseline. Before/after comparisons respect measurement date and creation order rather than grouping away intermediate measurements.

Log entry creation and its attachment uploads are separate API operations. Once an entry is saved, failed attachments are reported on that entry and can be retried individually. Upload-only contributors may add attachments to an existing public Log entry without editing its text. Add-Log-only contributors can create public text entries without upload controls. Log event time is shown; logged-at and last-edited timestamps remain hidden as required by the design.

## Language, definitions and accessibility

Use the existing fixed-value vocabulary for labels and definitions. Add an explicit bilingual catalog for UI labels, help, actions, empty/loading states and mapped errors. Do not display raw server English validation messages as the Greek UI. Unknown error codes get a localized generic message without leaking raw responses.

Managed names fall back to the nonempty language. User-entered content retains its original wording. Remember the owner's language preference. Fresh share pages start in Greek and allow switching language. Dates without a time remain calendar dates and must not shift through UTC conversion. Date-time inputs identify the displayed time zone and send explicit-offset timestamps; uncertain EXIF dates remain empty until the owner supplies them.

Definitions are available through a labeled help button or disclosure usable by touch and keyboard, not hover alone. Labels remain visible above controls. Dialogs manage focus and Escape, status changes have text as well as color, and all file actions have accessible names. Verify phone widths, keyboard operation and Greek labels with long text and mixed-language content.

## Uploads and viewers

The browser reuses `ACCEPTED_ATTACHMENT_EXTENSIONS` and server capability descriptors. Upload controls distinguish attachments from photo bundles. A photo bundle preserves original bytes and prepares JPEG display/thumbnail copies within the existing server limits. Photo selection, decoding/orientation, resizing, EXIF extraction and cancellation are tested in actual browsers. HEIC conversion must be proven with pinned browser code and genuine fixtures before the full-code plan claims support; unsupported image decoding must never fabricate a successful photo bundle. A download-only attachment remains an available way to retain accepted original bytes.

Show upload preparation, progress, completion and failure per file. Preparation/upload cancellation must release worker and object-URL resources. Explain that the 100 MB ceiling covers the full request including metadata and image copies. Honor server 413 and 507 responses without repeated automatic retries or an invented per-user quota.

Owner/contributor native viewers use authorized same-origin server routes. Shared viewers fetch with the bearer token and use bytes without exposing the token in a URL, DOM attribute or logging. Shared SVG is decoded only as an image and rasterized before presentation. Never open original-upload Blob URLs in a tab, frame or document. Downloads use forced-download controls and safe filenames; unsupported codecs retain a clear original-download fallback.

PDF viewing uses a locally bundled data-fed renderer with scripting and automatic external actions disabled. Test the chosen implementation with authenticated and shared PDFs; no external CDN is used. EML/MSG parsing runs in a cancellable Worker, with escaped headers/text and local embedded attachment downloads. Email HTML is never inserted into the DOM, and remote images, fonts or tracking resources are never fetched. Closing a viewer terminates its pending work and releases byte/object-URL resources. The existing synthetic email-parser probe establishes feasibility only; browser integration needs its own tests.

## Access and browser security

Keep shared and authenticated data loading separate. Shared and contributor rendering consumes only the server's public projection. Do not fetch an owner record and hide its private fields to build a shared view. A revoked/expired/Draft share gets one neutral unavailable page; a contributor losing access gets an access-unavailable state. Clear previously rendered content and pending resources when access fails, a record changes, or a session ends.

The share token stays in memory for requests, never local/session storage or logs. Retaining the original fragment supports reload of the link; section navigation must not overwrite it. Language or section changes reuse the already loaded shared record rather than artificially incrementing its view counter through redundant record requests. There are no third-party scripts, analytics or automatic prefetches of share records.

Cookie-authenticated writes use the same public origin as the API so the browser supplies the matching Origin. Keep development API access same-origin through the development setup rather than weakening server checks. The production browser build is served by Fastify from an explicit application-assets directory. SPA navigation must not turn unknown `/api` routes or missing assets into HTML, and no data-directory path is statically exposed. Production proxy configuration and deployment remain Plan 6 work.

## Existing API integration map

| Screen / action | Existing interface |
|---|---|
| Login, account state, logout | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` |
| Owner project choice | `/api/projects`, `/api/projects/:projectId` |
| Owner record list and totals | `/api/projects/:projectId/records`, with validated filter/sort query parameters |
| Capture, detail, ordinary save | Record POST, GET and PATCH routes |
| Change status and verification history | Record `/transitions` and `/verifications` |
| Decisions | Record `/options`, with decision fields saved through record PATCH |
| Measurements | Record `/measurement-sets`; comparisons remain pure domain functions |
| Log and Activity | Record `/log` and `/activity` |
| Owner evidence | Record `/photos`, `/attachments`, occurrence file/view/preview routes |
| Share management and public record | Record `/share-links`; `/api/shared/record` and shared occurrence routes |
| Account selection and grants | `/api/contributors`; record `/grants` |
| Contributor home and record | `/api/assigned-records`, `/api/assigned-records/:id` |
| Contributor additions and viewers | Assigned-record `/log`, `/photos`, `/attachments` and occurrence routes |
| Managed lists | Project `/people`, `/trades`, `/tags`, `/locations`, `/zone-types` |

Account creation, password reset and account enable/disable remain CLI operations. This UI does not introduce account administration endpoints. Precedence references on reader pages show only human ID/title, without navigation to an ungranted record.

## Full-code plan preparation and verification

After presentation review, author the complete proposed implementation and tests in an isolated scratch checkout of the actual main baseline. Confirm exact dependencies, PDF integration, image/HEIC handling and email Worker bundling there. The full-code plan must contain the final code for every changed file and reproducible dependency installation steps. Prefer tasks that add the final implementation once rather than repeatedly replacing earlier narrower versions.

The anticipated task order is browser build/serving, API/session/language foundation, common forms and selection controls, owner list/capture, record detail and status, decisions/measurements, evidence preparation/upload, protected viewers/email Worker, Log/activity, managed lists, grants/contributor screens, shared pages, and integrated browser verification/closeout. These are planning work packages, not an approved replacement roadmap or a claimed test count.

Use Vitest for pure browser helpers and language coverage. Use Playwright against the real Fastify application and temporary seeded SQLite/files for phone capture, desktop editing, all three subtypes, field/status validation, measurements, list filters, permissions, privacy, sharing, upload failures and viewer behavior. Include hostile email/SVG/PDF fixtures, blocked external-resource attempts, revocation during reads/uploads, object-URL/Worker cleanup, language changes during editing and deep-link reloads. Preserve the existing server tests. All evidence is synthetic or an explicitly licensed non-project fixture.

Replay the published Markdown in a separate clean checkout, rather than testing only the authoring tree. Run dependency installation, build, TypeScript, complete unit/API suites and browser tests from the plan's commands. Record actual counts, failures, fixes and environment limits. Review the resulting code before Plan 5 execution. Production memory, Cloudflare behavior, backup/restore and A3/PDF print layout stay in Plan 6.
