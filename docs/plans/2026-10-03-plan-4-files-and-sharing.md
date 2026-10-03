# Plan 4 — Files and Sharing Implementation Plan

> **Document type:** Implementation plan
> **Status:** Draft
> **Retention:** Current planning document. Review before execution.
> **Implements:** `docs/designs/2026-10-02-v1-records-design.md` §2, §5.8–5.12, §11.3–11.5 and the relevant API tests in §13.
> **Depends on:** Plan 3, merged to `main` at `8324b2e`. Baseline: 237 tests across 29 files; TypeScript passes.
> **Implemented by:** Not implemented.
> **Verified:** 2026-10-03 — checked against the merged interfaces and approved design. Implementation and new tests have not been executed.
> **Merged to main:** Implementation not merged.
> **Checklist note:** Unchecked steps are future implementation work.
> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Preserve the owner's selected method and Astra Medium model preference. Follow the checkboxes task by task.

**Goal:** The owner can upload and manage record evidence, create/copy/revoke single-record share links, and serve a read-only record and its permitted files without exposing private content.

**Architecture:** Keep immutable, content-addressed files outside the application directory. SQLite holds separate photo and attachment occurrences, and hashed/encrypted share tokens. Owner routes use the existing session and Origin guards; three explicitly registered public read routes use a bearer share token and a server-built public projection.

**Tech stack:** Existing TypeScript, Fastify 5, SQLite and Vitest. Add only `@fastify/multipart` 9.3.0 as a runtime dependency. Use Node crypto, streams and filesystem APIs. No server image conversion, browser UI, PDF, background queue or storage abstraction.

**Spec:** [Approved v1 design](../designs/2026-10-02-v1-records-design.md). No maintained specification exists yet; Plan 6 consolidates it. This plan does not supersede the design.

## Global constraints

- “One record per link.” A token never authorises owner APIs or another record.
- “Private content (§2) is excluded by the server, not merely hidden in the browser.”
- “Stored files are never deleted in v1.” Temporary, unpublished upload files are not stored blobs and must be cleaned up.
- “Originals are never modified or overwritten. Corrections add new files.”
- “Photos reference three blobs: original, display copy and thumbnail.” The browser prepares the latter two in Plan 5.
- “Raw tokens appear only in owner-authorised link management and in the chosen PDF QR code. They are never written to activity entries or logs.” Presenting the token to the public API is authentication, not permission to echo it in a response.
- Single owner, local-disk SQLite, integer IDs, English/Greek fixed codes, no soft deletes or record deletion. File occurrence IDs must never be reused.
- Never use real project files, the root development database, live credentials or production for tests. Use temporary directories and synthetic fixtures.

## Planning decisions

These fill implementation details left open by the design. They are proposals for this plan, not additional product features.

