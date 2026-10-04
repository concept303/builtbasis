# Deploy and release BuiltBasis v1

> **Document type:** Operator guide
> **Status:** Active for deployed release `a3ff3e1`. Remaining release acceptance is tracked in the release checklist.
> **Contracts:** [Approved v1 design](../designs/2026-10-02-v1-records-design.md), [access guide](share-key-management.md), [backup and recovery](backup-restore.md).

## Server directory layout

The hosting account's home directory is `/usr/home/ktimana`. The layout below was checked against the server on 2026-10-04 after the owner removed the obsolete hosting trial. Names in angle brackets vary. Temporary entries appear during work and may remain after an interruption.

```text
/usr/home/ktimana/
├── builtbasis/                         Application code
│   ├── current -> releases/<commit>/   Link to the running release
│   └── releases/<commit>/              One directory per deployed code version
│       ├── dist/server/                Compiled server and command-line tools
│       │   └── main.mjs                Application entrypoint
│       ├── dist/web/                   Built browser interface and assets
│       ├── node_modules/               Installed server dependencies
│       ├── package.json               Package and runtime requirements
│       └── package-lock.json           Exact dependency versions
├── builtbasis-config/
│   └── operations.env                 Non-secret command-line settings
├── builtbasis-data/                    Live data, retained across deployments
│   ├── builtbasis.db                   SQLite application database
│   ├── builtbasis.db-journal           Temporary SQLite rollback journal
│   ├── files/
│   │   ├── <two-hex-digits>/<hash>     Immutable uploaded bytes and image variants
│   │   └── .tmp/                      Temporary uploads
│   └── backups/
│       ├── builtbasis-nightly-<UTC timestamp>.db
│       ├── builtbasis-pre-migration-<UTC timestamp>.db
│       ├── <backup filename>.tmp       Incomplete backup, not a recovery point
│       ├── .operations-lock/          Temporary backup/export coordination lock
│       └── .exports/<export-id>/       Pinned database copy during an off-site pull
│           ├── builtbasis.db
│           └── manifest.json
├── builtbasis-logs/
│   ├── app.log                        Application diagnostic log
│   ├── backup.log                     Scheduled server-backup output
│   └── scheduled-acceptance.done       Retained scheduling-test marker
└── builtbasis-recovery-20261004/        Retained recovery rehearsal material
    ├── restored/                      Separate restored database and files
    ├── snapshots/                     Recovery input snapshots
    ├── files/                         Recovery input file pool
    ├── offsite.tar                    Transferred recovery input archive
    ├── cron.*                         Saved cron configurations
    ├── operations.*                   Saved non-secret tool configurations
    ├── *.json                         Rehearsal preparation and result evidence
    └── synthetic-cleanup-trial.db      Database used to rehearse test-project cleanup
```

### What each application area is for

| Area | Purpose and handling |
|---|---|
| `builtbasis/releases/` and `current` | A release is a built copy of the application, not a Git checkout. `current` is a symbolic link, not another copy. Deployment stages a new release and switches this link while the service is stopped. Retain the current and previous release through verification. Do not edit deployed files in place. |
| `dist/server/` | `main.mjs` runs the website/API. `owner.mjs` and `user.mjs` manage accounts. `backup.mjs`, `backup-export.mjs` and `restore.mjs` manage recovery copies. `revoke-share-links.mjs` revokes links. `runtime-check.mjs` checks the installed runtime. |
| `builtbasis-config/operations.env` | Tells command-line tools where live data is stored and supplies any other required non-secret settings. Preserve it across releases. The HTTP application's settings, including `SHARE_LINK_KEY`, are in konsoleH. The share key is not copied into this file or backup bundles. |
| `builtbasis-data/builtbasis.db` | Stores projects, records, managed lists, users, access rules, file metadata and history. Uploaded file bytes live in `files/`. Preserve both together. SQLite manages any adjacent rollback journal; do not remove it while the database is in use. |
| `builtbasis-data/files/` | Stores originals, display images and thumbnails under content hashes. The database keeps their user-facing filenames and record associations. Published files are retained even after their photo/attachment occurrences are deleted. Do not rename or manually prune them. `.tmp/` is upload staging, not published evidence. |
| `builtbasis-data/backups/` | Holds checked database snapshots. It does not duplicate all uploaded bytes; retained `files/` bytes supply those during recovery. Nightly rotation retains the latest snapshot in each of 14 daily and eight weekly buckets. Pre-migration snapshots are outside that rotation. |
| `.exports/` and `.operations-lock/` | Protect backup selection and transfer. An export contains a pinned database and its file manifest; the PC separately copies missing files. Use the backup guide's release/recovery procedure for abandoned exports and locks. Do not clear active work. |
| `builtbasis-logs/` | Holds diagnostic output, separate from website content and backup bundles. `scheduled-acceptance.done` is a retained test marker, not a backup or a signal of current backup health. Logs should be managed through the hosting log-rotation procedure. |
| `builtbasis-recovery-20261004/` | Holds the isolated restored copy and evidence from the recovery rehearsal. It is not the active data directory or the normal backup destination. It contains private data and remains retained. Its eventual removal is separate from hosting-trial cleanup. |

