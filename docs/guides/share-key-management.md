# Share-link key management and API handoff

> **Document type:** Operational guide
> **Status:** Active for the implemented Plan 4 backend and Plan 5 browser. Plan 4 is merged to `main` at `01a4477`; Plan 5 is not merged. Not deployed.
> **Authority:** The approved v1 design defines scope. This guide documents the implemented key/account procedures and API contract, with deployment and release closeout assigned to Plan 6. See the [web interface guide](web-interface.md) for browser operation.
> **Verified:** 2026-10-03 — implementation suite passed 423 tests across 53 files; TypeScript passed. Implementation range: `a442939..55da13a`.

The application stores encrypted copies of share tokens so the owner can resend a link. The dedicated encryption key belongs in private server configuration. Losing or replacing it requires revoking existing links and issuing replacements.

## First setup

Set `BUILTBASIS_DATA_DIR` to the intended data directory and `PUBLIC_BASE_URL` to the application origin. Supply `SHARE_LINK_KEY` through private server configuration. It must encode exactly 32 random bytes as 64 hexadecimal characters. Use a cryptographically secure secret generator. There is no default key and no working key in `.env.example`.

Keep this key outside the repository, data directory and backups. Do not pass it as a command-line argument, print it to application logs, or include it in support material. Preserve it when replacing the application folder during deployment.

The HTTP app refuses a missing or malformed key before registering routes. A first empty database stores only a SHA-256 fingerprint. Normal startup with the same key does not revoke links or write new fingerprint state. Each link's encrypted token is bound to its record through authenticated encryption.

## Lost or replaced key

1. Stop the application so no public request can race administrative maintenance.
2. Set the intended data-directory configuration. An absent share key is permitted for this offline command. Remove a malformed key setting rather than substituting a guessed value.
3. From the application directory, run `npm run shares:revoke-all`.
4. Check that it exits successfully. Its output contains only `share_links_revoked_administratively` and the revoked-link count. Repeating it reports zero once every link is revoked.
5. Install a newly generated key in private configuration and restart the application.
6. Create replacement links through owner link management. Previously sent links remain unavailable.

The command opens and migrates the configured database through the existing bootstrap, revokes every unrevoked link, and closes the database. It never builds the HTTP app and does not require the lost key. Command failures return a nonzero exit code and the controlled event `share_links_revocation_failed`.

Startup also revokes all unrevoked links when the key fingerprint changes. Missing fingerprint state with existing links is treated as a change. Revocation and fingerprint replacement form one SQLite transaction. A failure rolls both back and prevents startup.

Old link rows are retained. The owner sees `url:null` when a row was encrypted with an unavailable old key. A corrupt copy under the matching current key fails with `share_copy_failed`; it never yields a fabricated URL. Owner-requested revocation is idempotent and appends one activity entry. Administrative revocation emits only a safe aggregate event and does not fabricate an owner actor. This aggregate maintenance event does not invent a record author.

## Restore requirements for Plan 6

Keep the application stopped throughout a restore. Restore the database and complete immutable file bytes together. Delete all sessions and revoke every share link before reopening access, even if the encryption key is unchanged. Restored links must never become usable merely because a backup predates their revocation. Disable every non-owner account and delete all record grants before reopening access. A backup can restore previously disabled users, revoked grants and old passwords. The owner must reset each retained contributor password before enabling that account, then deliberately regrant record access. Enabling alone is insufficient.

Backup enumeration must cover every hash in `blobs`, or at minimum all three photo references and all attachment references. Stored blobs are never deleted in v1, including completed unreferenced blobs left by a failed occurrence transaction. Exclude unpublished `.tmp` files and private configuration from backups. The key is preserved separately from backups.

Reverse-proxy and Cloudflare rules must preserve `no-store` and avoid logging Authorization or request bodies. The application uses registered route patterns and controlled errors in its logs, but upstream logging policy remains deployment work. Validate the full 100,000,000-byte multipart request-body path, including overhead, streaming memory use and Linux file/directory sync behaviour on hosting. Windows tests do not establish Linux crash durability. The recovery drill and production rollout remain Plan 6 work.

## Storage budget and free-space reserve

Before starting the HTTP app, set `FILES_STORAGE_BUDGET_BYTES` and `FILES_FREE_RESERVE_BYTES` to explicit positive safe-integer byte counts. There are no production defaults. Offline account, seed and share-revocation commands may omit them. Choose the managed-file budget below the actual hosting-account allowance, leaving room for SQLite, backups and other account usage. The reserve is minimum filesystem space to keep available. A `statfs` probe does not report the shared-hosting account quota.

One HTTP process owns the upload directory in v1. Do not run multiple workers or write managed files externally while it runs. Startup inventories actual files, including unreferenced blobs and stale temporary files. New uploads reserve their declared complete request length, or the full 100,000,000 bytes when length is unknown, before staging. Concurrent reservations count together. Budget checks may conservatively reject a retry that would ultimately deduplicate; they do not promise capacity based on an unverified hash.