1. **Share URL:** `${publicOrigin}/share#${token}`. Plan 5 reads the fragment and sends `Authorization: Bearer <token>` to the public API. No tokens in query strings, route parameters, image URLs or redirects. Shared images/downloads use authenticated fetch and browser object URLs. This keeps the token out of ordinary proxy request URLs. The `/share` page itself arrives in Plan 5; Plan 4 delivers its API.
2. **Upload unit:** one attachment, or one photo bundle, per request. A photo bundle contains exactly `original`, `display` and `thumbnail`. No batch protocol or replacement of bytes. Metadata can be edited separately.
3. **Limits:** interpret MB as decimal bytes. Original photo ≤25,000,000; display JPEG ≤5,000,000; thumbnail JPEG ≤500,000; attachment ≤50,000,000. Empty files are rejected. Metadata JSON ≤16,384 bytes. Limits apply to actual streamed bytes, regardless of Content-Length. No limit on the number of saved occurrences.
4. **Types:** originals accept JPEG, PNG and HEIC/HEIF still images; derived copies are JPEG. Attachments also accept PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, ODT/ODS/ODP and RTF. SVG, HTML, archives uploaded as archives, executables and macro-specific extensions are rejected. Office files are downloads, never rendered by the server. Byte signatures and extension families must agree; client MIME is not trusted. This is format screening, not malware scanning or a full document validator.
5. **Dates:** photo `takenAt` is nullable, accepts an ISO timestamp with an explicit offset and is normalised to UTC. The browser reads metadata in Plan 5. Missing or ambiguous metadata stays null until the owner edits it; the server does not substitute upload time.
6. **Links:** label is required nonblank text, max 200 characters; optional expiry must be a future ISO timestamp on creation. Links may be created for Draft records, but remain unavailable while Draft. Create a new link to change label/expiry; no link editing or physical link deletion. Revocation is idempotent. The owner can copy a stored link, including an inactive one; the returned state tells the UI whether it is usable.
7. **Key changes:** a valid 32-byte key is required before the HTTP app starts. Missing/malformed keys stop startup. A changed key revokes all unrevoked links before routes become available. It does not silently re-encrypt links. A stored SHA-256 key fingerprint identifies a change; it is not the key. A server command handles deliberate revocation without needing the lost key.
8. **Public activity:** expose existing record activity through an explicit allowlist. Share-management activity is owner-only because labels identify recipients. Never publish share IDs, labels, counters, ciphertext or tokens. Unknown future activity actions/fields are omitted until explicitly reviewed.
9. **Views:** one successful GET of the public record API counts as one view. HEAD and file reads do not count. A failed projection or failed token check does not count. Counts are requests, not unique people.
10. **HTTP caching:** shared responses and owner link-management responses use `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and `X-Robots-Tag: noindex, nofollow`. File responses also use `X-Content-Type-Options: nosniff`. No conditional 304 shortcut, CDN caching, or direct static mount of the data directory.

## Review focus

Each item has a regression test in the named task.

1. Identical bytes uploaded publicly and privately must not let the public occurrence reveal the private filename, Log text or download — Tasks 3 and 7.
2. Revocation, expiry, Draft status and Log privacy changes between consecutive requests must take effect on files as well as pages — Task 7.
3. A truncated multipart request or failure after publishing bytes must leave no incomplete record evidence — Tasks 2 and 3.
4. Lost/replaced keys and malformed authenticated ciphertext must fail closed without leaking a token or reviving an old link — Task 4.
5. Existing and future private fields nested inside activity, Log or lookup data must not enter the public response — Task 6.

## Files and interfaces

| File | Responsibility |
|---|---|
| `src/domain/files.ts`, `src/domain/sharing.ts` | Strict metadata schemas, limits and public response types; no I/O |
| `src/server/db/migration-0003-files-sharing.ts` | Blob, occurrence, share and key-state tables |
| `src/server/files/storage.ts` | Stream staging, hashing, immutable publication and byte reads |
| `src/server/files/formats.ts` | Bounded signature/extension checks and canonical content types |
| `src/server/files/uploads.ts` | Multipart envelope parsing and cleanup |
| `src/server/files/occurrences.ts` | Occurrence CRUD and metadata lists |
| `src/server/files/routes.ts` | Owner upload, metadata, delete and download routes |
| `src/server/sharing/crypto.ts` | Token generation/hash and AES-256-GCM copy |
| `src/server/sharing/links.ts` | Owner management, lookup, key reconciliation and global revocation |
| `src/server/sharing/projection.ts` | Explicit public record payload and referenced labels |
| `src/server/sharing/routes.ts` | Public record/file reads and owner link routes |
| `src/server/http/logging.ts` | Safe request/error serializers with credential redaction |
| `scripts/revoke-share-links.ts` | Offline administrative revocation after key loss or restore |
| `tests/server/file-fixture.ts` | Synthetic file bytes, multipart builder and successful-upload helpers |

Existing integration points: `app.ts` registers routes; `http/guards.ts` already supports `config.multipart`; `records/log.ts` has the Plan 4 attachment-deletion marker; `records/activity.ts` owns append-only events; `config.ts` and `bootstrap.ts` own configuration/startup. Append migration 0003; do not alter 0001 or 0002.

Use existing `Db`, `requireRecord(db, projectId, recordId)`, `touchRecord(db, recordId, userId, at)`, `recordActivity(db, entry)`, `requireUserId(request)` and parameter schemas. Existing `makeFixture`, `postRecord`, `recordUrl`, `get`, `send` and `forceStatus` are in `tests/server/record-fixture.ts` and `tests/server/helpers.ts`.

### Shared contracts

Define these exported types once in the indicated domain files. Use explicit output object construction; do not publish database rows with spread syntax.

```ts
// domain/files.ts
type PhotoVariant = 'original' | 'display' | 'thumbnail';
interface PhotoMeta { phase: PhotoPhase; caption?: string | null; takenAt?: string | null }
interface AttachmentMeta { title?: string | null; logEntryId?: number | null }
interface PhotoOut {
  id: number; originalFilename: string; phase: PhotoPhase;
  caption: string | null; takenAt: string | null;
  uploadedBy: string; uploadedAt: string;
}
interface AttachmentOut {
  id: number; originalFilename: string; title: string | null;
  size: number; contentType: string; uploadedBy: string; uploadedAt: string;
  logEntry: { id: number; eventAt: string; text: string; private: boolean } | null;
}
// domain/sharing.ts
interface ShareCreateInput { label: string; expiresAt?: string | null }
interface ShareLinkOut {
  id: number; label: string; createdAt: string; expiresAt: string | null;
  revokedAt: string | null; lastViewedAt: string | null; viewCount: number;
  url: string | null; // null for copies encrypted under an unavailable old key
}
```

`PhotoPhase` is the existing domain vocabulary type. Export schemas `PhotoUploadMeta`, `PhotoPatch`, `AttachmentUploadMeta`, `AttachmentPatch`, `ShareCreate` and `PhotoVariantParam`, plus their types, through `src/domain/index.ts`. Optional free text follows Plan 3: preserve nonblank text exactly, map blank/whitespace-only text to null. Caption/title max 2,000 characters. PATCH schemas allow only phase/caption/takenAt for photos and title for attachments; reject empty patches and unknown keys. Moving an attachment between Log entries is not supported; delete/re-upload instead. Filename metadata is the browser-supplied basename: strip components separated by either slash style, then require 1–255 characters and reject NUL/control characters. Never use it as a filesystem path.

## Task 1: Persist blobs, occurrences and links

**Files:** create `src/server/db/migration-0003-files-sharing.ts`, `src/domain/files.ts`, `src/domain/sharing.ts`, `tests/server/files-db.test.ts`, `tests/domain/files-sharing.test.ts`; modify `src/server/db/migrations.ts`, `src/domain/index.ts`.

**Consumes:** existing migration runner, `PhotoPhase`, `Db`.
**Produces:** schemas above and migration `0003_files_sharing` with the following tables.

| Table | Columns and constraints |
|---|---|
| `blobs` | `hash TEXT PRIMARY KEY` (64 lowercase hex), `size INTEGER NOT NULL CHECK(size > 0)`, `content_type TEXT NOT NULL`; no filename or record ownership |
| `photos` | `id INTEGER PRIMARY KEY AUTOINCREMENT`, `record_id` FK records, three NOT NULL hash FKs named `original_hash`, `display_hash`, `thumbnail_hash`; `original_filename`, `phase` (before/during/after), nullable `caption`, `taken_at`; `uploaded_by` FK users, `uploaded_at` |
| `attachments` | nonreused integer `id`, `record_id` FK records, `blob_hash` FK blobs, `original_filename`, nullable `title`, nullable `log_entry_id`, `uploaded_by` FK users, `uploaded_at` |
| `share_links` | nonreused integer `id`, `record_id` FK records, `label`, unique `token_hash`, `key_fingerprint TEXT NOT NULL`; `token_ciphertext`, `token_nonce`, `token_tag` BLOBs; `created_by` FK users, `created_at`, nullable `expires_at`, `revoked_at`, `last_viewed_at`; `view_count INTEGER NOT NULL DEFAULT 0 CHECK(view_count >= 0)` |
| `share_key_state` | singleton `id INTEGER PRIMARY KEY CHECK(id=1)`, `fingerprint TEXT NOT NULL` |

Use NOT NULL for columns unless stated nullable. Add indexes on each record FK, attachments' Log FK, and the token hash via UNIQUE. Add `UNIQUE(id, record_id)` to `log_entries` with a new index, then a composite FK `(log_entry_id, record_id) REFERENCES log_entries(id, record_id) ON DELETE CASCADE` on attachments. The independent record FK remains. This prevents cross-record Log attachment links and atomically removes occurrences when a Log entry is deleted. Never use `ON DELETE SET NULL` here. Blob FKs restrict deletion; no blob deletion API exists.

- [ ] **Write failing schema tests.** Use a temporary migrated database and inspect row state, not just SQL text. Pin these assertions:

```ts
expect(() => insertAttachment({ recordId: a, logEntryId: logOnB })).toThrow();
deleteLog(logOnA);
expect(attachmentCount(logOnA)).toBe(0);
expect(blobCount()).toBe(beforeBlobCount);
expect(nextOccurrenceIdAfterDelete).toBeGreaterThan(deletedOccurrenceId);
expect(() => insertDuplicateTokenHash()).toThrow();
```

The local insertion helpers create the minimum fixture rows using SQL. Also test migration from only migrations 0001–0002 preserves an existing record, creates a pre-migration backup, and is idempotent. Schema tests cover strict input keys, all three phases, blank text, timestamp offsets, invalid expiry format and filename rules.
- [ ] Run `npx vitest run tests/server/files-db.test.ts tests/domain/files-sharing.test.ts`; confirm failures reflect missing tables/schemas.
- [ ] Implement the schemas, migration and exports. Expiry's future check belongs in the link service with its supplied clock, not in a time-dependent Zod schema.
- [ ] Run those tests and `npm run typecheck`; all pass.
- [ ] Commit only Task 1 files: `feat: add file occurrences and share-link schema`.

## Task 2: Stream and publish immutable file bytes

**Files:** create `src/server/files/storage.ts`, `src/server/files/formats.ts`, `tests/server/file-storage.test.ts`, `tests/server/file-fixture.ts`; modify `src/server/config.ts`, `tests/server/config.test.ts`.

**Consumes:** `config.dataDir`, file limits from Task 1.
**Produces:** `config.filesDir = join(dataDir, 'files')` and these server interfaces:

```ts
interface StagedFile { path: string; hash: string; size: number; contentType: string }
stageFile(filesDir: string, source: Readable, filename: string,
  purpose: 'photo-original' | 'photo-display' | 'photo-thumbnail' | 'attachment'): Promise<StagedFile>;
