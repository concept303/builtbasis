# v1 release checklist

> **Document type:** Release acceptance checklist
> **Status:** In progress. Hosted release `a3ff3e1` is active. Checked boxes have implementation or operational evidence recorded below. Unchecked boxes may be partly tested; they are not accepted as complete.
> **Authority:** [Approved design](../designs/2026-10-02-v1-records-design.md), [proposed specification](../specs/v1.md) and [roadmap](../plans/2026-10-02-v1-roadmap.md).

For every completed gate, record the date, operator, release commit, environment, command or procedure, observed result and a private evidence location. Record failures plainly. Do not copy credentials, tokens, contact data or private record content into this repository. Do not activate the specification or mark the design historical until the external gates are satisfied.

## Build and release identity

- [x] Record the exact reviewed commit and clean build inputs. Run unit/API tests, TypeScript, production builds and browser tests. Retain their actual outputs and distinguish replay from implementation evidence.
- [x] Check the release archive contains only compiled server/web assets and production dependency manifests. It must exclude `.env`, keys, database/files/backups, source CSV/workbooks and synthetic test credentials.
- [x] Install production dependencies with the verified hosting Node executable on PATH. Run the native SQLite runtime check in the staged release. Confirm no source `tsx` command is required on hosting.
- [x] Record the stable current-release path and separate private data/configuration paths. Verify deployment cannot overwrite data or external configuration. Exercise the documented restart and rollback procedure without silently rolling back a migrated database.

## Hosting, proxy and capacity

- [x] Confirm `builtbasis.ktimanet.com` is the only domain changed. Check `ktimanet.com` WordPress before and after activation, including a representative existing page and its HTTPS response.
- [x] Confirm local disk placement and SQLite locking on the production data path. Verify Linux file and directory sync support. Record the hosting Node version, socket activation and restart behavior.
- [x] Verify Cloudflare proxying, Full (strict), origin certificate and intended hostname. Record whether origin access is restricted to Cloudflare. Test direct-origin reachability and the `CF-Connecting-IP` trust boundary. Keep the global login failure cap even when the client-IP header is enabled.
- [ ] Inspect application, hosting and Cloudflare logging settings. Verify Authorization headers, share/session tokens, passwords and private request bodies do not enter upstream logs. Verify private/no-store, no-referrer, noindex and protective content headers survive the proxy.
- [x] Send valid multipart requests totaling exactly **100,000,000 bytes**, including all boundaries, metadata and file parts, through the public Cloudflare URL. Check both declared Content-Length and streaming requests where supported. Verify accepted bytes and metadata after success.
- [x] Send a **100,000,001-byte** request through the public path. Verify rejection, no incomplete evidence occurrence and temporary-file cleanup. Exercise a disconnect during upload. Record any lower upstream limit as a blocking failure rather than advertising a larger limit than users can reach.
- [ ] Observe streaming upload memory on hosting under the actual **384 MB** process limit. Include a near-limit attachment, a photo bundle and realistic concurrent activity. Record peak resident memory, process stability and response results. Confirm the server does not buffer whole large uploads.
- [x] Check authorised GET, HEAD, one byte range, suffix/open ranges, unsupported multiple ranges and If-Range behavior through the proxy. Verify originals, previews and media remain private and no-store. Test revoked, expired and wrong-record access.
- [x] Record the actual hosting account storage allowance and current usage. Select explicit `FILES_STORAGE_BUDGET_BYTES` and `FILES_FREE_RESERVE_BYTES`, leaving capacity for retained immutable files, database, backups, export pins, logs and other account use. Filesystem free bytes alone do not establish account quota.
- [x] Exercise capacity refusal using an isolated configured limit. Verify new uploads fail safely while reads/login work. Document who monitors usage and how capacity is increased. Do not delete published immutable files as a capacity response.

## Access, seed and browser acceptance