Application code can be replaced during deployment. Live data, configuration, logs and retained recovery material remain outside the release directories. Database schema upgrades change the live database only through the migration procedure, which first creates a pre-migration backup. Copying the code directory alone is not an application-data backup.

### Other folders and files in the hosting account

These share the same home directory but serve the wider hosting account. BuiltBasis deployment does not manage them.

| Entry | Purpose |
|---|---|
| `public_html -> /usr/www/users/ktimana` | Symbolic link to the conventional website files, including WordPress sites. BuiltBasis is served by its separate Node.js application. |
| `public_ftp/incoming/` | FTP incoming area. BuiltBasis deployment and off-site copying use SSH/SFTP instead. |
| `vmail/` | Hosted email mailbox storage. |
| `www_logs/` | Hosting web-server logs for the account's websites, separate from BuiltBasis's own logs. |
| `.ssh/` | SSH access configuration and authentication-related files. |
| `.cache/` | Tool caches. The observed `node-gyp/` cache supports native Node.js module builds. |
| `.npm/` | npm package cache, installation logs and update-check metadata. |
| `.local/share/` | User-specific application data used by installed tools. |
| `.tmp/` | Account-level temporary files, including hosting job locks. Distinct from `builtbasis-data/files/.tmp/`. |
| `.nodeversion`, `.phpversion` | Hosting version-selection files. Observed values were `24` and `8.2`. The BuiltBasis Node.js application is configured separately in konsoleH. |
| `.bashrc`, `.profile`, `.bash_logout` | Shell startup and logout configuration. |
| `.bash_history` | Shell command history. It may contain sensitive commands and is not application documentation. |
| `.selected_editor` | Saved command-line editor preference. |

A leading dot marks a hidden entry; it does not mean the entry is a directory. In `ls -la`, `.` means the current directory and `..` its parent. An arrow after a filename identifies a symbolic link and its target.

### PC backup directory

The owner-selected off-site destination is `X:\1976KN\Sys\Software\builtbasis`:

```text
builtbasis/
├── snapshots/<export-id>/
│   ├── builtbasis.db                  Copied server database snapshot
│   ├── manifest.json                  Source-backup identity and expected hashes
│   └── COMPLETE                       Successful verification report
├── files/<two-hex-digits>/<hash>       Shared immutable file pool for snapshots
├── operations/
│   ├── run-pull.ps1                   Windows scheduled-task entrypoint
│   └── scheduled-pull.log             Transfer and verification results
├── .pull-lock/                        Temporary lock preventing concurrent pulls
├── development-archives/              Preserved development drafts and evidence
└── restore-drills/                    Separate local recovery-test destinations
```

`operations/` also contains retained notification-test scripts/logs and recovery-transfer artifacts. These are test evidence, not recovery points. The scheduled pull uses the matching compiled tools in `X:\1976KN\Dev\Code\builtbasis`. `COMPLETE` records successful verification; source-backup age, not transfer time, determines freshness. Preserve the file pool required by retained snapshots. See [backup and restore](backup-restore.md) for transfer, verification, retention and recovery procedures.

### Local development workspaces and archived evidence