publishFile(filesDir: string, staged: StagedFile): Promise<void>;
discardStaged(staged: StagedFile): Promise<void>;
blobPath(filesDir: string, hash: string): string;
```

`Readable` is Node's readable stream type. Paths are `<filesDir>/<first-two-hash-chars>/<hash>`. Temp files live under `<filesDir>/.tmp/` with random names and exclusive creation. `blobPath` validates the entire hash before joining paths.

- [ ] **Write failing tests** for streaming limits, content hashes, unchanged originals, deduplication and failure cleanup. Include:

```ts
expect(await readFile(blobPath(dir, staged.hash))).toEqual(originalBytes);
expect((await stageSameBytesTwice()).map(x => x.hash)).toEqual([hash, hash]);
await expect(stageWithLimitPlusOneByte()).rejects.toMatchObject({ statusCode: 413 });
expect(await temporaryFiles()).toEqual([]);
await Promise.all([publishFile(dir, sameA), publishFile(dir, sameB)]);
expect(await readFile(blobPath(dir, hash))).toEqual(originalBytes);
```

Also test an interrupted source, zero bytes, Greek filename, traversal-like filename, misleading MIME/extension, HTML renamed JPEG, existing destination with wrong bytes, and each permitted signature family. Boundary tests use generated streams rather than allocating 50 MB buffers. Use actual tiny synthetic JPEG/PNG and generated office-family headers; these are format-screening fixtures, not proof of full document validity.
- [ ] Run `npx vitest run tests/server/file-storage.test.ts`; confirm expected failures.
- [ ] Implement bounded streaming with backpressure: count bytes and compute SHA-256 while writing; retain at most the first 512 bytes for format screening. Flush and close the completed temp file before publication. Reject over-limit, truncated or malformed sources and remove their temp files.

Canonical signature policy: JPEG starts `FF D8 FF`; PNG has its eight-byte signature; PDF starts `%PDF-`; RTF starts `{\rtf`; legacy Office has OLE compound-file signature `D0 CF 11 E0 A1 B1 1A E1`; modern Office/OpenDocument has ZIP local-file signature `50 4B 03 04`. HEIC/HEIF requires a bounded ISO BMFF `ftyp` box with `heic`, `heix`, `hevc` or `hevx` in its major/compatible brands; `.heic` and `.heif` are accepted extensions. Reject generic `mif1` alone rather than misidentifying another image format. For Office containers, extension membership in the relevant family is required; no ZIP extraction or document execution. Store deterministic byte-family MIME (`application/x-cfb` or `application/zip` for these containers), not extension-dependent MIME, so identical bytes always deduplicate consistently. Images use JPEG/PNG/HEIC MIME, PDF `application/pdf`, RTF `application/rtf`.

Publication: use an atomic, exclusive hard link from the completed temp file to the destination on the same filesystem, then unlink only the temp name. On EEXIST, verify the existing file's size and streamed hash before reuse; never overwrite or repair it silently. Any other filesystem error fails the upload. Flush file contents before publication; on the Linux server, sync the destination directory after publication before permitting the database commit. Use the Windows-supported file flush in local tests; do not pretend Windows supports Linux directory handles. Do not expose the final path until the full bytes exist. A failure may leave an unreferenced completed blob, which is safe and retained. Do not perform filesystem awaits inside a SQLite transaction.
- [ ] Run storage/config tests and typecheck. Confirm a second publication does not change original bytes.
- [ ] Commit Task 2 files: `feat: store immutable content-addressed file bytes`.

## Task 3: Owner evidence uploads and occurrence management

**Files:** create `src/server/files/uploads.ts`, `src/server/files/occurrences.ts`, `src/server/files/routes.ts`, `tests/server/files-api.test.ts`; modify `package.json`, `package-lock.json`, `src/server/app.ts`, `src/server/records/log.ts`, `tests/server/file-fixture.ts`.

**Consumes:** Task 1 schemas, Task 2 storage, `requireRecord`, `touchRecord`, existing session/Origin guards.
**Produces:** owner routes below, and `listPhotos(db, recordId): PhotoOut[]`, `listAttachments(db, recordId): AttachmentOut[]` for Task 6.

Prefix `R = /api/projects/:projectId/records/:id`:

| Method and suffix | Body / result |
|---|---|
| `POST R/photos` | Multipart: JSON text field `metadata` (PhotoMeta), files `original`, `display`, `thumbnail`; 201 PhotoOut |
| `GET R/photos` | PhotoOut[], phase before/during/after, then upload time descending, ID descending |
| `PATCH R/photos/:itemId` | JSON metadata patch; PhotoOut |
| `DELETE R/photos/:itemId` | JSON `{}`; `{ok:true}` |
| `POST R/attachments` | Multipart: `metadata` (AttachmentMeta), one `file`; 201 AttachmentOut |
| `GET R/attachments` | All occurrences, including those on private Log entries; newest upload first, ID descending |
| `PATCH R/attachments/:itemId` | JSON title patch; AttachmentOut |
| `DELETE R/attachments/:itemId` | JSON `{}`; `{ok:true}` |

All lookup/update/delete operations scope occurrence to the route's record and project. A direct attachment has `logEntry:null`; a Log attachment joins the entry's **current** date, text and private flag. The same occurrence ID is used in both panes. Plan 5 can associate the Log's files from this list; do not create a second attachment relationship or copy files into Log JSON. Map malformed envelopes/metadata to 400 `invalid_upload`, invalid types to 415 `unsupported_file_type`, multipart size/part-limit failures to 413 `upload_too_large`, missing associations to 404, and disk/database faults to the existing generic 500 response. Never include disk paths or multipart contents in error details.

- [ ] Add `@fastify/multipart@9.3.0` using `npm install --save-exact @fastify/multipart@9.3.0 --ignore-scripts`; retain the README's `npm rebuild esbuild` workaround when a clean install needs it. Inspect the lockfile and runtime dependency audit; no unrelated upgrade. Register without `attachFieldsToBody`, which would buffer uploads before authorisation.
- [ ] **Write failing API tests** using multipart Buffers only for small fixtures and streams for large limits. Test real Fastify injection, successful response codes and persisted state. Required cases:

```ts
expect(upload.statusCode).toBe(201);
expect(photos[0]).toMatchObject({ originalFilename: 'όψη.jpg', phase: 'before' });
expect(attachments[0].logEntry).toMatchObject({ id: entry.id, text: 'Plans received' });
expect(second.id).not.toBe(first.id); // same bytes, separate metadata
expect(blobRowsForSameBytes).toBe(1);
expect(afterDeletingPrivateLog.attachments).not.toContainEqual(expect.objectContaining({ id: privateFile.id }));
expect(await storedBytesStillExist()).toBe(true);
```

Also require: missing cookie 401; wrong/missing Origin 403; multipart on ordinary record PATCH 415; JSON on upload rejected 415; duplicate/missing/unknown parts 400; too many parts/bytes 413; metadata after files works; failed third photo part creates no photo or record timestamp change; wrong Log record 404; deleted Log during streaming is rejected at final transaction; metadata edit preserves uploader/time and touches record; another record's occurrence 404. Force a SQLite failure after occurrence insertion and assert occurrence, blob rows and record metadata roll back while completed disk bytes remain safe.
- [ ] Run `npx vitest run tests/server/files-api.test.ts`; confirm failures are missing routes/behaviour.
- [ ] Implement one streaming iterator over `request.parts()`. Only these two POST routes set `config.multipart:true`. Enforce multipart content type explicitly: the existing guard also accepts JSON, so it alone is insufficient. Reject duplicate fields, unknown names and unexpected parts. Set explicit parser bounds: photo files 3, fields 1, parts 4, per-file parser ceiling 25,000,000; attachment files 1, fields 1, parts 2, ceiling 50,000,000; both fieldSize 16,384, fieldNameSize 100 and headerPairs 100. Stage enforces the lower derived-file limits. Detect field/file truncation; consume or terminate rejected streams so requests cannot hang. Clean temporary files in `finally`, including errors late in the multipart envelope.
- [ ] Validate the target record before streaming, validate the whole envelope before publication, publish all files, then open a **synchronous** SQLite transaction. Recheck record and Log association; insert blob metadata with collision verification, insert occurrence, and touch record. No occurrence is committed before all files are complete. New publication can leave retained orphan bytes on a later error, never dangling references to partial files.
- [ ] Implement JSON edit/delete and lists. The Task 1 composite FK already makes Log deletion cascade within `deleteLogEntry`'s transaction; update the Plan 4 comment to describe that constraint. Test cascade rollback on a forced transaction failure. Never remove stored blob rows or bytes.
- [ ] Run file API tests, existing `log-api.test.ts`, `records-reads.test.ts`, and typecheck; all pass.
- [ ] Commit Task 3 files: `feat: upload and manage record photos and attachments`.

## Task 4: Token cryptography, configuration and key-loss handling

**Files:** create `src/server/sharing/crypto.ts`, `src/server/sharing/links.ts`, `scripts/revoke-share-links.ts`, `tests/server/share-crypto.test.ts`, `tests/server/share-key.test.ts`; modify `src/server/config.ts`, `src/server/app.ts`, `tests/server/config.test.ts`, `tests/server/helpers.ts`, `.env.example`, `package.json`, `README.md`.

**Consumes:** Node crypto, migration 0003, AppConfig.
**Produces:** `AppConfig.shareKey: Buffer | null`, parsed from `SHARE_LINK_KEY` (exactly 64 hex characters; no default key); the interfaces below. `loadConfig` permits absent key as null so offline owner/seed/revoke commands can still run. **buildApp refuses null before registering/listening**, and reconciles a valid key before any request can arrive. Tests inject a fixed synthetic key through helpers, never the real environment.

```ts
interface EncryptedToken { ciphertext: Buffer; nonce: Buffer; tag: Buffer }
newShareToken(): string; // randomBytes(32).toString('base64url'), 43 chars
hashShareToken(token: string): string; // SHA-256 hex
encryptShareToken(token: string, key: Buffer, recordId: number): EncryptedToken;
decryptShareToken(value: EncryptedToken, key: Buffer, recordId: number): string;
reconcileShareKey(db: Db, key: Buffer, now?: Date): number; // revoked count
revokeAllShareLinks(db: Db, now?: Date): number;
```

- [ ] **Write failing tests** for exact key/token encodings and authenticated encryption:

```ts
expect(newShareToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
expect(encrypted.nonce).toHaveLength(12);
expect(encrypted.tag).toHaveLength(16);
expect(encrypted.ciphertext.includes(Buffer.from(token))).toBe(false);
expect(decryptShareToken(encrypted, key, recordId)).toBe(token);
expect(() => decryptShareToken(tampered, key, recordId)).toThrow();
expect(() => decryptShareToken(encrypted, key, otherRecordId)).toThrow();
expect(reconcileShareKey(db, replacementKey, clock)).toBe(activeLinkCount);
```

Also test wrong key, changed nonce/tag, malformed lengths, fresh nonce for repeated encryption, malformed decoded token, missing/malformed configuration, unchanged-key restart preserving links, changed-key restart revoking them before app.ready, missing fingerprint with existing links revoking them, and zero links not requiring a user row. SQL failure must roll back both revocation and fingerprint update.
- [ ] Run the two new test files; confirm failures.
- [ ] Implement AES-256-GCM with a fresh 12-byte random nonce and 16-byte tag. Bind AAD to UTF-8 `builtbasis-share-v1:<recordId>`. Validate canonical token format before hashing incoming tokens and after decrypting; compare its hash to the row's token hash when serving an owner copy. Decryption/copy failure returns a controlled server error with no ciphertext/token details. Do not invent a token or fall back to plaintext.
- [ ] Reconcile fingerprint and revoke all nonrevoked rows in one transaction. On first empty database, store fingerprint. Missing state with any links is treated as a key change. Administrative revocations update access rows only; no fabricated owner activity or record edit. Keep revoked rows, including encrypted copies that can no longer be decrypted; owner lists return `url:null` for those old-key rows. Compare each link's Task 1 `key_fingerprint` against the configured key fingerprint before decrypting. A matching-key authentication failure is an error, not an ordinary old-key null URL.
- [ ] Add `npm run shares:revoke-all` calling `tsx scripts/revoke-share-links.ts`. It loads local/configured environment, opens/migrates through existing bootstrap, calls global revocation and closes the database. It does not call buildApp or need the old key. Document: stop application, run command, install a newly generated 32-byte key outside data/backups/repository, restart and issue replacement links. Never display the old/new key in logs or write a generated key into the repository. `.env.example` has a comment/blank placeholder, not a working key.
- [ ] Run new tests, config tests, full suite and typecheck. Fix existing helpers for the required HTTP key; preserve offline command behaviour.
- [ ] Commit Task 4 files: `feat: encrypt share tokens and revoke links on key changes`.

## Task 5: Owner link management and safe request logging

**Files:** create `src/server/sharing/routes.ts`, `src/server/http/logging.ts`, `tests/server/share-links-api.test.ts`, `tests/server/share-logging.test.ts`; modify `src/server/sharing/links.ts`, `src/server/app.ts`, `src/server/records/activity.ts`.

**Consumes:** crypto and key reconciliation, `recordActivity`, `requireRecord`, `ShareCreateInput`.
**Produces:**

```ts
createShareLink(db: Db, config: AppConfig, projectId: number, recordId: number,
  userId: number, input: ShareCreateInput, now?: Date): ShareLinkOut;
listShareLinks(db: Db, config: AppConfig, projectId: number, recordId: number): ShareLinkOut[];
revokeShareLink(db: Db, projectId: number, recordId: number, linkId: number,
  userId: number, now?: Date): void;
```

Routes: `GET/POST R/share-links`, `POST R/share-links/:itemId/revoke` with JSON `{}`. POST create returns 201, revoke `{ok:true}`. Lists newest-created first, ID descending; only owner responses contain the URL. No token is returned by public reads.

- [ ] **Write failing API/log-capture tests.** Create, list/copy, expiry boundary, revoke twice, cross-record/project IDs, missing session and Origin, rejected payloads, and rollback on activity failure. Assertions include:

```ts
expect(copied.url).toBe(created.url);
expect(created.url).toMatch(/\/share#[A-Za-z0-9_-]{43}$/);
expect(rawDatabaseText).not.toContain(token);
expect(JSON.stringify(ownerActivity)).not.toContain(token);
expect(capturedLogText).not.toContain(token);
expect(revokedActivityCountAfterTwoCalls).toBe(1);
```

Capture logs with Fastify logging actually enabled and a writable in-memory stream. Exercise incoming bearer header, a mistaken `?token=<token>` request, malformed public path containing token text, wrong Origin, thrown internal error, and owner create/list responses. Do not conclude logging is safe from a default logger:false fixture.
- [ ] Run these tests; verify failures.
- [ ] Implement create/revoke transactionally with `share_created` / `share_revoked` activity actions; detail is `{linkId,label}` only. Extend ActivityAction. Touch the record on owner create/revoke, following Plan 3's metadata contract; repeated revoke is a no-op. Never put the raw token, URL, hash, ciphertext or key in activity. GET/list remains read-only.
- [ ] Configure logging before Fastify constructs its logger. Emit request method and a constant route-independent marker instead of raw URL; do not serialize request headers, query, body or response payload. Redact authorization/cookie/set-cookie as defence in depth. Error logs use a controlled code/type, not arbitrary error.message, stack, request/response objects or nested causes that may carry tokens. Retain request IDs and status/timing. Widen `AppDeps.logger` to `FastifyServerOptions['logger']` to accept a test destination, applying the safe serializers/redaction after any supplied options so tests cannot replace the policy. Validate all logging tests with normal and error paths.
- [ ] Run link/logging tests, existing auth and GET guard tests, and typecheck.
- [ ] Commit Task 5 files: `feat: manage private share links with credential-safe logging`.

## Task 6: Public record projection and bearer read route

**Files:** create `src/server/sharing/projection.ts`, `tests/server/shared-record-api.test.ts`; modify `src/domain/sharing.ts`, `src/server/sharing/links.ts`, `src/server/sharing/routes.ts`, `src/server/http/guards.ts`.

**Consumes:** `getRecordDetail`, `listOptions`, `listMeasurementSets`, `listVerifications`, `listLog`, `listActivity`, Task 3 lists. Use their existing names/signatures, not copies of repository logic.
**Produces:**

```ts
interface ShareAccess { linkId: number; projectId: number; recordId: number }
authorizeShare(db: Db, authorization: string | undefined, now?: Date): ShareAccess;
buildSharedRecord(db: Db, access: ShareAccess): SharedRecord;
```

`authorizeShare` accepts exactly one canonical `Bearer <43-char-token>`, looks up its hash and current record, rejects `revoked_at != null`, `expires_at <= now`, missing record or Draft. All failures are `404 {error:'not_available'}`; never reveal the reason. It has no side effects. Owner cookies do not bypass checks on public routes.

Route: `GET /api/shared/record` (and HEAD with zero counter writes). Add route config `shareRead?: boolean`; only the three explicit public routes in this and Task 7 set it. The session guard permits only GET/HEAD with that flag; it does not exempt a URL prefix. Bearer tokens never authenticate other `/api` routes. Mutation guards remain unchanged.

### Public payload allowlist

`SharedRecord` is `{record, options, measurements, verifications, photos, attachments, log, activity, labels}`. No owner link-management information appears. No blob hashes, filesystem paths or capability-bearing URLs appear.

- `record` explicitly copies these RecordDetail properties only: `id, humanId, subtype, status, statusReason, title, description, reference, ballInCourtId, responsibleId, tradeIds, severity, priority, dueDate, completion, safety, tagIds, locationIds, problemTypes, stage, disposition, correction, question, route, issuedById, chosenOptionId, decidedById, decidedOn, instructionText, createdAt, updatedAt`. Also resolve `createdBy` and `updatedBy` as usernames from the records table's user FKs, satisfying design §5.1; these are absent from the current owner RecordDetail DTO. Add `mustBeDoneBefore` and `requiresFirst` as `{humanId,title}[]`, filtering out Draft entries. No internal linked ID, status, URL or access grant.
- `options`: explicit `id,label,description` for this record. `measurements`: explicit existing MeasurementSetOut fields and explicit row fields. `verifications`: explicit existing Verification fields. These contain no private notes field; measurement/verification notes are public by design.
- `photos`: explicit PhotoOut fields. `attachments`: explicit AttachmentOut fields, but exclude entries whose current Log row is private; remove the `private` property from the public Log reference. Direct entries have `logEntry:null`.
- `log`: only nonprivate entries; explicit `id,eventAt,text,loggedBy` plus `attachmentIds` from already-filtered occurrences. Do not return loggedAt/editedAt/private markers.
- `activity`: base keys `id,at,by,action,field,from,to,detail`. Accept `created` with scalar draft target, `status_changed` with scalar status codes, and `field_changed` only for Plan 3's tracked public fields: ballInCourtId, responsibleId, severity, priority, dueDate, disposition, chosenOptionId, decidedById, decidedOn, instructionText. Field from/to values must be scalar/null of the expected type. Status detail permits only `reasonCode,reasonNote,note,verification`; verification permits only `id,outcome,method,checkedById,date`. Chosen-option detail permits only `fromOption,toOption`, each null or `{label,description}`. Other field changes and creation have null detail. Preserve public old/new text exactly. Unknown fields/actions/details are omitted; do not blindly include JSON `detail` or arbitrary from/to objects.
- `labels` contains only referenced managed entries: people `{id,code,name,role}` for visible current/history/measurement/verification person IDs; trades/tags `{id,nameEn,nameEl}` for selected IDs; locations `{id,path:[{id,nameEn,nameEl,kind,zoneTypeId}]}` for selected nodes and their ancestors; zone types `{id,nameEn,nameEl}` used in those paths. Include retired referenced entries. Never return the project people directory, phone/email, unrelated tags/locations or private-log-only references. Fixed bilingual vocabularies remain in shared domain code for Plan 5.

Define concrete SharedRecord types in `domain/sharing.ts` without importing server modules. Use pure structural types for the nested contracts above. Runtime output construction is an allowlist, not `Omit<RecordDetail,...>` plus spreading.

- [ ] **Write failing tests** for every nonprivate section and private sentinels, with two projects and multiple unrelated records. Include:

```ts
expect(res.statusCode).toBe(200);
expect(payload.record).not.toHaveProperty('notes');
expect(payload.record).not.toHaveProperty('outsideScope');
expect(payload.record).not.toHaveProperty('estimatedCost');
expect(JSON.stringify(payload)).not.toContain('PRIVATE_SENTINEL');
expect(payload.record.mustBeDoneBefore).toEqual([{ humanId: publicTask.humanId, title: publicTask.title }]);
expect(Object.keys(payload.record.mustBeDoneBefore[0]).sort()).toEqual(['humanId', 'title']);
expect(linkAfter.viewCount).toBe(linkBefore.viewCount + 1);
expect(recordAfter).toEqual(recordBefore);
```

Seed distinct private sentinels in Notes, private Log text/attachment filename/title, share label, unknown activity field/detail and unrelated people. Assert exact property sets in nested collections, not only substring absence. Check old/new instruction and option snapshots still appear; retired visible people resolve; Draft relationship is omitted in both directions. Revoked, expired-at-exact-now, malformed, unknown and Draft tokens all return the same 404. HEAD authenticates and returns no body without changing `total_changes()`. A forced projection error leaves count/time unchanged. GET cannot create a link or alter evidence; owner list reads still cause zero writes.
- [ ] Run shared-record tests and confirm failures.
- [ ] Implement authorisation and projection. Perform authorisation, synchronous projection and view update in one database transaction; only successful GET updates the link with `view_count = view_count + 1, last_viewed_at = now`. No `touchRecord`, new activity, session refresh or access mutation. Set no-store/noindex/no-referrer headers before returning, including failures. Do not place bearer values in validation details.
- [ ] Run new tests, existing auth/records-reads tests and typecheck.
- [ ] Commit Task 6 files: `feat: serve a private-content-free shared record API`.

## Task 7: Authorise every file request by occurrence

**Files:** create `src/server/files/downloads.ts`, `tests/server/file-access.test.ts`; modify `src/server/files/routes.ts`, `src/server/sharing/routes.ts`.

**Consumes:** Task 2 blob paths, Task 3 occurrences, `authorizeShare`.
**Produces:**

```ts
interface FileTarget { hash: string; size: number; contentType: string; filename: string }
resolvePhotoFile(db: Db, recordId: number, photoId: number, variant: PhotoVariant): FileTarget;
resolveAttachmentFile(db: Db, recordId: number, attachmentId: number,
  audience: 'owner' | 'shared'): FileTarget;
sendFile(reply: FastifyReply, filesDir: string, target: FileTarget,
  disposition: 'inline' | 'attachment'): Promise<void>;
```

Owner GET/HEAD routes: `R/photos/:itemId/:variant` and `R/attachments/:itemId/file`. Public GET/HEAD routes: `/api/shared/photos/:itemId/:variant` and `/api/shared/attachments/:itemId/file`. Public routes first resolve the bearer token's record; they never accept a caller-supplied record/project ID. The route param `itemId` always identifies an occurrence, never a blob. Each request rechecks current token and current Log privacy. Public requests cannot fall back to owner cookie access.

- [ ] **Write failing integration tests**, using synthetic same-byte occurrences. Test every photo variant, attachment origin and access state:

```ts
expect((await publicDownload(tokenA, publicOccurrence.id)).statusCode).toBe(200);
expect((await publicDownload(tokenA, privateOccurrence.id)).statusCode).toBe(404);
expect((await publicDownload(tokenA, occurrenceOnB.id)).statusCode).toBe(404);
expect((await publicDownload(revokedToken, publicOccurrence.id)).statusCode).toBe(404);
expect((await publicDownload(tokenA, deletedOccurrence.id)).statusCode).toBe(404);
expect(ownerDownloadOfPrivate.rawPayload).toEqual(originalBytes);
expect(sharedFileReadChanges).toBe(0);
```

Cover transitions public→private and private→public on the Log, deletion of a private Log entry, same blob attached to a second record, removed occurrence re-uploaded with a new ID, missing file on disk, malicious/pathlike/Greek filenames, owner session expiry, Draft after link creation, exact expiry, wrong variants, hash-path guessing and HEAD. Assert denied responses contain no private filename/title/Log text. Revocation applies to original, display and thumbnail. No conditional request or Range header can bypass authentication; v1 may ignore Range and return a full 200 response.
- [ ] Run file-access tests and confirm failures.
- [ ] Implement metadata resolution synchronously from the current occurrence and parent Log row. Owner downloads require session plus project/record scoping. Every public denial returns the same `not_available` result. Resolve/check authorisation before opening a file or emitting filename headers. Byte reads do not query by hash supplied by a client.
- [ ] Stream files with backpressure. Use attachment disposition for originals and all attachments, including PDF; only JPEG display/thumbnail copies are inline. Include an ASCII fallback filename and percent-encoded UTF-8 `filename*`, stripping control characters and path components from the **header** without altering stored metadata. Derived names append `-display.jpg` or `-thumbnail.jpg` to a safe basename. Set canonical MIME, Content-Length, no-store, nosniff and sandbox CSP on file responses. On missing disk bytes return a controlled error without leaking the disk path. Authorised downloads already sent or in flight cannot be clawed back; subsequent requests are checked again.
- [ ] Run file-access, shared-record, files-api and auth tests; typecheck passes.
- [ ] Commit Task 7 files: `feat: secure owner and shared downloads by occurrence`.

## Task 8: Verify the boundary and hand off to the web plan

**Files:** modify `README.md`, this plan, `docs/plans/2026-10-02-v1-roadmap.md`; create `docs/guides/share-key-management.md`; amend regression tests only for concrete gaps found here.

**Consumes:** all completed tasks. **Produces:** verified local API, key operator instructions, and explicit Plan 5/6 contracts.

- [ ] Run `npm test` and `npm run typecheck` on the final tree. All tests pass. Record actual counts; do not invent a forecast count or replace old passing tests to match it. Run `git diff --check` and inspect dependency changes. Document relevant new production dependency advisories if any; no blanket upgrade.
- [ ] Check the design §13 matrix against Tasks 1–7. Capture application logs with logging enabled and prove generated tokens/session credentials are absent. Verify every saved occurrence in test fixtures points to complete disk bytes. Read-only file and owner APIs must leave SQLite `total_changes()` unchanged; public record GET is the sole counter exception. Inject a transaction failure into link creation/revocation and Log deletion to verify rollback.
- [ ] Write the key guide from the tested command. Include first setup, restart with unchanged key, lost/replaced key, and restore revocation requirements. Explain that config/key is outside repository/data/backups; Plan 6 deployment must preserve it. Test the documented revocation command as a subprocess against a temporary database, including missing key. Do not perform a real restore or rotate a real key in this plan.
- [ ] Record Plan 5 handoff: browser supplies original plus JPEG copies; EXIF reading and HEIC decoding/fallback are browser work; URL fragment is read locally and sent only in an Authorization header; image/download fetch uses Blob object URLs that are revoked after use; Greek is default; `/share` shell sends noindex and no-referrer; no third-party scripts on share pages. Resolve created/updated usernames for the owner screen too (current owner RecordDetail contains only timestamps). Do not claim browser HEIC support has been proved by server tests.
- [ ] Record Plan 6 handoff: backup enumeration must cover all hashes in `blobs` (or at least all three photo references and attachments); exclude `.tmp` and config from backups. Restore deletes sessions and revokes every link before reopening access. Reverse-proxy/Cloudflare rules must preserve no-store and redact Authorization; no request-body logging. Validate the 50 MB upload path and memory behaviour on hosting during deployment. PDF reuses an owner-selected existing URL; it does not create links on GET.
- [ ] Update plan lifecycle to Completed/Historical only after implementation and review. Record actual commits, tests, merge state, deviations and deferrals. Keep the approved design active. No maintained specification is being changed here; Plan 6 still owns v1 specification/Architecture consolidation. Link the key guide from README and update roadmap status.
- [ ] Commit documentation and any verified regression fixes: `docs: close files and sharing implementation`.

## Preflight and execution checks

Before Task 1, inspect clean status and read the approved design plus this plan. Create the execution worktree at that time. Confirm `main` includes `8324b2e`, or assess later changes by interface rather than assuming an old line number. Baseline `npm test` is 237 tests/29 files and `npm run typecheck` passes on that commit. Installation uses the documented `npm ci --ignore-scripts` / `npm rebuild esbuild` sequence. Do not run the server against the real local database just to test migrations.

Current named integration checks: `getRecordDetail`, `listOptions`, `listMeasurementSets`, `listVerifications`, `listLog`, `listActivity`; the multipart route-config flag; Log deletion's transaction; migration registration; config consumers in owner/seed scripts. Changes to authentication apply globally: rerun the original auth suite after Tasks 5–7.

## Self-review record

- Design coverage: files/occurrences and deletion in Tasks 1–3; encrypted links and key loss in Tasks 4–5; private projection and counters in Task 6; all file authorisation paths in Task 7; operational handoffs and docs in Task 8.
- Interfaces checked against `8324b2e`. File and sharing functions in this document are new planned interfaces, not claims that code exists.
- New implementation/tests have not been run. This document is deliberately a plan with signatures, assertions and algorithms where necessary, not a transcript of an already-tested implementation.
- Browser screens, photo conversion/EXIF, language controls, PDF and deployment/restore remain in Plans 5–6. There is no hidden dependency on those plans for API testing.

## Technical references checked while planning

- [Fastify multipart 9.3.0 package](https://github.com/fastify/fastify-multipart/blob/v9.3.0/package.json) and [multipart streaming documentation](https://github.com/fastify/fastify-multipart): use streaming parts, explicit part/file limits and truncation handling. Multipart is not safely bounded by the ordinary JSON body limit alone.
- [Fastify logging](https://fastify.dev/docs/latest/Reference/Logging/): configure logging/serializers when constructing the app; test with logging enabled.
- [Node crypto](https://nodejs.org/api/crypto.html): built-in random bytes, SHA-256 and authenticated AES-GCM.
- [Node 24 filesystem APIs](https://nodejs.org/docs/latest-v24.x/api/fs.html): stream temporary bytes and publish using same-filesystem links without replacing an existing file.