- [x] Provision the unique owner through the compiled interactive CLI. Keep passwords out of arguments and logs. Verify contributor create/reset/disable/enable commands, independent Upload/Add Log grants, grant removal and Draft denial on the deployed release.
- [x] Select the intended empty project/database for seed import. Read the private CSV/workbook sources without copying them into the repository or release. Use the source-checkout seed command with its development dependencies if it is not packaged. Record list counts and representative bilingual values; verify repeat import refuses duplication. Do not import historical record rows without a separate decision.
- [ ] Test a real phone camera upload and photo selection, including iPhone HEIC where available. Check orientation, missing capture date, preserved original, preview fallback, narrow layout, touch controls and reconnect/error feedback. Desktop viewport emulation is not this gate.
- [ ] Check representative EML/MSG, PDF, SVG, audio/video and download-only attachments on desktop and phone. Confirm no external email tracking requests, safe failure/cancel, original-download fallback and supported playback behavior.
- [ ] Inspect the Greek and English interface with actual project labels. Check keyboard use, phone-accessible definitions, owner/contributor separation, public/private Notes and private Log attachments. Confirm one public occurrence never reveals metadata of a private occurrence with identical bytes.
- [x] Print representative Greek and English records to **A3 landscape PDF** from the intended desktop browser. Include long multi-page text, all subtypes, measurements/comparisons and Before/After photo limits. Inspect Greek glyphs, page breaks, clipping and pagination at actual scale.
- [x] Print an ordinary record and a Draft with **Include QR link** off by default. Confirm no link is created, no QR is printed, Draft status is clear, and sharing-service failure does not block printing without QR. Enable QR on an eligible record, decode it and open it on a separate device. Verify it resolves to the owner-selected active existing share link. Confirm revoked/expired/Draft denial, no automatic link creation, fresh labels/footer after managed-list changes, and exclusion of Notes, Log, Activity and all private fields from every PDF.

## Backup and recovery

- [x] Verify Administration is linked in owner navigation and always shows the completed server source date, backup-age limit, remaining allowance and configured 5 GB warning threshold. Healthy status must stay hidden on the working pages; missing/overdue/read-failure or low storage must show a compact warning linked to Administration, which disappears after recovery. Check below/at/above the configured allowance threshold, live upload reservations, filesystem reserve and accounting failures. No paths/secrets or implied hosting quota; contributors/share/print cannot see monitoring.
- [x] Under the actual scheduled Windows identity, trigger a controlled pull failure and observe the local `msg.exe` desktop message. Verify setup/transfer/stale/release failures keep a nonzero task exit, failed notification delivery is logged, and success sends no message. Record the logged-on-desktop requirement and that a powered-off PC or a task that never runs cannot alert through this mechanism.

- [x] Install nightly server cron with absolute Node, stable release directory and the existing external configuration file. Keep the share key out of cron text and backup directories. Observe an actual scheduled run, inspect its completed SQLite copy and confirm failed jobs produce a visible operator alert.
- [x] Confirm retention keeps 14 daily and eight weekly UTC buckets while leaving pre-migration backups and immutable blobs intact. Verify rotation cannot break an active pinned export. Document abandoned-pin and stale-lock inspection without clearing active work.
- [x] Install the owner's Windows scheduled pull to the intended private X: destination. Observe an actual scheduled run. Check database-first pin/copy, incremental immutable-file transfer, every-reference hash/size verification and COMPLETE creation only after success. Verify failure alerting, PC availability assumptions and remote export release.
- [x] Perform an actual restore drill from that completed offsite copy into a fresh isolated destination using compatible release code. Keep production data untouched. Record the selected backup, verification result, restored records and representative original/preview/attachment checks.
- [x] In the restored drill, verify all sessions are deleted, every share link revoked, every non-owner account disabled and all record grants cleared. Verify the owner is preserved. Demonstrate reset-password, enable and deliberate regrant before contributor access returns.
- [x] Rehearse the real-cutover prerequisite: stop application and all backup/pull jobs, verify writers are stopped, restore to a fresh path, select data/configuration, then reopen access. Document rollback preservation and key-loss handling. A fixture-only unit test does not satisfy the actual offsite drill.

## Closeout

- [ ] Reconcile actual deployed behavior with the specification, Architecture and operator guides. Record any approved deviation explicitly. Remove stale future-work claims only for work actually completed.
- [ ] Record the release owner's acceptance and the evidence locations for all external gates. Activate `docs/specs/v1.md` and mark the approved design historical only at this point. Update the roadmap and release documentation without turning planning replay into deployment evidence.