Capacity refusal returns `507 storage_capacity`. Reads and login remain available when the budget is exhausted. Uncertain temporary-file cleanup blocks further uploads until an operator investigates and restarts; startup then recounts actual bytes. Published blobs are never deleted, including those whose occurrence transaction failed. There is no per-user quota or automatic garbage collection.

Plan 6 verifies the real account allowance, selects both settings, monitors usage and documents the capacity response. When full, raise the budget only after increasing or verifying available hosting capacity, or move storage through a separately planned operation. Do not delete retained evidence or files needed by historical backups. Filesystem checks are point-in-time observations; external disk use can still cause writes to fail. Keep the existing failure cleanup and safe diagnostics.

## Named accounts and record grants

These commands are available. Run them against the intended `BUILTBASIS_DATA_DIR`. Account administration does not require a share-link encryption key.

```sh
npm run owner -- owner "Project owner"
npm run user -- create contractor "Contractor name"
npm run user -- reset contractor
npm run user -- disable contractor
npm run user -- enable contractor
```

Create and reset prompt for a password twice in an interactive terminal. Passwords are never command arguments or piped input. Reset ends that account's sessions. Login verifies the password before acquiring the write lock, then rechecks the active account and unchanged verified hash and inserts the session atomically. A reset that commits first prevents a login based on the old verification. Disable blocks login and ends sessions. Enable requires a fresh login and leaves existing record grants in place. The contributor command cannot change the owner. A reset does not implicitly enable a disabled account.

The owner selects an active contributor and grants access to individual records. A grant with both write permissions false provides read access. `canUpload` permits photos and attachments. `canAddLog` permits new public Log entries. Either permission can be enabled independently. Upload alone also permits a new attachment on an existing public Log entry of the same record. Creating a new entry with files needs both permissions. Contributors cannot add private entries, edit record fields, manage grants or change existing evidence. Draft records remain unavailable.

The owner APIs list contributors and manage `/api/projects/:projectId/records/:id/grants`. Contributor access uses `/api/assigned-records`. Every request checks the current account and grant. Every upload, including the owner's, revalidates the actual session token and current role or grant in the same short IMMEDIATE transaction that commits its occurrence. Receiving and publishing file bytes happen before this transaction. Logout, password reset or expiry during that asynchronous work must prevent the evidence commit. Removing a grant or disabling an account stops subsequent access. Already delivered bytes cannot be recalled. Public share links remain read-only and never grant contributor permissions.

The browser supplies screens to display and select existing CLI-provisioned accounts, manage record grants, show separate Upload and Add Log controls, and follow assigned records. It does not imply an account-creation or password-management API. Neither permission implies the other.

## Evidence and viewer contract

The browser uploads one attachment or one photo bundle per request. A bundle supplies an original plus JPEG display and thumbnail copies. The entire multipart request body may contain at most **100,000,000 bytes**, including preamble, metadata, part headers, boundaries and epilogue. Original files share this budget with the other parts; do not advertise a 100 MB file plus overhead. Generated display and thumbnail copies remain limited to 5,000,000 and 500,000 bytes. The server counts actual streamed bytes and rejects oversize requests with 413, including chunked bodies.

`ACCEPTED_ATTACHMENT_EXTENSIONS` in `src/domain/files.ts` is the shared 145-extension catalog. Browser pickers reuse it. Storage-only Office, CAD/BIM, archive and specialist formats are screened by suffix and never executed or converted. DWG version signatures do not limit storage admission. Native-view formats receive content-based screening before selecting their response MIME. SVG preambles stream through a constant-memory UTF-8 recognizer, so long comments, declarations and processing instructions are not limited to the initial 512-byte prefix. The recognizer never expands entities or loads a DTD and is not full-document validation. Canonical MIME is independent of the occurrence filename. This is not document validation or malware scanning. The `.a` and `.mat` entries are intentionally download-only.

EXIF extraction, explicit-offset date handling, HEIC decoding and fallback belong to the browser. Missing or ambiguous capture dates stay null. Photo bundles retain immutable original bytes. Server tests do not establish browser image-decoder support.

Attachment collections expose `capabilities`, with a viewer kind, view mode, download fallback and optional media type or email reader. Authorized `/preview` returns the same descriptor. Authorized `/file` returns the original as a download. Authorized `/view` returns image, PDF, audio or video bytes inline. Unsupported view modes return `preview_unavailable`. Owner, shared and assigned-record routes enforce their own access before resolving the occurrence.

GET file/view routes support one byte range, including suffix and open ranges. Unsatisfiable or unsupported multiple ranges return 416. HEAD ignores Range and opens no file stream. If-Range falls back to a full 200 response because this no-store API supplies no validator. Media playback remains dependent on browser/container/codec support. Keep a visible original-download option when decoding fails. Owner/contributor SVG viewers use the authorised server URL, whose sandbox CSP and nosniff remain attached to direct navigation. Never inject SVG source or embed it as an iframe/object. On bearer-only share pages, decode SVG as an image, draw it to canvas, then display a generated PNG. Never place the original SVG Blob URL in the DOM: even an img element offers browser navigation to the source. Revoke temporary source URLs; conversion failure falls back to original download.

