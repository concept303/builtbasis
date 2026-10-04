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