## Acceptance evidence — 2026-10-04

Operator: Codex, with Konstantinos performing konsoleH changes and confirming the desktop/phone observations. Hosted runtime: `12654399ff3fcdd060620745bf4744a316b8dfcd`, Node 24.21.0, Hetzner Webhosting L. Implementation remains on `codex/plan-6`; this is not a claim that main contains it.

Private execution evidence is retained under `.superpowers/sdd/2026-10-04-plan-6-print-and-operations/` in the implementation worktree. No credentials or share URLs are included here.

| Check | Procedure and observed result | Private evidence |
|---|---|---|
| Build and staged release | 503 unit/API tests in 71 files, 52 browser tests in 11 specs, TypeScript and builds passed. Compiled allowlisted release installed 78 production packages; native SQLite passed, production audit found zero vulnerabilities. | `live-fix-unit.log`, `live-fix-browser.log`, `live-fix-types.log`, `live-fix-build.log`, `host-fix-stage.log` |
| Hosted request limit | Through the public Cloudflare URL, hosting-originated requests of exactly 100,000,000 bytes returned 201, both declared and chunked. Both 100,000,001-byte cases returned 413. The first PC attempt returned 524 without creating an occurrence; a later PC repeat returned 201 in 34.410 seconds. The first timeout's cause remains unproven. | `host-server-boundaries.log`, `host-upload-limits.json`, `host-upload-limits-100000000.json` |
| Memory and capacity, partial | Concurrent reads and a backup succeeded during near-limit uploads. Peak process RSS was 144,960 KiB under the 384 MB limit; no temporary files remained. An isolated hosted process returned 507 with no new attachment. Production limits were unchanged. Actual phone camera/photo-bundle acceptance remains open. | `host-final-memory.json`, `host-capacity-probe.json` |
| Account allowance | Owner screenshot showed 100 GB allowance and about 43.6 GB used. Configured file budget is 30 GB, filesystem reserve 5 GB, warning threshold 5 GB. Other account usage still requires konsoleH monitoring. | Owner screenshot in conversation; `progress.md` |
| Proxy and logs, partial | Direct origin was reachable with a forged visitor-IP header. Owner set BEHIND_CLOUDFLARE=0 before activating the correction. API/shell privacy headers survive Cloudflare. Application logs passed sensitive-pattern checks. Only older hosting access archives were available; current-day hosting logs and Cloudflare logging settings remain unchecked. | `origin-reachability.json`, `host-log-check.json`, `upstream-log-check.json` |
| Devices and printing, partial | Owner confirmed live login/Administration, actual-phone record/photo/small-PDF display, and English/Greek A3 landscape previews without clipping. The owner also confirmed the physical QR scan. Broader phone formats and real camera upload are not yet confirmed. Local browser tests cover multipage PDF and QR decoding, but do not replace the device gates above. | User confirmations in conversation; `progress.md` |
| Scheduled backup and pull | Server scheduled acceptance produced source backup at 06:21:01 UTC. Windows task ran as the actual logged-on owner, result 0, verified at 06:21:37 UTC. Permanent schedules remain 02:00 server-local and 13:00 Sydney respectively. Transfer uses pinned source metadata and verified immutable files. | `progress.md`; private destination `operations/scheduled-pull.log` |
| Notification | Controlled failure under the scheduled Windows identity returned nonzero. Owner confirmed seeing the desktop message. The actual backup succeeded. Logged-on desktop and PC availability remain requirements. | Private destination `operations/notification-test.log`; user confirmation |
| Offsite recovery | Restored populated snapshot `2fe09d837a1ca2e75a116f1059641dd3` into a fresh isolated destination. Verified two unique blobs and preserved owner credentials. Cleared two sessions, revoked one link, disabled one contributor and cleared one grant. Real HTTP checks proved reset alone and enable alone insufficient; deliberate regrant restored access. Production was untouched. | `populated-pull.log`, `populated-restore-results.json`, `populated-restore.log` |