`.worktrees/` and `.superpowers/` in the development checkout were temporary development areas. `.worktrees/` held isolated planning, implementation and replay checkouts with duplicate dependencies. `.superpowers/` held private execution scripts, screenshots and deployment evidence. Neither directory is needed by the deployed application or the Windows backup runner, which uses the main checkout and its compiled tools.

On 2026-10-05 both directories were removed after archiving and verifying 4,467 retained files. Thirteen additional Git worktrees were deregistered, and the two merged implementation branches were removed. Only the main checkout remains registered. Dependency copies were disposable; uncommitted drafts, detached commit history, private execution evidence and saved preview data were preserved. No local preview was running during cleanup.

The private archive is `X:\1976KN\Sys\Software\builtbasis\development-archives\2026-10-05-workspace-cleanup`. It contains:

| File | Contents |
|---|---|
| `workspace-files.tar.gz` | Former `.worktrees/` and `.superpowers/` contents, excluding reinstallable `node_modules/` directories. Original member paths are retained. |
| `repository-history.bundle` | Git history and references, including the detached worktree commits. |
| `worktrees.json` | Original checkout paths, commits, status and tracked-file differences. |
| `preview-data.tar.gz` | Saved local preview database, its backups and files. This is separate from production backup snapshots. |
| `preview-path-original.json` | The preview's original local data path. |
| `manifest.json` | Original paths, sizes and SHA-256 hashes for every retained file. |
| `VERIFIED.json` | Successful extraction/hash comparison and archive hashes. |

The archives occupy about 60 MB; the removed workspace files occupied about 3.7 GB. Treat these archives as private because they contain databases and operational evidence. Extract into a separate recovery directory when needed. Do not overwrite the current checkout or run historical scripts without review. Old `.git` pointer files inside the archive refer to removed worktree registrations; use the Git bundle when recovering history. These archives do not replace the scheduled production backups.

For future development, temporary worktrees and private scratch folders remain ignored by Git. After integration, remove inactive worktrees and reinstallable dependencies. Preserve unique drafts, user-entered data and required operational evidence outside the checkout before cleanup, and update documentation that refers to their old locations.

### Removed hosting-trial material

On 2026-10-04 the owner removed `builtbasis-spike/`, `builtbasis-data/spike.db`, `builtbasis-data/backup-check.log` and the two `backups/spike-*.db` trial snapshots. SSH inspection confirmed all five paths were absent and no `spike-*` backups remained. `pdf-check.pdf` and the trial database's WAL/SHM files were already absent before cleanup. The live database, file pool, backups and recovery-rehearsal folder were retained. The live health endpoint returned HTTP 200 with `{"ok":true}`. The historical [hosting trial plan](../plans/2026-10-02-plan-0-webhosting-trial.md) explains why those test files existed.

## Build and stage

Run locally from a clean implementation commit. Run `npm ci --ignore-scripts`, `npm rebuild esbuild`, `npm run build`, `npm run typecheck`, `npm test` and `npm run test:browser` (installed Chrome requires `PLAYWRIGHT_CHANNEL=chrome`). Node 22.13 is the minimum; the trial used Node 24 on hosting. `dist/server` contains compiled application and administrative entrypoints. It does not need tsx on hosting. The package lock is retained, not regenerated on the server.

Stage with Windows PowerShell 5.1 or PowerShell 7 and OpenSSH. The release script has been tested on 5.1:

```powershell
$release = git rev-parse HEAD
./scripts/stage-release.ps1 -SshAlias builtbasis-hetzner -RemoteRoot /usr/home/ktimana/builtbasis -ReleaseId $release
```

The script transfers only built assets, compiled server tools and the package manifests. It installs production dependencies with the Node 24 toolchain, checks the native SQLite module, and leaves the running release unchanged. It refuses an existing release directory. A failed stage is not usable; inspect and remove only that failed release directory before retrying. No command deletes the data folder. Keep at least the current and previous release until verification is complete.

## First activation and configuration

Use separate directories: `/usr/home/ktimana/builtbasis/releases/<commit>` for code, `/usr/home/ktimana/builtbasis/current` for its symlink, `/usr/home/ktimana/builtbasis-data` for data, and `/usr/home/ktimana/builtbasis-config/operations.env` for non-secret command-line configuration. The configuration directory and file are owner-readable only (700 and 600). They are outside code, data and backup transfers. Preserve the dedicated share key across releases. Do not put real configuration or account passwords in this repository.