### Email reader

EML/MSG upload and original download are part of Plan 4. Their readable preview is implemented in the browser. The descriptor identifies `reader: eml|msg`; the server does not parse the email or extract embedded attachments.

The [synthetic email-viewer probe](../research/fixtures/2026-10-03-email-viewer-probe) records the earlier parser research. The delivered browser integrates postal-mime 4.0.2, @kenjiuno/msgreader 1.28.0 and htmlparser2 12.0.0. Its browser tests cover the integrated reader.

Fetch the authorized original into a cancellable Worker. Transfer its ArrayBuffer rather than cloning it. Render a reviewed selection of headers and readable body text through escaped text/textContent. HTML-only messages use inert text extraction. Never insert email HTML into a live document or fetch remote images, styles or scripts. List embedded attachments and download selected bytes locally as cleaned-filename, application/octet-stream Blob downloads. Do not automatically preview or recursively parse them.

Close/cancel must terminate the Worker and revoke Blob URLs. Malformed, encrypted, unsupported RTF-only or memory-constrained messages need an explicit unavailable-preview message and original download. A successful synthetic parser probe does not guarantee every 100 MB message can be decoded on a phone. Plan 5 browser tests cover parser failure, cancellation, encoded headers, embedded attachments, HTML-only messages and zero external fetches.

## Privacy and public-link browser contract

Public Notes are visible to contributors and public-link readers. Private Notes are owner-only. The owner edits both fields; contributors cannot change either. Contributor and public-link responses also exclude Outside contract scope, estimated cost, private Log entries and their attachments. Visible Log entries and uploads use human display names for attribution. Login usernames, automatic internal audit identities, share metadata and storage paths/hashes remain outside the shared projection. Referenced retired business people remain available as labels. Relationships expose visible human IDs and titles without granting access to another record.

Share URLs have the form `${publicOrigin}/share#${token}`. The `/share` shell reads the fragment locally and sends the token only in an Authorization bearer header. Fetch images, viewer bytes and downloads through those APIs. Blob URLs are limited to suitable image/video/audio elements and explicit download links; never open them in a new tab or embed them as documents/frames. The original SVG exception follows the rasterisation rule above. Shared PDF viewing must use a data-fed renderer or another reviewed sandboxed mechanism. Disable PDF scripting and automatic external resources/actions; links and embedded attachments require deliberate user action. Revoke Blob URLs after use. Native player requests cannot add bearer headers directly; use authorized fetches rather than putting a share token in a player URL. Owner/contributor cookie routes use the authorised server URLs, preserving response headers and native ranged requests. Do not place tokens in queries, route parameters, redirects or image URLs. Greek is the default share-page language. The shell sends noindex and no-referrer and loads no third-party scripts.

Only a successful public record GET updates view count and last-viewed time. HEAD, descriptors and all file reads are read-only. Each file request rechecks the link and current Log privacy by occurrence. Identical bytes never grant access to a private occurrence. State-changing session requests require the matching Origin. Upstream logs and caches must preserve these protections.

## Plan 6 PDF and documentation contract

PDF generation reuses an owner-selected existing share URL and never creates a link on GET. Its QR code may contain that selected URL. Private content remains excluded from PDF as required by the design.

The approved v1 design remains active. Plan 6 still owns the maintained v1 specification, Architecture reconciliation, recovery drill and v1 documentation closeout. Plan 4's backend is implemented, verified and merged to main. Plan 5 browser delivery is implemented and verified on its feature branch, with final integration review pending. Production deployment remains future work. No maintained specification exists to update at this stage; the approved design remains the requirements baseline until Plan 6 consolidates it.

## Verification evidence

Plan 5 implementation verification on 2026-10-04 passed the browser build, TypeScript check, 464 unit/API tests across 64 files and 39 Chrome browser tests across 9 spec files. Desktop/phone screenshots and keyboard focus were inspected. Runtime commits are `b80dbcb` through `1e6bd06`; planning replay evidence is recorded separately in the [historical Plan 5](../plans/2026-10-04-plan-5-web-interface.md).

The key-command integration test runs the same script entrypoint as `npm run shares:revoke-all` in a separate process, with a temporary working directory and database. It covers missing and replacement keys, aggregate safe output, retained activity counts and idempotent repeat runs. Crypto tests cover tampering, wrong key, wrong record, nonce uniqueness and authenticated but noncanonical plaintext. API tests cover owner guards, private projection, early rejection headers, occurrence access and explicit HEAD handling. The review follow-up also exercises real loopback HTTP requests, oversized chunked bodies and connection aborts. Server diagnostics use only recognized error categories and codes, with messages, stacks, paths and unrecognized error properties excluded.