Offsite destination: `X:\1976KN\Sys\Software\builtbasis`. The Windows runner now references the permanent `main` checkout. Its compiled tools were rebuilt after integration, and the actual scheduled task completed with result 0. The implementation worktree is retained for private acceptance evidence.

The synthetic acceptance project was removed on 2026-10-04 at the owner’s request after a fresh verified server/off-site backup (snapshot `6e19b9b2416da2afbd92a5480f92b644`). Cleanup removed its five records, 12 photo occurrences, 15 attachment occurrences and four share links. Gennadi 822A and its lists were verified unchanged. Immutable stored bytes remain under the backup policy. The controlled code rollback/restart rehearsal passed as recorded below. The remaining unchecked acceptance details must be resolved before final release acceptance. Do not mark the specification Current or the design Historical from these partial results.

### Additional acceptance evidence

All results below are from 2026-10-04 against hosted release `1265439`, except explicitly identified local verification. The same private evidence directory applies.

| Check | Observed result | Evidence |
|---|---|---|
| Contributor administration and permissions | Compiled CLI create/reset/disable/enable passed with a dedicated synthetic account. Real login verified reset/disable session invalidation. Upload and Add Log work independently; removed grants and Draft access are denied. Temporary account disabled afterwards. | `host-remaining-acceptance.json` |
| File access and interrupted upload | Full GET, HEAD, suffix/open/multiple ranges and If-Range behaved as specified through Cloudflare. Expired and wrong-record shares were denied. A deliberate incomplete upload disconnect left no occurrence or temporary file. | `host-remaining-acceptance.json` |
| Desktop viewers | Live EML/MSG/SVG/audio/video viewing and CAD download fallback passed in Chrome. Original downloads worked. No email/SVG tracking requests occurred. Cloudflare injects an analytics script, but CSP blocked it with no response; protections were retained. | `host-browser-acceptance.json`, `host-browser-network.json` |
| A3 PDF | Six deployed-app PDFs cover all subtypes in English and Greek. QI has eight pages, DC two and Task one. Greek text, width bounds, measurements/comparisons, newest-four Before/After photo limits and Notes exclusion passed. Draft printing created no share link. Owner separately confirmed ordinary EN/EL previews and physical QR scanning. | `host-print-acceptance.json`, six `host-print-*.pdf` files; owner confirmations |
| Monitoring and capacity | Live Administration shows healthy backup and 5 GB threshold; healthy record pages hide the panel. Isolated hosted capacity refusal preserved login/read access and returned missing-backup/storage warnings. Local implementation tests cover warning recovery, thresholds and audience restrictions. | `host-browser-acceptance.json`, `host-capacity-read-probe.json`; existing monitoring/API/browser test outputs |
| Seed repeat | Read-only verification of the preserved initial seed confirmed 1 project, 19 people, 34 trades, 25 tags, 13 zone types, 93 location nodes and zero records. A repeat seed invocation refused the existing project. | `seed-repeat-verification.json` |
| Retention and pinning | Local implementation tests verify 14 daily/8 weekly UTC buckets, migration-copy preservation, active pin survival and failed cleanup. Real transfers released export pins. This is not a claim that eight weeks of scheduled history already exist. Stale-lock/pin inspection procedures are in the backup guide. | `task-2-unit.log`, `live-fix-unit.log`, completed pull logs |

Known display limitation: measurement comparisons can print long floating-point fractions. The calculation remains unrounded as approved; a later display-formatting change can shorten those values.

### Mobile viewer correction — 2026-10-04

Owner requested finishing the cramped viewer UI and deferring the phone JPG investigation after a successful desktop upload. That phone rejection remains unresolved; no claim of successful phone camera/gallery acceptance is made.

Release `6247a9f857eddb34cdbed159bdcada0b7afd1d81` fixes dialog sizing, media placement, fixed header/actions and scrolling/wrapping email content. Three new layout regressions failed before the fix and passed afterwards. TypeScript/build, 503 unit/API tests and 55 browser tests passed. Two unchanged backend tests timed out during overlapping default-worker verification; the complete four-worker rerun passed without test or backend changes.