Record the actual account quota and current usage from konsoleH before setting `FILES_STORAGE_BUDGET_BYTES` and `FILES_FREE_RESERVE_BYTES`. Budget for immutable files, the database, 14 daily/8 weekly backups, export pins, two releases and other sites. The filesystem free-space value is not the account quota. No default budget is assumed. Record the chosen values and rationale privately in the release checklist.

Set `BACKUP_MAX_AGE_HOURS` if the server-backup warning threshold should differ from its 36-hour default. Keep it aligned with the nightly schedule and the Windows pull's `-MaxAgeHours`. Set `FILES_WARNING_BELOW_BYTES` if the default 5,000,000,000 bytes (5 GB) remaining-file warning should change. These values are server configuration, not editable website settings. Administration always shows full status; the other owner screens show only warnings with a link to that page. Verify healthy status is hidden there, missing/unreadable status warns, and contributors/share/print cannot see monitoring. The [backup guide](backup-restore.md) explains the separate Windows failure message and logged-on-desktop requirement.

Set `BUILTBASIS_DATA_DIR`, `PUBLIC_BASE_URL=https://builtbasis.ktimanet.com`, `SHARE_LINK_KEY`, `BEHIND_CLOUDFLARE=0`, both storage settings, and `NODE_ENV=production`. Leave `PORT` unset: Hetzner supplies its socket. Keep `SHARE_LINK_KEY` only in the HTTP application settings in konsoleH. The command-line tools do not need it. Put only `BUILTBASIS_DATA_DIR` and any other needed non-secret settings in `operations.env`; keep the data path aligned with konsoleH. Never duplicate the share key into that file. Never print the key in logs. Cloudflare Full (strict) remains enabled. Hosted acceptance found the origin directly reachable, so keep BEHIND_CLOUDFLARE=0 to ignore untrusted visitor-IP headers. Only set it to 1 after origin access is restricted and that restriction is verified. The global login failure limit remains enforced.

Provision real project data locally using the existing `seed:gennadi` command against a fresh private data directory. Source contact CSV/workbook and the resulting database are private. Do not include them in the release archive. Transfer the closed initial database to the production data folder only while Node is deactivated and only when no production database exists. Preserve any existing database instead of replacing it. Verify its schema/integrity on the server. Once the app has live data, use the restore procedure for data replacement.

For first activation, deactivate the spike in konsoleH. Create `current` as a symlink to the verified release. Set script path `dist/server/main.mjs`, working directory `builtbasis/current/`, Node 24 and memory 384 MB. Keep the log outside the release directory, restrict access, and configure log rotation in the hosting controls. Set the environment values above. Create the owner with an interactive SSH terminal before admitting users:

```sh
cd /usr/home/ktimana/builtbasis/current
/usr/local/nodejs/24/bin/node --env-file=/usr/home/ktimana/builtbasis-config/operations.env dist/server/owner.mjs OWNER_LOGIN "Owner display name"
```

The password is prompted; never place it in the command line. Other deployed tools use `node --env-file=... dist/server/user.mjs`, `backup.mjs`, `backup-export.mjs`, `restore.mjs`, or `revoke-share-links.mjs`. Source-level npm administration commands require the development checkout and are not used in the staged production directory.

## Subsequent activation and rollback

Take and verify a completed database backup before activation. In konsoleH deactivate BuiltBasis, confirm the exact Node process has stopped, then repoint `current` to the staged release. Keep the recorded previous symlink target. Reactivate and make a request; startup applies migrations after the existing pre-migration backup. This deliberate stop prevents the platform restarting the old release during a switch. WordPress is a separate domain and must remain untouched.

For a schema upgrade, complete the pre-upgrade PC pull with the old matching verifier before rebuilding the PC tools. Pause the idle Windows pull task during the transition. After activation and data checks, create a fresh backup with the new schema, then enable and run the Windows task using the newly built matching tools. Verify its result and source-backup timestamp. A successful transfer with an incompatible verifier does not complete the backup.

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
