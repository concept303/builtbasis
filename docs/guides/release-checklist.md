# v1 release checklist

> **Document type:** Release acceptance checklist
> **Status:** In progress. Hosted release `1265439` is active. Checked boxes have implementation or operational evidence recorded below. Unchecked boxes may be partly tested; they are not accepted as complete.
> **Authority:** [Approved design](../designs/2026-10-02-v1-records-design.md), [proposed specification](../specs/v1.md) and [roadmap](../plans/2026-10-02-v1-roadmap.md).

For every completed gate, record the date, operator, release commit, environment, command or procedure, observed result and a private evidence location. Record failures plainly. Do not copy credentials, tokens, contact data or private record content into this repository. Do not activate the specification or mark the design historical until the external gates are satisfied.

## Build and release identity

- [x] Record the exact reviewed commit and clean build inputs. Run unit/API tests, TypeScript, production builds and browser tests. Retain their actual outputs and distinguish replay from implementation evidence.
- [x] Check the release archive contains only compiled server/web assets and production dependency manifests. It must exclude `.env`, keys, database/files/backups, source CSV/workbooks and synthetic test credentials.
- [x] Install production dependencies with the verified hosting Node executable on PATH. Run the native SQLite runtime check in the staged release. Confirm no source `tsx` command is required on hosting.
- [ ] Record the stable current-release path and separate private data/configuration paths. Verify deployment cannot overwrite data or external configuration. Exercise the documented restart and rollback procedure without silently rolling back a migrated database.

## Hosting, proxy and capacity

- [ ] Confirm `builtbasis.ktimanet.com` is the only domain changed. Check `ktimanet.com` WordPress before and after activation, including a representative existing page and its HTTPS response.
- [ ] Confirm local disk placement and SQLite locking on the production data path. Verify Linux file and directory sync support. Record the hosting Node version, socket activation and restart behavior.
- [ ] Verify Cloudflare proxying, Full (strict), origin certificate and intended hostname. Record whether origin access is restricted to Cloudflare. Test direct-origin reachability and the `CF-Connecting-IP` trust boundary. Keep the global login failure cap even when the client-IP header is enabled.
- [ ] Inspect application, hosting and Cloudflare logging settings. Verify Authorization headers, share/session tokens, passwords and private request bodies do not enter upstream logs. Verify private/no-store, no-referrer, noindex and protective content headers survive the proxy.
- [x] Send valid multipart requests totaling exactly **100,000,000 bytes**, including all boundaries, metadata and file parts, through the public Cloudflare URL. Check both declared Content-Length and streaming requests where supported. Verify accepted bytes and metadata after success.
- [ ] Send a **100,000,001-byte** request through the public path. Verify rejection, no incomplete evidence occurrence and temporary-file cleanup. Exercise a disconnect during upload. Record any lower upstream limit as a blocking failure rather than advertising a larger limit than users can reach.
- [ ] Observe streaming upload memory on hosting under the actual **384 MB** process limit. Include a near-limit attachment, a photo bundle and realistic concurrent activity. Record peak resident memory, process stability and response results. Confirm the server does not buffer whole large uploads.
- [ ] Check authorised GET, HEAD, one byte range, suffix/open ranges, unsupported multiple ranges and If-Range behavior through the proxy. Verify originals, previews and media remain private and no-store. Test revoked, expired and wrong-record access.
- [x] Record the actual hosting account storage allowance and current usage. Select explicit `FILES_STORAGE_BUDGET_BYTES` and `FILES_FREE_RESERVE_BYTES`, leaving capacity for retained immutable files, database, backups, export pins, logs and other account use. Filesystem free bytes alone do not establish account quota.
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
- [x] Under the actual scheduled Windows identity, trigger a controlled pull failure and observe the local `msg.exe` desktop message. Verify setup/transfer/stale/release failures keep a nonzero task exit, failed notification delivery is logged, and success sends no message. Record the logged-on-desktop requirement and that a powered-off PC or a task that never runs cannot alert through this mechanism.

- [ ] Install nightly server cron with absolute Node, stable release directory and the existing external configuration file. Keep the share key out of cron text and backup directories. Observe an actual scheduled run, inspect its completed SQLite copy and confirm failed jobs produce a visible operator alert.
- [ ] Confirm retention keeps 14 daily and eight weekly UTC buckets while leaving pre-migration backups and immutable blobs intact. Verify rotation cannot break an active pinned export. Document abandoned-pin and stale-lock inspection without clearing active work.
- [x] Install the owner's Windows scheduled pull to the intended private X: destination. Observe an actual scheduled run. Check database-first pin/copy, incremental immutable-file transfer, every-reference hash/size verification and COMPLETE creation only after success. Verify failure alerting, PC availability assumptions and remote export release.
- [x] Perform an actual restore drill from that completed offsite copy into a fresh isolated destination using compatible release code. Keep production data untouched. Record the selected backup, verification result, restored records and representative original/preview/attachment checks.
- [x] In the restored drill, verify all sessions are deleted, every share link revoked, every non-owner account disabled and all record grants cleared. Verify the owner is preserved. Demonstrate reset-password, enable and deliberate regrant before contributor access returns.
- [ ] Rehearse the real-cutover prerequisite: stop application and all backup/pull jobs, verify writers are stopped, restore to a fresh path, select data/configuration, then reopen access. Document rollback preservation and key-loss handling. A fixture-only unit test does not satisfy the actual offsite drill.

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
| Devices and printing, partial | Owner confirmed live login/Administration, actual-phone record/photo/small-PDF display, and English/Greek A3 landscape previews without clipping. Physical QR scan, broader phone formats and real camera upload are not yet confirmed. Local browser tests cover multipage PDF and QR decoding, but do not replace the device gates above. | User confirmations in conversation; `progress.md` |
| Scheduled backup and pull | Server scheduled acceptance produced source backup at 06:21:01 UTC. Windows task ran as the actual logged-on owner, result 0, verified at 06:21:37 UTC. Permanent schedules remain 02:00 server-local and 13:00 Sydney respectively. Transfer uses pinned source metadata and verified immutable files. | `progress.md`; private destination `operations/scheduled-pull.log` |
| Notification | Controlled failure under the scheduled Windows identity returned nonzero. Owner confirmed seeing the desktop message. The actual backup succeeded. Logged-on desktop and PC availability remain requirements. | Private destination `operations/notification-test.log`; user confirmation |
| Offsite recovery | Restored populated snapshot `2fe09d837a1ca2e75a116f1059641dd3` into a fresh isolated destination. Verified two unique blobs and preserved owner credentials. Cleared two sessions, revoked one link, disabled one contributor and cleared one grant. Real HTTP checks proved reset alone and enable alone insufficient; deliberate regrant restored access. Production was untouched. | `populated-pull.log`, `populated-restore-results.json`, `populated-restore.log` |

Offsite destination: `X:\1976KN\Sys\Software\builtbasis`. The Windows runner currently references the retained implementation worktree. When integrating to main, update it to the permanent checkout, build the matching tools and verify the scheduled task before removing the worktree.

The synthetic acceptance project remains available for the pending QR check. A controlled code rollback/restart rehearsal and the remaining unchecked acceptance details must be resolved before final release acceptance. Do not mark the specification Current or the design Historical from these partial results.