Staging passed native SQLite/runtime checks and installed 78 production packages with no production audit findings. All eight compiled server entrypoints and both dependency manifests were byte-identical to live `1265439`. For this UI-only deployment, the operator atomically switched the code symlink and stopped the exact verified old app PID. Activation, rollback to `1265439`, and reactivation of `6247a9f` each produced HTTP 200 from a new process in the expected release directory. The data directory and configuration were unchanged. This is a bounded exception to the guide's general stopped-service switch, not permission to use it for changed server code, schemas or dependencies.

The deployed UI then passed authenticated Chrome checks at 360×740 for dialog bounds, media placement, email/SVG/media previews and original downloads. Its mobile screenshot was inspected. WordPress still returned HTTP 200. Evidence: `viewer-unit.log`, `viewer-stage.log`, `viewer-activation.json`, `viewer-live-acceptance.json`, `live-mobile-viewer.png`. This completes the requested UI correction; other unchecked release gates remain recorded above. Uploaded test photos are preserved.

### Final operational verification — 2026-10-04 (in progress)

Implementation is merged to `main` at `a911f02`; the hosted runtime remains `6247a9f`. The merged tree passed TypeScript, production build and all 503 unit/API tests. The prior 55-browser result applies to the unchanged runtime. The Windows scheduled pull now uses the permanent checkout and completed successfully after that change.

The owner confirmed Cloudflare Full (strict). A fresh origin-certificate inspection confirmed the intended hostname and validity through 2039-11-10. The owner confirmed the two existing Workers are unrelated to BuiltBasis. The supplied Logpush screen shows a subscription offer rather than configured export jobs; no Logpush subscription was activated. These observations close the requested Cloudflare configuration checks, without claiming an independent audit of unrelated Workers. Current-day Hetzner logs are not exposed through the available SSH log directory; the earlier archived-log inspection does not prove current logging configuration.

A fresh server backup from 08:25:15.453 UTC was copied off-site by the actual scheduled Windows identity and verified at 08:25:42.678 UTC. The completed bundle and every referenced blob were transferred back into a separate private server directory, with archive and per-file verification passing. Recovery preparation did not modify the live data or suspend its service. The stop/restore/switch/return procedure was then executed successfully, as recorded below.

Private evidence: `closeout-preflight.json`, `cutover-prepared.json`, `cutover-procedure.md`, `wordpress-before-recovery.json` and the scheduled-pull log. The WordPress homepage and an existing About HTML page both returned HTTPS 200 before the rehearsal.

### Hosted recovery cutover and return — 2026-10-04

The owner disabled Node.js. The operator verified no application/backup/export/restore process or open original-database descriptor remained. The Windows pull task was disabled and its lock absent. The exact server crontab was preserved, and only the BuiltBasis nightly line was suspended.

The actual off-site bundle was restored into a fresh private server destination. Integrity and file hashes passed. It contained 2 projects, 5 records, 12 photos, 15 attachments and 13 unique blobs. The restored database had zero sessions, active share links, active contributors and grants. Owner credentials were preserved. The original database fingerprint remained unchanged.

The owner selected the restored data directory in konsoleH and enabled Node.js. The running process was verified to have the restored database open. Actual HTTPS checks passed for owner session access, a record, photo original/display/thumbnail hashes and a PDF hash. A desktop browser rendered record/evidence. The owner confirmed normal-password login and opening a record with photos. A helper initially selected the phone navigation control on a desktop viewport; correcting that test locator made the browser check pass without a product change. Temporary test sessions were removed.

The owner disabled Node.js again and selected the original data directory. With the process stopped, the operator verified the original database fingerprint still matched and restored the exact original offline-tool configuration. After re-enable, process/database-path, authenticated HTTPS record/photo/PDF and browser checks passed against original data. Both server and Windows backup schedules were resumed. Original data was never overwritten. The private restored copy remains separate; its sessions/grants/share links were reset as required.

WordPress homepage and its existing About HTML page returned HTTPS 200 before and after the rehearsal. No other domain configuration or cron entry was changed. Private evidence: `cutover-restore-result.json`, `cutover-restored-check.json`, `cutover-restored-live.json`, `cutover-return-prepared.json`, `cutover-original-live.json`, `cutover-schedules-resumed.json`, `wordpress-before-recovery.json`, `wordpress-after-recovery.json`, plus owner confirmations and the scheduled-pull log.

Post-rehearsal backup: source 2026-10-04T08:41:12.968Z, off-site verification 08:41:27.204Z (19:41 Sydney). The resumed Windows task returned 0 and is Ready with its daily schedule enabled. Server export pin was released. Snapshot `a9439c944cfe9a82cfb643c2820bbbad` remains in the private backup destination.

### Cloudflare observations — 2026-10-04

Owner-provided dashboard evidence confirms Full (strict), two existing Workers identified by the owner as unrelated to BuiltBasis, and the Logpush subscription-offer screen. No configuration was changed. The HTTP requests screenshot shows normal request metadata and Dynamic cache status on visible BuiltBasis API requests; it does not prove absence of sensitive values in every upstream log field.

A final SSH recheck still exposed only October 2–3 hosting log archives. Current-day hosting-log verification remains unavailable and is not marked passed. No further owner dashboard action is requested for these checks. The phone JPG investigation remains explicitly deferred; the completed recovery rehearsal and active backup schedules are unaffected.

### Project management and location photos deployment — 2026-10-04

Commits `296dd07`, `d942159` and `a3ff3e1` were fast-forwarded to main and pushed to GitHub. The merged release passed TypeScript, production build, 521 unit/server tests in 74 files and 61 browser tests. The build retains its existing bundle-size warning. Staging installed 78 production packages with no production audit findings and passed native SQLite/runtime checks. The staged server entrypoint and web shell matched the tested build hashes.

The pre-upgrade server backup from 10:59:35.240 UTC was verified off-site in snapshot `4c3af4d4cb01a34c7f1e7c81f5768894`. The idle Windows backup task was paused while rebuilding its verifier. The owner disabled Node.js in konsoleH. The operator verified the application and database writers had stopped, took the final backup at 11:06:39.952 UTC, fingerprinted existing data, and switched the code symlink from `6247a9f` to `a3ff3e17a8a5ccdeec434c0c0952af292ee7d4bf`. The owner enabled Node.js with configuration unchanged.

Startup retained the original data directory, created a pre-migration backup at 11:10:59.958 UTC and applied migrations 0005 and 0006. Integrity and foreign-key checks passed. All existing columns and rows across 25 business tables matched the stopped-service fingerprints. Owner credentials, existing records, managed lists and retained file metadata were unchanged.

Actual HTTPS and desktop Chrome checks passed for project creation/editing/usage/deletion, direct managed-list actions and the expandable location tree. A temporary record accepted JPEG and HEIC location photos through the deployed browser without a tree selection. Uploads preserved unsaved Location Notes and title. Location photos stayed separate from work evidence. Anonymous sharing at phone viewport width showed the notes and photos without private notes or edit controls. The print projection and page included both location images and notes with loaded image resources. This was desktop browser verification, not a new physical-phone acceptance claim.

The temporary project, record, photo occurrences, share link and verification session were removed. The original project list was unchanged, the deleted share returned 404, and the old acceptance project remained absent. Immutable uploaded bytes remain under the retention policy. WordPress still returned HTTPS 200.

After cleanup, a new schema-0006 backup completed at 11:11:57.615 UTC. The Windows task was enabled and run successfully with result 0. Snapshot `0eb50ab024485777ce7ecea62187bee1` was hash/schema/freshness-verified at 11:12:26.785 UTC and its server export pin was released. The task returned to Ready with its regular schedule enabled; the server nightly schedule was unchanged. The previous release and pre-upgrade backups were retained. A schema rollback must follow the recovery guide rather than pointing old code at the upgraded database.

Private evidence is under `.superpowers/project-management-refresh/`: `deploy-local-checks.json`, `deploy-before.json`, `deploy-activation.json`, `deploy-preservation.json`, `deploy-live-check.json` and `live-*.png`. Local verification logs are in the operator's temporary directory as `builtbasis-release-*.log`; PC transfer evidence is in the private destination's `operations/scheduled-pull.log`.
