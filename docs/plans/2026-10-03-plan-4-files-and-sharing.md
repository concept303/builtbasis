# Plan 4 — Files and Sharing Implementation Plan

> **Document type:** Implementation plan
> **Status:** Draft
> **Retention:** Current planning document. Review before execution.
> **Implements:** `docs/designs/2026-10-02-v1-records-design.md` §2, §5.8–5.12, §11.3–11.5 and the relevant API tests in §13.
> **Depends on:** Plan 3, merged to `main` at `8324b2e`. Baseline: 237 tests across 29 files; TypeScript passes.
> **Implemented by:** Not implemented.
> **Verified:** Product implementation not verified or merged. The proposed code is checked separately by the scratch replay recorded below.
> **Planning check:** 2026-10-03 — complete code and tests replayed from this document in a separate disposable checkout. See the replay evidence for commands, results and limits.
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
4. **Types:** originals accept JPEG, PNG and HEIC/HEIF still images; derived copies are JPEG. Attachments also accept PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, ODT/ODS/ODP, RTF and DWG (download only). SVG, HTML, archives uploaded as archives, executables and macro-specific extensions are rejected. Office files are downloads, never rendered by the server. Byte signatures and extension families must agree; client MIME is not trusted. This is format screening, not malware scanning or a full document validator.
5. **Dates:** photo `takenAt` is nullable, accepts an ISO timestamp with an explicit offset and is normalised to UTC. The browser reads metadata in Plan 5. Missing or ambiguous metadata stays null until the owner edits it; the server does not substitute upload time.
6. **Links:** label is required nonblank text, max 200 characters; optional expiry must be a future ISO timestamp on creation. Links may be created for Draft records, but remain unavailable while Draft. Create a new link to change label/expiry; no link editing or physical link deletion. Revocation is idempotent. The owner can copy a stored link, including an inactive one; the returned state tells the UI whether it is usable.
7. **Key changes:** a valid 32-byte key is required before the HTTP app starts. Missing/malformed keys stop startup. A changed key revokes all unrevoked links before routes become available. It does not silently re-encrypt links. A stored SHA-256 key fingerprint identifies a change; it is not the key. A server command handles deliberate revocation without needing the lost key.
8. **Public activity:** expose existing record activity through an explicit allowlist. Share-management activity is owner-only because labels identify recipients. Never publish share IDs, labels, counters, ciphertext or tokens. Unknown future activity actions/fields are omitted until explicitly reviewed.
9. **Views:** one successful GET of the public record API counts as one view. HEAD and file reads do not count. A failed projection or failed token check does not count. Counts are requests, not unique people.
10. **HTTP caching:** shared responses and owner link-management responses use `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and `X-Robots-Tag: noindex, nofollow`. File responses also use `X-Content-Type-Options: nosniff`. No conditional 304 shortcut, CDN caching, or direct static mount of the data directory.
11. **Public actor identities — proposed design clarification:** omit the login username from all public responses, including created/updated users, uploaders, Log authors and activity actors. Keep these values in owner responses and storage. With one editing account, publishing its login identifier adds no useful distinction. This narrows design §5.1/§5.11's public actor information; reconcile the approved design when this plan is approved, before execution. People selected as responsible, decision-maker, measurer or verifier remain public business references, not login accounts.
12. **Administrative revocations — proposed design exception:** key-change/global administrative revocation updates share-link rows without appending per-record owner activity. No owner request performed the change, and the existing activity table requires an owner user ID. The command/startup emits only a safe reason code and revoked-link count. This is an explicit exception to design §5.12's universal revocation logging rule; reconcile the approved design when this plan is approved, before execution. Owner-requested revocations still append activity atomically.

The owner selected a full-code plan with scratch replay and approved download-only DWG attachments on 2026-10-03. The complete file blocks below implement those choices in a disposable scratch checkout. Astra Medium is an explicit owner instruction from this conversation and remains the execution preference.

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
| `src/server/files/downloads.ts` | Occurrence resolution and GET/HEAD file responses |
| `src/server/sharing/crypto.ts` | Token generation/hash and AES-256-GCM copy |
| `src/server/sharing/links.ts` | Owner management, lookup, key reconciliation and global revocation |
| `src/server/sharing/projection.ts` | Explicit public record payload and referenced labels |
| `src/server/sharing/routes.ts` | Public record/file reads and owner link routes |
| `src/server/http/logging.ts` | Safe request/error serializers with credential redaction |
| `src/server/http/privacy.ts` | Shared privacy-response headers |
| `scripts/revoke-share-links.ts` | Offline administrative revocation after key loss or restore |
| `tests/server/file-fixture.ts` | Synthetic file bytes, multipart builder and successful-upload helpers |

Existing integration points: `app.ts` registers routes; `http/guards.ts` already supports `config.multipart`; `records/log.ts` has the Plan 4 attachment-deletion marker; `records/activity.ts` owns append-only events; `config.ts` and `bootstrap.ts` own configuration/startup. Append migration 0003; do not alter 0001 or 0002.

Use existing `Db`, `requireRecord(db, projectId, recordId)`, `touchRecord(db, recordId, userId, at)`, `recordActivity(db, entry)`, `requireUserId(request)` and parameter schemas. Existing `makeFixture`, `postRecord`, `recordUrl`, `get`, `send` and `forceStatus` are in `tests/server/record-fixture.ts` and `tests/server/helpers.ts`.

### Shared contracts

The complete domain schemas and output types appear in Task 1, with the public projection types added in Task 6. Those file blocks define the interfaces. Public objects are constructed explicitly; database rows are never returned by spreading their properties.

## How to use the exact code

Read [Preflight and execution checks](#preflight-and-execution-checks) before Task 1. Each file block below is the complete file at that step. Create or replace the named file exactly. Apply test/helper blocks first, observe the stated failure, then apply implementation blocks and verify. Do not copy later-task snapshots early. The scratch hashes identify authoring evidence only; they are not implementation commits on main.

## Task 1: Persist blobs, occurrences and links

**Scratch checkpoint:** `ed5045d`. **Depends on:** baseline `50ac37a`.

**Deliverable:** Strict metadata schemas and migration 0003, including same-record Log attachment constraints and retained blobs.

**Reviewed corrections:** the listed file blocks incorporate fixes from `40e6663` directly. Execute the corrected blocks below; do not reproduce the earlier defects.

- [ ] **Step 1: Write these complete test and fixture files.**

#### File: `tests/domain/files-sharing.test.ts`

<!-- replay task=1 phase=test sha256=6efdd818feddec5a5c3d09becdafc521d1de9a238ed73d95c35728f44486e387 -->

``````ts
import { describe, expect, it } from 'vitest';
import { AttachmentPatch, AttachmentUploadMeta, Filename, PhotoPatch, PhotoUploadMeta, PhotoVariantParam, ShareCreate } from '../../src/domain';

describe('file and share metadata', () => {
  it('preserves text, normalises blank text and offset timestamps, and validates phases', () => {
    for (const phase of ['before', 'during', 'after']) expect(PhotoUploadMeta.parse({ phase }).phase).toBe(phase);
    expect(PhotoUploadMeta.parse({ phase: 'before', caption: '  όψη  ', takenAt: '2026-10-03T12:00:00+03:00' })).toEqual({ phase: 'before', caption: '  όψη  ', takenAt: '2026-10-03T09:00:00.000Z' });
    expect(PhotoPatch.parse({ caption: '  ', takenAt: null })).toEqual({ caption: null, takenAt: null });
    expect(AttachmentUploadMeta.parse({ title: '\t' })).toEqual({ title: null });
    expect(AttachmentPatch.parse({ title: ' Test ' })).toEqual({ title: ' Test ' });
    for (const bad of [{}, { phase: 'later' }, { phase: 'before', extra: 1 }, { phase: 'before', takenAt: '2026-10-03T12:00:00' }]) expect(() => PhotoUploadMeta.parse(bad)).toThrow();
    for (const schema of [PhotoPatch, AttachmentPatch]) expect(() => schema.parse({})).toThrow();
    expect(() => AttachmentPatch.parse({ logEntryId: 1 })).toThrow();
    expect(() => PhotoVariantParam.parse('hash')).toThrow();
  });
  it('requires safe basename metadata and strict link inputs without a clock-dependent expiry check', () => {
    expect(Filename.parse('C:\\fakepath\\όψη.jpg')).toBe('όψη.jpg');
    expect(Filename.parse('../../file.pdf')).toBe('file.pdf');
    for (const name of ['', 'a\n.pdf', 'a\0.jpg', 'a'.repeat(256)]) expect(() => Filename.parse(name)).toThrow();
    expect(ShareCreate.parse({ label: ' Old ', expiresAt: '2000-01-01T02:00:00+02:00' })).toEqual({ label: ' Old ', expiresAt: '2000-01-01T00:00:00.000Z' });
    for (const body of [{ label: ' ' }, { label: 'x', extra: 1 }, { label: 'x', expiresAt: 'tomorrow' }]) expect(() => ShareCreate.parse(body)).toThrow();
  });
});
``````

#### File: `tests/server/files-db.test.ts`

<!-- replay task=1 phase=test sha256=e508462c0268a249f40a132c1a5c61450d5c4050d55bfdf62cb1360ccd45826c -->

``````ts
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { MIGRATIONS } from '../../src/server/db/migrations';

function seed(db: Db) {
  db.exec("INSERT INTO users VALUES (1,'u','h','t','t'); INSERT INTO projects VALUES (1,'p','P','t')");
  for (const n of [1, 2]) db.prepare("INSERT INTO records (project_id,subtype,sequence,human_id,status,created_at,created_by,updated_at,updated_by) VALUES (1,'task',?,?,'draft','t',1,'t',1)").run(n, `T-${n}`);
}

it('enforces occurrence ownership, cascade, retained blobs, nonreused ids and unique tokens', () => {
  const db = openDatabase(':memory:');
  try {
    migrate(db, { backupsDir: 'unused' }); seed(db);
    const hash = 'a'.repeat(64);
    expect(() => db.prepare('INSERT INTO blobs VALUES (NULL,1,?)').run('image/jpeg')).toThrow();
    db.prepare('INSERT INTO blobs VALUES (?,1,?)').run(hash, 'image/jpeg');
    db.exec("INSERT INTO log_entries (id,record_id,event_at,text,private,logged_by,logged_at) VALUES (1,1,'t','a',0,1,'t'),(2,2,'t','b',1,1,'t')");
    const insert = db.prepare("INSERT INTO attachments (record_id,blob_hash,original_filename,log_entry_id,uploaded_by,uploaded_at) VALUES (1,?,'a.jpg',?,1,'t')");
    expect(() => insert.run(hash, 2)).toThrow();
    const id = Number(insert.run(hash, 1).lastInsertRowid);
    db.exec('DELETE FROM log_entries WHERE id=1');
    expect(db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
    expect(db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(1);
    expect(Number(insert.run(hash, null).lastInsertRowid)).toBeGreaterThan(id);
    const photo = db.prepare("INSERT INTO photos(record_id,original_hash,display_hash,thumbnail_hash,original_filename,phase,uploaded_by,uploaded_at) VALUES (1,?,?,?,'a.jpg','before',1,'t')");
    const photoId = Number(photo.run(hash, hash, hash).lastInsertRowid);
    db.prepare('DELETE FROM photos WHERE id=?').run(photoId);
    expect(Number(photo.run(hash, hash, hash).lastInsertRowid)).toBeGreaterThan(photoId);
    const share = db.prepare("INSERT INTO share_links(record_id,label,token_hash,key_fingerprint,token_ciphertext,token_nonce,token_tag,created_by,created_at) VALUES (1,'x',?,'k',?,?,?,1,'t')");
    share.run(hash, Buffer.alloc(1), Buffer.alloc(12), Buffer.alloc(16));
    expect(() => share.run(hash, Buffer.alloc(1), Buffer.alloc(12), Buffer.alloc(16))).toThrow();
  } finally { db.close(); }
});

it('upgrades a populated Plan 3 database with a backup and is idempotent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bb-files-db-'));
  const db = openDatabase(join(dir, 'test.db'));
  try {
    migrate(db, { backupsDir: join(dir, 'backups'), migrations: MIGRATIONS.slice(0, 2) }); seed(db);
    migrate(db, { backupsDir: join(dir, 'backups') });
    expect(db.prepare('SELECT count(*) FROM records').pluck().get()).toBe(2);
    expect(db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(0);
    expect(readdirSync(join(dir, 'backups')).length).toBeGreaterThan(0);
    const before = db.prepare('SELECT total_changes()').pluck().get();
    migrate(db, { backupsDir: join(dir, 'backups') });
    expect(db.prepare('SELECT total_changes()').pluck().get()).toBe(before);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
``````

- [ ] **Step 2: Verify the pre-implementation result.**

Run: `npx vitest run tests/server/files-db.test.ts tests/domain/files-sharing.test.ts`.

Expected: exit 1, four failures from missing schemas and tables. Observed during scratch authoring.

- [ ] **Step 3: Write these complete implementation/configuration files.**

#### File: `src/domain/files.ts`

<!-- replay task=1 phase=implementation sha256=aecf530185f4871bd38748fab7b533896ee76ee215c6549a726a46bdf8b46562 -->

``````ts
import { z } from 'zod';
import type { PhotoPhase } from './vocab';

export const FILE_LIMITS = { 'photo-original': 25_000_000, 'photo-display': 5_000_000, 'photo-thumbnail': 500_000, attachment: 50_000_000 } as const;
export type FilePurpose = keyof typeof FILE_LIMITS;
const text = z.string().max(2_000).nullable().transform(value => value === null || value.trim() === '' ? null : value);
export const FileTimestamp = z.iso.datetime({ offset: true }).transform(value => new Date(value).toISOString());
export const Filename = z.string().transform(value => value.split(/[\\/]/).at(-1) ?? '').pipe(z.string().min(1).max(255).refine(value => !/[\x00-\x1f\x7f]/.test(value), 'Invalid filename'));
export const PhotoVariantParam = z.enum(['original', 'display', 'thumbnail']);
export type PhotoVariant = z.infer<typeof PhotoVariantParam>;
const photoFields = { phase: z.enum(['before', 'during', 'after']), caption: text.optional(), takenAt: FileTimestamp.nullable().optional() };
export const PhotoUploadMeta = z.strictObject(photoFields);
export const PhotoPatch = PhotoUploadMeta.partial().refine(value => Object.keys(value).length > 0, 'Empty patch');
export const AttachmentUploadMeta = z.strictObject({ title: text.optional(), logEntryId: z.number().int().positive().nullable().optional() });
export const AttachmentPatch = z.strictObject({ title: text.optional() }).refine(value => Object.keys(value).length > 0, 'Empty patch');
export type PhotoMeta = z.output<typeof PhotoUploadMeta>;
export type PhotoPatchInput = z.output<typeof PhotoPatch>;
export type AttachmentMeta = z.output<typeof AttachmentUploadMeta>;
export type AttachmentPatchInput = z.output<typeof AttachmentPatch>;
export interface PhotoOut {
  id: number; originalFilename: string; phase: PhotoPhase; caption: string | null; takenAt: string | null; uploadedBy: string; uploadedAt: string;
}
export interface AttachmentOut {
  id: number; originalFilename: string; title: string | null; size: number; contentType: string; uploadedBy: string; uploadedAt: string;
  logEntry: { id: number; eventAt: string; text: string; private: boolean } | null;
}
``````

#### File: `src/domain/index.ts`

<!-- replay task=1 phase=implementation sha256=2812a2e172a7cff09074eaf186504a0620348a0a8c7cc2b0ea0eb804a198fe8e -->

``````ts
export * from './vocab';
export * from './ids';
export * from './statuses';
export * from './record-rules';
export * from './measurements';
export * from './lists';
export * from './text';
export * from './records';
export * from './files';
export * from './sharing';
``````

#### File: `src/domain/sharing.ts`

<!-- replay task=1 phase=implementation sha256=cd6803d442abeded9caae059b7cee2249e22887e19dff1c35caed1e0fa87405a -->

``````ts
import { z } from 'zod';
import { FileTimestamp } from './files';

export const ShareCreate = z.strictObject({ label: z.string().max(200).refine(value => value.trim() !== '', 'Required'), expiresAt: FileTimestamp.nullable().optional() });
export type ShareCreateInput = z.output<typeof ShareCreate>;
export interface ShareLinkOut {
  id: number; label: string; createdAt: string; expiresAt: string | null; revokedAt: string | null; lastViewedAt: string | null; viewCount: number; url: string | null;
}
``````

#### File: `src/server/db/migration-0003-files-sharing.ts`

<!-- replay task=1 phase=implementation sha256=fbf8503f5e0d4bb841fc30b1ad3dad2935a63ff5da07c4b0e8234b7b16a6d609 -->

``````ts
import type { Migration } from './migrations';

export const MIGRATION_0003_FILES_SHARING: Migration = {
  id: '0003_files_sharing',
  sql: `
    CREATE TABLE blobs (
      hash TEXT PRIMARY KEY NOT NULL CHECK(length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'),
      size INTEGER NOT NULL CHECK(size > 0), content_type TEXT NOT NULL
    );
    CREATE TABLE photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, record_id INTEGER NOT NULL REFERENCES records(id),
      original_hash TEXT NOT NULL REFERENCES blobs(hash), display_hash TEXT NOT NULL REFERENCES blobs(hash), thumbnail_hash TEXT NOT NULL REFERENCES blobs(hash),
      original_filename TEXT NOT NULL, phase TEXT NOT NULL CHECK(phase IN ('before','during','after')), caption TEXT, taken_at TEXT,
      uploaded_by INTEGER NOT NULL REFERENCES users(id), uploaded_at TEXT NOT NULL
    );
    CREATE INDEX photos_record ON photos(record_id);
    CREATE UNIQUE INDEX log_entries_id_record ON log_entries(id, record_id);
    CREATE TABLE attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, record_id INTEGER NOT NULL REFERENCES records(id), blob_hash TEXT NOT NULL REFERENCES blobs(hash),
      original_filename TEXT NOT NULL, title TEXT, log_entry_id INTEGER,
      uploaded_by INTEGER NOT NULL REFERENCES users(id), uploaded_at TEXT NOT NULL,
      FOREIGN KEY(log_entry_id, record_id) REFERENCES log_entries(id, record_id) ON DELETE CASCADE
    );
    CREATE INDEX attachments_record ON attachments(record_id);
    CREATE INDEX attachments_log ON attachments(log_entry_id);
    CREATE TABLE share_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT, record_id INTEGER NOT NULL REFERENCES records(id), label TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE, key_fingerprint TEXT NOT NULL, token_ciphertext BLOB NOT NULL, token_nonce BLOB NOT NULL, token_tag BLOB NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, expires_at TEXT, revoked_at TEXT, last_viewed_at TEXT,
      view_count INTEGER NOT NULL DEFAULT 0 CHECK(view_count >= 0)
    );
    CREATE INDEX share_links_record ON share_links(record_id);
    CREATE TABLE share_key_state (id INTEGER PRIMARY KEY CHECK(id=1), fingerprint TEXT NOT NULL);
  `,
};
``````

#### File: `src/server/db/migrations.ts`

<!-- replay task=1 phase=implementation sha256=c4f8cf602a734bb2902c138bd53b2d8e917a07ca4311fa39c1f4939141234f54 -->

``````ts
import { MIGRATION_0002_RECORDS } from './migration-0002-records';
import { MIGRATION_0003_FILES_SHARING } from './migration-0003-files-sharing';

export interface Migration {
  id: string;
  sql: string;
}

/** Forward-only migrations, applied in order (design §11.3). Never edit an applied migration; add a new one. */
export const MIGRATIONS: readonly Migration[] = [
  {
    id: '0001_init',
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE INDEX sessions_user ON sessions(user_id);

      CREATE TABLE projects (
        id INTEGER PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE people (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        company TEXT,
        role TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        UNIQUE (project_id, code)
      );

      CREATE TABLE trades (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        code TEXT NOT NULL,
        name_en TEXT NOT NULL DEFAULT '',
        name_el TEXT NOT NULL DEFAULT '',
        def_en TEXT NOT NULL DEFAULT '',
        def_el TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        UNIQUE (project_id, code),
        CHECK (name_en <> '' OR name_el <> '')
      );

      CREATE TABLE zone_types (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        name_en TEXT NOT NULL DEFAULT '',
        name_el TEXT NOT NULL DEFAULT '',
        CHECK (name_en <> '' OR name_el <> '')
      );

      CREATE TABLE tags (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        name_el TEXT NOT NULL DEFAULT '',
        name_en TEXT NOT NULL DEFAULT '',
        name_el_key TEXT,
        name_en_key TEXT,
        CHECK (name_el <> '' OR name_en <> '')
      );
      CREATE UNIQUE INDEX tags_el_unique ON tags(project_id, name_el_key) WHERE name_el_key IS NOT NULL;
      CREATE UNIQUE INDEX tags_en_unique ON tags(project_id, name_en_key) WHERE name_en_key IS NOT NULL;

      CREATE TABLE location_nodes (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        parent_id INTEGER REFERENCES location_nodes(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        zone_type_id INTEGER REFERENCES zone_types(id),
        name_en TEXT NOT NULL DEFAULT '',
        name_el TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        CHECK (name_en <> '' OR name_el <> '')
      );
      CREATE INDEX location_nodes_parent ON location_nodes(project_id, parent_id);
    `,
  },
  MIGRATION_0002_RECORDS,
  MIGRATION_0003_FILES_SHARING,
];
``````

- [ ] **Step 4: Verify the completed task.**

Run: `npx vitest run tests/server/files-db.test.ts tests/domain/files-sharing.test.ts`, then `npm run typecheck`. Expected: four tests in two files pass; TypeScript reports no errors.

- [ ] **Step 5: Commit only the task files.**

```powershell
git add 'src/domain/files.ts' 'src/domain/index.ts' 'src/domain/sharing.ts' 'src/server/db/migration-0003-files-sharing.ts' 'src/server/db/migrations.ts' 'tests/domain/files-sharing.test.ts' 'tests/server/files-db.test.ts'
git commit -m "feat: add file occurrences and share-link schema"
```

## Task 2: Stream and publish immutable file bytes

**Scratch checkpoint:** `1a1dd4e`. **Depends on:** Task 1.

**Deliverable:** Bounded streaming, byte-family screening including DWG, content-addressed publication and retained original bytes.

**Reviewed corrections:** the listed file blocks incorporate fixes from `40e6663` directly. Execute the corrected blocks below; do not reproduce the earlier defects.

- [ ] **Step 1: Write these complete test and fixture files.**

#### File: `tests/server/config.test.ts`

<!-- replay task=2 phase=test sha256=ac9b3faf4b3e7f2bab17c9662348e31d82f7f028da141d147d33b207aba8d576 -->

``````ts
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/server/config';

describe('loadConfig (design §11.6)', () => {
  it('requires BUILTBASIS_DATA_DIR', () => {
    expect(() => loadConfig({})).toThrow('BUILTBASIS_DATA_DIR');
  });

  it('derives database and backup paths and local defaults', () => {
    const config = loadConfig({ BUILTBASIS_DATA_DIR: '/data' });
    expect(config.dbPath).toMatch(/builtbasis\.db$/);
    expect(config.backupsDir).toMatch(/backups$/);
    expect(config.filesDir).toMatch(/files$/);
    expect(config.publicOrigin).toBe('http://localhost:3000');
    expect(config.secureCookies).toBe(false);
    expect(config.behindCloudflare).toBe(false);
    expect(config.port).toBeNull();
  });

  it('uses the public origin, secure cookies and Cloudflare mode in production', () => {
    const config = loadConfig({
      BUILTBASIS_DATA_DIR: '/data',
      PUBLIC_BASE_URL: 'https://builtbasis.ktimanet.com/',
      BEHIND_CLOUDFLARE: '1',
      PORT: '3000',
    });
    expect(config.publicOrigin).toBe('https://builtbasis.ktimanet.com');
    expect(config.secureCookies).toBe(true);
    expect(config.behindCloudflare).toBe(true);
    expect(config.port).toBe('3000');
  });
});
``````

#### File: `tests/server/file-fixture.ts`

<!-- replay task=2 phase=test sha256=2dfafed87af48bbae819f70dc91e10420b5abd15549bdcab43ad26cbf50f57ea -->

``````ts
export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]);
export const PNG = Buffer.from('89504e470d0a1a0a0000000049454e44ae426082', 'hex');
export const PDF = Buffer.from('%PDF-1.7\nsynthetic fixture\n%%EOF');
export const OLE = Buffer.from('d0cf11e0a1b11ae100000000', 'hex');
export const ZIP = Buffer.from('504b030400000000', 'hex');
export const HEIC = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(4), Buffer.from('mif1heic')]);
export interface MultipartPart { name: string; filename?: string; data: Buffer | string; type?: string }
export function multipart(parts: MultipartPart[]) {
  const boundary = 'bb-synthetic-boundary';
  const chunks: Buffer[] = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"${part.filename === undefined ? '' : `; filename="${part.filename}"`}\r\n${part.filename === undefined ? '' : `Content-Type: ${part.type ?? 'application/octet-stream'}\r\n`}\r\n`));
    chunks.push(Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data), Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}
``````

#### File: `tests/server/file-storage.test.ts`

<!-- replay task=2 phase=test sha256=ec709487dd558d0493b86a9363fc2b9415dade2ec0af8ed9cd0ffbd491a85cc2 -->

``````ts
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import * as fsPromises from 'node:fs/promises';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FILE_LIMITS } from '../../src/domain';
import { blobPath, discardStaged, publishFile, stageFile } from '../../src/server/files/storage';
import { HEIC, JPEG, OLE, PDF, PNG, ZIP } from './file-fixture';

vi.mock('node:fs/promises', async importOriginal => ({
  ...await importOriginal<typeof import('node:fs/promises')>(),
}));

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'bb-storage-')); });
afterEach(async () => { vi.restoreAllMocks(); await rm(dir, { recursive: true, force: true }); });

it('preserves original bytes, hashes content and publishes concurrent duplicate bytes without replacement', async () => {
  const a = await stageFile(dir, Readable.from([JPEG]), 'όψη.jpg', 'photo-original');
  const b = await stageFile(dir, Readable.from([JPEG]), '../../same.jpeg', 'attachment');
  expect(a.hash).toBe(createHash('sha256').update(JPEG).digest('hex'));
  expect(b.hash).toBe(a.hash);
  await Promise.all([publishFile(dir, a), publishFile(dir, b)]);
  expect(await readFile(blobPath(dir, a.hash))).toEqual(JPEG);
  expect(await readdir(join(dir, '.tmp'))).toEqual([]);
  const c = await stageFile(dir, Readable.from([JPEG]), 'c.jpg', 'attachment');
  await writeFile(blobPath(dir, a.hash), Buffer.alloc(JPEG.length));
  await expect(publishFile(dir, c)).rejects.toThrow();
  await discardStaged(c);
  expect(await readFile(blobPath(dir, a.hash))).toEqual(Buffer.alloc(JPEG.length));
  expect(() => blobPath(dir, '../guess')).toThrow();
});

it.each([
  ['a.jpg', JPEG, 'image/jpeg'], ['a.png', PNG, 'image/png'], ['a.heic', HEIC, 'image/heic'], ['a.heif', HEIC, 'image/heic'],
  ['a.pdf', PDF, 'application/pdf'], ['a.rtf', Buffer.from('{\\rtf1 synthetic}'), 'application/rtf'],
  ...['doc', 'xls', 'ppt'].map(ext => [`a.${ext}`, OLE, 'application/x-cfb']),
  ...['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'].map(ext => [`a.${ext}`, ZIP, 'application/zip']),
  ...['AC1006','AC1009','AC1012','AC1014','AC1015','AC1018','AC1021','AC1024','AC1027','AC1032'].map(sig => ['a.dwg', Buffer.from(sig), 'application/octet-stream']),
] as [string, Buffer, string][])('screens allowed signature for %s', async (filename, bytes, type) => {
  const file = await stageFile(dir, Readable.from([bytes]), filename, 'attachment');
  expect(file.contentType).toBe(type);
  await discardStaged(file);
});

it.each([
  ['a.jpg', Buffer.from('<html>bad</html>')], ['a.exe', JPEG], ['a.docm', ZIP], ['a.zip', ZIP], ['a.pdf', JPEG],
  ['a.dwg', Buffer.from('AC9999')], ['a.jpg', Buffer.from('AC1032')], ['a.heic', Buffer.concat([Buffer.from([0,0,0,16]), Buffer.from('ftypmif1'), Buffer.alloc(4)])],
] as [string, Buffer][])('rejects a misleading or disallowed format %s', async (filename, bytes) => {
  await expect(stageFile(dir, Readable.from([bytes]), filename, 'attachment')).rejects.toMatchObject({ statusCode: 415 });
  expect(await readdir(join(dir, '.tmp'))).toEqual([]);
});

it('cleans incomplete, empty, wrong-derived-format and interrupted streams', async () => {
  await expect(stageFile(dir, Readable.from([]), 'a.jpg', 'photo-original')).rejects.toMatchObject({ statusCode: 415 });
  await expect(stageFile(dir, Readable.from([PNG]), 'a.png', 'photo-display')).rejects.toMatchObject({ statusCode: 415 });
  const broken = Readable.from((async function* () { yield JPEG; throw new Error('interrupted'); })());
  await expect(stageFile(dir, broken, 'a.jpg', 'photo-original')).rejects.toThrow('interrupted');
  expect(await readdir(join(dir, '.tmp'))).toEqual([]);
});

it('terminates sources rejected before staging and after a disk flush failure', async () => {
  const invalid = Readable.from([JPEG]);
  await expect(stageFile(dir, invalid, 'a'.repeat(256), 'attachment')).rejects.toThrow();
  expect(invalid.destroyed).toBe(true);
  await writeFile(join(dir, '.tmp'), 'occupied');
  const blocked = Readable.from([JPEG]);
  await expect(stageFile(dir, blocked, 'a.jpg', 'attachment')).rejects.toThrow();
  expect(blocked.destroyed).toBe(true);
  await rm(join(dir, '.tmp'));
  const originalOpen = fsPromises.open;
  vi.spyOn(fsPromises, 'open').mockImplementation(async (...args: Parameters<typeof originalOpen>) => {
    const handle = await originalOpen(...args);
    vi.spyOn(handle, 'sync').mockRejectedValue(new Error('forced_flush_failure'));
    return handle;
  });
  const failed = Readable.from([JPEG]);
  await expect(stageFile(dir, failed, 'a.jpg', 'attachment')).rejects.toThrow('forced_flush_failure');
  expect(failed.destroyed).toBe(true);
  expect(await readdir(join(dir, '.tmp'))).toEqual([]);
});

it.each(Object.entries(FILE_LIMITS))('enforces actual streamed limit for %s', async (purpose, limit) => {
  const source = (size: number) => Readable.from((function* () {
    yield JPEG;
    let remaining = size - JPEG.length;
    const chunk = Buffer.alloc(64 * 1024);
    while (remaining > 0) { const n = Math.min(remaining, chunk.length); yield chunk.subarray(0, n); remaining -= n; }
  })());
  const valid = await stageFile(dir, source(limit), 'a.jpg', purpose as keyof typeof FILE_LIMITS);
  expect(valid.size).toBe(limit); await discardStaged(valid);
  await expect(stageFile(dir, source(limit + 1), 'a.jpg', purpose as keyof typeof FILE_LIMITS)).rejects.toMatchObject({ statusCode: 413 });
  expect(await readdir(join(dir, '.tmp'))).toEqual([]);
});
``````

- [ ] **Step 2: Verify the pre-implementation result.**

Run: `npx vitest run tests/server/file-storage.test.ts tests/server/config.test.ts`.

Expected: exit 1 from the missing storage module and missing filesDir configuration. Observed during authoring.

- [ ] **Step 3: Write these complete implementation/configuration files.**

#### File: `src/server/config.ts`

<!-- replay task=2 phase=implementation sha256=cc30411b37cf2d508db9a99d50832b1501aff2b6451b79dbc070a8ff6ef5e6f6 -->

``````ts
import { join } from 'node:path';

export interface AppConfig {
  dataDir: string;
  dbPath: string;
  backupsDir: string;
  filesDir: string;
  /** Scheme + host (+ port) that browsers send as Origin, e.g. https://builtbasis.ktimanet.com */
  publicOrigin: string;
  secureCookies: boolean;
  /** Read the visitor IP from CF-Connecting-IP (design §11.6). */
  behindCloudflare: boolean;
  /** PORT: a port number or a socket path. null = listen like Hetzner's example (no arguments). */
  port: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataDir = env.BUILTBASIS_DATA_DIR;
  if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');
  const publicOrigin = new URL(env.PUBLIC_BASE_URL ?? 'http://localhost:3000').origin;
  return {
    dataDir,
    dbPath: join(dataDir, 'builtbasis.db'),
    backupsDir: join(dataDir, 'backups'),
    filesDir: join(dataDir, 'files'),
    publicOrigin,
    secureCookies: publicOrigin.startsWith('https://'),
    behindCloudflare: env.BEHIND_CLOUDFLARE === '1',
    port: env.PORT ?? null,
  };
}
``````

#### File: `src/server/files/formats.ts`

<!-- replay task=2 phase=implementation sha256=d87515208e190a03e4e61017a56f1d413f3218a3c54b536e2c6308dfd44a1239 -->

``````ts
import { extname } from 'node:path';
import type { FilePurpose } from '../../domain';
import { HttpError } from '../errors';

const begins = (bytes: Buffer, signature: Buffer) => bytes.subarray(0, signature.length).equals(signature);
const dwg = new Set(['AC1006','AC1009','AC1012','AC1014','AC1015','AC1018','AC1021','AC1024','AC1027','AC1032']);
function isHeic(bytes: Buffer): boolean {
  if (bytes.length < 16 || bytes.toString('ascii', 4, 8) !== 'ftyp') return false;
  const size = bytes.readUInt32BE(0);
  if (size < 16 || size > bytes.length || size % 4 !== 0) return false;
  const brands = [bytes.toString('ascii', 8, 12)];
  for (let at = 16; at < size; at += 4) brands.push(bytes.toString('ascii', at, at + 4));
  return brands.some(brand => ['heic','heix','hevc','hevx'].includes(brand));
}

/** Bounded format screening, not document validation or malware scanning. */
export function detectFormat(bytes: Buffer, filename: string, purpose: FilePurpose): string {
  const ext = extname(filename).toLowerCase();
  let mime: string | undefined;
  if (['.jpg','.jpeg'].includes(ext) && begins(bytes, Buffer.from('ffd8ff', 'hex'))) mime = 'image/jpeg';
  else if (ext === '.png' && begins(bytes, Buffer.from('89504e470d0a1a0a', 'hex'))) mime = 'image/png';
  else if (['.heic','.heif'].includes(ext) && isHeic(bytes)) mime = 'image/heic';
  else if (purpose === 'attachment') {
    if (ext === '.pdf' && begins(bytes, Buffer.from('%PDF-'))) mime = 'application/pdf';
    else if (ext === '.rtf' && begins(bytes, Buffer.from('{\\rtf'))) mime = 'application/rtf';
    else if (['.doc','.xls','.ppt'].includes(ext) && begins(bytes, Buffer.from('d0cf11e0a1b11ae1', 'hex'))) mime = 'application/x-cfb';
    else if (['.docx','.xlsx','.pptx','.odt','.ods','.odp'].includes(ext) && begins(bytes, Buffer.from('504b0304', 'hex'))) mime = 'application/zip';
    else if (ext === '.dwg' && dwg.has(bytes.toString('ascii', 0, 6))) mime = 'application/octet-stream';
  }
  if (!mime || ((purpose === 'photo-display' || purpose === 'photo-thumbnail') && mime !== 'image/jpeg')) throw new HttpError(415, 'unsupported_file_type');
  return mime;
}
``````

#### File: `src/server/files/storage.ts`

<!-- replay task=2 phase=implementation sha256=c051b8db82b76b586c5ab109de2fa950fa2ad820edc83250efaddde980d30fe0 -->

``````ts
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, mkdir, open, stat, unlink, type FileHandle } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Readable } from 'node:stream';
import { FILE_LIMITS, Filename, type FilePurpose } from '../../domain';
import { HttpError } from '../errors';
import { detectFormat } from './formats';

export interface StagedFile { path: string; hash: string; size: number; contentType: string }
export function blobPath(filesDir: string, hash: string): string {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('invalid_blob_hash');
  return join(filesDir, hash.slice(0, 2), hash);
}
export async function discardStaged(staged: Pick<StagedFile, 'path'>): Promise<void> {
  try { await unlink(staged.path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
export async function stageFile(filesDir: string, source: Readable, filename: string, purpose: FilePurpose): Promise<StagedFile> {
  let file: FileHandle | undefined;
  let path: string | undefined;
  try {
    const name = Filename.parse(filename);
    const tempDir = join(filesDir, '.tmp');
    await mkdir(tempDir, { recursive: true });
    const candidate = join(tempDir, randomBytes(24).toString('hex'));
    file = await open(candidate, 'wx', 0o600);
    path = candidate;
    const hash = createHash('sha256');
    let size = 0;
    let prefix = Buffer.alloc(0);
    for await (const chunk of source) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > FILE_LIMITS[purpose]) throw new HttpError(413, 'upload_too_large');
      if (prefix.length < 512) prefix = Buffer.concat([prefix, bytes.subarray(0, 512 - prefix.length)]);
      hash.update(bytes);
      for (let offset = 0; offset < bytes.length;) {
        const result = await file.write(bytes, offset, bytes.length - offset);
        if (result.bytesWritten === 0) throw new Error('file_write_incomplete');
        offset += result.bytesWritten;
      }
    }
    if ((source as Readable & { truncated?: boolean }).truncated) throw new HttpError(413, 'upload_too_large');
    if (size === 0) throw new HttpError(415, 'unsupported_file_type');
    const contentType = detectFormat(prefix, name, purpose);
    await file.sync();
    await file.close();
    file = undefined;
    return { path, hash: hash.digest('hex'), size, contentType };
  } catch (error) {
    source.destroy();
    // Try both cleanup operations even if close itself fails; retain the original error.
    if (file) await file.close().catch(() => undefined);
    if (path) await discardStaged({ path }).catch(() => undefined);
    throw error;
  }
}
export async function publishFile(filesDir: string, staged: StagedFile): Promise<void> {
  const destination = blobPath(filesDir, staged.hash);
  const dir = dirname(destination);
  await mkdir(dir, { recursive: true });
  try { await link(staged.path, destination); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if ((await stat(destination)).size !== staged.size) throw new Error('blob_collision');
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(destination)) hash.update(chunk);
    if (hash.digest('hex') !== staged.hash) throw new Error('blob_collision');
  }
  if (process.platform !== 'win32') {
    // Persist newly created directory entries as well as the published file entry.
    for (const path of [dirname(filesDir), filesDir, dir]) {
      const handle = await open(path, 'r');
      try { await handle.sync(); } finally { await handle.close(); }
    }
  }
  await discardStaged(staged);
}
``````

- [ ] **Step 4: Verify the completed task.**

Run: `npx vitest run tests/server/file-storage.test.ts tests/server/config.test.ts`, then `npm run typecheck`. Expected: 43 tests in two files pass; TypeScript reports no errors.

- [ ] **Step 5: Commit only the task files.**

```powershell
git add 'src/server/config.ts' 'src/server/files/formats.ts' 'src/server/files/storage.ts' 'tests/server/config.test.ts' 'tests/server/file-fixture.ts' 'tests/server/file-storage.test.ts'
git commit -m "feat: store immutable content-addressed file bytes"
```

## Task 3: Owner evidence uploads and occurrence management

**Scratch checkpoint:** `9832e62`. **Depends on:** Task 2.

**Deliverable:** Real multipart uploads, metadata changes, private Log attachment cascade and atomic occurrence commits.

**Reviewed corrections:** the listed file blocks incorporate fixes from `40e6663` directly. Execute the corrected blocks below; do not reproduce the earlier defects.

- [ ] **Step 1: Write these complete test and fixture files.**

#### File: `tests/server/file-fixture.ts`

<!-- replay task=3 phase=test sha256=9b09a97fd9325c1bb933fd8b3e68dbc267cabda76248e9949758a8a74c4c7983 -->

``````ts
export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]);
export const PNG = Buffer.from('89504e470d0a1a0a0000000049454e44ae426082', 'hex');
export const PDF = Buffer.from('%PDF-1.7\nsynthetic fixture\n%%EOF');
export const OLE = Buffer.from('d0cf11e0a1b11ae100000000', 'hex');
export const ZIP = Buffer.from('504b030400000000', 'hex');
export const HEIC = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(4), Buffer.from('mif1heic')]);
export interface MultipartPart { name: string; filename?: string; data: Buffer | string; type?: string }
export function multipart(parts: MultipartPart[]) {
  const boundary = 'bb-synthetic-boundary';
  const chunks: Buffer[] = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"${part.filename === undefined ? '' : `; filename="${part.filename}"`}\r\n${part.filename === undefined ? '' : `Content-Type: ${part.type ?? 'application/octet-stream'}\r\n`}\r\n`));
    chunks.push(Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data), Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

export function upload(f: Fixture, recordId: number, kind: 'photos' | 'attachments', parts: MultipartPart[], headers: Record<string, string> = {}) {
  const form = multipart(parts);
  return f.ctx.app.inject({
    method: 'POST',
    url: `${f.base}/records/${recordId}/${kind}`,
    headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType, ...headers },
    payload: form.body,
  });
}

export async function addAttachment(f: Fixture, recordId: number, metadata: object = {}, filename = 'plan.pdf', bytes = PDF) {
  const response = await upload(f, recordId, 'attachments', [
    { name: 'metadata', data: JSON.stringify(metadata) },
    { name: 'file', filename, data: bytes },
  ]);
  expect(response.statusCode, response.body).toBe(201);
  return response.json();
}

export async function addPhoto(f: Fixture, recordId: number, metadata: object = { phase: 'before' }) {
  const response = await upload(f, recordId, 'photos', [
    { name: 'metadata', data: JSON.stringify(metadata) },
    ...['original', 'display', 'thumbnail'].map(name => ({ name, filename: name === 'original' ? 'όψη.jpg' : `${name}.jpg`, data: JPEG })),
  ]);
  expect(response.statusCode, response.body).toBe(201);
  return response.json();
}
import { expect } from 'vitest';
import type { Fixture } from './record-fixture';
``````

#### File: `tests/server/files-api.test.ts`

<!-- replay task=3 phase=test sha256=e55ed3dce66eea5baccecca90891f796e82ea1d01b3b4ff2edda0971d57d56b1 -->

``````ts
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { FastifyRequest } from 'fastify';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { blobPath } from '../../src/server/files/storage';
import { parseUpload } from '../../src/server/files/uploads';
import { get, send } from './helpers';
import { getRecord, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';
import { addAttachment, addPhoto, JPEG, multipart, PDF, upload } from './file-fixture';

let f: Fixture;
let id: number;
beforeEach(async () => {
  f = await makeFixture();
  id = (await postRecord(f, { subtype: 'task' })).id;
});
afterEach(async () => { await f.ctx.close(); });

it('stores photo bundles, preserves metadata and sorts phases', async () => {
  const after = await addPhoto(f, id, { phase: 'after' });
  const before = await addPhoto(f, id, { phase: 'before', takenAt: '2026-10-03T12:00:00+03:00' });
  expect(before).toMatchObject({ originalFilename: 'όψη.jpg', phase: 'before', takenAt: '2026-10-03T09:00:00.000Z' });
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/photos'))).json().map((p: { id: number }) => p.id)).toEqual([before.id, after.id]);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(1);
  const hash = f.ctx.db.prepare('SELECT original_hash FROM photos WHERE id=?').pluck().get(before.id) as string;
  expect(await readFile(blobPath(f.ctx.config.filesDir, hash))).toEqual(JPEG);
  f.ctx.db.prepare('UPDATE records SET updated_at=? WHERE id=?').run('2000-01-01', id);
  const patched = await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/photos/${before.id}`), { caption: 'Caption' });
  expect(patched.statusCode).toBe(200);
  expect(patched.json()).toMatchObject({ caption: 'Caption', uploadedAt: before.uploadedAt, uploadedBy: before.uploadedBy });
  expect((await getRecord(f, id)).updatedAt).not.toBe('2000-01-01');
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/photos/${before.id}`))).statusCode).toBe(200);
  expect((await addPhoto(f, id)).id).toBeGreaterThan(before.id);
});

it('keeps separate occurrences, joins current Log metadata and cascades private Log deletion without deleting bytes', async () => {
  const log = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'Plans received', private: true });
  expect(log.statusCode).toBe(201);
  const direct = await addAttachment(f, id);
  const linked = await addAttachment(f, id, { logEntryId: log.json().id });
  expect(linked.id).not.toBe(direct.id);
  expect(linked.logEntry).toMatchObject({ id: log.json().id, text: 'Plans received', private: true });
  expect(direct.logEntry).toBeNull();
  const renamed = await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/attachments/${direct.id}`), { title: 'Changed' });
  expect(renamed.statusCode).toBe(200);
  expect(renamed.json()).toMatchObject({ title: 'Changed', uploadedAt: direct.uploadedAt });
  const hash = f.ctx.db.prepare('SELECT blob_hash FROM attachments WHERE id=?').pluck().get(direct.id) as string;
  await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/log/${log.json().id}`), { text: 'Revised', private: false });
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/attachments'))).json()[0].logEntry).toMatchObject({ text: 'Revised', private: false });
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/log/${log.json().id}`))).statusCode).toBe(200);
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/attachments'))).json().map((a: { id: number }) => a.id)).toEqual([direct.id]);
  expect(await readFile(blobPath(f.ctx.config.filesDir, hash))).toEqual(PDF);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(1);
});

it('checks session, Origin and upload content type before parsing files', async () => {
  const parts = [{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }];
  expect((await upload(f, id, 'attachments', parts, { cookie: '' })).statusCode).toBe(401);
  expect((await upload(f, id, 'attachments', parts, { origin: '' })).statusCode).toBe(403);
  expect((await upload(f, id, 'attachments', parts, { origin: 'https://evil.example' })).statusCode).toBe(403);
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/attachments'))).statusCode).toBe(415);
  const form = multipart(parts);
  expect((await f.ctx.app.inject({ method: 'PATCH', url: recordUrl(f, id), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body })).statusCode).toBe(415);
});

it('rejects malformed envelopes and cleans temporary files; accepts metadata after files', async () => {
  for (const parts of [
    [{ name: 'metadata', data: '{}' }],
    [{ name: 'file', filename: 'a.pdf', data: PDF }],
    [{ name: 'unknown', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }],
    [{ name: 'metadata', data: '{bad' }, { name: 'file', filename: 'a.pdf', data: PDF }],
    [{ name: 'metadata', data: '{"unknown":1}' }, { name: 'file', filename: 'a.pdf', data: PDF }],
  ]) expect((await upload(f, id, 'attachments', parts)).statusCode).toBe(400);
  const response = await upload(f, id, 'attachments', [
    { name: 'file', filename: 'a.pdf', data: PDF }, { name: 'metadata', data: '{}' },
  ]);
  expect(response.statusCode).toBe(201);
  expect(await readdir(join(f.ctx.config.filesDir, '.tmp'))).toEqual([]);
});

it('terminates invalid-filename multipart streams', async () => {
  const source = Readable.from([PDF]);
  const request = {
    isMultipart: () => true,
    raw: Readable.from([]),
    parts: async function* () {
      yield { type: 'file', fieldname: 'file', filename: 'a'.repeat(256), file: source };
    },
  } as unknown as FastifyRequest;
  await expect(parseUpload(request, f.ctx.config.filesDir, 'attachments')).rejects.toMatchObject({ statusCode: 400 });
  expect(source.destroyed).toBe(true);
});

it('normalises malformed parser envelopes and accepts JSON metadata fields', async () => {
  const before = await getRecord(f, id);
  const missingBoundary = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data' }, payload: 'bad' });
  expect(missingBoundary.statusCode).toBe(400);
  expect(missingBoundary.json()).toEqual({ error: 'invalid_upload' });
  for (const [metadata, status] of [['{bad', 400], ['{}', 201]] as const) {
    const body = Buffer.concat([
      Buffer.from(`--json\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--json\r\nContent-Disposition: form-data; name="file"; filename="a.pdf"\r\n\r\n`), PDF, Buffer.from('\r\n--json--\r\n'),
    ]);
    const response = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data; boundary=json' }, payload: body });
    expect(response.statusCode).toBe(status);
    if (status === 400) {
      expect(response.json()).toEqual({ error: 'invalid_upload' });
      expect(await getRecord(f, id)).toEqual(before);
    }
  }
});

it('rejects duplicate photo parts, parser limits, bad third file and truncated multipart without changing evidence', async () => {
  const before = await getRecord(f, id);
  const files = ['original', 'display', 'thumbnail'].map(name => ({ name, filename: 'a.jpg', data: JPEG }));
  expect((await upload(f, id, 'photos', [{ name: 'metadata', data: '{"phase":"before"}' }, files[0]!, files[0]!, files[2]!])).statusCode).toBe(400);
  expect((await upload(f, id, 'photos', [{ name: 'metadata', data: '{"phase":"before"}' }, ...files, files[0]!])).statusCode).toBe(413);
  expect((await upload(f, id, 'photos', [{ name: 'metadata', data: '{"phase":"before"}' }, files[0]!, files[1]!, { ...files[2]!, data: PDF }])).statusCode).toBe(415);
  expect((await upload(f, id, 'attachments', [{ name: 'metadata', data: 'a'.repeat(16_385) }, { name: 'file', filename: 'a.pdf', data: PDF }])).statusCode).toBe(413);
  const form = multipart([{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }]);
  expect((await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body.subarray(0, -20) })).statusCode).toBe(400);
  expect(await getRecord(f, id)).toEqual(before);
  expect(f.ctx.db.prepare('SELECT count(*) FROM photos').pluck().get()).toBe(0);
  expect(await readdir(join(f.ctx.config.filesDir, '.tmp'))).toEqual([]);
});

it('scopes occurrences and Log associations to the record', async () => {
  const other = await postRecord(f, { subtype: 'task' });
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, other.id, '/log'), { text: 'Other' })).json();
  expect((await upload(f, id, 'attachments', [{ name: 'metadata', data: JSON.stringify({ logEntryId: entry.id }) }, { name: 'file', filename: 'a.pdf', data: PDF }])).statusCode).toBe(404);
  const attachment = await addAttachment(f, id);
  const photo = await addPhoto(f, id);
  for (const [kind, occurrenceId] of [['attachments', attachment.id], ['photos', photo.id]]) {
    expect((await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, other.id, `/${kind}/${occurrenceId}`), kind === 'photos' ? { caption: 'x' } : { title: 'x' })).statusCode).toBe(404);
    expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, other.id, `/${kind}/${occurrenceId}`))).statusCode).toBe(404);
  }
});

it('rolls database changes back after occurrence insertion and retains completed disk bytes', async () => {
  const before = await getRecord(f, id);
  f.ctx.db.exec("CREATE TRIGGER fail_touch BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT,'forced'); END");
  const response = await upload(f, id, 'attachments', [{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }]);
  expect(response.statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(0);
  expect(await getRecord(f, id)).toEqual(before);
  expect((await readdir(f.ctx.config.filesDir)).filter(name => name !== '.tmp')).toHaveLength(1);
});

it('rolls back the Log cascade if touching its record fails', async () => {
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'Private', private: true })).json();
  const attachment = await addAttachment(f, id, { logEntryId: entry.id });
  f.ctx.db.exec("CREATE TRIGGER fail_touch BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT,'forced'); END");
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/log/${entry.id}`))).statusCode).toBe(500);
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/attachments'))).json()[0].id).toBe(attachment.id);
});

it('rechecks a Log association deleted while its multipart bytes are arriving', async () => {
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'Soon removed' })).json();
  const form = multipart([
    { name: 'metadata', data: JSON.stringify({ logEntryId: entry.id }) },
    { name: 'file', filename: 'a.pdf', data: PDF },
  ]);
  const payload = Readable.from((async function* () {
    yield form.body.subarray(0, form.body.length - 40);
    f.ctx.db.prepare('DELETE FROM log_entries WHERE id=?').run(entry.id);
    yield form.body.subarray(form.body.length - 40);
  })());
  const response = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload });
  expect(response.statusCode).toBe(404);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
});

it('rejects an oversized attachment by actual streamed bytes without a Content-Length', async () => {
  const payload = Readable.from((function* () {
    yield Buffer.from('--limit\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n{}\r\n--limit\r\nContent-Disposition: form-data; name="file"; filename="a.pdf"\r\nContent-Type: application/pdf\r\n\r\n');
    yield PDF;
    let remaining = 50_000_001 - PDF.length;
    const chunk = Buffer.alloc(64 * 1024);
    while (remaining > 0) {
      const n = Math.min(remaining, chunk.length);
      yield chunk.subarray(0, n);
      remaining -= n;
    }
    yield Buffer.from('\r\n--limit--\r\n');
  })());
  const response = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data; boundary=limit' }, payload });
  expect(response.statusCode).toBe(413);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
  expect(await readdir(join(f.ctx.config.filesDir, '.tmp'))).toEqual([]);
});
``````

- [ ] **Step 2: Verify the pre-implementation result.**

Run: `npx vitest run tests/server/files-api.test.ts`.

Expected: exit 1 while upload routes are absent. Earlier cases report unsupported_content_type; no upload can succeed.

- [ ] **Step 3: Write these complete implementation/configuration files.**

#### File: `package-lock.json`

<!-- replay task=3 phase=implementation sha256=29f1a5cea94cd650626ed137b75704fdacb18515af3e538e9d9883012cc7757a -->

``````json
{
  "name": "builtbasis",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "builtbasis",
      "version": "0.1.0",
      "license": "UNLICENSED",
      "dependencies": {
        "@fastify/cookie": "^11.1.2",
        "@fastify/multipart": "9.3.0",
        "better-sqlite3": "13.0.3",
        "fastify": "^5.12.5",
        "zod": "^4.6.5"
      },
      "devDependencies": {
        "@types/better-sqlite3": "^7.6.13",
        "@types/node": "^22.20.5",
        "exceljs": "^4.4.0",
        "tsx": "^4.23.15",
        "typescript": "^5.9.3",
        "vitest": "^3.2.7"
      },
      "engines": {
        "node": ">=22.12.0"
      }
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.28.2.tgz",
      "integrity": "sha512-XExcO+dvLKvVtNTibSTBej1NCAbaGhWn9Ww1ZPx80qsahhPFe/8jgWP0IchNe0F3HwkU7n8ejhH8bjonqht8mQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.28.2.tgz",
      "integrity": "sha512-kXXoiPVVGQcnIYGOeaovwOURpniDBpSq4A03qkQ+BMQqtGG6HYap3xne9C1O1yo4TR3qxlCX5IqqmX6fFo2Lqg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.28.2.tgz",
      "integrity": "sha512-5YfKeeI8qWfBZIX+u2xZC3Zlb3Os/gLS2sbEKM+I4ZOcsWmHS2WLysCcQZDAFRslDUU5Oiq44gf6PYN1vGwG5A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.28.2.tgz",
      "integrity": "sha512-O387ite7SzUyCcy3JQX4P4bLtEA7bLLkx+esve5JHnyYfNTxcVpXZo9jhdB0lTKN44gztELTdU7nS8Nr16Fs1Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.28.2.tgz",
      "integrity": "sha512-n4KqkOQrraxHJcgjM1RvwbigfQKIKJVpM7xp+KsxiyUSrRdIXnt73VhrPAx0fV44hgfmIVKjxMN9J1t5jySVkw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.28.2.tgz",
      "integrity": "sha512-uq6suIWYP37qzGddBKPw5QEQPi6HiLGsO7UmkpfyaYNQ3D+rN6w6WfwH+nuqcGXWvawGwxOEroO4YGnFh95azw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.28.2.tgz",
      "integrity": "sha512-n+I0BTSRIoy+d6RPKnEVwql5UwBJolytvY4mAOIEJorKlqgPII8ix6slVVrfZ5Tnj7glIZvloylbB/EJPMWEXw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.28.2.tgz",
      "integrity": "sha512-78XJTJkvPs0kz2w61301PJjXl4g7q3JqiYMZ/M/yVI73EHBrCRTgkhu9oqG7vPqq+a/yadEW8aD+agKlk5xrmg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.28.2.tgz",
      "integrity": "sha512-XlDnu2q5yoqems+xay6wSAcg9DDD7K9RLKZEBOMZm3ckNpJBvOX20tSfby8KfrrhINDyv9V2YVZKY/SpoGJI8w==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.28.2.tgz",
      "integrity": "sha512-pW4AC0P3it8c7do9MVM4p51FzHzdM/TZrerurgRcHJ2WTa1VQ1CIq18xncfpBJw4ojkiZZrKW2yIBWBP92j6Ug==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.28.2.tgz",
      "integrity": "sha512-CYbnj78HsIeA+DhgUKgFCfvNsTHFhMMrinUrMZpDXJXKN8T3XViTZ/+wtHeVxEWY8ewSzTFN+nRmSwO2tZaLUQ==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.28.2.tgz",
      "integrity": "sha512-buwkd8nsph4R+ajRvw0qM5Hja/TXQow3ptzWO2EbG/cqcIkHloRrdlBtQlshyYGTNFvfkfJ5tpPLVkY4DtsPfQ==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.28.2.tgz",
      "integrity": "sha512-ZVykbDyk7519VwiNb9Lcj9m8XM6v5V9uKPvrEMkkEedVewf+0itkhahp4HDpgERXhwLRpWFypsGbG/J8s0QjJA==",
      "cpu": [
        "mips64el"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.28.2.tgz",
      "integrity": "sha512-CAXl+Dtd9UUuJd8pKKdwh6MLm3MUMiqMPmhZ3tTSXPqfyQ3vDl6R5hZdZ/kYojK4ofXtdfSv1tFq8XzWx3heNQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.28.2.tgz",
      "integrity": "sha512-GeXCej4IQtU1B+QlDV8W/RRvbzI3O/Stss+/bCXv4lZls5WGRtu2a+3JkA3i4qIUlMXpcHebWpF8AkJhATowuA==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.28.2.tgz",
      "integrity": "sha512-3H1weTYZPxt/WOhByszQZybS9w5lKzUn1FDMsgEChbHWQwHYQQRfBxgCcZvPhjHfKyJjIievvMmEUawJrdY9Dg==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.28.2.tgz",
      "integrity": "sha512-4xTZr1FUmSoQW4XIWmit3tzQrUTZM+N3P0XV8xROKYF50XfI7xeO90+1bZvNwxIufQ9hDQVRJH5YhgPVF8A/HQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.28.2.tgz",
      "integrity": "sha512-sSATRjPeDBg3pdgHoQfoYBob11Kk1FGa9lui5RIHZCoCkJa9QKlvl3/vKz2usCmYYjs7ymJR/2Nnsqe+Hjt5nw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.28.2.tgz",
      "integrity": "sha512-lqnzCV+mM0gIADaKihiCg6ifgfU2L3h5E33rNQBN1Y4MaVGnzryzmvvf7UHxprpQdE8hpqLolJ9Rl+SkIRDpyw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.28.2.tgz",
      "integrity": "sha512-AL2qJILH7lNjrDmCQDvdxMfAUIv8KMNZOvrwAQ8i8//ntL9FflhOyMJ8OZSMBb8/AWXe3/5v5S20y3zCoZWKoQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.28.2.tgz",
      "integrity": "sha512-QtiuPytchRyC4rwUKhexJdQKvDuZ6hWloi3igqPQNUJCS1/v9EiO3UTOXR6A3FoMo4fnAKbWJdqaIwhOzh8qEw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openharmony-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.28.2.tgz",
      "integrity": "sha512-WkhYDmpTjLvGlScA1rwjRUmhl4k8oXR3cIbtqWmELgU/dFeHHlEllxDvdWcNJV9rbzCexB5vz8gtNewWLgCT7Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.28.2.tgz",
      "integrity": "sha512-GPMSkTOtMnv2U2F8gxe4Io6qmVs+YKyp832Etqqxr0hFngmXQ3rzwytelm3GIn7T4VviRUlf3sOgBOiTdvaf7g==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.28.2.tgz",
      "integrity": "sha512-PIhhEkE9uPBleRBrQEJpUn7MBnibZzbGzYWPmY3x+YoVg/95zbjB4CxPPOQ8l5tYYM4mMaCthF8/1DIfBQQyWQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.28.2.tgz",
      "integrity": "sha512-YmJbfTlvU7Sdn9BB+4PRES4oB6pxgS37MAONj+hBr/cpXS1aBPKXxNnDbu+QCWPj0o9dgyxeq79g6c5P8KeuYA==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.28.2.tgz",
      "integrity": "sha512-5ebpxr3nWMzrL/rnUI755Jkuee0bHL/Gq0WTF9lvcpv73wAp5eu8MfBUgWK9bhWvZjj7yX8etf/8tI8Ney695g==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@fast-csv/format": {
      "version": "4.3.5",
      "resolved": "https://registry.npmjs.org/@fast-csv/format/-/format-4.3.5.tgz",
      "integrity": "sha512-8iRn6QF3I8Ak78lNAa+Gdl5MJJBM5vRHivFtMRUWINdevNo00K7OXxS2PshawLKTejVwieIlPmK5YlLu6w4u8A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "^14.0.1",
        "lodash.escaperegexp": "^4.1.2",
        "lodash.isboolean": "^3.0.3",
        "lodash.isequal": "^4.5.0",
        "lodash.isfunction": "^3.0.9",
        "lodash.isnil": "^4.0.0"
      }
    },
    "node_modules/@fast-csv/format/node_modules/@types/node": {
      "version": "14.18.63",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-14.18.63.tgz",
      "integrity": "sha512-fAtCfv4jJg+ExtXhvCkCqUKZ+4ok/JQk01qDKhL5BDDoS3AxKXhV5/MAVUZyQnSEd2GT92fkgZl0pz0Q0AzcIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@fast-csv/parse": {
      "version": "4.3.6",
      "resolved": "https://registry.npmjs.org/@fast-csv/parse/-/parse-4.3.6.tgz",
      "integrity": "sha512-uRsLYksqpbDmWaSmzvJcuApSEe38+6NQZBUsuAyMZKqHxH0g1wcJgsKUvN3WC8tewaqFjBMMGrkHmC+T7k8LvA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "^14.0.1",
        "lodash.escaperegexp": "^4.1.2",
        "lodash.groupby": "^4.6.0",
        "lodash.isfunction": "^3.0.9",
        "lodash.isnil": "^4.0.0",
        "lodash.isundefined": "^3.0.1",
        "lodash.uniq": "^4.5.0"
      }
    },
    "node_modules/@fast-csv/parse/node_modules/@types/node": {
      "version": "14.18.63",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-14.18.63.tgz",
      "integrity": "sha512-fAtCfv4jJg+ExtXhvCkCqUKZ+4ok/JQk01qDKhL5BDDoS3AxKXhV5/MAVUZyQnSEd2GT92fkgZl0pz0Q0AzcIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@fastify/ajv-compiler": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/@fastify/ajv-compiler/-/ajv-compiler-4.0.6.tgz",
      "integrity": "sha512-NtuzM0SfaMJbGlnjr9LWQUN5LzgSrbB8tf/wRZNas+4E1O/Nmzl53e7ruT61HDZyRCJGC6FxIogmNZO1c5ETBA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "ajv": "^8.12.0",
        "ajv-formats": "^3.0.1",
        "fast-uri": "^4.0.0"
      }
    },
    "node_modules/@fastify/busboy": {
      "version": "3.2.2",
      "resolved": "https://registry.npmjs.org/@fastify/busboy/-/busboy-3.2.2.tgz",
      "integrity": "sha512-yXSS27qPExaXeuLvMRMXOLtpipzfQYNjG3FkunDWKGfMYjKuhFXko9CVzqxm8jcF+lmtS9Fd89QNdh9XDjnbNg==",
      "license": "MIT"
    },
    "node_modules/@fastify/cookie": {
      "version": "11.1.2",
      "resolved": "https://registry.npmjs.org/@fastify/cookie/-/cookie-11.1.2.tgz",
      "integrity": "sha512-Dtrpk/YOGUsbRMvP/8ZqPpwnMRv0qSqodFdoQ2B589Obc7jw4s4Qla+cV72Bsm7WsZJnqlYFX/i7uSBq0xzg6g==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "cookie": "^2.0.0",
        "fastify-plugin": "^6.0.0"
      }
    },
    "node_modules/@fastify/deepmerge": {
      "version": "3.2.1",
      "resolved": "https://registry.npmjs.org/@fastify/deepmerge/-/deepmerge-3.2.1.tgz",
      "integrity": "sha512-N5Oqvltoa2r9z1tbx4xjky0oRR60v+T47Ic4J1ukoVQcptLOrIdRnCSdTGmOmajZuHVKlTnfcmrjyqsGEW1ztA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT"
    },
    "node_modules/@fastify/error": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/@fastify/error/-/error-4.2.0.tgz",
      "integrity": "sha512-RSo3sVDXfHskiBZKBPRgnQTtIqpi/7zhJOEmAxCiBcM7d0uwdGdxLlsCaLzGs8v8NnxIRlfG0N51p5yFaOentQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT"
    },
    "node_modules/@fastify/fast-json-stringify-compiler": {
      "version": "5.1.0",
      "resolved": "https://registry.npmjs.org/@fastify/fast-json-stringify-compiler/-/fast-json-stringify-compiler-5.1.0.tgz",
      "integrity": "sha512-PxcYtKLbQ8Z+yApiqjK8FwxIwvEj38k2OiLc17u8dkJSlmfi2wHHPaSnaoqBPQqtvF8YVsDgDpP2snDCfFrpfw==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "fast-json-stringify": "^7.0.0"
      }
    },
    "node_modules/@fastify/forwarded": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/@fastify/forwarded/-/forwarded-3.0.2.tgz",
      "integrity": "sha512-NE8HgKLgYejV9lDpqkEFaDKMLYelJBVfHekhB0UKvX0ghagXRJqg68feg8er1NPXxG4N9i6vPxzt8E+3wHfcmA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT"
    },
    "node_modules/@fastify/merge-json-schemas": {
      "version": "0.2.1",
      "resolved": "https://registry.npmjs.org/@fastify/merge-json-schemas/-/merge-json-schemas-0.2.1.tgz",
      "integrity": "sha512-OA3KGBCy6KtIvLf8DINC5880o5iBlDX4SxzLQS8HorJAbqluzLRn80UXU0bxZn7UOFhFgpRJDasfwn9nG4FG4A==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "dequal": "^2.0.3"
      }
    },
    "node_modules/@fastify/multipart": {
      "version": "9.3.0",
      "resolved": "https://registry.npmjs.org/@fastify/multipart/-/multipart-9.3.0.tgz",
      "integrity": "sha512-NpeKipTOjjL1dA7SSlRMrOWWtrE8/0yKOmeudkdQoEaz4sVDJw5MVdZIahsWhvpc3YTN7f04f9ep/Y65RKoOWA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "@fastify/busboy": "^3.0.0",
        "@fastify/deepmerge": "^3.0.0",
        "@fastify/error": "^4.0.0",
        "fastify-plugin": "^5.0.0",
        "secure-json-parse": "^4.0.0"
      }
    },
    "node_modules/@fastify/multipart/node_modules/fastify-plugin": {
      "version": "5.1.0",
      "resolved": "https://registry.npmjs.org/fastify-plugin/-/fastify-plugin-5.1.0.tgz",
      "integrity": "sha512-FAIDA8eovSt5qcDgcBvDuX/v0Cjz0ohGhENZ/wpc3y+oZCY2afZ9Baqql3g/lC+OHRnciQol4ww7tuthOb9idw==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT"
    },
    "node_modules/@fastify/proxy-addr": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/@fastify/proxy-addr/-/proxy-addr-5.1.1.tgz",
      "integrity": "sha512-zv07Y9GEuDsJPegZoDFd4SDWaZOW8N2pa0GSrYmKpId/tjt1Hgo3BjZBVjdVpfVrHaA+Qv5jawtS2O50J5xM9g==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "@fastify/forwarded": "^3.0.0",
        "ipaddr.js": "^2.1.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.6.0.tgz",
      "integrity": "sha512-T7jf+5zgsZHwNJ4lvQ7/aezbyk0nNX+zJVWpmHA7VYsEx7a7qr5Rg5IbtJFqkgze5Y2sruq1RUY8Q837Od7iFw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@napi-rs/lzma-linux-x64-gnu": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/@napi-rs/lzma-linux-x64-gnu/-/lzma-linux-x64-gnu-1.5.1.tgz",
      "integrity": "sha512-oTXEIha4SsuXdTA4Iyskj0kpdx2yVXdhd75c2v3xGrHFfVMsbhTPZU/nMPL4sWKo4pBHm3aucLaqGlF696dTyQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^22.20 || ^24.12 || >=25"
      }
    },
    "node_modules/@pinojs/redact": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/@pinojs/redact/-/redact-0.4.0.tgz",
      "integrity": "sha512-k2ENnmBugE/rzQfEcdWHcCY+/FM3VLzH9cYEsbdsoqrvzAKRhUZeRNhAZvB8OitQJ1TBed3yqWtdjzS6wJKBwg==",
      "license": "MIT"
    },
    "node_modules/@rollup/rollup-android-arm-eabi": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.63.6.tgz",
      "integrity": "sha512-G6xF9OVRWsbHadMfoPNUDwW/Jt70QYG+ZDUvtYCFxjf3SPhqVAO0u9ShXZ7Cf5silVoRWyN4bDjCEKnJkXkw0w==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-arm64": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.63.6.tgz",
      "integrity": "sha512-Us/kTH5e2anr1CQvO8MEq4eeCVcIXI3Ag7OFxDI30n2OW7Q7xWuxo8ItbYq28PG2Sm1NWmZzG9+SqVEaj25SFA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-darwin-arm64": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.63.6.tgz",
      "integrity": "sha512-fwaSNrSHp9PJuEh4bKtd0mYC+G3FeVDjSTmsSiSlIYu7TFCpxrfB6lk7Ao8cIbswFyklPB1ZDUV8LkLBM15VWw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-darwin-x64": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.63.6.tgz",
      "integrity": "sha512-QR2tx26gCeGh4eAGnUasfnJuRc+d7Vc0Jo1/fYtKGuiKqCuhbVpbNEvqgYGBwGDZGyS04jj+zdHi9W8uvb1Sdw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-arm64": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-arm64/-/rollup-freebsd-arm64-4.63.6.tgz",
      "integrity": "sha512-7E1wRJEW8r7WlqmCy58ugndWHrzoEV/pRt2x0D9el7Inra62+Cw00lYW9XhW6iUCtFjhNw49McsSCIzJ/nG8uw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-x64": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-x64/-/rollup-freebsd-x64-4.63.6.tgz",
      "integrity": "sha512-13KJeF+vDswMzEHmMIouCVcEQdov3CzAA3ZhM8QFmBJV/FZ/VMZI49UHDvPXTK+wokk86kYPmQ9Qb3xGGJbZoQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-gnueabihf": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-gnueabihf/-/rollup-linux-arm-gnueabihf-4.63.6.tgz",
      "integrity": "sha512-hV+W1r8HM84PER4If94QuzrrD0DNk4CxobNhVUiz9ZiiWHDzJss4Jra2AYGH1a7GOTzjS1sIyZ35yYEhw/aq+g==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-musleabihf": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-musleabihf/-/rollup-linux-arm-musleabihf-4.63.6.tgz",
      "integrity": "sha512-5dWs/GENZufRph8PEfl0TrNH/R3DHJA+VxF/dqlfV2oUZfxRtN3qmFXg2DZj8DYM8d+Vd3dgZtuVmoBE/nb2YQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-gnu": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-gnu/-/rollup-linux-arm64-gnu-4.63.6.tgz",
      "integrity": "sha512-inQYLPVIUvYk+s7zpxQldqwrajUNs+t4TJjPGzsdPTvsT8gsQXVcW/sQFolHZ3YSWVk0nMMwU7TtRi0Ow+QMuw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-musl": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-musl/-/rollup-linux-arm64-musl-4.63.6.tgz",
      "integrity": "sha512-sH+0MV1HmDC1q7+bQnlN9ywKBmHqkA2EdD/hHYrrz654ybc+vNC1FRNyzuYKicMQVtZZ4X2jz0osJYmsOtnj4g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-gnu": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loong64-gnu/-/rollup-linux-loong64-gnu-4.63.6.tgz",
      "integrity": "sha512-mCECvRr6HGekdBc6dvHzUWubqEti4JyOqlNePrOzl4Wimk26iW5Zy9rld2mQbC9id1NYjfF8nHLFq5fr3CuOKQ==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-musl": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loong64-musl/-/rollup-linux-loong64-musl-4.63.6.tgz",
      "integrity": "sha512-bb9rdoCPwM4DEsbOP3CJgFnvhSJ3XKCUYyUhxnlSs/XGT0DknpOYgLCPbK8VUzwl+cZGzFQm0KbBYRaSGZC2YQ==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-gnu": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-gnu/-/rollup-linux-ppc64-gnu-4.63.6.tgz",
      "integrity": "sha512-aIJRoGCHev45JSu7JMzVrMzu1NX3nQrXx1Vb/6y4AblxW7JpCMpk4e8C6lHzvSElxi3UEcMdFJldsuWQjV1ddA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-musl": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-musl/-/rollup-linux-ppc64-musl-4.63.6.tgz",
      "integrity": "sha512-LvjnulezHjiaM5Ga9MPCDLTVddjvcrJhZc6vEz9fxeFRGPJsPAX9HuTuPTUQ3l8d+nYpZB/xWzUpuKJlLQm3VQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-gnu": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-gnu/-/rollup-linux-riscv64-gnu-4.63.6.tgz",
      "integrity": "sha512-YmhSBeYZwJ937s8tKpYAhms48N+tj7e+oFkbkVVxfMRdAiynK2AxqRapJXB4utyXxc/iYTkMfPRQ+7ZP0IO78w==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-musl": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-musl/-/rollup-linux-riscv64-musl-4.63.6.tgz",
      "integrity": "sha512-9+YukhzqTvJvzfDXJJzkURK9TDY01nofNH3pyHGuucGC4xPvBVtIfCAqJjkjnmBEGJYNXB8sBc2EDt7xDgGenw==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-s390x-gnu": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-s390x-gnu/-/rollup-linux-s390x-gnu-4.63.6.tgz",
      "integrity": "sha512-9G5AtEkpN/A89BILHHEL9aYRYTuFjwa8PUQqoEg8SDrwOZBKpwYqNlQCBNI5QPwGrf7qFlb6LNFilo8FCSA3Wg==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-gnu": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.63.6.tgz",
      "integrity": "sha512-Ezx2E5D6Siz805j41x91JiGbzuCm8i2U98U37SQ7ytY737+wsJq+P9nPL6UmqDww491zO7MTivYOTrtmTTeCSw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-musl": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-musl/-/rollup-linux-x64-musl-4.63.6.tgz",
      "integrity": "sha512-8EZ1Q3PB7yUjvR4MbFAnCBF1wF0XRe5QQqbtlJXP7ZX5C8iYlSQJugUhj9oS0gbUP4jp9qGhaIgFnV9Nvod86Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-openbsd-x64": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-openbsd-x64/-/rollup-openbsd-x64-4.63.6.tgz",
      "integrity": "sha512-3JI27TALItfZ/qaxXKdbRXfV6WepUoUa3IN07FE+1xxoRdl3JIyrp5PiDF0vOHsPgEiOFkF8s3B3BRymQkdwGA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ]
    },
    "node_modules/@rollup/rollup-openharmony-arm64": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-openharmony-arm64/-/rollup-openharmony-arm64-4.63.6.tgz",
      "integrity": "sha512-BNOGeNFNRZDT7Hfc7b9JbTZFXkpAXeXl/CZWtxdd5CNfBaor/0RkJjg+q+E2gwVIvGqqp/NclThKFGrhuScVhw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ]
    },
    "node_modules/@rollup/rollup-win32-arm64-msvc": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-arm64-msvc/-/rollup-win32-arm64-msvc-4.63.6.tgz",
      "integrity": "sha512-D3eEyLSIim5WF5fHbwnx+ryk0delN7fJyBrDTO3wVCCNBZ/cA8aCGwLS3SiuK+vRI4E7dqikAlStGuR20dBMuw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-ia32-msvc": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-ia32-msvc/-/rollup-win32-ia32-msvc-4.63.6.tgz",
      "integrity": "sha512-xwbs9g8zLbHzj1poG1uh27xtubsu27Gk2nuN6kvvGDybjiTfwMksQAnF+phlvI5oeXkJWWDc6kg1t3XpgUYvrg==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-gnu": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-gnu/-/rollup-win32-x64-gnu-4.63.6.tgz",
      "integrity": "sha512-Tr6rhRNnFthvXr45zWVZQ5P8jZ5UwZnXNc7Qnu80cP/VVYtSioOPmvv7wP6UMgRfkBCJr2Pm60ua0YBDSJjgnw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-msvc": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.63.6.tgz",
      "integrity": "sha512-0RAxO1pS/6lY1mSoD2Apm+6aPyfUlm+OWKgncIdj/eVN9I+pDY3lKgD7xsUNFei1u7MZQETGOo6m8POXMDp53A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@types/better-sqlite3": {
      "version": "7.6.13",
      "resolved": "https://registry.npmjs.org/@types/better-sqlite3/-/better-sqlite3-7.6.13.tgz",
      "integrity": "sha512-NMv9ASNARoKksWtsq/SHakpYAYnhBrQgGD8zkLYk/jaK8jUGn08CfEdTRgYhMypUQAfzSP8W6gNLe0q19/t4VA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@types/chai": {
      "version": "5.2.3",
      "resolved": "https://registry.npmjs.org/@types/chai/-/chai-5.2.3.tgz",
      "integrity": "sha512-Mw558oeA9fFbv65/y4mHtXDs9bPnFMZAL/jxdPFUpOHHIXX91mcgEHbS5Lahr+pwZFR8A7GQleRWeI6cGFC2UA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/deep-eql": "*",
        "assertion-error": "^2.0.1"
      }
    },
    "node_modules/@types/deep-eql": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/@types/deep-eql/-/deep-eql-4.0.2.tgz",
      "integrity": "sha512-c9h9dVVMigMPc4bwTvC5dxqtqJZwQPePsWjPlpSOnojbor6pGqdk541lfA7AqFQr5pB1BRdq0juY9db81BwyFw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/estree": {
      "version": "1.0.9",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.9.tgz",
      "integrity": "sha512-GhdPgy1el4/ImP05X05Uw4cw2/M93BCUmnEvWZNStlCzEKME4Fkk+YpoA5OiHNQmoS7Cafb8Xa3Pya8m1Qrzeg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "22.20.5",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-22.20.5.tgz",
      "integrity": "sha512-U2+DNr+wSjpsTS/wZGYHq7GcwfuSmKiKvoPvK22zwTlRhU91yOniN4qRR5KhIjvif7ysw/dz/hKmfDH0Ris4aA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "undici-types": "~6.21.0"
      }
    },
    "node_modules/@vitest/expect": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/expect/-/expect-3.2.7.tgz",
      "integrity": "sha512-E8eBXaKibuvH2pSZErOjdVb5vF4PbKYcrnluBTYxEk1l/VhhwZg1kZQsdtjq+CsF5CFydf2Rdkz7jDHKSisi3w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/chai": "^5.2.2",
        "@vitest/spy": "3.2.7",
        "@vitest/utils": "3.2.7",
        "chai": "^5.2.0",
        "tinyrainbow": "^2.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/@vitest/mocker": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/mocker/-/mocker-3.2.7.tgz",
      "integrity": "sha512-Trr0hYO9CM3Wj6ksWHRhK9IZpIY6wTMO5u/MqXurMxT57sWBaOPEtP3Oq60ihZuh5JsiagKfz95OcxdEP6dBrA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@vitest/spy": "3.2.7",
        "estree-walker": "^3.0.3",
        "magic-string": "^0.30.17"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      },
      "peerDependencies": {
        "msw": "^2.4.9",
        "vite": "^5.0.0 || ^6.0.0 || ^7.0.0-0"
      },
      "peerDependenciesMeta": {
        "msw": {
          "optional": true
        },
        "vite": {
          "optional": true
        }
      }
    },
    "node_modules/@vitest/pretty-format": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/pretty-format/-/pretty-format-3.2.7.tgz",
      "integrity": "sha512-KUHlwqVu0sRlhCdyPdQ/wBoTfRahjUky1MubOmYw9fWfIZy1gNoHpuaaQBPAaMaVYdQYHJLurzj8ECCj5OwTqA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "tinyrainbow": "^2.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/@vitest/runner": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/runner/-/runner-3.2.7.tgz",
      "integrity": "sha512-sB9y4ovltoQP+WaUPwmSxO9WIg9Ig694Di5PalVPsYHklAdE027mehpWF2SQSVq+k6sFgaivbTjTJwZLSHbedA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@vitest/utils": "3.2.7",
        "pathe": "^2.0.3",
        "strip-literal": "^3.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/@vitest/snapshot": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/snapshot/-/snapshot-3.2.7.tgz",
      "integrity": "sha512-7C+MwShwtBSI5Buwoyg3s/iY1eHL9PKAf+O1wVh/TdnjXUtkoL/9YQtre90i4MtNXM6edP1wJ2zOBpfCyhIS7g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@vitest/pretty-format": "3.2.7",
        "magic-string": "^0.30.17",
        "pathe": "^2.0.3"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/@vitest/spy": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/spy/-/spy-3.2.7.tgz",
      "integrity": "sha512-Q2eQGI6d2L/hBtZ0qNuKcAGid68XK6cv1xsoaIma6PaJhHPoqcEJhYpXZ/5myCMqkNgtP6UKuBhbc0nHKnrkuQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "tinyspy": "^4.0.3"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/@vitest/utils": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/@vitest/utils/-/utils-3.2.7.tgz",
      "integrity": "sha512-x6BDOd7dyo3PFLY3I9/HJ25X/6OurhGXk2/B9gOZNPF7XDVjeBK4k01lQE5uvDpbuheErh91qYuE1E2OEjK3Rw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@vitest/pretty-format": "3.2.7",
        "loupe": "^3.1.4",
        "tinyrainbow": "^2.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/abstract-logging": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/abstract-logging/-/abstract-logging-2.0.1.tgz",
      "integrity": "sha512-2BjRTZxTPvheOvGbBslFSYOUkr+SjPtOnrLP33f+VIWLzezQpZcqVg7ja3L4dBXmzzgwT+a029jRx5PCi3JuiA==",
      "license": "MIT"
    },
    "node_modules/ajv": {
      "version": "8.20.0",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-8.20.0.tgz",
      "integrity": "sha512-Thbli+OlOj+iMPYFBVBfJ3OmCAnaSyNn4M1vz9T6Gka5Jt9ba/HIR56joy65tY6kx/FCF5VXNB819Y7/GUrBGA==",
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.3",
        "fast-uri": "^3.0.1",
        "json-schema-traverse": "^1.0.0",
        "require-from-string": "^2.0.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ajv-formats": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/ajv-formats/-/ajv-formats-3.0.1.tgz",
      "integrity": "sha512-8iUql50EUR+uUcdRQ3HDqa6EVyo3docL8g5WJ3FNcWmu62IbkGUue/pEyLBW8VGKKucTPgqeks4fIU1DA4yowQ==",
      "license": "MIT",
      "dependencies": {
        "ajv": "^8.0.0"
      },
      "peerDependencies": {
        "ajv": "^8.0.0"
      },
      "peerDependenciesMeta": {
        "ajv": {
          "optional": true
        }
      }
    },
    "node_modules/ajv/node_modules/fast-uri": {
      "version": "3.1.8",
      "resolved": "https://registry.npmjs.org/fast-uri/-/fast-uri-3.1.8.tgz",
      "integrity": "sha512-GZMtZUTNRpOVIECoXwLNZS5xUGE+mVNbTB8h/7Rwh2TFWcBQiPzTgyZi05BF9UMZKkLJv8XBRJTlU7zg8+ZfMg==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "BSD-3-Clause"
    },
    "node_modules/archiver": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/archiver/-/archiver-5.3.2.tgz",
      "integrity": "sha512-+25nxyyznAXF7Nef3y0EbBeqmGZgeN/BxHX29Rs39djAfaFalmQ89SE6CWyDCHzGL0yt/ycBtNOmGTW0FyGWNw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "archiver-utils": "^2.1.0",
        "async": "^3.2.4",
        "buffer-crc32": "^0.2.1",
        "readable-stream": "^3.6.0",
        "readdir-glob": "^1.1.2",
        "tar-stream": "^2.2.0",
        "zip-stream": "^4.1.0"
      },
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/archiver-utils": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/archiver-utils/-/archiver-utils-2.1.0.tgz",
      "integrity": "sha512-bEL/yUb/fNNiNTuUz979Z0Yg5L+LzLxGJz8x79lYmR54fmTIb6ob/hNQgkQnIUDWIFjZVQwl9Xs356I6BAMHfw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "glob": "^7.1.4",
        "graceful-fs": "^4.2.0",
        "lazystream": "^1.0.0",
        "lodash.defaults": "^4.2.0",
        "lodash.difference": "^4.5.0",
        "lodash.flatten": "^4.4.0",
        "lodash.isplainobject": "^4.0.6",
        "lodash.union": "^4.6.0",
        "normalize-path": "^3.0.0",
        "readable-stream": "^2.0.0"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/archiver-utils/node_modules/readable-stream": {
      "version": "2.3.8",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-2.3.8.tgz",
      "integrity": "sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "core-util-is": "~1.0.0",
        "inherits": "~2.0.3",
        "isarray": "~1.0.0",
        "process-nextick-args": "~2.0.0",
        "safe-buffer": "~5.1.1",
        "string_decoder": "~1.1.1",
        "util-deprecate": "~1.0.1"
      }
    },
    "node_modules/archiver-utils/node_modules/safe-buffer": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
      "integrity": "sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/archiver-utils/node_modules/string_decoder": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.1.1.tgz",
      "integrity": "sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.1.0"
      }
    },
    "node_modules/assertion-error": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/assertion-error/-/assertion-error-2.0.1.tgz",
      "integrity": "sha512-Izi8RQcffqCeNVgFigKli1ssklIbpHnCYc6AknXGYoB6grJqyeby7jv12JUQgmTAnIDnbck1uxksT4dzN3PWBA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/async": {
      "version": "3.2.6",
      "resolved": "https://registry.npmjs.org/async/-/async-3.2.6.tgz",
      "integrity": "sha512-htCUDlxyyCLMgaM3xXg0C0LW2xqfuQ6p05pCEIsXuyQ+a1koYKTuBMzRNwmybfLgvJDMd0r1LTn4+E0Ti6C2AA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/atomic-sleep": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/atomic-sleep/-/atomic-sleep-1.0.0.tgz",
      "integrity": "sha512-kNOjDqAh7px0XWNI+4QbzoiR/nTkHAWNud2uvnJquD1/x5a7EQZMJT0AczqK0Qn67oY/TTQ1LbUKajZpp3I9tQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8.0.0"
      }
    },
    "node_modules/avvio": {
      "version": "9.3.0",
      "resolved": "https://registry.npmjs.org/avvio/-/avvio-9.3.0.tgz",
      "integrity": "sha512-g2tQ7LE7oOSqDfwEm3M+ZCMTJc7KiZCdJ4UwyZJb5ckTKyYu50OYmvv0mCFXPuYXoM4zkSt8zM9XQ9KCvxA74A==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "@fastify/error": "^4.0.0",
        "fastq": "^1.17.1"
      }
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/base64-js": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/base64-js/-/base64-js-1.5.1.tgz",
      "integrity": "sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/better-sqlite3": {
      "version": "13.0.3",
      "resolved": "https://registry.npmjs.org/better-sqlite3/-/better-sqlite3-13.0.3.tgz",
      "integrity": "sha512-RbOBxmLBG8uvFUc15X9+9SFemKcQ0WBuISBVkpuiaUB2qblC8UWlHEjdWVoZ8AdhSwmoEgsiXKfopX0CQxaACQ==",
      "license": "MIT",
      "dependencies": {
        "node-addon-api": "^8.0.0"
      },
      "engines": {
        "node": ">=22"
      }
    },
    "node_modules/big-integer": {
      "version": "1.6.52",
      "resolved": "https://registry.npmjs.org/big-integer/-/big-integer-1.6.52.tgz",
      "integrity": "sha512-QxD8cf2eVqJOOz63z6JIN9BzvVs/dlySa5HGSBH5xtR8dPteIRQnBxxKqkNTiT6jbDTF6jAfrd4oMcND9RGbQg==",
      "dev": true,
      "license": "Unlicense",
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/binary": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/binary/-/binary-0.3.0.tgz",
      "integrity": "sha512-D4H1y5KYwpJgK8wk1Cue5LLPgmwHKYSChkbspQg5JtVuR5ulGckxfR62H3AE9UDkdMC8yyXlqYihuz3Aqg2XZg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "buffers": "~0.1.1",
        "chainsaw": "~0.1.0"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/bl": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/bl/-/bl-4.1.0.tgz",
      "integrity": "sha512-1W07cM9gS6DcLperZfFSj+bWLtaPGSOHWhPiGzXmvVJbRLdG82sH/Kn8EtW1VqWVA54AKf2h5k5BbnIbwF3h6w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "buffer": "^5.5.0",
        "inherits": "^2.0.4",
        "readable-stream": "^3.4.0"
      }
    },
    "node_modules/bluebird": {
      "version": "3.4.7",
      "resolved": "https://registry.npmjs.org/bluebird/-/bluebird-3.4.7.tgz",
      "integrity": "sha512-iD3898SR7sWVRHbiQv+sHUtHnMvC1o3nW5rAcqnq3uOn07DSAppZYUkIGslDz6gXC7HfunPe7YVBgoEJASPcHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/brace-expansion": {
      "version": "1.1.21",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.21.tgz",
      "integrity": "sha512-9zeA+KLZNNzglF2TPKRQEDyx6Yby7daAkuy8MiPzpXPsYDWi/DRM8jmwUDxokQjYqBpv5DgPiwD4h4ZZSy1Ujw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/buffer": {
      "version": "5.7.1",
      "resolved": "https://registry.npmjs.org/buffer/-/buffer-5.7.1.tgz",
      "integrity": "sha512-EHcyIPBQ4BSGlvjB16k5KgAJ27CIsHY/2JBmCRReo48y9rQ3MaUzWX3KVlBa4U7MyX02HdVj0K7C3WaB3ju7FQ==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "base64-js": "^1.3.1",
        "ieee754": "^1.1.13"
      }
    },
    "node_modules/buffer-crc32": {
      "version": "0.2.13",
      "resolved": "https://registry.npmjs.org/buffer-crc32/-/buffer-crc32-0.2.13.tgz",
      "integrity": "sha512-VO9Ht/+p3SN7SKWqcrgEzjGbRSJYTx+Q1pTQC0wrWqHx0vpJraQ6GtHx8tvcg1rlK1byhU5gccxgOgj7B0TDkQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "*"
      }
    },
    "node_modules/buffer-indexof-polyfill": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/buffer-indexof-polyfill/-/buffer-indexof-polyfill-1.0.2.tgz",
      "integrity": "sha512-I7wzHwA3t1/lwXQh+A5PbNvJxgfo5r3xulgpYDB5zckTu/Z9oUK9biouBKQUjEqzaz3HnAT6TYoovmE+GqSf7A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/buffers": {
      "version": "0.1.1",
      "resolved": "https://registry.npmjs.org/buffers/-/buffers-0.1.1.tgz",
      "integrity": "sha512-9q/rDEGSb/Qsvv2qvzIzdluL5k7AaJOTrw23z9reQthrbF7is4CtlT0DXyO1oei2DCp4uojjzQ7igaSHp1kAEQ==",
      "dev": true,
      "engines": {
        "node": ">=0.2.0"
      }
    },
    "node_modules/cac": {
      "version": "6.7.14",
      "resolved": "https://registry.npmjs.org/cac/-/cac-6.7.14.tgz",
      "integrity": "sha512-b6Ilus+c3RrdDk+JhLKUAQfzzgLEPy6wcXqS7f/xe1EETvsDP6GORG7SFuOs6cID5YkqchW/LXZbX5bc8j7ZcQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/chai": {
      "version": "5.3.3",
      "resolved": "https://registry.npmjs.org/chai/-/chai-5.3.3.tgz",
      "integrity": "sha512-4zNhdJD/iOjSH0A05ea+Ke6MU5mmpQcbQsSOkgdaUMJ9zTlDTD/GYlwohmIE2u0gaxHYiVHEn1Fw9mZ/ktJWgw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "assertion-error": "^2.0.1",
        "check-error": "^2.1.1",
        "deep-eql": "^5.0.1",
        "loupe": "^3.1.0",
        "pathval": "^2.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/chainsaw": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/chainsaw/-/chainsaw-0.1.0.tgz",
      "integrity": "sha512-75kWfWt6MEKNC8xYXIdRpDehRYY/tNSgwKaJq+dbbDcxORuVrrQ+SEHoWsniVn9XPYfP4gmdWIeDk/4YNp1rNQ==",
      "dev": true,
      "license": "MIT/X11",
      "dependencies": {
        "traverse": ">=0.3.0 <0.4"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/check-error": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/check-error/-/check-error-2.1.3.tgz",
      "integrity": "sha512-PAJdDJusoxnwm1VwW07VWwUN1sl7smmC3OKggvndJFadxxDRyFJBX/ggnu/KE4kQAB7a3Dp8f/YXC1FlUprWmA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 16"
      }
    },
    "node_modules/compress-commons": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/compress-commons/-/compress-commons-4.1.2.tgz",
      "integrity": "sha512-D3uMHtGc/fcO1Gt1/L7i1e33VOvD4A9hfQLP+6ewd+BvG/gQ84Yh4oftEhAdjSMgBgwGL+jsppT7JYNpo6MHHg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "buffer-crc32": "^0.2.13",
        "crc32-stream": "^4.0.2",
        "normalize-path": "^3.0.0",
        "readable-stream": "^3.6.0"
      },
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/cookie": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-2.0.1.tgz",
      "integrity": "sha512-yuToqVvRrj6pfDXREyQAAv8SkAEk/8GS3jQRTiUMm66TVtBYmqQeoEjL2Lmq8Rpo6271vH76InTChTitEAm65w==",
      "license": "MIT",
      "engines": {
        "node": ">=22"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/core-util-is": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/core-util-is/-/core-util-is-1.0.3.tgz",
      "integrity": "sha512-ZQBvi1DcpJ4GDqanjucZ2Hj3wEO5pZDS89BWbkcrvdxksJorwUDDZamX9ldFkp9aw2lmBDLgkObEA4DWNJ9FYQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/crc-32": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/crc-32/-/crc-32-1.2.2.tgz",
      "integrity": "sha512-ROmzCKrTnOwybPcJApAA6WBWij23HVfGVNKqqrZpuyZOHqK2CwHSvpGuyt/UNNvaIjEd8X5IFGp4Mh+Ie1IHJQ==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "crc32": "bin/crc32.njs"
      },
      "engines": {
        "node": ">=0.8"
      }
    },
    "node_modules/crc32-stream": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/crc32-stream/-/crc32-stream-4.0.3.tgz",
      "integrity": "sha512-NT7w2JVU7DFroFdYkeq8cywxrgjPHWkdX1wjpRQXPX5Asews3tA+Ght6lddQO5Mkumffp3X7GEqku3epj2toIw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "crc-32": "^1.2.0",
        "readable-stream": "^3.4.0"
      },
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/dayjs": {
      "version": "1.11.23",
      "resolved": "https://registry.npmjs.org/dayjs/-/dayjs-1.11.23.tgz",
      "integrity": "sha512-QDTCU0M0MxR3hQfnlDJfwekQiaanm1ubOD231u73WBckQ/fsamwRLiE2GBz6D3a/xF1NgfiDLJjXBa1hYOYTtQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/deep-eql": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/deep-eql/-/deep-eql-5.0.2.tgz",
      "integrity": "sha512-h5k/5U50IJJFpzfL6nO9jaaumfjO/f2NjK/oYB2Djzm4p9L+3T9qWpZqZ2hAbLPuuYq9wrU08WQyBTL5GbPk5Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/dequal": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/dequal/-/dequal-2.0.3.tgz",
      "integrity": "sha512-0je+qPKHEMohvfRTCEo3CrPG6cAzAYgmzKyxRiYSSDkS6eGJdyVJm7WaYA5ECaAD9wLB2T4EEeymA5aFVcYXCA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/duplexer2": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/duplexer2/-/duplexer2-0.1.4.tgz",
      "integrity": "sha512-asLFVfWWtJ90ZyOUHMqk7/S2w2guQKxUI2itj3d92ADHhxUSbCMGi1f1cBcJ7xM1To+pE/Khbwo1yuNbMEPKeA==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "readable-stream": "^2.0.2"
      }
    },
    "node_modules/duplexer2/node_modules/readable-stream": {
      "version": "2.3.8",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-2.3.8.tgz",
      "integrity": "sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "core-util-is": "~1.0.0",
        "inherits": "~2.0.3",
        "isarray": "~1.0.0",
        "process-nextick-args": "~2.0.0",
        "safe-buffer": "~5.1.1",
        "string_decoder": "~1.1.1",
        "util-deprecate": "~1.0.1"
      }
    },
    "node_modules/duplexer2/node_modules/safe-buffer": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
      "integrity": "sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/duplexer2/node_modules/string_decoder": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.1.1.tgz",
      "integrity": "sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.1.0"
      }
    },
    "node_modules/end-of-stream": {
      "version": "1.4.5",
      "resolved": "https://registry.npmjs.org/end-of-stream/-/end-of-stream-1.4.5.tgz",
      "integrity": "sha512-ooEGc6HP26xXq/N+GCGOT0JKCLDGrq2bQUZrQ7gyrJiZANJ/8YDTxTpQBXGMn+WbIQXNVpyWymm7KYVICQnyOg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "once": "^1.4.0"
      }
    },
    "node_modules/es-module-lexer": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/es-module-lexer/-/es-module-lexer-1.7.0.tgz",
      "integrity": "sha512-jEQoCwk8hyb2AZziIOLhDqpm5+2ww5uIE6lkO/6jcOCusfk6LhMHpXXfBLXTZ7Ydyt0j4VoUQv6uGNYbdW+kBA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/esbuild": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.28.2.tgz",
      "integrity": "sha512-HKVLS8dvII+xoKW9kmqxbRKrnWEXfJJr/FZhhJmiqIB0e053QNYFqOBouTMO/k5sID4MvCiUCvv8b9M4h32wIA==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.28.2",
        "@esbuild/android-arm": "0.28.2",
        "@esbuild/android-arm64": "0.28.2",
        "@esbuild/android-x64": "0.28.2",
        "@esbuild/darwin-arm64": "0.28.2",
        "@esbuild/darwin-x64": "0.28.2",
        "@esbuild/freebsd-arm64": "0.28.2",
        "@esbuild/freebsd-x64": "0.28.2",
        "@esbuild/linux-arm": "0.28.2",
        "@esbuild/linux-arm64": "0.28.2",
        "@esbuild/linux-ia32": "0.28.2",
        "@esbuild/linux-loong64": "0.28.2",
        "@esbuild/linux-mips64el": "0.28.2",
        "@esbuild/linux-ppc64": "0.28.2",
        "@esbuild/linux-riscv64": "0.28.2",
        "@esbuild/linux-s390x": "0.28.2",
        "@esbuild/linux-x64": "0.28.2",
        "@esbuild/netbsd-arm64": "0.28.2",
        "@esbuild/netbsd-x64": "0.28.2",
        "@esbuild/openbsd-arm64": "0.28.2",
        "@esbuild/openbsd-x64": "0.28.2",
        "@esbuild/openharmony-arm64": "0.28.2",
        "@esbuild/sunos-x64": "0.28.2",
        "@esbuild/win32-arm64": "0.28.2",
        "@esbuild/win32-ia32": "0.28.2",
        "@esbuild/win32-x64": "0.28.2"
      }
    },
    "node_modules/estree-walker": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/estree-walker/-/estree-walker-3.0.3.tgz",
      "integrity": "sha512-7RUKfXgSMMkzt6ZuXmqapOurLGPPfgj6l9uRZ7lRGolvk0y2yocc35LdcxKC5PQZdn2DMqioAQ2NoWcrTKmm6g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/estree": "^1.0.0"
      }
    },
    "node_modules/exceljs": {
      "version": "4.4.0",
      "resolved": "https://registry.npmjs.org/exceljs/-/exceljs-4.4.0.tgz",
      "integrity": "sha512-XctvKaEMaj1Ii9oDOqbW/6e1gXknSY4g/aLCDicOXqBE4M0nRWkUu0PTp++UPNzoFY12BNHMfs/VadKIS6llvg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "archiver": "^5.0.0",
        "dayjs": "^1.8.34",
        "fast-csv": "^4.3.1",
        "jszip": "^3.10.1",
        "readable-stream": "^3.6.0",
        "saxes": "^5.0.1",
        "tmp": "^0.2.0",
        "unzipper": "^0.10.11",
        "uuid": "^8.3.0"
      },
      "engines": {
        "node": ">=8.3.0"
      }
    },
    "node_modules/expect-type": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/expect-type/-/expect-type-1.4.0.tgz",
      "integrity": "sha512-KfYbmpRm0VbLjEvVa9yGwCi9GI34xvi7A/HXYWQO65CSD2u3MczUJSuwXKFIxlGsgBQizV9q5J9NHj4VG0n+pA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=12.0.0"
      }
    },
    "node_modules/fast-csv": {
      "version": "4.3.6",
      "resolved": "https://registry.npmjs.org/fast-csv/-/fast-csv-4.3.6.tgz",
      "integrity": "sha512-2RNSpuwwsJGP0frGsOmTb9oUF+VkFSM4SyLTDgwf2ciHWTarN0lQTC+F2f/t5J9QjW+c65VFIAAu85GsvMIusw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@fast-csv/format": "4.3.5",
        "@fast-csv/parse": "4.3.6"
      },
      "engines": {
        "node": ">=10.0.0"
      }
    },
    "node_modules/fast-decode-uri-component": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/fast-decode-uri-component/-/fast-decode-uri-component-1.0.1.tgz",
      "integrity": "sha512-WKgKWg5eUxvRZGwW8FvfbaH7AXSh2cL+3j5fMGzUMCxWBJ3dV3a7Wz8y2f/uQ0e3B6WmodD3oS54jTQ9HVTIIg==",
      "license": "MIT"
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "license": "MIT"
    },
    "node_modules/fast-json-stringify": {
      "version": "7.0.1",
      "resolved": "https://registry.npmjs.org/fast-json-stringify/-/fast-json-stringify-7.0.1.tgz",
      "integrity": "sha512-eRSayARSbbwlBjpP4vnTTIRD5QPcIrmihPxDeN1DtKnHPg66UuJLx+8hlK1kaFdjvzyQ/dzALoi4vwAQ+T+iZA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "@fastify/merge-json-schemas": "^0.2.0",
        "ajv": "^8.12.0",
        "ajv-formats": "^3.0.1",
        "fast-uri": "^4.0.0",
        "json-schema-ref-resolver": "^3.0.0",
        "rfdc": "^1.2.0"
      }
    },
    "node_modules/fast-querystring": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/fast-querystring/-/fast-querystring-1.1.2.tgz",
      "integrity": "sha512-g6KuKWmFXc0fID8WWH0jit4g0AGBoJhCkJMb1RmbsSEUNvQ+ZC8D6CUZ+GtF8nMzSPXnhiePyyqqipzNNEnHjg==",
      "license": "MIT",
      "dependencies": {
        "fast-decode-uri-component": "^1.0.1"
      }
    },
    "node_modules/fast-uri": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/fast-uri/-/fast-uri-4.2.1.tgz",
      "integrity": "sha512-TmHQgewjHtMq1E5QKA0tOE0yeYGQs25KZC/ziJpubRtWI15W92e6vPFydWOeZBVROSHBYw/QhD9d5OefdD6LDg==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "BSD-3-Clause"
    },
    "node_modules/fastify": {
      "version": "5.12.5",
      "resolved": "https://registry.npmjs.org/fastify/-/fastify-5.12.5.tgz",
      "integrity": "sha512-OB2k1dlxs5/NAABqeKV2FUHkSD2BbENsCak8yULVcymn3fHIPDVa9TI3SDnJSWYSllZmSYuZXy2gTnsT+Sut1A==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "@fastify/ajv-compiler": "^4.0.5",
        "@fastify/error": "^4.0.0",
        "@fastify/fast-json-stringify-compiler": "^5.0.0",
        "@fastify/proxy-addr": "^5.0.0",
        "abstract-logging": "^2.0.1",
        "avvio": "^9.0.0",
        "fast-json-stringify": "^7.0.0",
        "find-my-way": "^9.6.0",
        "light-my-request": "^6.0.0",
        "pino": "^9.14.0 || ^10.1.0",
        "process-warning": "^5.1.0",
        "rfdc": "^1.3.1",
        "secure-json-parse": "^4.0.0",
        "semver": "^7.6.0",
        "toad-cache": "^3.7.0"
      }
    },
    "node_modules/fastify-plugin": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/fastify-plugin/-/fastify-plugin-6.0.0.tgz",
      "integrity": "sha512-fZOty7z3O7vOliF6d8bHE3wiEh1KcNnKEQensSgTk9C1DvN6nRLS++XVd86v33Hw/8u9Un8A1zDrQ8ujcQDHEg==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT"
    },
    "node_modules/fastq": {
      "version": "1.20.3",
      "resolved": "https://registry.npmjs.org/fastq/-/fastq-1.20.3.tgz",
      "integrity": "sha512-XKv5nnLs6nLF71NgiKJLIZFLkPyIEuOselLG7ujZnGrRfQK8HpvY+WqKhAJUAdLomwVHErVS4LfxFlPq0/FTAw==",
      "license": "ISC",
      "dependencies": {
        "reusify": "^1.0.4"
      }
    },
    "node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/find-my-way": {
      "version": "9.9.0",
      "resolved": "https://registry.npmjs.org/find-my-way/-/find-my-way-9.9.0.tgz",
      "integrity": "sha512-sJsgZ1sQH2UDuowPuMKg8az7Qc8F0jnj+SKkFWU/+T0xcFlgV5skgXOGUqmQzOdmW6ALA7AhJINWx3qFBkbLHA==",
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.3",
        "fast-querystring": "^1.0.0",
        "safe-regex2": "^5.0.0"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/fs-constants": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/fs-constants/-/fs-constants-1.0.0.tgz",
      "integrity": "sha512-y6OAwoSIf7FyjMIv94u+b5rdheZEjzR63GTyZJm5qh4Bi+2YgwLCcI/fPFZkL5PSixOt6ZNKm+w+Hfp/Bciwow==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fs.realpath": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/fs.realpath/-/fs.realpath-1.0.0.tgz",
      "integrity": "sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/fstream": {
      "version": "1.0.12",
      "resolved": "https://registry.npmjs.org/fstream/-/fstream-1.0.12.tgz",
      "integrity": "sha512-WvJ193OHa0GHPEL+AycEJgxvBEwyfRkN1vhjca23OaPVMCaLCXTd5qAu82AjTcgP1UJmytkOKb63Ypde7raDIg==",
      "deprecated": "This package is no longer supported.",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "graceful-fs": "^4.1.2",
        "inherits": "~2.0.0",
        "mkdirp": ">=0.5 0",
        "rimraf": "2"
      },
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/glob": {
      "version": "7.2.3",
      "resolved": "https://registry.npmjs.org/glob/-/glob-7.2.3.tgz",
      "integrity": "sha512-nFR0zLpU2YCaRxwoCJvL6UvCH2JFyFVIvwTLsIf21AuHlMskA1hhTdk+LlYJtOlYt9v6dvszD2BGRqBL+iQK9Q==",
      "deprecated": "Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "fs.realpath": "^1.0.0",
        "inflight": "^1.0.4",
        "inherits": "2",
        "minimatch": "^3.1.1",
        "once": "^1.3.0",
        "path-is-absolute": "^1.0.0"
      },
      "engines": {
        "node": "*"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/ieee754": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/ieee754/-/ieee754-1.2.1.tgz",
      "integrity": "sha512-dcyqhDvX1C46lXZcVqCpK+FtMRQVdIMN6/Df5js2zouUsqG7I6sFxitIC+7KYK29KdXOLHdu9zL4sFnoVQnqaA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "BSD-3-Clause"
    },
    "node_modules/immediate": {
      "version": "3.0.6",
      "resolved": "https://registry.npmjs.org/immediate/-/immediate-3.0.6.tgz",
      "integrity": "sha512-XXOFtyqDjNDAQxVfYxuF7g9Il/IbWmmlQg2MYKOH8ExIT1qg6xc4zyS3HaEEATgs1btfzxq15ciUiY7gjSXRGQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/inflight": {
      "version": "1.0.6",
      "resolved": "https://registry.npmjs.org/inflight/-/inflight-1.0.6.tgz",
      "integrity": "sha512-k92I/b08q4wvFscXCLvqfsHCrjrF7yiXsQuIVvVE7N82W3+aqpzuUdBbfhWcy/FZR3/4IgflMgKLOsvPDrGCJA==",
      "deprecated": "This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "once": "^1.3.0",
        "wrappy": "1"
      }
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/ipaddr.js": {
      "version": "2.5.0",
      "resolved": "https://registry.npmjs.org/ipaddr.js/-/ipaddr.js-2.5.0.tgz",
      "integrity": "sha512-aq+t5NAc+cS6rZQQVWC2x98CPqGtKKTMDd4Gaodv0wShnItdKg/51djkGJ1hqH+Oy0ivDftCbSLCQob8zso01w==",
      "license": "MIT",
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/isarray": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/isarray/-/isarray-1.0.0.tgz",
      "integrity": "sha512-VLghIWNM6ELQzo7zwmcg0NmTVyWKYjvIeM83yjp0wRDTmUnrM678fQbcKBo6n2CJEF0szoG//ytg+TKla89ALQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/js-tokens": {
      "version": "9.0.1",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-9.0.1.tgz",
      "integrity": "sha512-mxa9E9ITFOt0ban3j6L5MpjwegGz6lBQmM1IJkWeBZGcMxto50+eWdjC/52xDbS2vy0k7vIMK0Fe2wfL9OQSpQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-schema-ref-resolver": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/json-schema-ref-resolver/-/json-schema-ref-resolver-3.0.0.tgz",
      "integrity": "sha512-hOrZIVL5jyYFjzk7+y7n5JDzGlU8rfWDuYyHwGa2WA8/pcmMHezp2xsVwxrebD/Q9t8Nc5DboieySDpCp4WG4A==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "dequal": "^2.0.3"
      }
    },
    "node_modules/json-schema-traverse": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-1.0.0.tgz",
      "integrity": "sha512-NM8/P9n3XjXhIZn1lLhkFaACTOURQXjWhV4BA/RnOv8xvgqtqpAX9IO4mRQxSx1Rlo4tqzeqb0sOlruaOy3dug==",
      "license": "MIT"
    },
    "node_modules/jszip": {
      "version": "3.10.2",
      "resolved": "https://registry.npmjs.org/jszip/-/jszip-3.10.2.tgz",
      "integrity": "sha512-3l+rb15IOWtUhU0H5MFqES/T6Kh7abYwjosBey/vD6hDt8zoEffkSC5Ws5SGtgVw3gBx2NEbhTeSW1+kWkpyTQ==",
      "dev": true,
      "license": "(MIT OR GPL-3.0-or-later)",
      "dependencies": {
        "lie": "~3.3.0",
        "pako": "~1.0.2",
        "readable-stream": "~2.3.6",
        "setimmediate": "^1.0.5"
      }
    },
    "node_modules/jszip/node_modules/readable-stream": {
      "version": "2.3.8",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-2.3.8.tgz",
      "integrity": "sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "core-util-is": "~1.0.0",
        "inherits": "~2.0.3",
        "isarray": "~1.0.0",
        "process-nextick-args": "~2.0.0",
        "safe-buffer": "~5.1.1",
        "string_decoder": "~1.1.1",
        "util-deprecate": "~1.0.1"
      }
    },
    "node_modules/jszip/node_modules/safe-buffer": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
      "integrity": "sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/jszip/node_modules/string_decoder": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.1.1.tgz",
      "integrity": "sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.1.0"
      }
    },
    "node_modules/lazystream": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/lazystream/-/lazystream-1.0.1.tgz",
      "integrity": "sha512-b94GiNHQNy6JNTrt5w6zNyffMrNkXZb3KTkCZJb2V1xaEGCk093vkZ2jk3tpaeP33/OiXC+WvK9AxUebnf5nbw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "readable-stream": "^2.0.5"
      },
      "engines": {
        "node": ">= 0.6.3"
      }
    },
    "node_modules/lazystream/node_modules/readable-stream": {
      "version": "2.3.8",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-2.3.8.tgz",
      "integrity": "sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "core-util-is": "~1.0.0",
        "inherits": "~2.0.3",
        "isarray": "~1.0.0",
        "process-nextick-args": "~2.0.0",
        "safe-buffer": "~5.1.1",
        "string_decoder": "~1.1.1",
        "util-deprecate": "~1.0.1"
      }
    },
    "node_modules/lazystream/node_modules/safe-buffer": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
      "integrity": "sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lazystream/node_modules/string_decoder": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.1.1.tgz",
      "integrity": "sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.1.0"
      }
    },
    "node_modules/lie": {
      "version": "3.3.0",
      "resolved": "https://registry.npmjs.org/lie/-/lie-3.3.0.tgz",
      "integrity": "sha512-UaiMJzeWRlEujzAuw5LokY1L5ecNQYZKfmyZ9L7wDHb/p5etKaxXhohBcrw0EYby+G/NA52vRSN4N39dxHAIwQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "immediate": "~3.0.5"
      }
    },
    "node_modules/light-my-request": {
      "version": "6.6.0",
      "resolved": "https://registry.npmjs.org/light-my-request/-/light-my-request-6.6.0.tgz",
      "integrity": "sha512-CHYbu8RtboSIoVsHZ6Ye4cj4Aw/yg2oAFimlF7mNvfDV192LR7nDiKtSIfCuLT7KokPSTn/9kfVLm5OGN0A28A==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "BSD-3-Clause",
      "dependencies": {
        "cookie": "^1.0.1",
        "process-warning": "^4.0.0",
        "set-cookie-parser": "^2.6.0"
      }
    },
    "node_modules/light-my-request/node_modules/cookie": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-1.1.1.tgz",
      "integrity": "sha512-ei8Aos7ja0weRpFzJnEA9UHJ/7XQmqglbRwnf2ATjcB9Wq874VKH9kfjjirM6UhU2/E5fFYadylyhFldcqSidQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/light-my-request/node_modules/process-warning": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/process-warning/-/process-warning-4.0.1.tgz",
      "integrity": "sha512-3c2LzQ3rY9d0hc1emcsHhfT9Jwz0cChib/QN89oME2R451w5fy3f0afAhERFZAwrbDU43wk12d0ORBpDVME50Q==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT"
    },
    "node_modules/listenercount": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/listenercount/-/listenercount-1.0.1.tgz",
      "integrity": "sha512-3mk/Zag0+IJxeDrxSgaDPy4zZ3w05PRZeJNnlWhzFz5OkX49J4krc+A8X2d2M69vGMBEX0uyl8M+W+8gH+kBqQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/lodash.defaults": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/lodash.defaults/-/lodash.defaults-4.2.0.tgz",
      "integrity": "sha512-qjxPLHd3r5DnsdGacqOMU6pb/avJzdh9tFX2ymgoZE27BmjXrNy/y4LoaiTeAb+O3gL8AfpJGtqfX/ae2leYYQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.difference": {
      "version": "4.5.0",
      "resolved": "https://registry.npmjs.org/lodash.difference/-/lodash.difference-4.5.0.tgz",
      "integrity": "sha512-dS2j+W26TQ7taQBGN8Lbbq04ssV3emRw4NY58WErlTO29pIqS0HmoT5aJ9+TUQ1N3G+JOZSji4eugsWwGp9yPA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.escaperegexp": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/lodash.escaperegexp/-/lodash.escaperegexp-4.1.2.tgz",
      "integrity": "sha512-TM9YBvyC84ZxE3rgfefxUWiQKLilstD6k7PTGt6wfbtXF8ixIJLOL3VYyV/z+ZiPLsVxAsKAFVwWlWeb2Y8Yyw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.flatten": {
      "version": "4.4.0",
      "resolved": "https://registry.npmjs.org/lodash.flatten/-/lodash.flatten-4.4.0.tgz",
      "integrity": "sha512-C5N2Z3DgnnKr0LOpv/hKCgKdb7ZZwafIrsesve6lmzvZIRZRGaZ/l6Q8+2W7NaT+ZwO3fFlSCzCzrDCFdJfZ4g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.groupby": {
      "version": "4.6.0",
      "resolved": "https://registry.npmjs.org/lodash.groupby/-/lodash.groupby-4.6.0.tgz",
      "integrity": "sha512-5dcWxm23+VAoz+awKmBaiBvzox8+RqMgFhi7UvX9DHZr2HdxHXM/Wrf8cfKpsW37RNrvtPn6hSwNqurSILbmJw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.isboolean": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/lodash.isboolean/-/lodash.isboolean-3.0.3.tgz",
      "integrity": "sha512-Bz5mupy2SVbPHURB98VAcw+aHh4vRV5IPNhILUCsOzRmsTmSQ17jIuqopAentWoehktxGd9e/hbIXq980/1QJg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.isequal": {
      "version": "4.5.0",
      "resolved": "https://registry.npmjs.org/lodash.isequal/-/lodash.isequal-4.5.0.tgz",
      "integrity": "sha512-pDo3lu8Jhfjqls6GkMgpahsF9kCyayhgykjyLMNFTKWrpVdAQtYyB4muAMWozBB4ig/dtWAmsMxLEI8wuz+DYQ==",
      "deprecated": "This package is deprecated. Use require('node:util').isDeepStrictEqual instead.",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.isfunction": {
      "version": "3.0.9",
      "resolved": "https://registry.npmjs.org/lodash.isfunction/-/lodash.isfunction-3.0.9.tgz",
      "integrity": "sha512-AirXNj15uRIMMPihnkInB4i3NHeb4iBtNg9WRWuK2o31S+ePwwNmDPaTL3o7dTJ+VXNZim7rFs4rxN4YU1oUJw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.isnil": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/lodash.isnil/-/lodash.isnil-4.0.0.tgz",
      "integrity": "sha512-up2Mzq3545mwVnMhTDMdfoG1OurpA/s5t88JmQX809eH3C8491iu2sfKhTfhQtKY78oPNhiaHJUpT/dUDAAtng==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.isplainobject": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/lodash.isplainobject/-/lodash.isplainobject-4.0.6.tgz",
      "integrity": "sha512-oSXzaWypCMHkPC3NvBEaPHf0KsA5mvPrOPgQWDsbg8n7orZ290M0BmC/jgRZ4vcJ6DTAhjrsSYgdsW/F+MFOBA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.isundefined": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/lodash.isundefined/-/lodash.isundefined-3.0.1.tgz",
      "integrity": "sha512-MXB1is3s899/cD8jheYYE2V9qTHwKvt+npCwpD+1Sxm3Q3cECXCiYHjeHWXNwr6Q0SOBPrYUDxendrO6goVTEA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.union": {
      "version": "4.6.0",
      "resolved": "https://registry.npmjs.org/lodash.union/-/lodash.union-4.6.0.tgz",
      "integrity": "sha512-c4pB2CdGrGdjMKYLA+XiRDO7Y0PRQbm/Gzg8qMj+QH+pFVAoTp5sBpO0odL3FjoPCGjK96p6qsP+yQoiLoOBcw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.uniq": {
      "version": "4.5.0",
      "resolved": "https://registry.npmjs.org/lodash.uniq/-/lodash.uniq-4.5.0.tgz",
      "integrity": "sha512-xfBaXQd9ryd9dlSDvnvI0lvxfLJlYAZzXomUYzLKtUeOQvOP5piqAWuGtrhWeqaXK9hhoM/iyJc5AV+XfsX3HQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/loupe": {
      "version": "3.2.1",
      "resolved": "https://registry.npmjs.org/loupe/-/loupe-3.2.1.tgz",
      "integrity": "sha512-CdzqowRJCeLU72bHvWqwRBBlLcMEtIvGrlvef74kMnV2AolS9Y8xUv1I0U/MNAWMhBlKIoyuEgoJ0t/bbwHbLQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/magic-string": {
      "version": "0.30.21",
      "resolved": "https://registry.npmjs.org/magic-string/-/magic-string-0.30.21.tgz",
      "integrity": "sha512-vd2F4YUyEXKGcLHoq+TEyCjxueSeHnFxyyjNp80yg0XV4vUhnDer/lvvlqM/arB5bXQN5K2/3oinyCRyx8T2CQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.5"
      }
    },
    "node_modules/minimatch": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.5.tgz",
      "integrity": "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/minimist": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/minimist/-/minimist-1.2.8.tgz",
      "integrity": "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/mkdirp": {
      "version": "0.5.6",
      "resolved": "https://registry.npmjs.org/mkdirp/-/mkdirp-0.5.6.tgz",
      "integrity": "sha512-FP+p8RB8OWpF3YZBCrP5gtADmtXApB5AMLn+vdyA+PyxCjrCs00mjyUozssO33cwDeT3wNGdLxJ5M//YqtHAJw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "minimist": "^1.2.6"
      },
      "bin": {
        "mkdirp": "bin/cmd.js"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/nanoid": {
      "version": "3.3.19",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.19.tgz",
      "integrity": "sha512-Y2tUNy4ouw6tq5oDSKeQYGOyhkUBhNOcGV/02KC+6kd9eDGqdZd++mjMiIDilrBYvjEnCYvVtsuHCuP+okSfug==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/node-addon-api": {
      "version": "8.9.2",
      "resolved": "https://registry.npmjs.org/node-addon-api/-/node-addon-api-8.9.2.tgz",
      "integrity": "sha512-VijLXbi3UACN69I0JVXJsX4tjACjNoQDgv2gTF6sx2wWEi8tkSg2eX8p5gSIFi8z2+DL3oHmY6OyKce38SDolg==",
      "license": "MIT",
      "engines": {
        "node": "^18 || ^20 || >= 21"
      }
    },
    "node_modules/normalize-path": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/normalize-path/-/normalize-path-3.0.0.tgz",
      "integrity": "sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/on-exit-leak-free": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/on-exit-leak-free/-/on-exit-leak-free-2.1.2.tgz",
      "integrity": "sha512-0eJJY6hXLGf1udHwfNftBqH+g73EU4B504nZeKpz1sYRKafAghwxEJunB2O7rDZkL4PGfsMVnTXZ2EjibbqcsA==",
      "license": "MIT",
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/once": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/once/-/once-1.4.0.tgz",
      "integrity": "sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "wrappy": "1"
      }
    },
    "node_modules/pako": {
      "version": "1.0.11",
      "resolved": "https://registry.npmjs.org/pako/-/pako-1.0.11.tgz",
      "integrity": "sha512-4hLB8Py4zZce5s4yd9XzopqwVv/yGNhV1Bl8NTmCq1763HeK2+EwVTv+leGeL13Dnh2wfbqowVPXCIO0z4taYw==",
      "dev": true,
      "license": "(MIT AND Zlib)"
    },
    "node_modules/path-is-absolute": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/path-is-absolute/-/path-is-absolute-1.0.1.tgz",
      "integrity": "sha512-AVbw3UJ2e9bq64vSaS9Am0fje1Pa8pbGqTTsmXfaIiMpnr5DlDhfJOuLj9Sf95ZPVDAUerDfEk88MPmPe7UCQg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/pathe": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/pathe/-/pathe-2.0.3.tgz",
      "integrity": "sha512-WUjGcAqP1gQacoQe+OBJsFA7Ld4DyXuUIjZ5cc75cLHvJ7dtNsTugphxIADwspS+AraAUePCKrSVtPLFj/F88w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/pathval": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/pathval/-/pathval-2.0.1.tgz",
      "integrity": "sha512-//nshmD55c46FuFw26xV/xFAaB5HF9Xdap7HJBBnrKdAd6/GxDBaNA1870O79+9ueg61cZLSVc+OaFlfmObYVQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 14.16"
      }
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz",
      "integrity": "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/pino": {
      "version": "10.4.0",
      "resolved": "https://registry.npmjs.org/pino/-/pino-10.4.0.tgz",
      "integrity": "sha512-bk1ZMTwG/Vymx+zPoa28MhNzucFvXJWp3csrSuxuHPSMeUettaCoQ5Jvg07mtC4JGNpcfTwz41oVCnNgBK9+vA==",
      "license": "MIT",
      "dependencies": {
        "@pinojs/redact": "^0.4.0",
        "atomic-sleep": "^1.0.0",
        "on-exit-leak-free": "^2.1.0",
        "pino-abstract-transport": "^3.0.0",
        "pino-std-serializers": "^7.0.0",
        "process-warning": "^5.0.0",
        "quick-format-unescaped": "^4.0.3",
        "real-require": "^1.0.0",
        "safe-stable-stringify": "^2.3.1",
        "sonic-boom": "^4.0.1",
        "thread-stream": "^4.0.0"
      },
      "bin": {
        "pino": "bin.js"
      }
    },
    "node_modules/pino-abstract-transport": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/pino-abstract-transport/-/pino-abstract-transport-3.0.0.tgz",
      "integrity": "sha512-wlfUczU+n7Hy/Ha5j9a/gZNy7We5+cXp8YL+X+PG8S0KXxw7n/JXA3c46Y0zQznIJ83URJiwy7Lh56WLokNuxg==",
      "license": "MIT",
      "dependencies": {
        "split2": "^4.0.0"
      }
    },
    "node_modules/pino-std-serializers": {
      "version": "7.1.0",
      "resolved": "https://registry.npmjs.org/pino-std-serializers/-/pino-std-serializers-7.1.0.tgz",
      "integrity": "sha512-BndPH67/JxGExRgiX1dX0w1FvZck5Wa4aal9198SrRhZjH3GxKQUKIBnYJTdj2HDN3UQAS06HlfcSbQj2OHmaw==",
      "license": "MIT"
    },
    "node_modules/postcss": {
      "version": "8.5.28",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.28.tgz",
      "integrity": "sha512-RRuzqDtt5Y9h3quz5hWhK+TPnsmVs6WwSU6LkJMeY4HstUEDuYTG8UJSdawMRzmzAtV+KEoG8N3Qg2qLy5vM/A==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.18",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/process-nextick-args": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/process-nextick-args/-/process-nextick-args-2.0.1.tgz",
      "integrity": "sha512-3ouUOpQhtgrbOa17J7+uxOTpITYWaGP7/AhoR3+A+/1e9skrzelGi/dXzEYyvbxubEF6Wn2ypscTKiKJFFn1ag==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/process-warning": {
      "version": "5.1.0",
      "resolved": "https://registry.npmjs.org/process-warning/-/process-warning-5.1.0.tgz",
      "integrity": "sha512-jQSaVHsPgtyw60e1rQ/A+/ArPEj/S8pS/vFnyGa/gYFXrKk/6RuDkoqVDQ5NI5MmS01698ltlAk0NoDBNLujRw==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT"
    },
    "node_modules/quick-format-unescaped": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/quick-format-unescaped/-/quick-format-unescaped-4.0.4.tgz",
      "integrity": "sha512-tYC1Q1hgyRuHgloV/YXs2w15unPVh8qfu/qCTfhTYamaw7fyhumKa2yGpdSo87vY32rIclj+4fWYQXUMs9EHvg==",
      "license": "MIT"
    },
    "node_modules/readable-stream": {
      "version": "3.6.2",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-3.6.2.tgz",
      "integrity": "sha512-9u/sniCrY3D5WdsERHzHE4G2YCXqoG5FTHUiCC4SIbr6XcLZBY05ya9EKjYek9O5xOAwjGq+1JdGBAS7Q9ScoA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "inherits": "^2.0.3",
        "string_decoder": "^1.1.1",
        "util-deprecate": "^1.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/readdir-glob": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/readdir-glob/-/readdir-glob-1.1.3.tgz",
      "integrity": "sha512-v05I2k7xN8zXvPD9N+z/uhXPaj0sUFCe2rcWZIpBsqxfP7xXFQ0tipAd/wjj1YxWyWtUS5IDJpOG82JKt2EAVA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "minimatch": "^5.1.0"
      }
    },
    "node_modules/readdir-glob/node_modules/brace-expansion": {
      "version": "2.1.7",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-2.1.7.tgz",
      "integrity": "sha512-uZbew1NqdmPDTMJ8ah1y+b+9QEJrfkXFk3RcTQw3X0jW/xRUvFKsg1CfQdSYGdTbXZWExtU3J3ccxtnfw1Fi0g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0"
      }
    },
    "node_modules/readdir-glob/node_modules/minimatch": {
      "version": "5.1.9",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-5.1.9.tgz",
      "integrity": "sha512-7o1wEA2RyMP7Iu7GNba9vc0RWWGACJOCZBJX2GJWip0ikV+wcOsgVuY9uE8CPiyQhkGFSlhuSkZPavN7u1c2Fw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^2.0.1"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/real-require": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/real-require/-/real-require-1.0.0.tgz",
      "integrity": "sha512-P4nbQYQfePJxRSmY+v/KINxVucm4NF3p3s7pJveMTtom52FR4YGltUQLB8idDXwDDWW+eYrWDFbuzUnjoWHF7g==",
      "license": "MIT"
    },
    "node_modules/require-from-string": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/require-from-string/-/require-from-string-2.0.2.tgz",
      "integrity": "sha512-Xf0nWe6RseziFMu+Ap9biiUbmplq6S9/p+7w7YXP/JBHhrUDDUhwa+vANyubuqfZWTveU//DYVGsDG7RKL/vEw==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/ret": {
      "version": "0.5.0",
      "resolved": "https://registry.npmjs.org/ret/-/ret-0.5.0.tgz",
      "integrity": "sha512-I1XxrZSQ+oErkRR4jYbAyEEu2I0avBvvMM5JN+6EBprOGRCs63ENqZ3vjavq8fBw2+62G5LF5XelKwuJpcvcxw==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/reusify": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/reusify/-/reusify-1.1.0.tgz",
      "integrity": "sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw==",
      "license": "MIT",
      "engines": {
        "iojs": ">=1.0.0",
        "node": ">=0.10.0"
      }
    },
    "node_modules/rfdc": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/rfdc/-/rfdc-1.4.1.tgz",
      "integrity": "sha512-q1b3N5QkRUWUl7iyylaaj3kOpIT0N2i9MqIEQXP73GVsN9cw3fdx8X63cEmWhJGi2PPCF23Ijp7ktmd39rawIA==",
      "license": "MIT"
    },
    "node_modules/rimraf": {
      "version": "2.7.1",
      "resolved": "https://registry.npmjs.org/rimraf/-/rimraf-2.7.1.tgz",
      "integrity": "sha512-uWjbaKIK3T1OSVptzX7Nl6PvQ3qAGtKEtVRjRuazjfL3Bx5eI409VZSqgND+4UNnmzLVdPj9FqFJNPqBZFve4w==",
      "deprecated": "Rimraf versions prior to v4 are no longer supported",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "glob": "^7.1.3"
      },
      "bin": {
        "rimraf": "bin.js"
      }
    },
    "node_modules/rollup": {
      "version": "4.63.6",
      "resolved": "https://registry.npmjs.org/rollup/-/rollup-4.63.6.tgz",
      "integrity": "sha512-w4+GKyTBqshj84F1GF3s2zxAPFZPEmNkCbQtqilsYS7GsksmX6VoV7UggfZg8sUHCCOkBe7UtQp6fZwbH311FQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/estree": "1.0.9"
      },
      "bin": {
        "rollup": "dist/bin/rollup"
      },
      "engines": {
        "node": ">=18.0.0",
        "npm": ">=8.0.0"
      },
      "optionalDependencies": {
        "@napi-rs/lzma-linux-x64-gnu": "1.5.1",
        "@rollup/rollup-android-arm-eabi": "4.63.6",
        "@rollup/rollup-android-arm64": "4.63.6",
        "@rollup/rollup-darwin-arm64": "4.63.6",
        "@rollup/rollup-darwin-x64": "4.63.6",
        "@rollup/rollup-freebsd-arm64": "4.63.6",
        "@rollup/rollup-freebsd-x64": "4.63.6",
        "@rollup/rollup-linux-arm-gnueabihf": "4.63.6",
        "@rollup/rollup-linux-arm-musleabihf": "4.63.6",
        "@rollup/rollup-linux-arm64-gnu": "4.63.6",
        "@rollup/rollup-linux-arm64-musl": "4.63.6",
        "@rollup/rollup-linux-loong64-gnu": "4.63.6",
        "@rollup/rollup-linux-loong64-musl": "4.63.6",
        "@rollup/rollup-linux-ppc64-gnu": "4.63.6",
        "@rollup/rollup-linux-ppc64-musl": "4.63.6",
        "@rollup/rollup-linux-riscv64-gnu": "4.63.6",
        "@rollup/rollup-linux-riscv64-musl": "4.63.6",
        "@rollup/rollup-linux-s390x-gnu": "4.63.6",
        "@rollup/rollup-linux-x64-gnu": "4.63.6",
        "@rollup/rollup-linux-x64-musl": "4.63.6",
        "@rollup/rollup-openbsd-x64": "4.63.6",
        "@rollup/rollup-openharmony-arm64": "4.63.6",
        "@rollup/rollup-win32-arm64-msvc": "4.63.6",
        "@rollup/rollup-win32-ia32-msvc": "4.63.6",
        "@rollup/rollup-win32-x64-gnu": "4.63.6",
        "@rollup/rollup-win32-x64-msvc": "4.63.6",
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/safe-regex2": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/safe-regex2/-/safe-regex2-5.1.1.tgz",
      "integrity": "sha512-mOSBvHGDZMuIEZMdOz/aCEYDCv0E7nfcNsIhUF+/P+xC7Hyf3FkvymqgPbg9D1EdSGu+uKbJgy09K/RKKc7kJA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "ret": "~0.5.0"
      },
      "bin": {
        "safe-regex2": "bin/safe-regex2.js"
      }
    },
    "node_modules/safe-stable-stringify": {
      "version": "2.5.0",
      "resolved": "https://registry.npmjs.org/safe-stable-stringify/-/safe-stable-stringify-2.5.0.tgz",
      "integrity": "sha512-b3rppTKm9T+PsVCBEOUR46GWI7fdOs00VKZ1+9c1EWDaDMvjQc6tUwuFyIprgGgTcWoVHSKrU8H31ZHA2e0RHA==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/saxes": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/saxes/-/saxes-5.0.1.tgz",
      "integrity": "sha512-5LBh1Tls8c9xgGjw3QrMwETmTMVk0oFgvrFSvWx62llR2hcEInrKNZ2GZCCuuy2lvWrdl5jhbpeqc5hRYKFOcw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "xmlchars": "^2.2.0"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/secure-json-parse": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/secure-json-parse/-/secure-json-parse-4.1.0.tgz",
      "integrity": "sha512-l4KnYfEyqYJxDwlNVyRfO2E4NTHfMKAWdUuA8J0yve2Dz/E/PdBepY03RvyJpssIpRFwJoCD55wA+mEDs6ByWA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "BSD-3-Clause"
    },
    "node_modules/semver": {
      "version": "7.8.5",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz",
      "integrity": "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/set-cookie-parser": {
      "version": "2.7.2",
      "resolved": "https://registry.npmjs.org/set-cookie-parser/-/set-cookie-parser-2.7.2.tgz",
      "integrity": "sha512-oeM1lpU/UvhTxw+g3cIfxXHyJRc/uidd3yK1P242gzHds0udQBYzs3y8j4gCCW+ZJ7ad0yctld8RYO+bdurlvw==",
      "license": "MIT"
    },
    "node_modules/setimmediate": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/setimmediate/-/setimmediate-1.0.5.tgz",
      "integrity": "sha512-MATJdZp8sLqDl/68LfQmbP8zKPLQNV6BIZoIgrscFDQ+RsvK/BxeDQOgyxKKoh0y/8h3BqVFnCqQ/gd+reiIXA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/siginfo": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/siginfo/-/siginfo-2.0.0.tgz",
      "integrity": "sha512-ybx0WO1/8bSBLEWXZvEd7gMW3Sn3JFlW3TvX1nREbDLRNQNaeNN8WK0meBwPdAaOI7TtRRRJn/Es1zhrrCHu7g==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/sonic-boom": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/sonic-boom/-/sonic-boom-4.2.1.tgz",
      "integrity": "sha512-w6AxtubXa2wTXAUsZMMWERrsIRAdrK0Sc+FUytWvYAhBJLyuI4llrMIC1DtlNSdI99EI86KZum2MMq3EAZlF9Q==",
      "license": "MIT",
      "dependencies": {
        "atomic-sleep": "^1.0.0"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.2.tgz",
      "integrity": "sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/split2": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/split2/-/split2-4.2.0.tgz",
      "integrity": "sha512-UcjcJOWknrNkF6PLX83qcHM6KHgVKNkV62Y8a5uYDVv9ydGQVwAHMKqHdJje1VTWpljG0WYpCDhrCdAOYH4TWg==",
      "license": "ISC",
      "engines": {
        "node": ">= 10.x"
      }
    },
    "node_modules/stackback": {
      "version": "0.0.2",
      "resolved": "https://registry.npmjs.org/stackback/-/stackback-0.0.2.tgz",
      "integrity": "sha512-1XMJE5fQo1jGH6Y/7ebnwPOBEkIEnT4QF32d5R1+VXdXveM0IBMJt8zfaxX1P3QhVwrYe+576+jkANtSS2mBbw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/std-env": {
      "version": "3.10.0",
      "resolved": "https://registry.npmjs.org/std-env/-/std-env-3.10.0.tgz",
      "integrity": "sha512-5GS12FdOZNliM5mAOxFRg7Ir0pWz8MdpYm6AY6VPkGpbA7ZzmbzNcBJQ0GPvvyWgcY7QAhCgf9Uy89I03faLkg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/string_decoder": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.3.0.tgz",
      "integrity": "sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.2.0"
      }
    },
    "node_modules/strip-literal": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/strip-literal/-/strip-literal-3.1.0.tgz",
      "integrity": "sha512-8r3mkIM/2+PpjHoOtiAW8Rg3jJLHaV7xPwG+YRGrv6FP0wwk/toTpATxWYOW0BKdWwl82VT2tFYi5DlROa0Mxg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "js-tokens": "^9.0.1"
      },
      "funding": {
        "url": "https://github.com/sponsors/antfu"
      }
    },
    "node_modules/tar-stream": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/tar-stream/-/tar-stream-2.2.0.tgz",
      "integrity": "sha512-ujeqbceABgwMZxEJnk2HDY2DlnUZ+9oEcb1KzTVfYHio0UE6dG71n60d8D2I4qNvleWrrXpmjpt7vZeF1LnMZQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "bl": "^4.0.3",
        "end-of-stream": "^1.4.1",
        "fs-constants": "^1.0.0",
        "inherits": "^2.0.3",
        "readable-stream": "^3.1.1"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/thread-stream": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/thread-stream/-/thread-stream-4.2.0.tgz",
      "integrity": "sha512-e2zZ96wSChazBsbENf/Pcm/4swHt2cEKQ92rhUjkL9GCKiTDJIaTBenjE/m9DXi0QBmTMDkFDdOomUy20A1tDQ==",
      "license": "MIT",
      "dependencies": {
        "real-require": "^1.0.0"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/tinybench": {
      "version": "2.9.0",
      "resolved": "https://registry.npmjs.org/tinybench/-/tinybench-2.9.0.tgz",
      "integrity": "sha512-0+DUvqWMValLmha6lr4kD8iAMK1HzV0/aKnCtWb9v9641TnP/MFb7Pc2bxoxQjTXAErryXVgUOfv2YqNllqGeg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tinyexec": {
      "version": "0.3.2",
      "resolved": "https://registry.npmjs.org/tinyexec/-/tinyexec-0.3.2.tgz",
      "integrity": "sha512-KQQR9yN7R5+OSwaK0XQoj22pwHoTlgYqmUscPYoknOoWCWfj/5/ABTMRi69FrKU5ffPVh5QcFikpWJI/P1ocHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/tinypool": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/tinypool/-/tinypool-1.1.1.tgz",
      "integrity": "sha512-Zba82s87IFq9A9XmjiX5uZA/ARWDrB03OHlq+Vw1fSdt0I+4/Kutwy8BP4Y/y/aORMo61FQ0vIb5j44vSo5Pkg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.0.0 || >=20.0.0"
      }
    },
    "node_modules/tinyrainbow": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/tinyrainbow/-/tinyrainbow-2.0.0.tgz",
      "integrity": "sha512-op4nsTR47R6p0vMUUoYl/a+ljLFVtlfaXkLQmqfLR1qHma1h/ysYk4hEXZ880bf2CYgTskvTa/e196Vd5dDQXw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/tinyspy": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/tinyspy/-/tinyspy-4.0.6.tgz",
      "integrity": "sha512-u8KszXvGfU68hVcZpRHKG28T0krMuv2G5nDhiHaMLen/gIuFEgIJhaJuO69qjnXg5paSrbPMFfx3brNuN8eVSg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/tmp": {
      "version": "0.2.7",
      "resolved": "https://registry.npmjs.org/tmp/-/tmp-0.2.7.tgz",
      "integrity": "sha512-e0votIpp4Uo2AJYSzVHV6xCcawuiez3DzqDAbrTc3YxBkplN6e+dM13ZeIcZnDg/QpSuU2zfZ3rzwY8ukEnaXw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=14.14"
      }
    },
    "node_modules/toad-cache": {
      "version": "3.7.4",
      "resolved": "https://registry.npmjs.org/toad-cache/-/toad-cache-3.7.4.tgz",
      "integrity": "sha512-m1TdR/rvT7kgGJZhspNtXdsdYk0fddFpJJFlG5s+UkPFo6lkLoZ3YLOaovPYjq1R75NP5JfeTlSHaOsE09peCg==",
      "license": "MIT",
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/traverse": {
      "version": "0.3.9",
      "resolved": "https://registry.npmjs.org/traverse/-/traverse-0.3.9.tgz",
      "integrity": "sha512-iawgk0hLP3SxGKDfnDJf8wTz4p2qImnyihM5Hh/sGvQ3K37dPi/w8sRhdNIxYA1TwFwc5mDhIJq+O0RsvXBKdQ==",
      "dev": true,
      "license": "MIT/X11",
      "engines": {
        "node": "*"
      }
    },
    "node_modules/tsx": {
      "version": "4.23.15",
      "resolved": "https://registry.npmjs.org/tsx/-/tsx-4.23.15.tgz",
      "integrity": "sha512-Yiex1Ovn8z2xPpOWckIiysV1SSyRMY9BkLF++q0yKiDxCqRhosKfMg3janKkiLBwZ5c/YryloKwGZcrEmtwxKw==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "esbuild": "~0.28.0"
      },
      "bin": {
        "tsx": "dist/cli.mjs"
      },
      "engines": {
        "node": ">=18.0.0"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      }
    },
    "node_modules/typescript": {
      "version": "5.9.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz",
      "integrity": "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/undici-types": {
      "version": "6.21.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-6.21.0.tgz",
      "integrity": "sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/unzipper": {
      "version": "0.10.14",
      "resolved": "https://registry.npmjs.org/unzipper/-/unzipper-0.10.14.tgz",
      "integrity": "sha512-ti4wZj+0bQTiX2KmKWuwj7lhV+2n//uXEotUmGuQqrbVZSEGFMbI68+c6JCQ8aAmUWYvtHEz2A8K6wXvueR/6g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "big-integer": "^1.6.17",
        "binary": "~0.3.0",
        "bluebird": "~3.4.1",
        "buffer-indexof-polyfill": "~1.0.0",
        "duplexer2": "~0.1.4",
        "fstream": "^1.0.12",
        "graceful-fs": "^4.2.2",
        "listenercount": "~1.0.1",
        "readable-stream": "~2.3.6",
        "setimmediate": "~1.0.4"
      }
    },
    "node_modules/unzipper/node_modules/readable-stream": {
      "version": "2.3.8",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-2.3.8.tgz",
      "integrity": "sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "core-util-is": "~1.0.0",
        "inherits": "~2.0.3",
        "isarray": "~1.0.0",
        "process-nextick-args": "~2.0.0",
        "safe-buffer": "~5.1.1",
        "string_decoder": "~1.1.1",
        "util-deprecate": "~1.0.1"
      }
    },
    "node_modules/unzipper/node_modules/safe-buffer": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
      "integrity": "sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/unzipper/node_modules/string_decoder": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.1.1.tgz",
      "integrity": "sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.1.0"
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/uuid": {
      "version": "8.3.2",
      "resolved": "https://registry.npmjs.org/uuid/-/uuid-8.3.2.tgz",
      "integrity": "sha512-+NYs2QeMWy+GWFOEm9xnn6HCDp0l7QBD7ml8zLUmJ+93Q5NF0NocErnwkTkXVFNiX3/fpC6afS8Dhb/gz7R7eg==",
      "deprecated": "uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).",
      "dev": true,
      "license": "MIT",
      "bin": {
        "uuid": "dist/bin/uuid"
      }
    },
    "node_modules/vite": {
      "version": "7.3.6",
      "resolved": "https://registry.npmjs.org/vite/-/vite-7.3.6.tgz",
      "integrity": "sha512-4XP60spRGjSZFf1qYH+dJIkK2znL3zQfl9KkOV9MkkRR/3Dls0dxaBsQPTloEc5BLXWPL9vsOxopxyKoMmDueg==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "esbuild": "^0.27.0 || ^0.28.0",
        "fdir": "^6.5.0",
        "picomatch": "^4.0.3",
        "postcss": "^8.5.6",
        "rollup": "^4.43.0",
        "tinyglobby": "^0.2.15"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^20.19.0 || >=22.12.0",
        "jiti": ">=1.21.0",
        "less": "^4.0.0",
        "lightningcss": "^1.21.0",
        "sass": "^1.70.0",
        "sass-embedded": "^1.70.0",
        "stylus": ">=0.54.8",
        "sugarss": "^5.0.0",
        "terser": "^5.16.0",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "jiti": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "lightningcss": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    },
    "node_modules/vite-node": {
      "version": "3.2.4",
      "resolved": "https://registry.npmjs.org/vite-node/-/vite-node-3.2.4.tgz",
      "integrity": "sha512-EbKSKh+bh1E1IFxeO0pg1n4dvoOTt0UDiXMd/qn++r98+jPO1xtJilvXldeuQ8giIB5IkpjCgMleHMNEsGH6pg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "cac": "^6.7.14",
        "debug": "^4.4.1",
        "es-module-lexer": "^1.7.0",
        "pathe": "^2.0.3",
        "vite": "^5.0.0 || ^6.0.0 || ^7.0.0-0"
      },
      "bin": {
        "vite-node": "vite-node.mjs"
      },
      "engines": {
        "node": "^18.0.0 || ^20.0.0 || >=22.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      }
    },
    "node_modules/vitest": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/vitest/-/vitest-3.2.7.tgz",
      "integrity": "sha512-KrxIJ62Fd89gfysR4WotlgZABiz2dqFPgqGzX7s+CwsqLFomRH7777ZcrOD6+WVAh7khPQP41A+BKbpcJFrdEg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/chai": "^5.2.2",
        "@vitest/expect": "3.2.7",
        "@vitest/mocker": "3.2.7",
        "@vitest/pretty-format": "^3.2.7",
        "@vitest/runner": "3.2.7",
        "@vitest/snapshot": "3.2.7",
        "@vitest/spy": "3.2.7",
        "@vitest/utils": "3.2.7",
        "chai": "^5.2.0",
        "debug": "^4.4.1",
        "expect-type": "^1.2.1",
        "magic-string": "^0.30.17",
        "pathe": "^2.0.3",
        "picomatch": "^4.0.2",
        "std-env": "^3.9.0",
        "tinybench": "^2.9.0",
        "tinyexec": "^0.3.2",
        "tinyglobby": "^0.2.14",
        "tinypool": "^1.1.1",
        "tinyrainbow": "^2.0.0",
        "vite": "^5.0.0 || ^6.0.0 || ^7.0.0-0",
        "vite-node": "3.2.4",
        "why-is-node-running": "^2.3.0"
      },
      "bin": {
        "vitest": "vitest.mjs"
      },
      "engines": {
        "node": "^18.0.0 || ^20.0.0 || >=22.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/vitest"
      },
      "peerDependencies": {
        "@edge-runtime/vm": "*",
        "@types/debug": "^4.1.12",
        "@types/node": "^18.0.0 || ^20.0.0 || >=22.0.0",
        "@vitest/browser": "3.2.7",
        "@vitest/ui": "3.2.7",
        "happy-dom": "*",
        "jsdom": "*"
      },
      "peerDependenciesMeta": {
        "@edge-runtime/vm": {
          "optional": true
        },
        "@types/debug": {
          "optional": true
        },
        "@types/node": {
          "optional": true
        },
        "@vitest/browser": {
          "optional": true
        },
        "@vitest/ui": {
          "optional": true
        },
        "happy-dom": {
          "optional": true
        },
        "jsdom": {
          "optional": true
        }
      }
    },
    "node_modules/why-is-node-running": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/why-is-node-running/-/why-is-node-running-2.3.0.tgz",
      "integrity": "sha512-hUrmaWBdVDcxvYqnyh09zunKzROWjbZTiNy8dBEjkS7ehEDQibXJ7XvlmtbwuTclUiIyN+CyXQD4Vmko8fNm8w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "siginfo": "^2.0.0",
        "stackback": "0.0.2"
      },
      "bin": {
        "why-is-node-running": "cli.js"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/wrappy": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/wrappy/-/wrappy-1.0.2.tgz",
      "integrity": "sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/xmlchars": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/xmlchars/-/xmlchars-2.2.0.tgz",
      "integrity": "sha512-JZnDKK8B0RCDw84FNdDAIpZK+JuJw+s7Lz8nksI7SIuU3UXJJslUthsi+uWBUYOwPFwW7W7PRLRfUKpxjtjFCw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/zip-stream": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/zip-stream/-/zip-stream-4.1.1.tgz",
      "integrity": "sha512-9qv4rlDiopXg4E69k+vMHjNN63YFMe9sZMrdlvKnCjlCRWeCBswPPMPUfx+ipsAWq1LXHe70RcbaHdJJpS6hyQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "archiver-utils": "^3.0.4",
        "compress-commons": "^4.1.2",
        "readable-stream": "^3.6.0"
      },
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/zip-stream/node_modules/archiver-utils": {
      "version": "3.0.4",
      "resolved": "https://registry.npmjs.org/archiver-utils/-/archiver-utils-3.0.4.tgz",
      "integrity": "sha512-KVgf4XQVrTjhyWmx6cte4RxonPLR9onExufI1jhvw/MQ4BB6IsZD5gT8Lq+u/+pRkWna/6JoHpiQioaqFP5Rzw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "glob": "^7.2.3",
        "graceful-fs": "^4.2.0",
        "lazystream": "^1.0.0",
        "lodash.defaults": "^4.2.0",
        "lodash.difference": "^4.5.0",
        "lodash.flatten": "^4.4.0",
        "lodash.isplainobject": "^4.0.6",
        "lodash.union": "^4.6.0",
        "normalize-path": "^3.0.0",
        "readable-stream": "^3.6.0"
      },
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/zod": {
      "version": "4.6.5",
      "resolved": "https://registry.npmjs.org/zod/-/zod-4.6.5.tgz",
      "integrity": "sha512-v5l/aFXZQeai4awLbOpSoHecE9UiMrnfx75tEXLjNonXVARxQ5mOeipTjROUchszUNCqnE+hqAMujRsRHsut2Q==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    }
  }
}
``````

#### File: `package.json`

<!-- replay task=3 phase=implementation sha256=58c2ba5ab178762d16166849c4bcb1bcecaf95e0f9cf5821d6a58043afd0a179 -->

``````json
{
  "name": "builtbasis",
  "version": "0.1.0",
  "private": true,
  "license": "UNLICENSED",
  "type": "module",
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "dev": "tsx watch src/server/main.ts",
    "start": "tsx src/server/main.ts",
    "owner": "tsx scripts/owner.ts",
    "seed:gennadi": "tsx scripts/seed-gennadi.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "vocabulary:extract": "node scripts/extract-vocabulary.mjs"
  },
  "allowScripts": {
    "better-sqlite3@13.0.3": true
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^22.20.5",
    "exceljs": "^4.4.0",
    "tsx": "^4.23.15",
    "typescript": "^5.9.3",
    "vitest": "^3.2.7"
  },
  "dependencies": {
    "@fastify/cookie": "^11.1.2",
    "@fastify/multipart": "9.3.0",
    "better-sqlite3": "13.0.3",
    "fastify": "^5.12.5",
    "zod": "^4.6.5"
  }
}
``````

#### File: `src/server/app.ts`

<!-- replay task=3 phase=implementation sha256=24b62e6d40e9d1ede85666df8425c31403f99f94c0ba589a350f714b13c7ccd3 -->

``````ts
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
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
import { registerAuthRoutes } from './routes/auth';
import { registerHealthRoutes } from './routes/health';

export interface AppDeps {
  config: AppConfig;
  db: Db;
  /** Tests may pass their own limiter; the server uses the defaults. */
  limiter?: LoginLimiter;
  logger?: boolean;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { config, db } = deps;
  const app = Fastify({ logger: deps.logger ?? false, bodyLimit: 1024 * 1024 });
  await app.register(cookie);
  await app.register(multipart);
  registerGuards(app, config, db);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
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
    request.log.error(error);
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
  registerFileRoutes(app, db, config);
  return app;
}
``````

#### File: `src/server/files/occurrences.ts`

<!-- replay task=3 phase=implementation sha256=045a212a51a57a5410836384901f49a6d7900950c939cc07f1bfc3c79f9ea8b5 -->

``````ts
import type { AttachmentMeta, AttachmentOut, AttachmentPatchInput, PhotoMeta, PhotoOut, PhotoPatchInput } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { requireRecord, touchRecord } from '../records/store';
import type { StagedFile } from './storage';
import type { UploadEnvelope } from './uploads';

const PHOTO_SELECT = `SELECT p.id, p.original_filename AS originalFilename, p.phase, p.caption, p.taken_at AS takenAt,
  u.username AS uploadedBy, p.uploaded_at AS uploadedAt FROM photos p JOIN users u ON u.id = p.uploaded_by`;

export function listPhotos(db: Db, recordId: number): PhotoOut[] {
  return db.prepare(`${PHOTO_SELECT} WHERE p.record_id = ?
    ORDER BY CASE p.phase WHEN 'before' THEN 0 WHEN 'during' THEN 1 ELSE 2 END, p.uploaded_at DESC, p.id DESC`).all(recordId) as PhotoOut[];
}

export function listAttachments(db: Db, recordId: number): AttachmentOut[] {
  const rows = db.prepare(`SELECT a.id, a.original_filename AS originalFilename, a.title, b.size, b.content_type AS contentType,
    u.username AS uploadedBy, a.uploaded_at AS uploadedAt, l.id AS logId, l.event_at AS eventAt, l.text, l.private
    FROM attachments a JOIN blobs b ON b.hash = a.blob_hash JOIN users u ON u.id = a.uploaded_by
    LEFT JOIN log_entries l ON l.id = a.log_entry_id AND l.record_id = a.record_id
    WHERE a.record_id = ? ORDER BY a.uploaded_at DESC, a.id DESC`).all(recordId) as (Omit<AttachmentOut, 'logEntry'> & {
      logId: number | null; eventAt: string; text: string; private: number;
    })[];
  return rows.map(row => ({
    id: row.id,
    originalFilename: row.originalFilename,
    title: row.title,
    size: row.size,
    contentType: row.contentType,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt,
    logEntry: row.logId === null ? null : { id: row.logId, eventAt: row.eventAt, text: row.text, private: row.private === 1 },
  }));
}

export function requireOccurrence(db: Db, kind: 'photos' | 'attachments', recordId: number, id: number): void {
  if (!db.prepare(`SELECT id FROM ${kind} WHERE record_id = ? AND id = ?`).get(recordId, id)) {
    throw new HttpError(404, 'file_not_found');
  }
}

function insertBlob(db: Db, file: StagedFile): void {
  db.prepare('INSERT OR IGNORE INTO blobs(hash, size, content_type) VALUES (?, ?, ?)').run(file.hash, file.size, file.contentType);
  const row = db.prepare('SELECT size, content_type AS contentType FROM blobs WHERE hash = ?').get(file.hash) as { size: number; contentType: string };
  if (row.size !== file.size || row.contentType !== file.contentType) throw new Error('blob_metadata_collision');
}

/** Called only after all files are published. Recheck associations inside the synchronous transaction. */
export function saveUpload(db: Db, projectId: number, recordId: number, userId: number, kind: 'photos' | 'attachments', envelope: UploadEnvelope): PhotoOut | AttachmentOut {
  return db.transaction(() => {
    requireRecord(db, projectId, recordId);
    const at = new Date().toISOString();
    let id: number;
    if (kind === 'photos') {
      const meta = envelope.metadata as PhotoMeta;
      const { original, display, thumbnail } = envelope.files;
      if (!original || !display || !thumbnail) throw new HttpError(400, 'invalid_upload');
      for (const file of [original, display, thumbnail]) insertBlob(db, file);
      id = Number(db.prepare(`INSERT INTO photos(record_id, original_hash, display_hash, thumbnail_hash, original_filename, phase, caption, taken_at, uploaded_by, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(recordId, original.hash, display.hash, thumbnail.hash, original.filename, meta.phase, meta.caption ?? null, meta.takenAt ?? null, userId, at).lastInsertRowid);
    } else {
      const meta = envelope.metadata as AttachmentMeta;
      if (meta.logEntryId != null && !db.prepare('SELECT id FROM log_entries WHERE id = ? AND record_id = ?').get(meta.logEntryId, recordId)) {
        throw new HttpError(404, 'log_entry_not_found');
      }
      const file = envelope.files.file;
      if (!file) throw new HttpError(400, 'invalid_upload');
      insertBlob(db, file);
      id = Number(db.prepare(`INSERT INTO attachments(record_id, blob_hash, original_filename, title, log_entry_id, uploaded_by, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(recordId, file.hash, file.filename, meta.title ?? null, meta.logEntryId ?? null, userId, at).lastInsertRowid);
    }
    touchRecord(db, recordId, userId, at);
    return (kind === 'photos' ? listPhotos(db, recordId) : listAttachments(db, recordId)).find(row => row.id === id)!;
  })();
}

export function editOccurrence(db: Db, projectId: number, recordId: number, id: number, userId: number, kind: 'photos' | 'attachments', patch: PhotoPatchInput | AttachmentPatchInput): PhotoOut | AttachmentOut {
  return db.transaction(() => {
    requireRecord(db, projectId, recordId);
    requireOccurrence(db, kind, recordId, id);
    const fields = kind === 'photos' ? { phase: 'phase', caption: 'caption', takenAt: 'taken_at' } : { title: 'title' };
    for (const [key, column] of Object.entries(fields)) {
      if (Object.hasOwn(patch, key)) db.prepare(`UPDATE ${kind} SET ${column} = ? WHERE id = ?`).run((patch as Record<string, unknown>)[key], id);
    }
    touchRecord(db, recordId, userId, new Date().toISOString());
    return (kind === 'photos' ? listPhotos(db, recordId) : listAttachments(db, recordId)).find(row => row.id === id)!;
  })();
}

export function deleteOccurrence(db: Db, projectId: number, recordId: number, id: number, userId: number, kind: 'photos' | 'attachments'): void {
  db.transaction(() => {
    requireRecord(db, projectId, recordId);
    requireOccurrence(db, kind, recordId, id);
    db.prepare(`DELETE FROM ${kind} WHERE id = ?`).run(id);
    touchRecord(db, recordId, userId, new Date().toISOString());
  })();
}
``````

#### File: `src/server/files/routes.ts`

<!-- replay task=3 phase=implementation sha256=c49aae822fa32bf995244e5e04bff2c5c4612ced6dcfeb9541899b6734199a81 -->

``````ts
import type { FastifyInstance } from 'fastify';
import { AttachmentPatch, PhotoPatch } from '../../domain';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireRecord } from '../records/store';
import { deleteOccurrence, editOccurrence, listAttachments, listPhotos, saveUpload } from './occurrences';
import { discardStaged, publishFile } from './storage';
import { parseUpload } from './uploads';

export function registerFileRoutes(app: FastifyInstance, db: Db, config: AppConfig): void {
  for (const kind of ['photos', 'attachments'] as const) {
    const url = `/api/projects/:projectId/records/:id/${kind}`;
    app.post(url, { config: { multipart: true } }, async (request, reply) => {
      const { projectId, id } = ItemParams.parse(request.params);
      requireRecord(db, projectId, id);
      const envelope = await parseUpload(request, config.filesDir, kind);
      try {
        for (const file of Object.values(envelope.files)) await publishFile(config.filesDir, file);
        return reply.status(201).send(saveUpload(db, projectId, id, requireUserId(request), kind, envelope));
      } finally {
        await Promise.all(Object.values(envelope.files).map(discardStaged));
      }
    });
    app.get(url, async request => {
      const { projectId, id } = ItemParams.parse(request.params);
      requireRecord(db, projectId, id);
      return kind === 'photos' ? listPhotos(db, id) : listAttachments(db, id);
    });
    app.patch(`${url}/:itemId`, async request => {
      const { projectId, id, itemId } = RecordItemParams.parse(request.params);
      const patch = kind === 'photos' ? PhotoPatch.parse(request.body) : AttachmentPatch.parse(request.body);
      return editOccurrence(db, projectId, id, itemId, requireUserId(request), kind, patch);
    });
    app.delete(`${url}/:itemId`, async request => {
      const { projectId, id, itemId } = RecordItemParams.parse(request.params);
      deleteOccurrence(db, projectId, id, itemId, requireUserId(request), kind);
      return { ok: true };
    });
  }
}
``````

#### File: `src/server/files/storage.ts`

<!-- replay task=3 phase=implementation sha256=c051b8db82b76b586c5ab109de2fa950fa2ad820edc83250efaddde980d30fe0 -->

``````ts
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, mkdir, open, stat, unlink, type FileHandle } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Readable } from 'node:stream';
import { FILE_LIMITS, Filename, type FilePurpose } from '../../domain';
import { HttpError } from '../errors';
import { detectFormat } from './formats';

export interface StagedFile { path: string; hash: string; size: number; contentType: string }
export function blobPath(filesDir: string, hash: string): string {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('invalid_blob_hash');
  return join(filesDir, hash.slice(0, 2), hash);
}
export async function discardStaged(staged: Pick<StagedFile, 'path'>): Promise<void> {
  try { await unlink(staged.path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
export async function stageFile(filesDir: string, source: Readable, filename: string, purpose: FilePurpose): Promise<StagedFile> {
  let file: FileHandle | undefined;
  let path: string | undefined;
  try {
    const name = Filename.parse(filename);
    const tempDir = join(filesDir, '.tmp');
    await mkdir(tempDir, { recursive: true });
    const candidate = join(tempDir, randomBytes(24).toString('hex'));
    file = await open(candidate, 'wx', 0o600);
    path = candidate;
    const hash = createHash('sha256');
    let size = 0;
    let prefix = Buffer.alloc(0);
    for await (const chunk of source) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > FILE_LIMITS[purpose]) throw new HttpError(413, 'upload_too_large');
      if (prefix.length < 512) prefix = Buffer.concat([prefix, bytes.subarray(0, 512 - prefix.length)]);
      hash.update(bytes);
      for (let offset = 0; offset < bytes.length;) {
        const result = await file.write(bytes, offset, bytes.length - offset);
        if (result.bytesWritten === 0) throw new Error('file_write_incomplete');
        offset += result.bytesWritten;
      }
    }
    if ((source as Readable & { truncated?: boolean }).truncated) throw new HttpError(413, 'upload_too_large');
    if (size === 0) throw new HttpError(415, 'unsupported_file_type');
    const contentType = detectFormat(prefix, name, purpose);
    await file.sync();
    await file.close();
    file = undefined;
    return { path, hash: hash.digest('hex'), size, contentType };
  } catch (error) {
    source.destroy();
    // Try both cleanup operations even if close itself fails; retain the original error.
    if (file) await file.close().catch(() => undefined);
    if (path) await discardStaged({ path }).catch(() => undefined);
    throw error;
  }
}
export async function publishFile(filesDir: string, staged: StagedFile): Promise<void> {
  const destination = blobPath(filesDir, staged.hash);
  const dir = dirname(destination);
  await mkdir(dir, { recursive: true });
  try { await link(staged.path, destination); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if ((await stat(destination)).size !== staged.size) throw new Error('blob_collision');
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(destination)) hash.update(chunk);
    if (hash.digest('hex') !== staged.hash) throw new Error('blob_collision');
  }
  if (process.platform !== 'win32') {
    // Persist newly created directory entries as well as the published file entry.
    for (const path of [dirname(filesDir), filesDir, dir]) {
      const handle = await open(path, 'r');
      try { await handle.sync(); } finally { await handle.close(); }
    }
  }
  await discardStaged(staged);
}
``````

#### File: `src/server/files/uploads.ts`

<!-- replay task=3 phase=implementation sha256=e97a3f7b96beab57d6e74b1af6b0392a4b8c2f05bfe5216612e653c03e5e0156 -->

``````ts
import type { FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';
import { ZodError } from 'zod';
import { AttachmentUploadMeta, Filename, PhotoUploadMeta, type AttachmentMeta, type PhotoMeta } from '../../domain';
import { HttpError } from '../errors';
import { discardStaged, stageFile, type StagedFile } from './storage';

export interface UploadFile extends StagedFile { filename: string }
export interface UploadEnvelope {
  metadata: PhotoMeta | AttachmentMeta;
  files: Record<string, UploadFile>;
}

export async function parseUpload(request: FastifyRequest, filesDir: string, kind: 'photos' | 'attachments'): Promise<UploadEnvelope> {
  if (!request.isMultipart()) throw new HttpError(415, 'unsupported_content_type');
  const photo = kind === 'photos';
  const expected = photo ? ['original', 'display', 'thumbnail'] : ['file'];
  const files: Record<string, UploadFile> = {};
  let metadata: unknown;
  let hasMetadata = false;
  let currentFile: Readable | undefined;
  try {
    for await (const part of request.parts({
      limits: {
        files: photo ? 3 : 1,
        fields: 1,
        parts: photo ? 4 : 2,
        fileSize: photo ? 25_000_000 : 50_000_000,
        fieldSize: 16_384,
        fieldNameSize: 100,
        headerPairs: 100,
      },
    })) {
      if (part.type === 'file') {
        currentFile = part.file;
        if (!expected.includes(part.fieldname) || files[part.fieldname]) {
          part.file.resume();
          throw new HttpError(400, 'invalid_upload');
        }
        const filename = Filename.parse(part.filename);
        const purpose = photo ? `photo-${part.fieldname}` as 'photo-original' | 'photo-display' | 'photo-thumbnail' : 'attachment';
        const staged = await stageFile(filesDir, part.file, filename, purpose);
        files[part.fieldname] = { ...staged, filename };
        currentFile = undefined;
      } else {
        if (part.fieldnameTruncated || part.valueTruncated) throw new HttpError(413, 'upload_too_large');
        if (part.fieldname !== 'metadata' || hasMetadata) throw new HttpError(400, 'invalid_upload');
        hasMetadata = true;
        // Multipart parses application/json fields itself; text fields remain raw JSON strings.
        metadata = typeof part.value === 'string' ? JSON.parse(part.value) : part.value;
      }
    }
    if (!hasMetadata || expected.some(name => !files[name])) throw new HttpError(400, 'invalid_upload');
    return {
      metadata: photo ? PhotoUploadMeta.parse(metadata) : AttachmentUploadMeta.parse(metadata),
      files,
    };
  } catch (error) {
    currentFile?.destroy();
    // Stop the multipart parser and drain unread request bytes after an early rejection.
    request.raw.unpipe();
    request.raw.resume();
    await Promise.all(Object.values(files).map(discardStaged));
    if (error instanceof HttpError) throw error;
    const code = (error as { code?: string }).code;
    if (code && ['FST_REQ_FILE_TOO_LARGE', 'FST_FILES_LIMIT', 'FST_FIELDS_LIMIT', 'FST_PARTS_LIMIT'].includes(code)) {
      throw new HttpError(413, 'upload_too_large');
    }
    const malformed = ['Multipart: Boundary not found', 'Unexpected end of multipart data', 'Premature close'];
    if (error instanceof ZodError || error instanceof SyntaxError || code === 'FST_INVALID_JSON_FIELD_ERROR' || malformed.includes((error as Error).message)) {
      throw new HttpError(400, 'invalid_upload');
    }
    throw error;
  }
}
``````

#### File: `src/server/records/log.ts`

<!-- replay task=3 phase=implementation sha256=9fbdbbb763b1d8f3312ca81c1315a2a7855f3132fa177ccb334228c11dbb287f -->

``````ts
import type { FastifyInstance } from 'fastify';
import { LogEntryBody, LogEntryPatch, type LogEntryInput, type LogEntryPatchInput } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { requireRecord, touchRecord } from './store';

/** A Log entry (design §5.11). `loggedAt` and `editedAt` are stored for the record but not shown in the UI. */
export interface LogEntry {
  id: number;
  eventAt: string;
  text: string;
  private: boolean;
  loggedBy: string;
  loggedAt: string;
  editedAt: string | null;
}

type LogRow = Omit<LogEntry, 'private'> & { private: number };
const SELECT = `SELECT l.id, l.event_at AS eventAt, l.text, l.private, u.username AS loggedBy,
  l.logged_at AS loggedAt, l.edited_at AS editedAt
  FROM log_entries l JOIN users u ON u.id = l.logged_by`;
const toEntry = (row: LogRow): LogEntry => ({ ...row, private: row.private === 1 });

/** Event times are stored in UTC so that they sort correctly whatever offset the browser sent. */
const toUtc = (value: string): string => new Date(value).toISOString();

/** Newest first: by event time, then by logged-at (design §5.11). */
export function listLog(db: Db, recordId: number): LogEntry[] {
  return (
    db.prepare(`${SELECT} WHERE l.record_id = ? ORDER BY l.event_at DESC, l.logged_at DESC, l.id DESC`).all(recordId) as LogRow[]
  ).map(toEntry);
}

function requireEntry(db: Db, recordId: number, entryId: number): LogEntry {
  const row = db.prepare(`${SELECT} WHERE l.record_id = ? AND l.id = ?`).get(recordId, entryId) as LogRow | undefined;
  if (!row) throw new HttpError(404, 'log_entry_not_found');
  return toEntry(row);
}

export function addLogEntry(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  input: LogEntryInput,
  now: Date = new Date(),
): LogEntry {
  return db.transaction((): LogEntry => {
    requireRecord(db, projectId, recordId);
    const at = now.toISOString();
    const info = db
      .prepare(
        'INSERT INTO log_entries (record_id, event_at, text, private, logged_by, logged_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(recordId, input.eventAt ? toUtc(input.eventAt) : at, input.text, input.private ? 1 : 0, userId, at);
    touchRecord(db, recordId, userId, at);
    return requireEntry(db, recordId, Number(info.lastInsertRowid));
  })();
}

/** Event time, text and the private marker can change; logged-at and logged-by never do. */
export function updateLogEntry(
  db: Db,
  projectId: number,
  recordId: number,
  entryId: number,
  userId: number,
  patch: LogEntryPatchInput,
  now: Date = new Date(),
): LogEntry {
  return db.transaction((): LogEntry => {
    requireRecord(db, projectId, recordId);
    const current = requireEntry(db, recordId, entryId);
    const at = now.toISOString();
    db.prepare('UPDATE log_entries SET event_at = ?, text = ?, private = ?, edited_at = ? WHERE id = ?').run(
      patch.eventAt ? toUtc(patch.eventAt) : current.eventAt,
      patch.text ?? current.text,
      (patch.private ?? current.private) ? 1 : 0,
      at,
      entryId,
    );
    touchRecord(db, recordId, userId, at);
    return requireEntry(db, recordId, entryId);
  })();
}

/** The composite attachment FK cascades occurrence deletion in this transaction; stored blobs remain. */
export function deleteLogEntry(
  db: Db,
  projectId: number,
  recordId: number,
  entryId: number,
  userId: number,
  now: Date = new Date(),
): void {
  db.transaction(() => {
    requireRecord(db, projectId, recordId);
    requireEntry(db, recordId, entryId);
    db.prepare('DELETE FROM log_entries WHERE id = ?').run(entryId);
    touchRecord(db, recordId, userId, now.toISOString());
  })();
}

export function registerLogRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/log', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listLog(db, id);
  });

  app.post('/api/projects/:projectId/records/:id/log', async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    const entry = addLogEntry(db, projectId, id, requireUserId(request), LogEntryBody.parse(request.body));
    return reply.status(201).send(entry);
  });

  app.patch('/api/projects/:projectId/records/:id/log/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateLogEntry(db, projectId, id, itemId, requireUserId(request), LogEntryPatch.parse(request.body));
  });

  app.delete('/api/projects/:projectId/records/:id/log/:itemId', async (request) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireProject(db, projectId);
    deleteLogEntry(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
}
``````

Run `npm ci --ignore-scripts`, then `npm rebuild esbuild`, after writing both dependency files. Do not substitute an unpinned install.

- [ ] **Step 4: Verify the completed task.**

Run: `npx vitest run tests/server/files-api.test.ts`, then `npm run typecheck`. Expected: twelve upload API tests pass; TypeScript reports no errors.

- [ ] **Step 5: Commit only the task files.**

```powershell
git add 'package-lock.json' 'package.json' 'src/server/app.ts' 'src/server/files/occurrences.ts' 'src/server/files/routes.ts' 'src/server/files/storage.ts' 'src/server/files/uploads.ts' 'src/server/records/log.ts' 'tests/server/file-fixture.ts' 'tests/server/files-api.test.ts'
git commit -m "feat: upload and manage record photos and attachments"
```

## Task 4: Token cryptography, configuration and key-loss handling

**Scratch checkpoint:** `52f3774`. **Depends on:** Task 3.

**Deliverable:** Authenticated token encryption, key configuration, startup revocation and the offline revoke command.

- [ ] **Step 1: Write these complete test and fixture files.**

#### File: `tests/server/config.test.ts`

<!-- replay task=4 phase=test sha256=9cca5b956b1a032f78c36bad591d5131ca8560f91a76482cab5607b727081407 -->

``````ts
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/server/config';

describe('loadConfig (design §11.6)', () => {
  it('requires BUILTBASIS_DATA_DIR', () => {
    expect(() => loadConfig({})).toThrow('BUILTBASIS_DATA_DIR');
  });

  it('derives database and backup paths and local defaults', () => {
    const config = loadConfig({ BUILTBASIS_DATA_DIR: '/data' });
    expect(config.dbPath).toMatch(/builtbasis\.db$/);
    expect(config.backupsDir).toMatch(/backups$/);
    expect(config.filesDir).toMatch(/files$/);
    expect(config.publicOrigin).toBe('http://localhost:3000');
    expect(config.secureCookies).toBe(false);
    expect(config.behindCloudflare).toBe(false);
    expect(config.port).toBeNull();
    expect(config.shareKey).toBeNull();
  });

  it('accepts exactly 32 bytes of hex key and rejects malformed keys', () => {
    const env = { BUILTBASIS_DATA_DIR: '/data' };
    expect(loadConfig({ ...env, SHARE_LINK_KEY: 'ab'.repeat(32) }).shareKey).toEqual(Buffer.alloc(32, 0xab));
    for (const value of ['', 'ab', 'zz'.repeat(32), 'a'.repeat(65)]) {
      expect(() => loadConfig({ ...env, SHARE_LINK_KEY: value })).toThrow('SHARE_LINK_KEY');
    }
  });

  it('uses the public origin, secure cookies and Cloudflare mode in production', () => {
    const config = loadConfig({
      BUILTBASIS_DATA_DIR: '/data',
      PUBLIC_BASE_URL: 'https://builtbasis.ktimanet.com/',
      BEHIND_CLOUDFLARE: '1',
      PORT: '3000',
    });
    expect(config.publicOrigin).toBe('https://builtbasis.ktimanet.com');
    expect(config.secureCookies).toBe(true);
    expect(config.behindCloudflare).toBe(true);
    expect(config.port).toBe('3000');
  });
});
``````

#### File: `tests/server/helpers.ts`

<!-- replay task=4 phase=test sha256=01c5d6e7e6655c7c5c4b47fb6c9ae01e4623e251fe1d5ec233a730ee55d3d8af -->

``````ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server/app';
import type { LoginLimiter } from '../../src/server/auth/login-limiter';
import { setOwnerPassword } from '../../src/server/auth/users';
import { loadConfig, type AppConfig } from '../../src/server/config';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { SESSION_COOKIE } from '../../src/server/http/guards';

export interface TestContext {
  app: FastifyInstance;
  db: Db;
  config: AppConfig;
  origin: string;
  close: () => Promise<void>;
}

export const OWNER = { username: 'owner', password: 'correct horse battery staple' } as const;

export async function makeContext(
  options: { publicBaseUrl?: string; behindCloudflare?: boolean; limiter?: LoginLimiter } = {},
): Promise<TestContext> {
  const dataDir = mkdtempSync(join(tmpdir(), 'builtbasis-test-'));
  const config = loadConfig({
    BUILTBASIS_DATA_DIR: dataDir,
    SHARE_LINK_KEY: '07'.repeat(32),
    PUBLIC_BASE_URL: options.publicBaseUrl ?? 'http://localhost:3000',
    ...(options.behindCloudflare ? { BEHIND_CLOUDFLARE: '1' } : {}),
  });
  const db = openDatabase(config.dbPath);
  migrate(db, { backupsDir: config.backupsDir });
  const app = await buildApp({ config, db, limiter: options.limiter });
  return {
    app,
    db,
    config,
    origin: config.publicOrigin,
    close: async () => {
      await app.close();
      db.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

/** Creates the owner account, logs in and returns the Cookie header value. */
export async function loginAsOwner(ctx: TestContext): Promise<string> {
  setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { origin: ctx.origin },
    payload: { ...OWNER },
  });
  const cookie = res.cookies.find((candidate) => candidate.name === SESSION_COOKIE);
  if (!cookie) throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  return `${SESSION_COOKIE}=${cookie.value}`;
}

/** A state-changing owner request: matching Origin, session cookie, JSON body. */
export function send(ctx: TestContext, cookie: string, method: 'POST' | 'PATCH' | 'DELETE', url: string, payload: object = {}) {
  return ctx.app.inject({ method, url, headers: { origin: ctx.origin, cookie }, payload });
}

export function get(ctx: TestContext, cookie: string, url: string) {
  return ctx.app.inject({ method: 'GET', url, headers: { cookie } });
}
``````

#### File: `tests/server/share-crypto.test.ts`

<!-- replay task=4 phase=test sha256=a7fc59100842fceab73630c3ac9f1dcd3bfc2adf180de35b4546ccbf79af4f37 -->

``````ts
import { expect, it } from 'vitest';
import { decryptShareToken, encryptShareToken, hashShareToken, newShareToken } from '../../src/server/sharing/crypto';

const key = Buffer.alloc(32, 7);
it('generates canonical random tokens and authenticates ciphertext to its record', () => {
  const token = newShareToken();
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(newShareToken()).not.toBe(token);
  expect(hashShareToken(token)).toMatch(/^[a-f0-9]{64}$/);
  const encrypted = encryptShareToken(token, key, 12);
  expect(encrypted.nonce).toHaveLength(12);
  expect(encrypted.tag).toHaveLength(16);
  expect(encrypted.ciphertext.includes(Buffer.from(token))).toBe(false);
  expect(decryptShareToken(encrypted, key, 12)).toBe(token);
  expect(encryptShareToken(token, key, 12).nonce).not.toEqual(encrypted.nonce);
  expect(() => decryptShareToken(encrypted, key, 13)).toThrow();
  expect(() => decryptShareToken(encrypted, Buffer.alloc(32, 8), 12)).toThrow();
  for (const field of ['ciphertext', 'nonce', 'tag'] as const) {
    const value = Buffer.from(encrypted[field]);
    value[0] = value[0]! ^ 1;
    expect(() => decryptShareToken({ ...encrypted, [field]: value }, key, 12)).toThrow();
    expect(() => decryptShareToken({ ...encrypted, [field]: Buffer.alloc(0) }, key, 12)).toThrow();
  }
  for (const invalid of ['', 'a'.repeat(42), 'a'.repeat(43), `${token}=`]) {
    expect(() => hashShareToken(invalid)).toThrow();
    expect(() => encryptShareToken(invalid, key, 12)).toThrow();
  }
});
``````

#### File: `tests/server/share-key.test.ts`

<!-- replay task=4 phase=test sha256=26601a353f67d9ff720f9f04a2e076f7a613834fcab722c120ac33f3f3b7b8c0 -->

``````ts
import { afterEach, beforeEach, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app';
import { encryptShareToken, hashShareToken, keyFingerprint, newShareToken } from '../../src/server/sharing/crypto';
import { reconcileShareKey, revokeAllShareLinks } from '../../src/server/sharing/links';
import { makeFixture, postRecord, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => { f = await makeFixture(); });
afterEach(async () => { await f.ctx.close(); });

async function link() {
  const record = await postRecord(f, { subtype: 'task' });
  const token = newShareToken();
  const key = f.ctx.config.shareKey!;
  const encrypted = encryptShareToken(token, key, record.id);
  const user = f.ctx.db.prepare('SELECT id FROM users').pluck().get();
  f.ctx.db.prepare(`INSERT INTO share_links(record_id,label,token_hash,key_fingerprint,token_ciphertext,token_nonce,token_tag,created_by,created_at)
    VALUES (?,'recipient',?,?,?,?,?,?,'2026-01-01')`).run(record.id, hashShareToken(token), keyFingerprint(key), encrypted.ciphertext, encrypted.nonce, encrypted.tag, user);
}

it('requires an HTTP key but allows first reconciliation without any owner', async () => {
  await expect(buildApp({ db: f.ctx.db, config: { ...f.ctx.config, shareKey: null } })).rejects.toThrow('share_key_required');
  expect(reconcileShareKey(f.ctx.db, f.ctx.config.shareKey!)).toBe(0);
  const changedBefore = f.ctx.db.prepare('SELECT total_changes()').pluck().get();
  expect(reconcileShareKey(f.ctx.db, f.ctx.config.shareKey!)).toBe(0);
  expect(f.ctx.db.prepare('SELECT total_changes()').pluck().get()).toBe(changedBefore);
});

it('preserves unchanged-key links and revokes changed-key links before ready without owner activity', async () => {
  await link();
  expect(reconcileShareKey(f.ctx.db, f.ctx.config.shareKey!)).toBe(0);
  const activity = f.ctx.db.prepare('SELECT count(*) FROM activity').pluck().get();
  await f.ctx.app.close();
  f.ctx.app = await buildApp({ db: f.ctx.db, config: { ...f.ctx.config, shareKey: Buffer.alloc(32, 9) } });
  await f.ctx.app.ready();
  expect(f.ctx.db.prepare('SELECT revoked_at FROM share_links').pluck().get()).toEqual(expect.any(String));
  expect(f.ctx.db.prepare('SELECT count(*) FROM activity').pluck().get()).toBe(activity);
});

it('fails closed when fingerprint state is lost and globally revokes without needing a key', async () => {
  await link();
  f.ctx.db.exec('DELETE FROM share_key_state');
  expect(reconcileShareKey(f.ctx.db, f.ctx.config.shareKey!, new Date('2026-10-03'))).toBe(1);
  expect(f.ctx.db.prepare('SELECT revoked_at FROM share_links').pluck().get()).toBe('2026-10-03T00:00:00.000Z');
  expect(revokeAllShareLinks(f.ctx.db)).toBe(0);
});

it('rolls key reconciliation and revocation back together on SQL failure', async () => {
  await link();
  const fingerprint = keyFingerprint(f.ctx.config.shareKey!);
  f.ctx.db.exec("CREATE TRIGGER fail_key BEFORE UPDATE ON share_key_state BEGIN SELECT RAISE(ABORT,'forced'); END");
  expect(() => reconcileShareKey(f.ctx.db, Buffer.alloc(32, 9))).toThrow();
  expect(f.ctx.db.prepare('SELECT revoked_at FROM share_links').pluck().get()).toBeNull();
  expect(f.ctx.db.prepare('SELECT fingerprint FROM share_key_state').pluck().get()).toBe(fingerprint);
});
``````

- [ ] **Step 2: Verify the pre-implementation result.**

Run: `npx vitest run tests/server/share-crypto.test.ts tests/server/share-key.test.ts tests/server/config.test.ts`.

Expected: exit 1 from missing crypto/key modules and missing key configuration assertions.

- [ ] **Step 3: Write these complete implementation/configuration files.**

#### File: `.env.example`

<!-- replay task=4 phase=implementation sha256=c641f8728d3ca370d0c95ae725db3470269ddc302272ef848b0fd4b934667bbf -->

``````text
# Local development settings. Copy to .env (git-ignored); never commit .env.
BUILTBASIS_DATA_DIR=./data
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000
# HTTP startup requires a dedicated random 32-byte key encoded as 64 hex characters.
# Keep it outside the repository, data directory and backups. No default key exists.
# SHARE_LINK_KEY=
# Production only (set in konsoleH, not here):
# PUBLIC_BASE_URL=https://builtbasis.ktimanet.com
# BEHIND_CLOUDFLARE=1
``````

#### File: `README.md`

<!-- replay task=4 phase=implementation sha256=c2c2c83de5335dcca27f163af417aa677a8bde1a7961a92b2a97bc9174fe714c -->

``````markdown
# BuiltBasis

Lightweight construction-control application: quality issues, detail clarifications and tasks — with measurements, decisions, photos and read-only sharing — in English and Greek.

**Status:** Plans 0–3 are complete. The server foundation and records API are implemented and merged to `main`. Plan 4 (files and sharing) is next (see roadmap).

## Local dependency installation

Use the locked dependencies and shipped SQLite binary:

```sh
npm ci --ignore-scripts
npm rebuild esbuild
```

On this Windows machine, ordinary `npm ci` with npm 11.6.2 and 11.19.0 incorrectly attempted a SQLite source build despite the package declaring `gypfile: false`. The commands above were verified with all 155 tests and typechecking. Reassess install scripts when dependencies change.

## Documentation

| Document | Purpose |
|---|---|
| [docs/VISION.md](docs/VISION.md) | What we are building and why |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System structure |
| [docs/adr/0001-v1-stack-and-hosting.md](docs/adr/0001-v1-stack-and-hosting.md) | Stack and hosting decision |
| [docs/designs/2026-10-02-v1-records-design.md](docs/designs/2026-10-02-v1-records-design.md) | **Full v1 design** — records, fields, value lists, rules, screens, operations. Basis for the spec and implementation plan. |
| [docs/plans/2026-10-02-v1-roadmap.md](docs/plans/2026-10-02-v1-roadmap.md) | Implementation roadmap: the sequence of v1 plans and their status |
| [docs/research/2026-10-02-issue-and-clarification-tracking-research.md](docs/research/2026-10-02-issue-and-clarification-tracking-research.md) | Market and terminology research (non-authoritative input) |

Documentation follows `X:\1976KN\Dev\Code\DOCS-STANDARD.md` (v1.4).
# Share-link key setup

HTTP startup requires `SHARE_LINK_KEY`, a dedicated random 32-byte key encoded as 64 hexadecimal characters. Store it in server configuration outside the repository, data directory and backups. Preserve it across deployments. Offline owner, seed and share-revocation commands do not require an absent key.

After key loss or replacement, stop the application and run `npm run shares:revoke-all` against the intended data directory. Install a newly generated key in private configuration, restart, and issue replacement links. Startup also revokes unrevoked links when the key fingerprint changes. Never publish a key or put it in command logs.
``````

#### File: `package.json`

<!-- replay task=4 phase=implementation sha256=12637b552815e86ff63a0436a951220afc4c9c3aaaeaa489d8ecbf3989d699b2 -->

``````json
{
  "name": "builtbasis",
  "version": "0.1.0",
  "private": true,
  "license": "UNLICENSED",
  "type": "module",
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "dev": "tsx watch src/server/main.ts",
    "start": "tsx src/server/main.ts",
    "owner": "tsx scripts/owner.ts",
    "seed:gennadi": "tsx scripts/seed-gennadi.ts",
    "shares:revoke-all": "tsx scripts/revoke-share-links.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "vocabulary:extract": "node scripts/extract-vocabulary.mjs"
  },
  "allowScripts": {
    "better-sqlite3@13.0.3": true
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^22.20.5",
    "exceljs": "^4.4.0",
    "tsx": "^4.23.15",
    "typescript": "^5.9.3",
    "vitest": "^3.2.7"
  },
  "dependencies": {
    "@fastify/cookie": "^11.1.2",
    "@fastify/multipart": "9.3.0",
    "better-sqlite3": "13.0.3",
    "fastify": "^5.12.5",
    "zod": "^4.6.5"
  }
}
``````

#### File: `scripts/revoke-share-links.ts`

<!-- replay task=4 phase=implementation sha256=2875dc977a0cadd603c516f5a62082d547243bc5772af133855a26f279efd513 -->

``````ts
import { loadEnvFile, openMigratedDatabase } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';
import { revokeAllShareLinks } from '../src/server/sharing/links';

try {
  loadEnvFile();
  const { db } = openMigratedDatabase(loadConfig());
  try {
    const revokedLinks = revokeAllShareLinks(db);
    console.log(JSON.stringify({ event: 'share_links_revoked_administratively', revokedLinks }));
  } finally {
    db.close();
  }
} catch {
  console.error(JSON.stringify({ event: 'share_links_revocation_failed' }));
  process.exitCode = 1;
}
``````

#### File: `src/server/app.ts`

<!-- replay task=4 phase=implementation sha256=1ad717fb9fc846ed281151cf585a0ba2dff333616b4cf9c1e3a3ff442a5e940a -->

``````ts
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
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
import { requireShareKey } from './sharing/crypto';
import { reconcileShareKey } from './sharing/links';
import { registerAuthRoutes } from './routes/auth';
import { registerHealthRoutes } from './routes/health';

export interface AppDeps {
  config: AppConfig;
  db: Db;
  /** Tests may pass their own limiter; the server uses the defaults. */
  limiter?: LoginLimiter;
  logger?: boolean;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { config, db } = deps;
  requireShareKey(config.shareKey);
  const revokedLinks = reconcileShareKey(db, config.shareKey);
  const app = Fastify({ logger: deps.logger ?? false, bodyLimit: 1024 * 1024 });
  if (revokedLinks > 0) app.log.info({ event: 'share_key_changed', revokedLinks });
  await app.register(cookie);
  await app.register(multipart);
  registerGuards(app, config, db);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
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
    request.log.error(error);
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
  registerFileRoutes(app, db, config);
  return app;
}
``````

#### File: `src/server/config.ts`

<!-- replay task=4 phase=implementation sha256=b125466988aedb7e20052645e6ff1f42418252338636afb300cb7009069d3c99 -->

``````ts
import { join } from 'node:path';

export interface AppConfig {
  dataDir: string;
  dbPath: string;
  backupsDir: string;
  filesDir: string;
  shareKey: Buffer | null;
  /** Scheme + host (+ port) that browsers send as Origin, e.g. https://builtbasis.ktimanet.com */
  publicOrigin: string;
  secureCookies: boolean;
  /** Read the visitor IP from CF-Connecting-IP (design §11.6). */
  behindCloudflare: boolean;
  /** PORT: a port number or a socket path. null = listen like Hetzner's example (no arguments). */
  port: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataDir = env.BUILTBASIS_DATA_DIR;
  if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');
  const publicOrigin = new URL(env.PUBLIC_BASE_URL ?? 'http://localhost:3000').origin;
  const encodedKey = env.SHARE_LINK_KEY;
  if (encodedKey !== undefined && !/^[a-fA-F0-9]{64}$/.test(encodedKey)) {
    throw new Error('SHARE_LINK_KEY must contain exactly 64 hexadecimal characters');
  }
  return {
    dataDir,
    dbPath: join(dataDir, 'builtbasis.db'),
    backupsDir: join(dataDir, 'backups'),
    filesDir: join(dataDir, 'files'),
    shareKey: encodedKey === undefined ? null : Buffer.from(encodedKey, 'hex'),
    publicOrigin,
    secureCookies: publicOrigin.startsWith('https://'),
    behindCloudflare: env.BEHIND_CLOUDFLARE === '1',
    port: env.PORT ?? null,
  };
}
``````

#### File: `src/server/sharing/crypto.ts`

<!-- replay task=4 phase=implementation sha256=79c1ab1ec89367ba5c174f552e44511be981ed2465ff6464dad4ab2b562de530 -->

``````ts
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export interface EncryptedToken {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
}

export function validShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token) && Buffer.from(token, 'base64url').toString('base64url') === token;
}

function requireToken(token: string): void {
  if (!validShareToken(token)) throw new Error('invalid_share_token');
}

export function requireShareKey(key: Buffer | null): asserts key is Buffer {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('share_key_required');
}

export function newShareToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashShareToken(token: string): string {
  requireToken(token);
  return createHash('sha256').update(token).digest('hex');
}

export function keyFingerprint(key: Buffer): string {
  requireShareKey(key);
  return createHash('sha256').update(key).digest('hex');
}

const aad = (recordId: number): Buffer => Buffer.from(`builtbasis-share-v1:${recordId}`, 'utf8');

export function encryptShareToken(token: string, key: Buffer, recordId: number): EncryptedToken {
  requireToken(token);
  requireShareKey(key);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(aad(recordId));
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return { ciphertext, nonce, tag: cipher.getAuthTag() };
}

export function decryptShareToken(value: EncryptedToken, key: Buffer, recordId: number): string {
  requireShareKey(key);
  if (value.nonce.length !== 12 || value.tag.length !== 16 || value.ciphertext.length !== 43) throw new Error('invalid_share_ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', key, value.nonce);
  decipher.setAAD(aad(recordId));
  decipher.setAuthTag(value.tag);
  const token = Buffer.concat([decipher.update(value.ciphertext), decipher.final()]).toString('utf8');
  requireToken(token);
  return token;
}
``````

#### File: `src/server/sharing/links.ts`

<!-- replay task=4 phase=implementation sha256=84ab7cdb29bf867987f5cec5b6a96bb5ba4d4d94fca44e33b5bf226c278ad345 -->

``````ts
import type { Db } from '../db/connection';
import { keyFingerprint } from './crypto';

/** Administrative revocation has no owner actor and does not fabricate record activity. */
export function revokeAllShareLinks(db: Db, now = new Date()): number {
  return db.prepare('UPDATE share_links SET revoked_at = ? WHERE revoked_at IS NULL').run(now.toISOString()).changes;
}

export function reconcileShareKey(db: Db, key: Buffer, now = new Date()): number {
  const fingerprint = keyFingerprint(key);
  return db.transaction(() => {
    const current = db.prepare('SELECT fingerprint FROM share_key_state WHERE id = 1').pluck().get();
    if (current === fingerprint) return 0;
    const revoked = revokeAllShareLinks(db, now);
    db.prepare('INSERT INTO share_key_state(id, fingerprint) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET fingerprint = excluded.fingerprint').run(fingerprint);
    return revoked;
  })();
}
``````

- [ ] **Step 4: Verify the completed task.**

Run: `npx vitest run tests/server/share-crypto.test.ts tests/server/share-key.test.ts tests/server/config.test.ts`, then `npm run typecheck`. Expected: nine tests in three files pass; TypeScript reports no errors.

- [ ] **Step 5: Commit only the task files.**

```powershell
git add '.env.example' 'README.md' 'package.json' 'scripts/revoke-share-links.ts' 'src/server/app.ts' 'src/server/config.ts' 'src/server/sharing/crypto.ts' 'src/server/sharing/links.ts' 'tests/server/config.test.ts' 'tests/server/helpers.ts' 'tests/server/share-crypto.test.ts' 'tests/server/share-key.test.ts'
git commit -m "feat: encrypt share tokens and revoke links on key changes"
```

## Task 5: Owner link management and safe request logging

**Scratch checkpoint:** `72f24a1`. **Depends on:** Task 4.

**Deliverable:** Owner-only create/copy/revoke endpoints, atomic activity and logging that preserves safe route patterns without credentials.

- [ ] **Step 1: Write these complete test and fixture files.**

#### File: `tests/server/share-links-api.test.ts`

<!-- replay task=5 phase=test sha256=561917d8e98a6f525a7dd04aff27050d0b99926e788fd0b6b5267bf30d110997 -->

``````ts
import { afterEach, beforeEach, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app';
import { createShareLink } from '../../src/server/sharing/links';
import { get, send } from './helpers';
import { getRecord, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
let id: number;
beforeEach(async () => {
  f = await makeFixture();
  id = (await postRecord(f, { subtype: 'task' })).id;
});
afterEach(async () => { await f.ctx.close(); });

it('creates/copies a Draft link privately, stores no plaintext token and revokes idempotently', async () => {
  const response = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'Architect' });
  expect(response.statusCode).toBe(201);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.headers['referrer-policy']).toBe('no-referrer');
  const created = response.json();
  expect(created.url).toMatch(/\/share#[A-Za-z0-9_-]{43}$/);
  const token = created.url.split('#')[1];
  const changes = () => f.ctx.db.prepare('SELECT total_changes()').pluck().get();
  const before = changes();
  const listed = await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'));
  expect(listed.json()[0]).toEqual(created);
  expect(changes()).toBe(before);
  expect(JSON.stringify(f.ctx.db.prepare('SELECT * FROM share_links').all())).not.toContain(token);
  const activity = (await get(f.ctx, f.cookie, recordUrl(f, id, '/activity'))).json();
  expect(activity[0]).toMatchObject({ action: 'share_created', detail: { linkId: created.id, label: 'Architect' } });
  expect(JSON.stringify(activity)).not.toContain(token);
  for (let n = 0; n < 2; n++) expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, `/share-links/${created.id}/revoke`))).statusCode).toBe(200);
  const revoked = (await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'))).json()[0];
  expect(revoked.revokedAt).toEqual(expect.any(String));
  expect(revoked.url).toBe(created.url);
  expect(f.ctx.db.prepare("SELECT count(*) FROM activity WHERE action='share_revoked'").pluck().get()).toBe(1);
});

it('validates future expiry, strict payloads, ownership and guards', async () => {
  const url = recordUrl(f, id, '/share-links');
  for (const body of [{ label: ' ' }, { label: 'x', extra: true }, { label: 'x', expiresAt: '2000-01-01T00:00:00Z' }]) {
    expect((await send(f.ctx, f.cookie, 'POST', url, body)).statusCode).toBe(400);
  }
  const userId = f.ctx.db.prepare('SELECT id FROM users').pluck().get() as number;
  expect(() => createShareLink(f.ctx.db, f.ctx.config, f.projectId, id, userId, { label: 'x', expiresAt: '2026-10-03T00:00:00.000Z' }, new Date('2026-10-03'))).toThrow('expiry_must_be_future');
  const created = (await send(f.ctx, f.cookie, 'POST', url, { label: 'x' })).json();
  const other = await postRecord(f, { subtype: 'task' });
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, other.id, `/share-links/${created.id}/revoke`))).statusCode).toBe(404);
  expect((await f.ctx.app.inject({ method: 'GET', url })).statusCode).toBe(401);
  expect((await f.ctx.app.inject({ method: 'POST', url, headers: { cookie: f.cookie }, payload: { label: 'x' } })).statusCode).toBe(403);
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, `/share-links/${created.id}/revoke`), { reason: 'x' })).statusCode).toBe(400);
});

it('rolls creation and revocation back if activity writing fails', async () => {
  const before = await getRecord(f, id);
  f.ctx.db.exec("CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT,'forced'); END");
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'x' })).statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT count(*) FROM share_links').pluck().get()).toBe(0);
  expect(await getRecord(f, id)).toEqual(before);
  f.ctx.db.exec('DROP TRIGGER fail_activity');
  const created = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'x' })).json();
  f.ctx.db.exec("CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT,'forced'); END");
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, `/share-links/${created.id}/revoke`))).statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT revoked_at FROM share_links').pluck().get()).toBeNull();
});

it('returns null URL for an old key and a controlled error for matching-key corruption', async () => {
  await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'x' });
  f.ctx.db.exec("UPDATE share_links SET token_tag=zeroblob(16)");
  const broken = await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'));
  expect(broken.statusCode).toBe(500);
  expect(broken.json()).toEqual({ error: 'share_copy_failed' });
  await f.ctx.app.close();
  f.ctx.app = await buildApp({ db: f.ctx.db, config: { ...f.ctx.config, shareKey: Buffer.alloc(32, 9) } });
  const old = (await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'))).json()[0];
  expect(old.url).toBeNull();
  expect(old.revokedAt).toEqual(expect.any(String));
});
``````

#### File: `tests/server/share-logging.test.ts`

<!-- replay task=5 phase=test sha256=213eea5cb12659305d443ff684744f0e561298e8b642b0bfeaa1e78193350d7a -->

``````ts
import { Writable } from 'node:stream';
import { expect, it } from 'vitest';
import { buildApp } from '../../src/server/app';
import { get, send } from './helpers';
import { makeFixture, postRecord, recordUrl } from './record-fixture';

it('logs route patterns and controlled errors without URLs, credentials, parameters or response tokens', async () => {
  const f = await makeFixture();
  let captured = '';
  const stream = new Writable({ write(chunk, _encoding, callback) { captured += chunk.toString(); callback(); } });
  try {
    const record = await postRecord(f, { subtype: 'task' });
    await f.ctx.app.close();
    f.ctx.app = await buildApp({ config: f.ctx.config, db: f.ctx.db, logger: { level: 'info', stream } });
    f.ctx.app.get('/api/probe/:value', async () => { throw new Error('SECRET_THROWN_MESSAGE'); });
    const create = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/share-links'), { label: 'SECRET_LABEL' });
    expect(create.statusCode).toBe(201);
    const token = create.json().url.split('#')[1];
    await get(f.ctx, f.cookie, recordUrl(f, record.id, '/share-links'));
    await f.ctx.app.inject({ method: 'GET', url: `/api/probe/SECRET_PARAMETER?token=${token}`, headers: { cookie: f.cookie, authorization: `Bearer ${token}` } });
    await f.ctx.app.inject({ method: 'GET', url: `/unknown/${token}?session=SECRET_QUERY`, headers: { authorization: `Bearer ${token}` } });
    await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, record.id, '/share-links'), headers: { cookie: f.cookie, origin: `https://${token}.example` }, payload: { label: token } });
    await f.ctx.app.close();
    expect(captured).toContain('/api/projects/:projectId/records/:id/share-links');
    expect(captured).toContain('/api/probe/:value');
    expect(captured).toContain('<unmatched>');
    expect(captured).toContain('internal_error');
    for (const secret of [token, f.cookie.split('=')[1]!, 'SECRET_PARAMETER', 'SECRET_THROWN_MESSAGE', 'SECRET_QUERY', 'SECRET_LABEL']) expect(captured).not.toContain(secret);
  } finally { await f.ctx.close(); }
});
``````

- [ ] **Step 2: Verify the pre-implementation result.**

Run: `npx vitest run tests/server/share-links-api.test.ts tests/server/share-logging.test.ts`.

Expected: exit 1 because owner share-link routes and safe logger are not implemented.

- [ ] **Step 3: Write these complete implementation/configuration files.**

#### File: `src/server/app.ts`

<!-- replay task=5 phase=implementation sha256=146a5ef61d3863c028ecb6d2bba49fd7a76f1bcc8ea312520ee856f94ac3c752 -->

``````ts
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
import { requireShareKey } from './sharing/crypto';
import { reconcileShareKey } from './sharing/links';
import { registerSharingRoutes } from './sharing/routes';
import { safeLogger } from './http/logging';
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
  const revokedLinks = reconcileShareKey(db, config.shareKey);
  const app = Fastify({ logger: safeLogger(deps.logger), bodyLimit: 1024 * 1024 });
  if (revokedLinks > 0) app.log.info({ event: 'share_key_changed', revokedLinks });
  await app.register(cookie);
  await app.register(multipart);
  registerGuards(app, config, db);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
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
    request.log.error({ event: 'internal_error' });
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
  registerFileRoutes(app, db, config);
  registerSharingRoutes(app, db, config);
  return app;
}
``````

#### File: `src/server/http/logging.ts`

<!-- replay task=5 phase=implementation sha256=324debd558ee58e75756de497d30306773e33ad1a084534537885add2c2d44eb -->

``````ts
import type { FastifyRequest, FastifyServerOptions } from 'fastify';

/** Request/response data is never a log payload. Only registered patterns identify routes. */
export function safeLogger(logger: FastifyServerOptions['logger']): FastifyServerOptions['logger'] {
  if (!logger) return false;
  return {
    ...(typeof logger === 'object' ? logger : {}),
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    serializers: {
      req: (request: FastifyRequest) => ({ method: request.method, route: request.routeOptions?.url ?? '<unmatched>' }),
      res: (response: { statusCode: number }) => ({ statusCode: response.statusCode }),
      err: () => ({ type: 'internal_error', message: 'internal_error', stack: '' }),
    },
  };
}
``````

#### File: `src/server/records/activity.ts`

<!-- replay task=5 phase=implementation sha256=bf9b4647cdf06b63725e563cd886ad4f46b07d8ac87e2b1a1fc8e9dd7efda9d0 -->

``````ts
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/connection';
import { ItemParams } from '../http/params';
import { requireProject } from '../lists/projects';
import { requireRecord } from './store';

export type ActivityAction = 'created' | 'field_changed' | 'status_changed' | 'share_created' | 'share_revoked';

export interface ActivityInput {
  recordId: number;
  userId: number;
  at: string;
  action: ActivityAction;
  field?: string;
  from?: unknown;
  to?: unknown;
  detail?: Record<string, unknown>;
}

export interface ActivityEntry {
  id: number;
  at: string;
  by: string;
  action: ActivityAction;
  field: string | null;
  from: unknown;
  to: unknown;
  detail: Record<string, unknown> | null;
}

const toJson = (value: unknown): string | null => (value === undefined ? null : JSON.stringify(value));
const fromJson = (value: string | null): unknown => (value === null ? null : JSON.parse(value));

/** Appends one entry to the record's activity log (design §5.12). Entries are never changed or deleted. */
export function recordActivity(db: Db, entry: ActivityInput): void {
  db.prepare(
    'INSERT INTO activity (record_id, at, user_id, action, field, old_value, new_value, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    entry.recordId,
    entry.at,
    entry.userId,
    entry.action,
    entry.field ?? null,
    toJson(entry.from),
    toJson(entry.to),
    toJson(entry.detail),
  );
}

/** Newest first. */
export function listActivity(db: Db, recordId: number): ActivityEntry[] {
  const rows = db
    .prepare(
      `SELECT a.id, a.at, u.username, a.action, a.field, a.old_value AS oldValue, a.new_value AS newValue, a.detail
       FROM activity a JOIN users u ON u.id = a.user_id
       WHERE a.record_id = ? ORDER BY a.at DESC, a.id DESC`,
    )
    .all(recordId) as {
    id: number;
    at: string;
    username: string;
    action: ActivityAction;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
    detail: string | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    at: row.at,
    by: row.username,
    action: row.action,
    field: row.field,
    from: fromJson(row.oldValue),
    to: fromJson(row.newValue),
    detail: fromJson(row.detail) as Record<string, unknown> | null,
  }));
}

export function registerActivityRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/activity', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    requireRecord(db, projectId, id);
    return listActivity(db, id);
  });
}
``````

#### File: `src/server/sharing/links.ts`

<!-- replay task=5 phase=implementation sha256=95f345054e402b2915317ea246191420095b3a9aa028ce38ff7865923b251a18 -->

``````ts
import type { Db } from '../db/connection';
import type { ShareCreateInput, ShareLinkOut } from '../../domain';
import type { AppConfig } from '../config';
import { HttpError } from '../errors';
import { recordActivity } from '../records/activity';
import { requireRecord, touchRecord } from '../records/store';
import { decryptShareToken, encryptShareToken, hashShareToken, keyFingerprint, newShareToken, requireShareKey } from './crypto';

/** Administrative revocation has no owner actor and does not fabricate record activity. */
export function revokeAllShareLinks(db: Db, now = new Date()): number {
  return db.prepare('UPDATE share_links SET revoked_at = ? WHERE revoked_at IS NULL').run(now.toISOString()).changes;
}

export function reconcileShareKey(db: Db, key: Buffer, now = new Date()): number {
  const fingerprint = keyFingerprint(key);
  return db.transaction(() => {
    const current = db.prepare('SELECT fingerprint FROM share_key_state WHERE id = 1').pluck().get();
    if (current === fingerprint) return 0;
    const revoked = revokeAllShareLinks(db, now);
    db.prepare('INSERT INTO share_key_state(id, fingerprint) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET fingerprint = excluded.fingerprint').run(fingerprint);
    return revoked;
  })();
}

interface LinkRow {
  id: number;
  record_id: number;
  label: string;
  token_hash: string;
  key_fingerprint: string;
  token_ciphertext: Buffer;
  token_nonce: Buffer;
  token_tag: Buffer;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
}

function linkOutput(row: LinkRow, config: AppConfig): ShareLinkOut {
  requireShareKey(config.shareKey);
  let url: string | null = null;
  if (row.key_fingerprint === keyFingerprint(config.shareKey)) {
    try {
      const token = decryptShareToken({ ciphertext: row.token_ciphertext, nonce: row.token_nonce, tag: row.token_tag }, config.shareKey, row.record_id);
      if (hashShareToken(token) !== row.token_hash) throw new Error('token_hash_mismatch');
      url = `${config.publicOrigin}/share#${token}`;
    } catch {
      throw new HttpError(500, 'share_copy_failed');
    }
  }
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastViewedAt: row.last_viewed_at,
    viewCount: row.view_count,
    url,
  };
}

export function listShareLinks(db: Db, config: AppConfig, projectId: number, recordId: number): ShareLinkOut[] {
  requireRecord(db, projectId, recordId);
  const rows = db.prepare('SELECT * FROM share_links WHERE record_id = ? ORDER BY created_at DESC, id DESC').all(recordId) as LinkRow[];
  return rows.map(row => linkOutput(row, config));
}

export function createShareLink(db: Db, config: AppConfig, projectId: number, recordId: number, userId: number, input: ShareCreateInput, now = new Date()): ShareLinkOut {
  requireShareKey(config.shareKey);
  const key = config.shareKey;
  const at = now.toISOString();
  if (input.expiresAt != null && Date.parse(input.expiresAt) <= now.getTime()) throw new HttpError(400, 'expiry_must_be_future');
  return db.transaction(() => {
    requireRecord(db, projectId, recordId);
    const token = newShareToken();
    const encrypted = encryptShareToken(token, key, recordId);
    const id = Number(db.prepare(`INSERT INTO share_links(record_id, label, token_hash, key_fingerprint, token_ciphertext, token_nonce, token_tag, created_by, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(recordId, input.label, hashShareToken(token), keyFingerprint(key), encrypted.ciphertext, encrypted.nonce, encrypted.tag, userId, at, input.expiresAt ?? null).lastInsertRowid);
    recordActivity(db, { recordId, userId, at, action: 'share_created', detail: { linkId: id, label: input.label } });
    touchRecord(db, recordId, userId, at);
    return linkOutput(db.prepare('SELECT * FROM share_links WHERE id = ?').get(id) as LinkRow, config);
  })();
}

export function revokeShareLink(db: Db, projectId: number, recordId: number, linkId: number, userId: number, now = new Date()): void {
  db.transaction(() => {
    requireRecord(db, projectId, recordId);
    const row = db.prepare('SELECT * FROM share_links WHERE id = ? AND record_id = ?').get(linkId, recordId) as LinkRow | undefined;
    if (!row) throw new HttpError(404, 'share_link_not_found');
    if (row.revoked_at !== null) return;
    const at = now.toISOString();
    db.prepare('UPDATE share_links SET revoked_at = ? WHERE id = ?').run(at, linkId);
    recordActivity(db, { recordId, userId, at, action: 'share_revoked', detail: { linkId, label: row.label } });
    touchRecord(db, recordId, userId, at);
  })();
}
``````

#### File: `src/server/sharing/routes.ts`

<!-- replay task=5 phase=implementation sha256=713e57275a62197f2201bdcf1868bc359ce3b32ae3024d58e8cc4d4064b161ae -->

``````ts
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ShareCreate } from '../../domain';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { createShareLink, listShareLinks, revokeShareLink } from './links';

export function shareHeaders(reply: FastifyReply): void {
  reply.header('Cache-Control', 'no-store');
  reply.header('Referrer-Policy', 'no-referrer');
  reply.header('X-Robots-Tag', 'noindex, nofollow');
}

export function registerSharingRoutes(app: FastifyInstance, db: Db, config: AppConfig): void {
  const url = '/api/projects/:projectId/records/:id/share-links';
  const options = { onRequest: async (_request: unknown, reply: FastifyReply) => shareHeaders(reply) };
  app.get(url, options, async request => {
    const { projectId, id } = ItemParams.parse(request.params);
    return listShareLinks(db, config, projectId, id);
  });
  app.post(url, options, async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    return reply.status(201).send(createShareLink(db, config, projectId, id, requireUserId(request), ShareCreate.parse(request.body)));
  });
  app.post(`${url}/:itemId/revoke`, options, async request => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    z.strictObject({}).parse(request.body);
    revokeShareLink(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
}
``````

- [ ] **Step 4: Verify the completed task.**

Run: `npx vitest run tests/server/share-links-api.test.ts tests/server/share-logging.test.ts`, then `npm run typecheck`. Expected: five tests in two files pass; TypeScript reports no errors.

- [ ] **Step 5: Commit only the task files.**

```powershell
git add 'src/server/app.ts' 'src/server/http/logging.ts' 'src/server/records/activity.ts' 'src/server/sharing/links.ts' 'src/server/sharing/routes.ts' 'tests/server/share-links-api.test.ts' 'tests/server/share-logging.test.ts'
git commit -m "feat: manage private share links with credential-safe logging"
```

## Task 6: Public record projection and view counting

**Scratch checkpoint:** `ca8ccb8`. **Depends on:** Task 5.

**Deliverable:** Explicit public allowlists, referenced labels, uniform token denial and GET-only counters. This task also moves privacy headers before the global guards, covering owner-link 403/415 responses.

- [ ] **Step 1: Write these complete test and fixture files.**

#### File: `tests/server/share-links-api.test.ts`

<!-- replay task=6 phase=test sha256=2b9606ac9508c1e06ff3790b1c77c5b8efee15625eb90ae38830d152b0aaca38 -->

``````ts
import { afterEach, beforeEach, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app';
import { createShareLink } from '../../src/server/sharing/links';
import { get, send } from './helpers';
import { getRecord, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
let id: number;
beforeEach(async () => {
  f = await makeFixture();
  id = (await postRecord(f, { subtype: 'task' })).id;
});
afterEach(async () => { await f.ctx.close(); });

it('creates/copies a Draft link privately, stores no plaintext token and revokes idempotently', async () => {
  const response = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'Architect' });
  expect(response.statusCode).toBe(201);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.headers['referrer-policy']).toBe('no-referrer');
  const created = response.json();
  expect(created.url).toMatch(/\/share#[A-Za-z0-9_-]{43}$/);
  const token = created.url.split('#')[1];
  const changes = () => f.ctx.db.prepare('SELECT total_changes()').pluck().get();
  const before = changes();
  const listed = await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'));
  expect(listed.json()[0]).toEqual(created);
  expect(changes()).toBe(before);
  expect(JSON.stringify(f.ctx.db.prepare('SELECT * FROM share_links').all())).not.toContain(token);
  const activity = (await get(f.ctx, f.cookie, recordUrl(f, id, '/activity'))).json();
  expect(activity[0]).toMatchObject({ action: 'share_created', detail: { linkId: created.id, label: 'Architect' } });
  expect(JSON.stringify(activity)).not.toContain(token);
  for (let n = 0; n < 2; n++) expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, `/share-links/${created.id}/revoke`))).statusCode).toBe(200);
  const revoked = (await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'))).json()[0];
  expect(revoked.revokedAt).toEqual(expect.any(String));
  expect(revoked.url).toBe(created.url);
  expect(f.ctx.db.prepare("SELECT count(*) FROM activity WHERE action='share_revoked'").pluck().get()).toBe(1);
});

it('validates future expiry, strict payloads, ownership and guards', async () => {
  const url = recordUrl(f, id, '/share-links');
  for (const body of [{ label: ' ' }, { label: 'x', extra: true }, { label: 'x', expiresAt: '2000-01-01T00:00:00Z' }]) {
    expect((await send(f.ctx, f.cookie, 'POST', url, body)).statusCode).toBe(400);
  }
  const userId = f.ctx.db.prepare('SELECT id FROM users').pluck().get() as number;
  expect(() => createShareLink(f.ctx.db, f.ctx.config, f.projectId, id, userId, { label: 'x', expiresAt: '2026-10-03T00:00:00.000Z' }, new Date('2026-10-03'))).toThrow('expiry_must_be_future');
  const created = (await send(f.ctx, f.cookie, 'POST', url, { label: 'x' })).json();
  const other = await postRecord(f, { subtype: 'task' });
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, other.id, `/share-links/${created.id}/revoke`))).statusCode).toBe(404);
  expect((await f.ctx.app.inject({ method: 'GET', url })).statusCode).toBe(401);
  expect((await f.ctx.app.inject({ method: 'POST', url, headers: { cookie: f.cookie }, payload: { label: 'x' } })).statusCode).toBe(403);
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, `/share-links/${created.id}/revoke`), { reason: 'x' })).statusCode).toBe(400);
});

it('applies private response headers even when Origin or content type is rejected', async () => {
  const url = recordUrl(f, id, '/share-links');
  const denied = [
    await f.ctx.app.inject({ method: 'POST', url, headers: { cookie: f.cookie }, payload: { label: 'x' } }),
    await f.ctx.app.inject({ method: 'POST', url, headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'text/plain' }, payload: 'x' }),
  ];
  expect(denied.map(response => response.statusCode)).toEqual([403, 415]);
  for (const response of denied) {
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-robots-tag']).toBe('noindex, nofollow');
  }
});

it('rolls creation and revocation back if activity writing fails', async () => {
  const before = await getRecord(f, id);
  f.ctx.db.exec("CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT,'forced'); END");
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'x' })).statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT count(*) FROM share_links').pluck().get()).toBe(0);
  expect(await getRecord(f, id)).toEqual(before);
  f.ctx.db.exec('DROP TRIGGER fail_activity');
  const created = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'x' })).json();
  f.ctx.db.exec("CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT,'forced'); END");
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, `/share-links/${created.id}/revoke`))).statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT revoked_at FROM share_links').pluck().get()).toBeNull();
});

it('returns null URL for an old key and a controlled error for matching-key corruption', async () => {
  await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'x' });
  f.ctx.db.exec("UPDATE share_links SET token_tag=zeroblob(16)");
  const broken = await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'));
  expect(broken.statusCode).toBe(500);
  expect(broken.json()).toEqual({ error: 'share_copy_failed' });
  await f.ctx.app.close();
  f.ctx.app = await buildApp({ db: f.ctx.db, config: { ...f.ctx.config, shareKey: Buffer.alloc(32, 9) } });
  const old = (await get(f.ctx, f.cookie, recordUrl(f, id, '/share-links'))).json()[0];
  expect(old.url).toBeNull();
  expect(old.revokedAt).toEqual(expect.any(String));
});
``````

#### File: `tests/server/shared-record-api.test.ts`

<!-- replay task=6 phase=test sha256=b8ca5440ca6b0dc4908a1bc721c08a09f449ad8f5bad06758d8891e454a4ecc9 -->

``````ts
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createPerson } from '../../src/server/lists/people';
import { createProject } from '../../src/server/lists/projects';
import { authorizeShare } from '../../src/server/sharing/links';
import { addAttachment, addPhoto } from './file-fixture';
import { get, send } from './helpers';
import { forceStatus, getRecord, makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => { f = await makeFixture(); });
afterEach(async () => { await f.ctx.close(); });

async function share(id: number) {
  const response = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'PRIVATE_SENTINEL recipient' });
  expect(response.statusCode).toBe(201);
  return { ...response.json(), token: response.json().url.split('#')[1] as string };
}
function read(token: string, method: 'GET' | 'HEAD' = 'GET') {
  return f.ctx.app.inject({ method, url: '/api/shared/record', headers: { authorization: `Bearer ${token}` } });
}
const keys = (value: object) => Object.keys(value).sort();

it('projects all visible sections and only their referenced labels, omitting private content and login identities', async () => {
  f.ctx.db.exec("UPDATE users SET username='PRIVATE_SENTINEL_LOGIN'");
  const foreignProject = createProject(f.ctx.db, { code: 'other', name: 'PRIVATE_SENTINEL project' }).id;
  createPerson(f.ctx.db, foreignProject, { code: 'HIDDEN', name: 'PRIVATE_SENTINEL foreign person', role: 'other' });
  createPerson(f.ctx.db, f.projectId, { code: 'UNUSED', name: 'PRIVATE_SENTINEL unrelated person', role: 'other' });
  const downstream = await postRecord(f, { subtype: 'task', title: 'Public successor' });
  const hidden = await postRecord(f, { subtype: 'task', title: 'PRIVATE_SENTINEL draft' });
  const record = await postRecord(f, {
    subtype: 'detail_clarification', title: 'Stone', question: 'Thickness?', notes: 'PRIVATE_SENTINEL notes', outsideScope: true, estimatedCost: 123.45,
    ballInCourtId: f.people.architect, tradeIds: [f.trades.tiling], tagIds: [f.tags.stone], locationIds: [f.locations.v1Kitchen],
    mustBeDoneBeforeIds: [downstream.id, hidden.id], instructionText: 'Old instruction',
  });
  await postRecord(f, { subtype: 'task', title: 'PRIVATE_SENTINEL predecessor', mustBeDoneBeforeIds: [record.id] });
  forceStatus(f, downstream.id, 'open');
  const option = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/options'), { label: 'Honed', description: '20 mm' });
  expect(option.statusCode).toBe(201);
  expect((await patchRecord(f, record.id, { instructionText: 'New instruction', chosenOptionId: option.json().id })).statusCode).toBe(200);
  const measurement = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/measurement-sets'), {
    date: '2026-10-03', phase: 'before', measuredById: f.people.architect, note: 'Public set note',
    rows: [{ item: 'Stone', quantity: 'Thickness', value: 20, unit: 'mm', note: 'Public row note' }],
  });
  expect(measurement.statusCode).toBe(201);
  f.ctx.db.prepare(`INSERT INTO verifications(record_id, checked_by_id, date, method, outcome, note, created_at, created_by)
    VALUES (?,?,'2026-10-03','visual','passed','Public check','2026-10-03',(SELECT id FROM users LIMIT 1))`).run(record.id, f.people.architect);
  const publicLog = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/log'), { text: 'Public Log' });
  const privateLog = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/log'), { text: 'PRIVATE_SENTINEL log', private: true });
  expect(publicLog.statusCode).toBe(201);
  expect(privateLog.statusCode).toBe(201);
  await addAttachment(f, record.id, { logEntryId: privateLog.json().id, title: 'PRIVATE_SENTINEL title' }, 'PRIVATE_SENTINEL.pdf');
  const publicFile = await addAttachment(f, record.id, { logEntryId: publicLog.json().id });
  await addAttachment(f, record.id);
  await addPhoto(f, record.id);
  const userId = f.ctx.db.prepare('SELECT id FROM users').pluck().get();
  f.ctx.db.prepare(`INSERT INTO activity(record_id,at,user_id,action,field,old_value,new_value,detail)
    VALUES (?,'2026-10-04',?,'field_changed','notes',NULL,?,?)`).run(record.id, userId, JSON.stringify('PRIVATE_SENTINEL future field'), JSON.stringify({ secret: 'PRIVATE_SENTINEL detail' }));
  f.ctx.db.prepare(`UPDATE activity SET detail=? WHERE record_id=? AND field='chosenOptionId'`).run(JSON.stringify({ fromOption: null, toOption: { label: 'Historical option', description: 'Preserved', extra: 'PRIVATE_SENTINEL nested' }, unknown: 'PRIVATE_SENTINEL detail' }), record.id);
  f.ctx.db.prepare('UPDATE people SET active=0, email=?, phone=? WHERE id=?').run('PRIVATE_SENTINEL email', 'PRIVATE_SENTINEL phone', f.people.architect);
  forceStatus(f, record.id, 'open');
  const link = await share(record.id);
  const before = await getRecord(f, record.id);
  const response = await read(link.token);
  expect(response.statusCode).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  const body = response.json();
  expect(keys(body)).toEqual(['activity','attachments','labels','log','measurements','options','photos','record','verifications']);
  for (const field of ['notes','outsideScope','estimatedCost','id','projectId','createdBy','updatedBy','allowedTransitions']) expect(body.record).not.toHaveProperty(field);
  expect(JSON.stringify(body)).not.toContain('PRIVATE_SENTINEL');
  expect(body.record.mustBeDoneBefore).toEqual([{ humanId: downstream.humanId, title: downstream.title }]);
  expect(body.record.requiresFirst).toEqual([]);
  expect(keys(body.options[0])).toEqual(['description','id','label']);
  expect(keys(body.measurements[0])).toEqual(['date','id','measuredById','note','phase','rows']);
  expect(keys(body.measurements[0].rows[0])).toEqual(['item','note','quantity','unit','value']);
  expect(keys(body.verifications[0])).toEqual(['checkedById','createdAt','date','id','method','note','outcome']);
  expect(keys(body.photos[0])).toEqual(['caption','id','originalFilename','phase','takenAt','uploadedAt']);
  expect(keys(body.attachments[0])).toEqual(['contentType','id','logEntry','originalFilename','size','title','uploadedAt']);
  expect(body.log).toEqual([{ id: publicLog.json().id, eventAt: publicLog.json().eventAt, text: 'Public Log', attachmentIds: [publicFile.id] }]);
  expect(body.activity.find((a: { field: string }) => a.field === 'instructionText')).toMatchObject({ from: 'Old instruction', to: 'New instruction', detail: null });
  expect(body.activity.find((a: { field: string }) => a.field === 'chosenOptionId').detail).toEqual({ fromOption: null, toOption: { label: 'Historical option', description: 'Preserved' } });
  for (const entry of body.activity) expect(keys(entry)).toEqual(['action','at','detail','field','from','id','to']);
  expect(body.labels.people).toEqual([{ id: f.people.architect, code: 'ARCH', name: 'Person ARCH', role: 'other' }]);
  expect(body.labels.locations[0].path.map((node: { id: number }) => node.id)).toEqual([f.locations.villa1, f.locations.v1Ground, f.locations.v1Kitchen]);
  expect(body.labels.zoneTypes).toEqual([{ id: f.zones.kitchen, nameEn: 'Kitchen', nameEl: '' }]);
  expect((await get(f.ctx, f.cookie, recordUrl(f, record.id, '/share-links'))).json()[0].viewCount).toBe(1);
  expect(await getRecord(f, record.id)).toEqual(before);
});

it('denies malformed, unknown, expired, revoked and Draft links uniformly without granting owner access', async () => {
  const record = await postRecord(f, { subtype: 'task', title: 'Task' });
  const link = await share(record.id);
  for (const token of [link.token, '', 'a'.repeat(43), 'A'.repeat(43)]) {
    const response = await read(token);
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'not_available' });
  }
  forceStatus(f, record.id, 'open');
  f.ctx.db.prepare('UPDATE share_links SET expires_at=?').run('2026-10-03T00:00:00.000Z');
  expect(() => authorizeShare(f.ctx.db, `Bearer ${link.token}`, new Date('2026-10-03'))).toThrow('not_available');
  f.ctx.db.exec('UPDATE share_links SET expires_at=NULL');
  expect((await read(link.token)).statusCode).toBe(200);
  expect((await f.ctx.app.inject({ method: 'GET', url: recordUrl(f, record.id), headers: { authorization: `Bearer ${link.token}` } })).statusCode).toBe(401);
  expect((await f.ctx.app.inject({ method: 'GET', url: '/api/shared/not-a-route', headers: { authorization: `Bearer ${link.token}` } })).statusCode).toBe(401);
  await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, `/share-links/${link.id}/revoke`));
  const denied = await f.ctx.app.inject({ method: 'GET', url: '/api/shared/record', headers: { cookie: f.cookie, authorization: `Bearer ${link.token}` } });
  expect(denied.json()).toEqual({ error: 'not_available' });
});

it('HEAD skips projection and counters, and projection failures never increment views', async () => {
  const record = await postRecord(f, { subtype: 'task', title: 'Task' });
  forceStatus(f, record.id, 'open');
  const link = await share(record.id);
  // listActivity cannot decode this row. HEAD must never call the projection.
  f.ctx.db.prepare("UPDATE activity SET detail='bad-json' WHERE record_id=?").run(record.id);
  const changes = f.ctx.db.prepare('SELECT total_changes()').pluck().get();
  const head = await read(link.token, 'HEAD');
  expect(head.statusCode).toBe(200);
  expect(head.body).toBe('');
  expect(f.ctx.db.prepare('SELECT total_changes()').pluck().get()).toBe(changes);
  expect((await read(link.token)).statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT view_count,last_viewed_at FROM share_links WHERE id=?').get(link.id)).toEqual({ view_count: 0, last_viewed_at: null });
});

it('allowlists status history details and resolves visible historical people without publishing unknown objects', async () => {
  const record = await postRecord(f, { subtype: 'task', title: 'History' });
  forceStatus(f, record.id, 'open');
  const userId = f.ctx.db.prepare('SELECT id FROM users').pluck().get();
  const insert = f.ctx.db.prepare('INSERT INTO activity(record_id,at,user_id,action,field,old_value,new_value,detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insert.run(record.id, '2026-01-02', userId, 'status_changed', 'status', '"ready_for_verification"', '"closed"', JSON.stringify({
    reasonCode: null, note: 'Public note', hidden: 'PRIVATE_SENTINEL',
    verification: { id: 1, outcome: 'passed', method: 'visual', checkedById: f.people.retired, date: '2026-01-02', hidden: 'PRIVATE_SENTINEL' },
  }));
  insert.run(record.id, '2026-01-03', userId, 'field_changed', 'responsibleId', JSON.stringify({ secret: 'PRIVATE_SENTINEL' }), 'null', null);
  insert.run(record.id, '2026-01-04', userId, 'future_action', 'instructionText', 'null', '"PRIVATE_SENTINEL"', null);
  const link = await share(record.id);
  const response = await read(link.token);
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(JSON.stringify(body)).not.toContain('PRIVATE_SENTINEL');
  expect(body.activity.find((entry: { action: string }) => entry.action === 'status_changed')).toMatchObject({ action: 'status_changed', field: 'status', detail: {
    reasonCode: null, note: 'Public note', verification: { id: 1, outcome: 'passed', method: 'visual', checkedById: f.people.retired, date: '2026-01-02' },
  } });
  expect(body.labels.people).toEqual([{ id: f.people.retired, code: 'OLD', name: 'Person OLD', role: 'other' }]);
});
``````

- [ ] **Step 2: Verify the pre-implementation result.**

Run: `npx vitest run tests/server/shared-record-api.test.ts tests/server/share-links-api.test.ts`.

Expected: public record tests fail because the routes are absent; the owner error-response test fails because privacy headers are missing.

- [ ] **Step 3: Write these complete implementation/configuration files.**

#### File: `src/domain/sharing.ts`

<!-- replay task=6 phase=implementation sha256=19add1bc2b509329ed228c6b5030973de4bbfd15c082c98d4d16e1df6518df24 -->

``````ts
import { z } from 'zod';
import { FileTimestamp } from './files';
import type { PhotoPhase, Subtype, Status, Severity, Priority, ProblemType, Stage, Disposition, Route, MeasurementPhase, Unit, VerificationMethod, VerificationOutcome } from './vocab';

export const ShareCreate = z.strictObject({ label: z.string().max(200).refine(value => value.trim() !== '', 'Required'), expiresAt: FileTimestamp.nullable().optional() });
export type ShareCreateInput = z.output<typeof ShareCreate>;
export interface ShareLinkOut {
  id: number; label: string; createdAt: string; expiresAt: string | null; revokedAt: string | null; lastViewedAt: string | null; viewCount: number; url: string | null;
}

export interface SharedRecordFields {
  humanId: string;
  subtype: Subtype;
  status: Status;
  statusReason: { code: string | null; note: string | null } | null;
  title: string | null;
  description: string | null;
  reference: string | null;
  ballInCourtId: number | null;
  responsibleId: number | null;
  tradeIds: number[];
  severity: Severity | null;
  priority: Priority | null;
  dueDate: string | null;
  completion: number | null;
  safety: boolean;
  tagIds: number[];
  locationIds: number[];
  problemTypes: ProblemType[];
  stage: Stage | null;
  disposition: Disposition | null;
  correction: string | null;
  question: string | null;
  route: Route | null;
  issuedById: number | null;
  chosenOptionId: number | null;
  decidedById: number | null;
  decidedOn: string | null;
  instructionText: string | null;
  createdAt: string;
  updatedAt: string;
  mustBeDoneBefore: { humanId: string; title: string | null }[];
  requiresFirst: { humanId: string; title: string | null }[];
}

export interface SharedActivity {
  id: number;
  at: string;
  action: 'created' | 'status_changed' | 'field_changed';
  field: string | null;
  from: string | number | null;
  to: string | number | null;
  detail: {
    reasonCode?: string | null;
    reasonNote?: string | null;
    note?: string | null;
    verification?: { id: number; outcome: VerificationOutcome; method: VerificationMethod; checkedById: number; date: string };
    fromOption?: { label: string; description: string | null } | null;
    toOption?: { label: string; description: string | null } | null;
  } | null;
}

export interface SharedRecord {
  record: SharedRecordFields;
  options: { id: number; label: string; description: string | null }[];
  measurements: {
    id: number; date: string; measuredById: number | null; phase: MeasurementPhase; note: string | null;
    rows: { item: string; quantity: string; value: number; unit: Unit; note: string | null }[];
  }[];
  verifications: { id: number; checkedById: number; date: string; method: VerificationMethod; outcome: VerificationOutcome; note: string | null; createdAt: string }[];
  photos: { id: number; originalFilename: string; phase: PhotoPhase; caption: string | null; takenAt: string | null; uploadedAt: string }[];
  attachments: {
    id: number; originalFilename: string; title: string | null; size: number; contentType: string; uploadedAt: string;
    logEntry: { id: number; eventAt: string; text: string } | null;
  }[];
  log: { id: number; eventAt: string; text: string; attachmentIds: number[] }[];
  activity: SharedActivity[];
  labels: {
    people: { id: number; code: string; name: string; role: string }[];
    trades: { id: number; nameEn: string; nameEl: string }[];
    tags: { id: number; nameEn: string; nameEl: string }[];
    locations: { id: number; path: { id: number; nameEn: string; nameEl: string; kind: string; zoneTypeId: number | null }[] }[];
    zoneTypes: { id: number; nameEn: string; nameEl: string }[];
  };
}
``````

#### File: `src/server/http/guards.ts`

<!-- replay task=6 phase=implementation sha256=b4118b69f559abbb956f000cf013c6e4f00a28a87cffb8e46db43735f9766cae -->

``````ts
import type { FastifyInstance } from 'fastify';
import { findSessionUser, type SessionUser } from '../auth/sessions';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { shareHeaders } from './privacy';

export const SESSION_COOKIE = 'bb_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_API_ROUTES = new Set(['/api/health', '/api/auth/login']);

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
  interface FastifyContextConfig {
    /** Set on upload routes (Plan 4) to accept multipart/form-data instead of JSON. */
    multipart?: boolean;
    shareRead?: boolean;
    privateResponse?: boolean;
  }
}

/**
 * Request rules (design §11.5):
 * - every state-changing request needs Origin = the public origin and a JSON body
 *   (multipart only on routes that allow it);
 * - every /api route except health and login needs a valid session;
 * - session lookup is read-only, so GET requests never write.
 */
export function registerGuards(app: FastifyInstance, config: AppConfig, db: Db): void {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.config.privateResponse) shareHeaders(reply);
    if (SAFE_METHODS.has(request.method)) return;
    if (request.headers.origin !== config.publicOrigin) throw new HttpError(403, 'origin_rejected');
    const contentType = (request.headers['content-type']?.split(';', 1)[0] ?? '').trim().toLowerCase();
    const isJson = contentType === 'application/json';
    const isAllowedMultipart =
      contentType === 'multipart/form-data' && request.routeOptions.config?.multipart === true;
    if (!isJson && !isAllowedMultipart) throw new HttpError(415, 'unsupported_content_type');
  });

  app.addHook('preHandler', async (request) => {
    if (request.routeOptions.config.shareRead === true && (request.method === 'GET' || request.method === 'HEAD')) return;
    const token = request.cookies[SESSION_COOKIE];
    request.user = token ? findSessionUser(db, token) : null;
    const route = request.routeOptions.url ?? request.url;
    if (!route.startsWith('/api/') || PUBLIC_API_ROUTES.has(route)) return;
    if (request.user === null) throw new HttpError(401, 'unauthenticated');
  });
}
``````

#### File: `src/server/http/privacy.ts`

<!-- replay task=6 phase=implementation sha256=0ac939dd5c8c7f353ee9dfbec5f804ed8ed3026df86153a8857bdff6ce2bd23d -->

``````ts
import type { FastifyReply } from 'fastify';

export function shareHeaders(reply: FastifyReply): void {
  reply.header('Cache-Control', 'no-store');
  reply.header('Referrer-Policy', 'no-referrer');
  reply.header('X-Robots-Tag', 'noindex, nofollow');
}
``````

#### File: `src/server/sharing/links.ts`

<!-- replay task=6 phase=implementation sha256=cb8892a665150dfe783d759c3ff7d51bbd479468e00597c795c17cb95ed63240 -->

``````ts
import type { Db } from '../db/connection';
import type { ShareCreateInput, ShareLinkOut } from '../../domain';
import type { AppConfig } from '../config';
import { HttpError } from '../errors';
import { recordActivity } from '../records/activity';
import { requireRecord, touchRecord } from '../records/store';
import { decryptShareToken, encryptShareToken, hashShareToken, keyFingerprint, newShareToken, requireShareKey, validShareToken } from './crypto';

/** Administrative revocation has no owner actor and does not fabricate record activity. */
export function revokeAllShareLinks(db: Db, now = new Date()): number {
  return db.prepare('UPDATE share_links SET revoked_at = ? WHERE revoked_at IS NULL').run(now.toISOString()).changes;
}

export function reconcileShareKey(db: Db, key: Buffer, now = new Date()): number {
  const fingerprint = keyFingerprint(key);
  return db.transaction(() => {
    const current = db.prepare('SELECT fingerprint FROM share_key_state WHERE id = 1').pluck().get();
    if (current === fingerprint) return 0;
    const revoked = revokeAllShareLinks(db, now);
    db.prepare('INSERT INTO share_key_state(id, fingerprint) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET fingerprint = excluded.fingerprint').run(fingerprint);
    return revoked;
  })();
}

interface LinkRow {
  id: number;
  record_id: number;
  label: string;
  token_hash: string;
  key_fingerprint: string;
  token_ciphertext: Buffer;
  token_nonce: Buffer;
  token_tag: Buffer;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
}

function linkOutput(row: LinkRow, config: AppConfig): ShareLinkOut {
  requireShareKey(config.shareKey);
  let url: string | null = null;
  if (row.key_fingerprint === keyFingerprint(config.shareKey)) {
    try {
      const token = decryptShareToken({ ciphertext: row.token_ciphertext, nonce: row.token_nonce, tag: row.token_tag }, config.shareKey, row.record_id);
      if (hashShareToken(token) !== row.token_hash) throw new Error('token_hash_mismatch');
      url = `${config.publicOrigin}/share#${token}`;
    } catch {
      throw new HttpError(500, 'share_copy_failed');
    }
  }
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastViewedAt: row.last_viewed_at,
    viewCount: row.view_count,
    url,
  };
}

export function listShareLinks(db: Db, config: AppConfig, projectId: number, recordId: number): ShareLinkOut[] {
  requireRecord(db, projectId, recordId);
  const rows = db.prepare('SELECT * FROM share_links WHERE record_id = ? ORDER BY created_at DESC, id DESC').all(recordId) as LinkRow[];
  return rows.map(row => linkOutput(row, config));
}

export function createShareLink(db: Db, config: AppConfig, projectId: number, recordId: number, userId: number, input: ShareCreateInput, now = new Date()): ShareLinkOut {
  requireShareKey(config.shareKey);
  const key = config.shareKey;
  const at = now.toISOString();
  if (input.expiresAt != null && Date.parse(input.expiresAt) <= now.getTime()) throw new HttpError(400, 'expiry_must_be_future');
  return db.transaction(() => {
    requireRecord(db, projectId, recordId);
    const token = newShareToken();
    const encrypted = encryptShareToken(token, key, recordId);
    const id = Number(db.prepare(`INSERT INTO share_links(record_id, label, token_hash, key_fingerprint, token_ciphertext, token_nonce, token_tag, created_by, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(recordId, input.label, hashShareToken(token), keyFingerprint(key), encrypted.ciphertext, encrypted.nonce, encrypted.tag, userId, at, input.expiresAt ?? null).lastInsertRowid);
    recordActivity(db, { recordId, userId, at, action: 'share_created', detail: { linkId: id, label: input.label } });
    touchRecord(db, recordId, userId, at);
    return linkOutput(db.prepare('SELECT * FROM share_links WHERE id = ?').get(id) as LinkRow, config);
  })();
}

export function revokeShareLink(db: Db, projectId: number, recordId: number, linkId: number, userId: number, now = new Date()): void {
  db.transaction(() => {
    requireRecord(db, projectId, recordId);
    const row = db.prepare('SELECT * FROM share_links WHERE id = ? AND record_id = ?').get(linkId, recordId) as LinkRow | undefined;
    if (!row) throw new HttpError(404, 'share_link_not_found');
    if (row.revoked_at !== null) return;
    const at = now.toISOString();
    db.prepare('UPDATE share_links SET revoked_at = ? WHERE id = ?').run(at, linkId);
    recordActivity(db, { recordId, userId, at, action: 'share_revoked', detail: { linkId, label: row.label } });
    touchRecord(db, recordId, userId, at);
  })();
}

export interface ShareAccess {
  linkId: number;
  projectId: number;
  recordId: number;
}

export function authorizeShare(db: Db, authorization: string | undefined, now = new Date()): ShareAccess {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!validShareToken(token)) throw new HttpError(404, 'not_available');
  const row = db.prepare(`SELECT s.id AS linkId, r.project_id AS projectId, r.id AS recordId,
    s.revoked_at AS revokedAt, s.expires_at AS expiresAt, r.status
    FROM share_links s JOIN records r ON r.id = s.record_id WHERE s.token_hash = ?`).get(hashShareToken(token)) as
    (ShareAccess & { revokedAt: string | null; expiresAt: string | null; status: string }) | undefined;
  if (!row || row.revokedAt !== null || (row.expiresAt !== null && Date.parse(row.expiresAt) <= now.getTime()) || row.status === 'draft') {
    throw new HttpError(404, 'not_available');
  }
  return { linkId: row.linkId, projectId: row.projectId, recordId: row.recordId };
}
``````

#### File: `src/server/sharing/projection.ts`

<!-- replay task=6 phase=implementation sha256=1f4001332a306127ee3658d385b3eb4dd8f8de08065b119a40c17ee73a764bcd -->

``````ts
import { z } from 'zod';
import { isCode, type SharedActivity, type SharedRecord, type VerificationMethod, type VerificationOutcome } from '../../domain';
import type { Db } from '../db/connection';
import { listAttachments, listPhotos } from '../files/occurrences';
import { listLocations } from '../lists/locations';
import { listPeople } from '../lists/people';
import { listTags } from '../lists/tags';
import { listTrades } from '../lists/trades';
import { listZoneTypes } from '../lists/zone-types';
import { listActivity, type ActivityEntry } from '../records/activity';
import { listLog } from '../records/log';
import { listMeasurementSets } from '../records/measurements';
import { listOptions } from '../records/options';
import { getRecordDetail } from '../records/records';
import { listVerifications } from '../records/transitions';
import type { ShareAccess } from './links';

const scalarFields = new Map<string, 'number' | 'string'>([
  ['ballInCourtId', 'number'], ['responsibleId', 'number'], ['severity', 'string'], ['priority', 'string'],
  ['dueDate', 'string'], ['disposition', 'string'], ['chosenOptionId', 'number'], ['decidedById', 'number'],
  ['decidedOn', 'string'], ['instructionText', 'string'],
]);
const snapshot = z.object({ label: z.string(), description: z.string().nullable() }).nullable();
const optionDetail = z.object({ fromOption: snapshot.optional(), toOption: snapshot.optional() });
const statusDetail = z.object({
  reasonCode: z.string().nullable().optional(),
  reasonNote: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  verification: z.object({
    id: z.number().int().positive(),
    outcome: z.custom<VerificationOutcome>(value => isCode('verificationOutcome', value)),
    method: z.custom<VerificationMethod>(value => isCode('verificationMethod', value)),
    checkedById: z.number().int().positive(),
    date: z.iso.date(),
  }).optional(),
});

function publicActivity(entry: ActivityEntry): SharedActivity | null {
  let detail: SharedActivity['detail'] = null;
  if (entry.action === 'created') {
    if (entry.from !== null || entry.to !== 'draft') return null;
  } else if (entry.action === 'status_changed') {
    if (!isCode('status', entry.from) || !isCode('status', entry.to)) return null;
    const parsed = statusDetail.safeParse(entry.detail);
    if (parsed.success) detail = parsed.data;
  } else if (entry.action === 'field_changed') {
    const expected = entry.field === null ? undefined : scalarFields.get(entry.field);
    if (!expected || [entry.from, entry.to].some(value => value !== null && typeof value !== expected)) return null;
    if (entry.field === 'chosenOptionId') {
      const parsed = optionDetail.safeParse(entry.detail);
      if (parsed.success) detail = parsed.data;
    }
  } else return null;
  return {
    id: entry.id,
    at: entry.at,
    action: entry.action,
    field: entry.action === 'created' ? null : entry.action === 'status_changed' ? 'status' : entry.field,
    from: entry.from as string | number | null,
    to: entry.to as string | number | null,
    detail,
  };
}

/** Every public property is copied deliberately; future owner fields are private by default. */
export function buildSharedRecord(db: Db, access: ShareAccess): SharedRecord {
  const { projectId, recordId } = access;
  const r = getRecordDetail(db, projectId, recordId);
  const record: SharedRecord['record'] = {
    humanId: r.humanId,
    subtype: r.subtype,
    status: r.status,
    statusReason: r.statusReason === null ? null : { code: r.statusReason.code, note: r.statusReason.note },
    title: r.title,
    description: r.description,
    reference: r.reference,
    ballInCourtId: r.ballInCourtId,
    responsibleId: r.responsibleId,
    tradeIds: r.tradeIds,
    severity: r.severity,
    priority: r.priority,
    dueDate: r.dueDate,
    completion: r.completion,
    safety: r.safety,
    tagIds: r.tagIds,
    locationIds: r.locationIds,
    problemTypes: r.problemTypes,
    stage: r.stage,
    disposition: r.disposition,
    correction: r.correction,
    question: r.question,
    route: r.route,
    issuedById: r.issuedById,
    chosenOptionId: r.chosenOptionId,
    decidedById: r.decidedById,
    decidedOn: r.decidedOn,
    instructionText: r.instructionText,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    mustBeDoneBefore: r.mustBeDoneBefore.filter(item => item.status !== 'draft').map(item => ({ humanId: item.humanId, title: item.title })),
    requiresFirst: r.requiresFirst.filter(item => item.status !== 'draft').map(item => ({ humanId: item.humanId, title: item.title })),
  };
  const options = listOptions(db, recordId).map(item => ({ id: item.id, label: item.label, description: item.description }));
  const measurements = listMeasurementSets(db, recordId).map(item => ({
    id: item.id, date: item.date, measuredById: item.measuredById, phase: item.phase, note: item.note,
    rows: item.rows.map(row => ({ item: row.item, quantity: row.quantity, value: row.value, unit: row.unit, note: row.note })),
  }));
  const verifications = listVerifications(db, recordId).map(item => ({
    id: item.id, checkedById: item.checkedById, date: item.date, method: item.method, outcome: item.outcome, note: item.note, createdAt: item.createdAt,
  }));
  const photos = listPhotos(db, recordId).map(item => ({
    id: item.id, originalFilename: item.originalFilename, phase: item.phase, caption: item.caption, takenAt: item.takenAt, uploadedAt: item.uploadedAt,
  }));
  const attachments = listAttachments(db, recordId).filter(item => !item.logEntry?.private).map(item => ({
    id: item.id, originalFilename: item.originalFilename, title: item.title, size: item.size, contentType: item.contentType, uploadedAt: item.uploadedAt,
    logEntry: item.logEntry === null ? null : { id: item.logEntry.id, eventAt: item.logEntry.eventAt, text: item.logEntry.text },
  }));
  const log = listLog(db, recordId).filter(item => !item.private).map(item => ({
    id: item.id, eventAt: item.eventAt, text: item.text,
    attachmentIds: attachments.filter(file => file.logEntry?.id === item.id).map(file => file.id),
  }));
  const activity = listActivity(db, recordId).map(publicActivity).filter((item): item is SharedActivity => item !== null);
  const personIds = new Set<number>();
  const addPerson = (id: number | null | undefined) => { if (id != null) personIds.add(id); };
  for (const id of [r.ballInCourtId, r.responsibleId, r.issuedById, r.decidedById]) addPerson(id);
  measurements.forEach(item => addPerson(item.measuredById));
  verifications.forEach(item => addPerson(item.checkedById));
  for (const entry of activity) {
    if (['ballInCourtId', 'responsibleId', 'decidedById'].includes(entry.field ?? '')) {
      if (typeof entry.from === 'number') addPerson(entry.from);
      if (typeof entry.to === 'number') addPerson(entry.to);
    }
    addPerson(entry.detail?.verification?.checkedById);
  }
  const nodes = new Map(listLocations(db, projectId).map(node => [node.id, node]));
  const zoneIds = new Set<number>();
  const locations = r.locationIds.map(id => {
    const path: SharedRecord['labels']['locations'][number]['path'] = [];
    let node = nodes.get(id);
    const seen = new Set<number>();
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      if (node.zoneTypeId !== null) zoneIds.add(node.zoneTypeId);
      path.unshift({ id: node.id, nameEn: node.nameEn, nameEl: node.nameEl, kind: node.kind, zoneTypeId: node.zoneTypeId });
      node = node.parentId === null ? undefined : nodes.get(node.parentId);
    }
    return { id, path };
  });
  const labels: SharedRecord['labels'] = {
    people: listPeople(db, projectId).filter(item => personIds.has(item.id)).map(item => ({ id: item.id, code: item.code, name: item.name, role: item.role })),
    trades: listTrades(db, projectId).filter(item => r.tradeIds.includes(item.id)).map(item => ({ id: item.id, nameEn: item.nameEn, nameEl: item.nameEl })),
    tags: listTags(db, projectId).filter(item => r.tagIds.includes(item.id)).map(item => ({ id: item.id, nameEn: item.nameEn, nameEl: item.nameEl })),
    locations,
    zoneTypes: listZoneTypes(db, projectId).filter(item => zoneIds.has(item.id)).map(item => ({ id: item.id, nameEn: item.nameEn, nameEl: item.nameEl })),
  };
  return { record, options, measurements, verifications, photos, attachments, log, activity, labels };
}
``````

#### File: `src/server/sharing/routes.ts`

<!-- replay task=6 phase=implementation sha256=64f8c90af1e7541b421a055bad142d5e8e4f88400db3535ee357ba92e3aee06a -->

``````ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ShareCreate } from '../../domain';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { authorizeShare, createShareLink, listShareLinks, revokeShareLink } from './links';
import { buildSharedRecord } from './projection';

export function registerSharingRoutes(app: FastifyInstance, db: Db, config: AppConfig): void {
  const url = '/api/projects/:projectId/records/:id/share-links';
  const options = { config: { privateResponse: true } };
  app.get(url, options, async request => {
    const { projectId, id } = ItemParams.parse(request.params);
    return listShareLinks(db, config, projectId, id);
  });
  app.post(url, options, async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    return reply.status(201).send(createShareLink(db, config, projectId, id, requireUserId(request), ShareCreate.parse(request.body)));
  });
  app.post(`${url}/:itemId/revoke`, options, async request => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    z.strictObject({}).parse(request.body);
    revokeShareLink(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
  app.get('/api/shared/record', { config: { shareRead: true, privateResponse: true } }, async (request, reply) => {
    return db.transaction(() => {
      const now = new Date();
      const access = authorizeShare(db, request.headers.authorization, now);
      if (request.method === 'HEAD') return reply.status(200).send();
      const payload = buildSharedRecord(db, access);
      db.prepare('UPDATE share_links SET view_count = view_count + 1, last_viewed_at = ? WHERE id = ?').run(now.toISOString(), access.linkId);
      return payload;
    })();
  });
}
``````

- [ ] **Step 4: Verify the completed task.**

Run: `npx vitest run tests/server/shared-record-api.test.ts tests/server/share-links-api.test.ts`, then `npm run typecheck`. Expected: nine tests in two files pass; TypeScript reports no errors.

- [ ] **Step 5: Commit only the task files.**

```powershell
git add 'src/domain/sharing.ts' 'src/server/http/guards.ts' 'src/server/http/privacy.ts' 'src/server/sharing/links.ts' 'src/server/sharing/projection.ts' 'src/server/sharing/routes.ts' 'tests/server/share-links-api.test.ts' 'tests/server/shared-record-api.test.ts'
git commit -m "feat: expose private-safe shared records with view counting"
```

## Task 7: Serve owner and shared files by occurrence

**Scratch checkpoint:** `4fccb1a`. **Depends on:** Task 6.

**Deliverable:** Current occurrence authorization for every download, safe disposition and explicit GET/HEAD routes. HEAD preserves file headers without opening a stream.

- [ ] **Step 1: Write these complete test and fixture files.**

#### File: `tests/server/file-access.test.ts`

<!-- replay task=7 phase=test sha256=64223509eb795e1c4fbf1b23ca30bfa26c7ac71e7f197f1f4912a461c7c74fed -->

``````ts
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { blobPath } from '../../src/server/files/storage';
import { addAttachment, addPhoto, JPEG, PDF } from './file-fixture';
import { send } from './helpers';
import { forceStatus, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

vi.mock('node:fs', async importOriginal => ({ ...await importOriginal<typeof import('node:fs')>() }));
vi.mock('node:fs/promises', async importOriginal => ({ ...await importOriginal<typeof import('node:fs/promises')>() }));

let f: Fixture;
let id: number;
let token: string;
beforeEach(async () => {
  f = await makeFixture();
  id = (await postRecord(f, { subtype: 'task', title: 'Evidence' })).id;
  forceStatus(f, id, 'open');
  const link = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'Reader' });
  expect(link.statusCode).toBe(201);
  token = link.json().url.split('#')[1];
});
afterEach(async () => { vi.restoreAllMocks(); await f.ctx.close(); });

function shared(path: string, method: 'GET' | 'HEAD' = 'GET', headers: Record<string, string> = {}) {
  return f.ctx.app.inject({ method, url: `/api/shared/${path}`, headers: { authorization: `Bearer ${token}`, ...headers } });
}
function owner(path: string, method: 'GET' | 'HEAD' = 'GET') {
  return f.ctx.app.inject({ method, url: recordUrl(f, id, `/${path}`), headers: { cookie: f.cookie } });
}

it('serves every photo variant with correct disposition while HEAD opens no stream and no read writes', async () => {
  const photo = await addPhoto(f, id);
  const changes = f.ctx.db.prepare('SELECT total_changes()').pluck().get();
  for (const variant of ['original', 'display', 'thumbnail']) {
    const path = `photos/${photo.id}/${variant}`;
    const response = await shared(path);
    expect(response.statusCode).toBe(200);
    expect(response.rawPayload).toEqual(JPEG);
    expect(response.headers['content-type']).toBe('image/jpeg');
    expect(response.headers['content-disposition']).toMatch(variant === 'original' ? /^attachment;/ : /^inline;/);
    expect(response.headers['content-disposition']).toContain("filename*=UTF-8''");
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBe('sandbox');
    expect((await owner(path)).rawPayload).toEqual(JPEG);
    const spy = vi.spyOn(fs, 'createReadStream');
    const head = await shared(path, 'HEAD');
    expect(head.statusCode).toBe(200);
    expect(head.body).toBe('');
    expect(head.headers['content-length']).toBe(String(JPEG.length));
    expect((await owner(path, 'HEAD')).body).toBe('');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  }
  expect(f.ctx.db.prepare('SELECT total_changes()').pluck().get()).toBe(changes);
  expect(f.ctx.db.prepare('SELECT view_count FROM share_links').pluck().get()).toBe(0);
});

it('authorises identical blobs by occurrence and current private Log state', async () => {
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'PRIVATE_SENTINEL', private: true })).json();
  const direct = await addAttachment(f, id);
  const privateFile = await addAttachment(f, id, { logEntryId: entry.id, title: 'PRIVATE_SENTINEL' }, 'PRIVATE_SENTINEL.pdf');
  const other = await postRecord(f, { subtype: 'task' });
  const elsewhere = await addAttachment(f, other.id);
  expect((await shared(`attachments/${direct.id}/file`)).rawPayload).toEqual(PDF);
  const spy = vi.spyOn(fsPromises, 'stat');
  const deniedHead = await shared(`attachments/${privateFile.id}/file`, 'HEAD');
  expect(deniedHead.statusCode).toBe(404);
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
  for (const file of [privateFile, elsewhere]) {
    const denied = await shared(`attachments/${file.id}/file`, 'GET', { cookie: f.cookie, range: 'bytes=0-1', 'if-none-match': '*' });
    expect(denied.statusCode).toBe(404);
    expect(denied.json()).toEqual({ error: 'not_available' });
    expect(denied.headers['content-disposition']).toBeUndefined();
    expect(denied.body).not.toContain('PRIVATE_SENTINEL');
  }
  expect((await owner(`attachments/${privateFile.id}/file`)).rawPayload).toEqual(PDF);
  await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/log/${entry.id}`), { private: false });
  expect((await shared(`attachments/${privateFile.id}/file`)).statusCode).toBe(200);
  await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/log/${entry.id}`), { private: true });
  expect((await shared(`attachments/${privateFile.id}/file`)).statusCode).toBe(404);
  await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/log/${entry.id}`));
  expect((await shared(`attachments/${privateFile.id}/file`)).statusCode).toBe(404);
  expect((await shared(`attachments/${direct.id}/file`)).statusCode).toBe(200);
});

it('rechecks revocation, expiry and Draft state for every variant and attachments', async () => {
  const photo = await addPhoto(f, id);
  const file = await addAttachment(f, id);
  const paths = ['original','display','thumbnail'].map(variant => `photos/${photo.id}/${variant}`).concat(`attachments/${file.id}/file`);
  for (const state of ['draft','expired','revoked']) {
    if (state === 'draft') forceStatus(f, id, 'draft');
    if (state === 'expired') {
      forceStatus(f, id, 'open');
      f.ctx.db.exec("UPDATE share_links SET expires_at='2000-01-01T00:00:00.000Z'");
    }
    if (state === 'revoked') f.ctx.db.exec("UPDATE share_links SET expires_at=NULL, revoked_at='2000-01-01'");
    for (const path of paths) {
      expect((await shared(path)).json()).toEqual({ error: 'not_available' });
      expect((await shared(path, 'HEAD')).statusCode).toBe(404);
    }
  }
});

it('never reuses deleted occurrence access and rejects guessing hashes or bad variants', async () => {
  const first = await addAttachment(f, id);
  const photo = await addPhoto(f, id);
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/attachments/${first.id}`))).statusCode).toBe(200);
  const next = await addAttachment(f, id);
  expect(next.id).toBeGreaterThan(first.id);
  expect((await shared(`attachments/${first.id}/file`)).statusCode).toBe(404);
  expect((await shared(`attachments/${next.id}/file`)).statusCode).toBe(200);
  expect((await shared(`photos/${photo.id}/unknown`)).json()).toEqual({ error: 'not_available' });
  const hash = f.ctx.db.prepare('SELECT hash FROM blobs LIMIT 1').pluck().get() as string;
  expect((await shared(`attachments/${hash}/file`)).statusCode).toBe(404);
  expect((await f.ctx.app.inject({ method: 'GET', url: `/files/${hash}` })).statusCode).toBe(404);
  const other = await postRecord(f, { subtype: 'task' });
  expect((await f.ctx.app.inject({ method: 'GET', url: recordUrl(f, other.id, `/attachments/${next.id}/file`), headers: { cookie: f.cookie } })).statusCode).toBe(404);
});

it('downloads DWG and PDF with safe filenames and handles missing bytes without paths', async () => {
  const dwg = await addAttachment(f, id, {}, 'σχέδιο.dwg', Buffer.from('AC1032'));
  const response = await shared(`attachments/${dwg.id}/file`);
  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toBe('application/octet-stream');
  expect(response.headers['content-disposition']).toMatch(/^attachment;/);
  expect(response.headers['content-disposition']).toContain(encodeURIComponent('σχέδιο.dwg'));
  f.ctx.db.prepare('UPDATE attachments SET original_filename=? WHERE id=?').run('C:\\path\\bad\r\n".dwg', dwg.id);
  const safe = await owner(`attachments/${dwg.id}/file`);
  expect(safe.statusCode).toBe(200);
  expect(safe.headers['content-disposition']).not.toMatch(/[\r\n]/);
  expect(safe.headers['content-disposition']).not.toContain('path');
  const pdf = await addAttachment(f, id);
  expect((await shared(`attachments/${pdf.id}/file`)).headers['content-disposition']).toMatch(/^attachment;/);
  const hash = f.ctx.db.prepare('SELECT blob_hash FROM attachments WHERE id=?').pluck().get(pdf.id) as string;
  await fsPromises.unlink(blobPath(f.ctx.config.filesDir, hash));
  const missing = await shared(`attachments/${pdf.id}/file`);
  expect(missing.statusCode).toBe(404);
  expect(missing.body).not.toContain(f.ctx.config.filesDir);
});

it('rejects expired owner sessions independently of bearer authorisation', async () => {
  const file = await addAttachment(f, id);
  f.ctx.db.exec("UPDATE sessions SET expires_at='2000-01-01'");
  expect((await owner(`attachments/${file.id}/file`)).statusCode).toBe(401);
  expect((await shared(`attachments/${file.id}/file`)).statusCode).toBe(200);
});
``````

- [ ] **Step 2: Verify the pre-implementation result.**

Run: `npx vitest run tests/server/file-access.test.ts`.

Expected: six tests fail while file routes are absent.

- [ ] **Step 3: Write these complete implementation/configuration files.**

#### File: `src/server/files/downloads.ts`

<!-- replay task=7 phase=implementation sha256=2a33a4f84d5a59305c2f3201719271e72e34f130667a7604b864f47954fcc3d8 -->

``````ts
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PhotoVariant } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { shareHeaders } from '../http/privacy';
import { blobPath } from './storage';

export interface FileTarget {
  hash: string;
  size: number;
  contentType: string;
  filename: string;
}

function safeFilename(filename: string): string {
  return (filename.split(/[\\/]/).at(-1) ?? 'file').replace(/[\x00-\x1f\x7f]/g, '') || 'file';
}

export function resolvePhotoFile(db: Db, recordId: number, photoId: number, variant: PhotoVariant): FileTarget {
  const column = { original: 'original_hash', display: 'display_hash', thumbnail: 'thumbnail_hash' }[variant];
  const row = db.prepare(`SELECT b.hash, b.size, b.content_type AS contentType, p.original_filename AS filename
    FROM photos p JOIN blobs b ON b.hash = p.${column} WHERE p.record_id = ? AND p.id = ?`).get(recordId, photoId) as FileTarget | undefined;
  if (!row) throw new HttpError(404, 'file_not_found');
  if (variant !== 'original') row.filename = `${safeFilename(row.filename).replace(/\.[^.]*$/, '')}-${variant}.jpg`;
  return row;
}

export function resolveAttachmentFile(db: Db, recordId: number, attachmentId: number, audience: 'owner' | 'shared'): FileTarget {
  const row = db.prepare(`SELECT b.hash, b.size, b.content_type AS contentType, a.original_filename AS filename,
    l.private AS private, a.log_entry_id AS logEntryId, l.id AS existingLogId
    FROM attachments a JOIN blobs b ON b.hash = a.blob_hash
    LEFT JOIN log_entries l ON l.id = a.log_entry_id AND l.record_id = a.record_id
    WHERE a.record_id = ? AND a.id = ?`).get(recordId, attachmentId) as (FileTarget & {
      private: number | null; logEntryId: number | null; existingLogId: number | null;
    }) | undefined;
  if (!row || (audience === 'shared' && (row.private === 1 || (row.logEntryId !== null && row.existingLogId === null)))) {
    throw new HttpError(404, 'file_not_found');
  }
  return { hash: row.hash, size: row.size, contentType: row.contentType, filename: row.filename };
}

/** Authorisation and occurrence resolution must precede this function. HEAD never opens a stream. */
export async function sendFile(request: FastifyRequest, reply: FastifyReply, filesDir: string, target: FileTarget, disposition: 'inline' | 'attachment'): Promise<void> {
  const path = blobPath(filesDir, target.hash);
  let info;
  try {
    info = await stat(path);
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw new HttpError(404, 'file_not_found');
    throw new HttpError(500, 'file_unavailable');
  }
  if (!info.isFile() || info.size !== target.size) throw new HttpError(500, 'file_unavailable');
  const filename = safeFilename(target.filename);
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  shareHeaders(reply);
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('Content-Security-Policy', 'sandbox');
  reply.header('Content-Type', target.contentType);
  reply.header('Content-Length', info.size);
  reply.header('Content-Disposition', `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`);
  if (request.method === 'HEAD') {
    reply.status(200).send();
    return;
  }
  await reply.send(createReadStream(path));
}
``````

#### File: `src/server/files/routes.ts`

<!-- replay task=7 phase=implementation sha256=4e3a184e4af451d8d66488e4350eed7148ec9aa941794b85ca0806ce78c054c8 -->

``````ts
import type { FastifyInstance } from 'fastify';
import { AttachmentPatch, PhotoPatch, PhotoVariantParam } from '../../domain';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireRecord } from '../records/store';
import { deleteOccurrence, editOccurrence, listAttachments, listPhotos, saveUpload } from './occurrences';
import { discardStaged, publishFile } from './storage';
import { parseUpload } from './uploads';
import { resolveAttachmentFile, resolvePhotoFile, sendFile } from './downloads';

export function registerFileRoutes(app: FastifyInstance, db: Db, config: AppConfig): void {
  app.route({ method: ['GET', 'HEAD'], url: '/api/projects/:projectId/records/:id/photos/:itemId/:variant', config: { privateResponse: true }, handler: async (request, reply) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    const variant = PhotoVariantParam.parse((request.params as { variant: unknown }).variant);
    requireRecord(db, projectId, id);
    const target = resolvePhotoFile(db, id, itemId, variant);
    await sendFile(request, reply, config.filesDir, target, variant === 'original' ? 'attachment' : 'inline');
  } });
  app.route({ method: ['GET', 'HEAD'], url: '/api/projects/:projectId/records/:id/attachments/:itemId/file', config: { privateResponse: true }, handler: async (request, reply) => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    requireRecord(db, projectId, id);
    await sendFile(request, reply, config.filesDir, resolveAttachmentFile(db, id, itemId, 'owner'), 'attachment');
  } });
  for (const kind of ['photos', 'attachments'] as const) {
    const url = `/api/projects/:projectId/records/:id/${kind}`;
    app.post(url, { config: { multipart: true } }, async (request, reply) => {
      const { projectId, id } = ItemParams.parse(request.params);
      requireRecord(db, projectId, id);
      const envelope = await parseUpload(request, config.filesDir, kind);
      try {
        for (const file of Object.values(envelope.files)) await publishFile(config.filesDir, file);
        return reply.status(201).send(saveUpload(db, projectId, id, requireUserId(request), kind, envelope));
      } finally {
        await Promise.all(Object.values(envelope.files).map(discardStaged));
      }
    });
    app.get(url, async request => {
      const { projectId, id } = ItemParams.parse(request.params);
      requireRecord(db, projectId, id);
      return kind === 'photos' ? listPhotos(db, id) : listAttachments(db, id);
    });
    app.patch(`${url}/:itemId`, async request => {
      const { projectId, id, itemId } = RecordItemParams.parse(request.params);
      const patch = kind === 'photos' ? PhotoPatch.parse(request.body) : AttachmentPatch.parse(request.body);
      return editOccurrence(db, projectId, id, itemId, requireUserId(request), kind, patch);
    });
    app.delete(`${url}/:itemId`, async request => {
      const { projectId, id, itemId } = RecordItemParams.parse(request.params);
      deleteOccurrence(db, projectId, id, itemId, requireUserId(request), kind);
      return { ok: true };
    });
  }
}
``````

#### File: `src/server/sharing/routes.ts`

<!-- replay task=7 phase=implementation sha256=dec4c6266f05c4ee0d265927fc6e3eb93b4fdc803e1e6633d954b62cecca7b6c -->

``````ts
import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { PhotoVariantParam, ShareCreate } from '../../domain';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { ItemParams, RecordItemParams } from '../http/params';
import { requireUserId } from '../http/user';
import { authorizeShare, createShareLink, listShareLinks, revokeShareLink } from './links';
import { buildSharedRecord } from './projection';
import { HttpError } from '../errors';
import { resolveAttachmentFile, resolvePhotoFile, sendFile } from '../files/downloads';

export function registerSharingRoutes(app: FastifyInstance, db: Db, config: AppConfig): void {
  const url = '/api/projects/:projectId/records/:id/share-links';
  const options = { config: { privateResponse: true } };
  app.get(url, options, async request => {
    const { projectId, id } = ItemParams.parse(request.params);
    return listShareLinks(db, config, projectId, id);
  });
  app.post(url, options, async (request, reply) => {
    const { projectId, id } = ItemParams.parse(request.params);
    return reply.status(201).send(createShareLink(db, config, projectId, id, requireUserId(request), ShareCreate.parse(request.body)));
  });
  app.post(`${url}/:itemId/revoke`, options, async request => {
    const { projectId, id, itemId } = RecordItemParams.parse(request.params);
    z.strictObject({}).parse(request.body);
    revokeShareLink(db, projectId, id, itemId, requireUserId(request));
    return { ok: true };
  });
  app.get('/api/shared/record', { config: { shareRead: true, privateResponse: true } }, async (request, reply) => {
    return db.transaction(() => {
      const now = new Date();
      const access = authorizeShare(db, request.headers.authorization, now);
      if (request.method === 'HEAD') return reply.status(200).send();
      const payload = buildSharedRecord(db, access);
      db.prepare('UPDATE share_links SET view_count = view_count + 1, last_viewed_at = ? WHERE id = ?').run(now.toISOString(), access.linkId);
      return payload;
    })();
  });
  const publicFileOptions = { config: { shareRead: true, privateResponse: true } };
  const fileParams = z.object({ itemId: z.coerce.number().int().positive() });
  const unavailable = (error: unknown): never => {
    if (error instanceof ZodError || (error instanceof HttpError && error.statusCode === 404)) throw new HttpError(404, 'not_available');
    throw error;
  };
  app.route({ method: ['GET', 'HEAD'], url: '/api/shared/photos/:itemId/:variant', ...publicFileOptions, handler: async (request, reply) => {
    try {
      const access = authorizeShare(db, request.headers.authorization);
      const { itemId } = fileParams.parse(request.params);
      const variant = PhotoVariantParam.parse((request.params as { variant: unknown }).variant);
      const target = resolvePhotoFile(db, access.recordId, itemId, variant);
      await sendFile(request, reply, config.filesDir, target, variant === 'original' ? 'attachment' : 'inline');
    } catch (error) {
      unavailable(error);
    }
  } });
  app.route({ method: ['GET', 'HEAD'], url: '/api/shared/attachments/:itemId/file', ...publicFileOptions, handler: async (request, reply) => {
    try {
      const access = authorizeShare(db, request.headers.authorization);
      const { itemId } = fileParams.parse(request.params);
      const target = resolveAttachmentFile(db, access.recordId, itemId, 'shared');
      await sendFile(request, reply, config.filesDir, target, 'attachment');
    } catch (error) {
      unavailable(error);
    }
  } });
}
``````

- [ ] **Step 4: Verify the completed task.**

Run: `npx vitest run tests/server/file-access.test.ts`, then `npm run typecheck`. Expected: six file-access tests pass; TypeScript reports no errors.

- [ ] **Step 5: Commit only the task files.**

```powershell
git add 'src/server/files/downloads.ts' 'src/server/files/routes.ts' 'src/server/sharing/routes.ts' 'tests/server/file-access.test.ts'
git commit -m "feat: authorize file downloads per evidence occurrence"
```

## Task 8: Verify the offline command and document handoffs

**Scratch checkpoint:** `f7cb9cc`. **Depends on:** Task 7.

**Deliverable:** Subprocess verification of offline revocation, complete-byte assertions and the proposed key-management guide. Browser and operations handoffs stay explicit.

**Reviewed corrections:** the listed file blocks incorporate fixes from `c1de260` directly. Execute the corrected blocks below; do not reproduce the earlier defects.

- [ ] **Step 1: Write these complete test and fixture files.**

#### File: `tests/server/files-api.test.ts`

<!-- replay task=8 phase=test sha256=b04ab9f24560f99dcb43c1ffa13ff8bacbac5d41d34d88af0a925dbe6bbbd1ca -->

``````ts
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { FastifyRequest } from 'fastify';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { blobPath } from '../../src/server/files/storage';
import { parseUpload } from '../../src/server/files/uploads';
import { get, send } from './helpers';
import { getRecord, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';
import { addAttachment, addPhoto, JPEG, multipart, PDF, PNG, upload } from './file-fixture';

let f: Fixture;
let id: number;
beforeEach(async () => {
  f = await makeFixture();
  id = (await postRecord(f, { subtype: 'task' })).id;
});
afterEach(async () => { await f.ctx.close(); });

it('stores photo bundles, preserves metadata and sorts phases', async () => {
  const after = await addPhoto(f, id, { phase: 'after' });
  const before = await addPhoto(f, id, { phase: 'before', takenAt: '2026-10-03T12:00:00+03:00' });
  expect(before).toMatchObject({ originalFilename: 'όψη.jpg', phase: 'before', takenAt: '2026-10-03T09:00:00.000Z' });
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/photos'))).json().map((p: { id: number }) => p.id)).toEqual([before.id, after.id]);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(1);
  const hash = f.ctx.db.prepare('SELECT original_hash FROM photos WHERE id=?').pluck().get(before.id) as string;
  expect(await readFile(blobPath(f.ctx.config.filesDir, hash))).toEqual(JPEG);
  f.ctx.db.prepare('UPDATE records SET updated_at=? WHERE id=?').run('2000-01-01', id);
  const patched = await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/photos/${before.id}`), { caption: 'Caption' });
  expect(patched.statusCode).toBe(200);
  expect(patched.json()).toMatchObject({ caption: 'Caption', uploadedAt: before.uploadedAt, uploadedBy: before.uploadedBy });
  expect((await getRecord(f, id)).updatedAt).not.toBe('2000-01-01');
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/photos/${before.id}`))).statusCode).toBe(200);
  expect((await addPhoto(f, id)).id).toBeGreaterThan(before.id);
});

it('commits each photo variant and attachment only with complete matching disk bytes', async () => {
  const original = PNG;
  const display = Buffer.concat([JPEG, Buffer.from('display')]);
  const thumbnail = Buffer.concat([JPEG, Buffer.from('thumbnail')]);
  const photo = await upload(f, id, 'photos', [
    { name: 'metadata', data: '{"phase":"during"}' },
    { name: 'original', filename: 'original.png', data: original },
    { name: 'display', filename: 'display.jpg', data: display },
    { name: 'thumbnail', filename: 'thumbnail.jpg', data: thumbnail },
  ]);
  expect(photo.statusCode).toBe(201);
  await addAttachment(f, id);
  const hashes = f.ctx.db.prepare('SELECT original_hash, display_hash, thumbnail_hash FROM photos WHERE id=?').get(photo.json().id) as Record<string, string>;
  for (const [column, bytes] of [['original_hash', original], ['display_hash', display], ['thumbnail_hash', thumbnail]] as const) {
    expect(hashes[column]).toBe(createHash('sha256').update(bytes).digest('hex'));
  }
  const blobs = f.ctx.db.prepare('SELECT hash,size FROM blobs').all() as { hash: string; size: number }[];
  expect(blobs).toHaveLength(4);
  for (const blob of blobs) {
    const bytes = await readFile(blobPath(f.ctx.config.filesDir, blob.hash));
    expect(bytes.length).toBe(blob.size);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(blob.hash);
  }
});

it('keeps separate occurrences, joins current Log metadata and cascades private Log deletion without deleting bytes', async () => {
  const log = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'Plans received', private: true });
  expect(log.statusCode).toBe(201);
  const direct = await addAttachment(f, id);
  const linked = await addAttachment(f, id, { logEntryId: log.json().id });
  expect(linked.id).not.toBe(direct.id);
  expect(linked.logEntry).toMatchObject({ id: log.json().id, text: 'Plans received', private: true });
  expect(direct.logEntry).toBeNull();
  const renamed = await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/attachments/${direct.id}`), { title: 'Changed' });
  expect(renamed.statusCode).toBe(200);
  expect(renamed.json()).toMatchObject({ title: 'Changed', uploadedAt: direct.uploadedAt });
  const hash = f.ctx.db.prepare('SELECT blob_hash FROM attachments WHERE id=?').pluck().get(direct.id) as string;
  await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id, `/log/${log.json().id}`), { text: 'Revised', private: false });
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/attachments'))).json()[0].logEntry).toMatchObject({ text: 'Revised', private: false });
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/log/${log.json().id}`))).statusCode).toBe(200);
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/attachments'))).json().map((a: { id: number }) => a.id)).toEqual([direct.id]);
  expect(await readFile(blobPath(f.ctx.config.filesDir, hash))).toEqual(PDF);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(1);
});

it('checks session, Origin and upload content type before parsing files', async () => {
  const parts = [{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }];
  expect((await upload(f, id, 'attachments', parts, { cookie: '' })).statusCode).toBe(401);
  expect((await upload(f, id, 'attachments', parts, { origin: '' })).statusCode).toBe(403);
  expect((await upload(f, id, 'attachments', parts, { origin: 'https://evil.example' })).statusCode).toBe(403);
  expect((await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/attachments'))).statusCode).toBe(415);
  const form = multipart(parts);
  expect((await f.ctx.app.inject({ method: 'PATCH', url: recordUrl(f, id), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body })).statusCode).toBe(415);
});

it('rejects malformed envelopes and cleans temporary files; accepts metadata after files', async () => {
  for (const parts of [
    [{ name: 'metadata', data: '{}' }],
    [{ name: 'file', filename: 'a.pdf', data: PDF }],
    [{ name: 'unknown', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }],
    [{ name: 'metadata', data: '{bad' }, { name: 'file', filename: 'a.pdf', data: PDF }],
    [{ name: 'metadata', data: '{"unknown":1}' }, { name: 'file', filename: 'a.pdf', data: PDF }],
  ]) expect((await upload(f, id, 'attachments', parts)).statusCode).toBe(400);
  const response = await upload(f, id, 'attachments', [
    { name: 'file', filename: 'a.pdf', data: PDF }, { name: 'metadata', data: '{}' },
  ]);
  expect(response.statusCode).toBe(201);
  expect(await readdir(join(f.ctx.config.filesDir, '.tmp'))).toEqual([]);
});

it('terminates invalid-filename multipart streams', async () => {
  const source = Readable.from([PDF]);
  const request = {
    isMultipart: () => true,
    raw: Readable.from([]),
    parts: async function* () {
      yield { type: 'file', fieldname: 'file', filename: 'a'.repeat(256), file: source };
    },
  } as unknown as FastifyRequest;
  await expect(parseUpload(request, f.ctx.config.filesDir, 'attachments')).rejects.toMatchObject({ statusCode: 400 });
  expect(source.destroyed).toBe(true);
});

it('normalises malformed parser envelopes and accepts JSON metadata fields', async () => {
  const before = await getRecord(f, id);
  const missingBoundary = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data' }, payload: 'bad' });
  expect(missingBoundary.statusCode).toBe(400);
  expect(missingBoundary.json()).toEqual({ error: 'invalid_upload' });
  for (const [metadata, status] of [['{bad', 400], ['{}', 201]] as const) {
    const body = Buffer.concat([
      Buffer.from(`--json\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--json\r\nContent-Disposition: form-data; name="file"; filename="a.pdf"\r\n\r\n`), PDF, Buffer.from('\r\n--json--\r\n'),
    ]);
    const response = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data; boundary=json' }, payload: body });
    expect(response.statusCode).toBe(status);
    if (status === 400) {
      expect(response.json()).toEqual({ error: 'invalid_upload' });
      expect(await getRecord(f, id)).toEqual(before);
    }
  }
});

it('rejects duplicate photo parts, parser limits, bad third file and truncated multipart without changing evidence', async () => {
  const before = await getRecord(f, id);
  const files = ['original', 'display', 'thumbnail'].map(name => ({ name, filename: 'a.jpg', data: JPEG }));
  expect((await upload(f, id, 'photos', [{ name: 'metadata', data: '{"phase":"before"}' }, files[0]!, files[0]!, files[2]!])).statusCode).toBe(400);
  expect((await upload(f, id, 'photos', [{ name: 'metadata', data: '{"phase":"before"}' }, ...files, files[0]!])).statusCode).toBe(413);
  expect((await upload(f, id, 'photos', [{ name: 'metadata', data: '{"phase":"before"}' }, files[0]!, files[1]!, { ...files[2]!, data: PDF }])).statusCode).toBe(415);
  expect((await upload(f, id, 'attachments', [{ name: 'metadata', data: 'a'.repeat(16_385) }, { name: 'file', filename: 'a.pdf', data: PDF }])).statusCode).toBe(413);
  const form = multipart([{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }]);
  expect((await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body.subarray(0, -20) })).statusCode).toBe(400);
  expect(await getRecord(f, id)).toEqual(before);
  expect(f.ctx.db.prepare('SELECT count(*) FROM photos').pluck().get()).toBe(0);
  expect(await readdir(join(f.ctx.config.filesDir, '.tmp'))).toEqual([]);
});

it('scopes occurrences and Log associations to the record', async () => {
  const other = await postRecord(f, { subtype: 'task' });
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, other.id, '/log'), { text: 'Other' })).json();
  expect((await upload(f, id, 'attachments', [{ name: 'metadata', data: JSON.stringify({ logEntryId: entry.id }) }, { name: 'file', filename: 'a.pdf', data: PDF }])).statusCode).toBe(404);
  const attachment = await addAttachment(f, id);
  const photo = await addPhoto(f, id);
  for (const [kind, occurrenceId] of [['attachments', attachment.id], ['photos', photo.id]]) {
    expect((await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, other.id, `/${kind}/${occurrenceId}`), kind === 'photos' ? { caption: 'x' } : { title: 'x' })).statusCode).toBe(404);
    expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, other.id, `/${kind}/${occurrenceId}`))).statusCode).toBe(404);
  }
});

it('rolls database changes back after occurrence insertion and retains completed disk bytes', async () => {
  const before = await getRecord(f, id);
  f.ctx.db.exec("CREATE TRIGGER fail_touch BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT,'forced'); END");
  const response = await upload(f, id, 'attachments', [{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }]);
  expect(response.statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
  expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(0);
  expect(await getRecord(f, id)).toEqual(before);
  expect((await readdir(f.ctx.config.filesDir)).filter(name => name !== '.tmp')).toHaveLength(1);
});

it('rolls back the Log cascade if touching its record fails', async () => {
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'Private', private: true })).json();
  const attachment = await addAttachment(f, id, { logEntryId: entry.id });
  f.ctx.db.exec("CREATE TRIGGER fail_touch BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT,'forced'); END");
  expect((await send(f.ctx, f.cookie, 'DELETE', recordUrl(f, id, `/log/${entry.id}`))).statusCode).toBe(500);
  expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/attachments'))).json()[0].id).toBe(attachment.id);
});

it('rechecks a Log association deleted while its multipart bytes are arriving', async () => {
  const entry = (await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/log'), { text: 'Soon removed' })).json();
  const form = multipart([
    { name: 'metadata', data: JSON.stringify({ logEntryId: entry.id }) },
    { name: 'file', filename: 'a.pdf', data: PDF },
  ]);
  const payload = Readable.from((async function* () {
    yield form.body.subarray(0, form.body.length - 40);
    f.ctx.db.prepare('DELETE FROM log_entries WHERE id=?').run(entry.id);
    yield form.body.subarray(form.body.length - 40);
  })());
  const response = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload });
  expect(response.statusCode).toBe(404);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
});

it('rejects an oversized attachment by actual streamed bytes without a Content-Length', async () => {
  const payload = Readable.from((function* () {
    yield Buffer.from('--limit\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n{}\r\n--limit\r\nContent-Disposition: form-data; name="file"; filename="a.pdf"\r\nContent-Type: application/pdf\r\n\r\n');
    yield PDF;
    let remaining = 50_000_001 - PDF.length;
    const chunk = Buffer.alloc(64 * 1024);
    while (remaining > 0) {
      const n = Math.min(remaining, chunk.length);
      yield chunk.subarray(0, n);
      remaining -= n;
    }
    yield Buffer.from('\r\n--limit--\r\n');
  })());
  const response = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, id, '/attachments'), headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': 'multipart/form-data; boundary=limit' }, payload });
  expect(response.statusCode).toBe(413);
  expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
  expect(await readdir(join(f.ctx.config.filesDir, '.tmp'))).toEqual([]);
});
``````

#### File: `tests/server/share-command.test.ts`

<!-- replay task=8 phase=test sha256=11640f626bfd1e8fe2b6d4ec8509b25a513ab3e109fa62ad9ef03b556f8573aa -->

``````ts
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { send } from './helpers';
import { makeFixture, postRecord, recordUrl } from './record-fixture';

const exec = promisify(execFile);

it.each([{ mode: 'missing', key: undefined }, { mode: 'replacement', key: '09'.repeat(32) }])('runs the documented revocation entrypoint with a $mode key against temporary data', async ({ key }) => {
  const f = await makeFixture();
  try {
    const record = await postRecord(f, { subtype: 'task' });
    const created = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/share-links'), { label: 'Private recipient' });
    expect(created.statusCode).toBe(201);
    const token = created.json().url.split('#')[1];
    const activity = f.ctx.db.prepare('SELECT count(*) FROM activity').pluck().get();
    const env: NodeJS.ProcessEnv = { ...process.env, BUILTBASIS_DATA_DIR: f.ctx.config.dataDir };
    delete env.SHARE_LINK_KEY;
    if (key !== undefined) env.SHARE_LINK_KEY = key;
    // Run the same entrypoint as npm run shares:revoke-all. A temporary cwd prevents .env loading.
    const args = [
      '--import', new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url).href,
      fileURLToPath(new URL('../../scripts/revoke-share-links.ts', import.meta.url)),
    ];
    const first = await exec(process.execPath, args, { cwd: f.ctx.config.dataDir, env });
    expect(first.stderr).toBe('');
    expect(JSON.parse(first.stdout)).toEqual({ event: 'share_links_revoked_administratively', revokedLinks: 1 });
    expect(first.stdout).not.toContain(token);
    const second = await exec(process.execPath, args, { cwd: f.ctx.config.dataDir, env });
    expect(JSON.parse(second.stdout).revokedLinks).toBe(0);
    expect(f.ctx.db.prepare('SELECT revoked_at FROM share_links').pluck().get()).toEqual(expect.any(String));
    expect(f.ctx.db.prepare('SELECT count(*) FROM activity').pluck().get()).toBe(activity);
  } finally {
    await f.ctx.close();
  }
});
``````

#### File: `tests/server/share-crypto.test.ts`

<!-- replay task=8 phase=test sha256=2f82c9fcd0367af703244166490c9eb26f9e81a42b52e0c7315864d74466a79f -->

``````ts
import { expect, it } from 'vitest';
import { createCipheriv } from 'node:crypto';
import { decryptShareToken, encryptShareToken, hashShareToken, newShareToken } from '../../src/server/sharing/crypto';

const key = Buffer.alloc(32, 7);
it('generates canonical random tokens and authenticates ciphertext to its record', () => {
  const token = newShareToken();
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(newShareToken()).not.toBe(token);
  expect(hashShareToken(token)).toMatch(/^[a-f0-9]{64}$/);
  const encrypted = encryptShareToken(token, key, 12);
  expect(encrypted.nonce).toHaveLength(12);
  expect(encrypted.tag).toHaveLength(16);
  expect(encrypted.ciphertext.includes(Buffer.from(token))).toBe(false);
  expect(decryptShareToken(encrypted, key, 12)).toBe(token);
  expect(encryptShareToken(token, key, 12).nonce).not.toEqual(encrypted.nonce);
  expect(() => decryptShareToken(encrypted, key, 13)).toThrow();
  expect(() => decryptShareToken(encrypted, Buffer.alloc(32, 8), 12)).toThrow();
  for (const field of ['ciphertext', 'nonce', 'tag'] as const) {
    const value = Buffer.from(encrypted[field]);
    value[0] = value[0]! ^ 1;
    expect(() => decryptShareToken({ ...encrypted, [field]: value }, key, 12)).toThrow();
    expect(() => decryptShareToken({ ...encrypted, [field]: Buffer.alloc(0) }, key, 12)).toThrow();
  }
  for (const invalid of ['', 'a'.repeat(42), 'a'.repeat(43), `${token}=`]) {
    expect(() => hashShareToken(invalid)).toThrow();
    expect(() => encryptShareToken(invalid, key, 12)).toThrow();
  }
});

it('rejects an authenticated copy whose decoded token is not canonical', () => {
  const nonce = Buffer.alloc(12, 3);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from('builtbasis-share-v1:12'));
  const ciphertext = Buffer.concat([cipher.update('a'.repeat(43)), cipher.final()]);
  expect(() => decryptShareToken({ ciphertext, nonce, tag: cipher.getAuthTag() }, key, 12)).toThrow('invalid_share_token');
});
``````

- [ ] **Step 2: Verify the pre-implementation result.**

Run: `npx vitest run tests/server/share-command.test.ts tests/server/share-crypto.test.ts tests/server/files-api.test.ts`.

Expected: all seventeen tests pass already. This task verifies behavior implemented earlier; do not introduce an artificial failure.

- [ ] **Step 3: Write these complete implementation/configuration files.**

#### File: `README.md`

<!-- replay task=8 phase=implementation sha256=332f4dd857946ad8b7a6b90e2172ad13d9ac38b9c2fa1081abebb57f5b81c548 -->

``````markdown
# BuiltBasis

Lightweight construction-control application: quality issues, detail clarifications and tasks — with measurements, decisions, photos and read-only sharing — in English and Greek.

**Status:** Plans 0–3 are complete. The server foundation and records API are implemented and merged to `main`. Plan 4 (files and sharing) is next (see roadmap).

## Local dependency installation

Use the locked dependencies and shipped SQLite binary:

```sh
npm ci --ignore-scripts
npm rebuild esbuild
```

On this Windows machine, ordinary `npm ci` with npm 11.6.2 and 11.19.0 incorrectly attempted a SQLite source build despite the package declaring `gypfile: false`. The commands above were verified with all 155 tests and typechecking. Reassess install scripts when dependencies change.

## Documentation

| Document | Purpose |
|---|---|
| [docs/VISION.md](docs/VISION.md) | What we are building and why |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System structure |
| [docs/adr/0001-v1-stack-and-hosting.md](docs/adr/0001-v1-stack-and-hosting.md) | Stack and hosting decision |
| [docs/designs/2026-10-02-v1-records-design.md](docs/designs/2026-10-02-v1-records-design.md) | **Full v1 design** — records, fields, value lists, rules, screens, operations. Basis for the spec and implementation plan. |
| [docs/plans/2026-10-02-v1-roadmap.md](docs/plans/2026-10-02-v1-roadmap.md) | Implementation roadmap: the sequence of v1 plans and their status |
| [docs/guides/share-key-management.md](docs/guides/share-key-management.md) | Proposed Plan 4 key setup, administrative revocation and Plan 5/6 handoff |
| [docs/research/2026-10-02-issue-and-clarification-tracking-research.md](docs/research/2026-10-02-issue-and-clarification-tracking-research.md) | Market and terminology research (non-authoritative input) |

Documentation follows `X:\1976KN\Dev\Code\DOCS-STANDARD.md` (v1.4).
## Share-link key setup

The proposed Plan 4 HTTP app requires `SHARE_LINK_KEY`, a dedicated random 32-byte key encoded as 64 hexadecimal characters. Store it in server configuration outside the repository, data directory and backups. Preserve it across deployments. Offline owner, seed and share-revocation commands permit an absent key.

After key loss or replacement, stop the application and run `npm run shares:revoke-all` against the intended data directory. Install a newly generated key in private configuration, restart, and issue replacement links. Startup also revokes unrevoked links when the key fingerprint changes. Never publish a key or put it in command logs.
``````

#### File: `docs/guides/share-key-management.md`

<!-- replay task=8 phase=implementation sha256=427155d0bb8ca1cc7b09793b13c715bf5528e977c08b505a2c5326bc57066649 -->

``````markdown
# Share-link key management and API handoff

> **Document type:** Operational guide
> **Status:** Draft — proposed Plan 4 procedure; subject to implementation approval.
> **Authority:** The approved v1 design remains the implementation baseline. Plan 4 decisions 11–12 remain proposed design clarifications/exceptions until separately approved and reconciled.

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

Old link rows are retained. The owner sees `url:null` when a row was encrypted with an unavailable old key. A corrupt copy under the matching current key fails with `share_copy_failed`; it never yields a fabricated URL. Owner-requested revocation is idempotent and appends one activity entry. Administrative revocation emits only a safe aggregate event and does not fabricate an owner actor. That last behaviour is proposed design exception 12, not an independently approved change to design §5.12.

## Restore requirements for Plan 6

Keep the application stopped throughout a restore. Restore the database and complete immutable file bytes together. Delete all sessions and revoke every share link before reopening access, even if the encryption key is unchanged. Restored links must never become usable merely because a backup predates their revocation.

Backup enumeration must cover every hash in `blobs`, or at minimum all three photo references and all attachment references. Stored blobs are never deleted in v1, including completed unreferenced blobs left by a failed occurrence transaction. Exclude unpublished `.tmp` files and private configuration from backups. The key is preserved separately from backups.

Reverse-proxy and Cloudflare rules must preserve `no-store` and avoid logging Authorization or request bodies. The application uses registered route patterns and controlled errors in its logs, but upstream logging policy remains deployment work. Validate the full 50 MB upload path, streaming memory use and Linux file/directory sync behaviour on hosting. Windows tests do not establish Linux crash durability. The recovery drill and production rollout remain Plan 6 work.

## Plan 5 browser contract

The browser uploads one attachment or one photo bundle per request. A bundle supplies the original plus JPEG display and thumbnail copies. Original limits are 25,000,000 bytes, display 5,000,000, thumbnail 500,000, and attachment 50,000,000. The server checks streamed bytes and bounded format signatures. It does not decode images, convert HEIC, extract EXIF, execute Office documents or scan for malware. DWG is accepted only for the documented version signatures and is always downloaded as `application/octet-stream`.

EXIF extraction, explicit-offset date handling, HEIC decoding and fallback belong to the browser. Missing or ambiguous capture dates stay null. The server tests do not prove browser HEIC support. Owner screens must resolve created/updated login usernames too; current owner RecordDetail contains timestamps, while public payloads intentionally omit automatic login identities under proposed clarification 11.

Share URLs have the form `${publicOrigin}/share#${token}`. The `/share` shell reads the fragment locally and sends the token only in an Authorization bearer header. Fetch images and downloads through those authenticated APIs, create Blob object URLs for display/download, and revoke them after use. Do not place tokens in query strings, route parameters, redirects or image URLs. Greek is the default share-page language. The shell must send noindex and no-referrer and load no third-party scripts.

Public JSON is constructed from reviewed field lists. It excludes Notes, Outside contract scope, estimated cost, private Logs and their attachments, login usernames, the record's internal ID, share metadata and storage paths/hashes. Referenced retired business people remain available as labels. Relationships expose only visible human IDs and titles and grant no access to another record.

Only a successful public record GET updates view count and last-viewed time. HEAD and all file reads are read-only. Each file request rechecks the link and current Log privacy by occurrence; identical bytes do not grant access to a private occurrence. Only display/thumbnail JPEGs are inline. Originals and every attachment, including PDF and DWG, use download disposition. Already delivered or in-flight authorised bytes cannot be recalled; subsequent requests recheck access.

## Plan 6 PDF and documentation contract

PDF generation reuses an owner-selected existing share URL and never creates a link on GET. Its QR code may contain that selected URL. Private content remains excluded from PDF as required by the design.

The approved v1 design remains active. Plan 6 still owns the maintained v1 specification, Architecture reconciliation, recovery drill and documentation closeout. Plan 4 and this guide remain Draft until implementation approval and closeout.

## Verification evidence

The key-command integration test runs the same script entrypoint as `npm run shares:revoke-all` in a separate process, with a temporary working directory and database. It covers missing and replacement keys, aggregate safe output, retained activity counts and idempotent repeat runs. Crypto tests cover tampering, wrong key, wrong record, nonce uniqueness and authenticated but noncanonical plaintext. API tests cover owner guards, private projection, early rejection headers, occurrence access and explicit HEAD handling.
``````

#### File: `docs/plans/2026-10-02-v1-roadmap.md`

<!-- replay task=8 phase=implementation sha256=6febf470c445edd7f8fe828ef16c1ce82c26bf479e3d7f2de10fc49b2579703b -->

``````markdown
# BuiltBasis v1 — Implementation Roadmap

> **Document type:** Implementation plan (index)
> **Status:** Approved
> **Retention:** Active until v1 is delivered; historical afterwards. Do not execute directly — execute the numbered plans.
> **Implements:** `docs/designs/2026-10-02-v1-records-design.md` (commit `f9ddaed` and later)

v1 is delivered through sequential plans. Each plan produces working, tested software on its own and is written **just before it is executed**, against the code that exists by then. Plans 0 and 1 were written first; Plans 2–4 on 2026-10-03.

| # | Plan | Delivers | Design sections | Depends on | Status |
|---|---|---|---|---|---|
| 0 | [Webhosting L trial](2026-10-02-plan-0-webhosting-trial.md) | Go/no-go evidence for hosting: Node on the addon domain, SQLite driver (better-sqlite3 or node:sqlite — decides Plan 2's driver), local-disk data folder, restart, memory, Playwright, cron | §11.6, §11.8, §11.9 | — | **Completed — GO** (2026-10-03) |
| 1 | [Domain core](2026-10-02-plan-1-domain-core.md) | Repo scaffold; `src/domain`: bilingual value lists (generated from §7) with completeness test, human IDs, status sets, required fields, transition rules, measurement comparisons | §4.2, §5, §6, §7, §8, §5.7 | — | Completed |
| 2 | [Server foundation](2026-10-03-plan-2-server-foundation.md) | Fastify app and config; SQLite schema and migrations (with pre-migration backup); owner account command, login/logout, hashed sessions, Origin checks; managed lists API (people, trades, tags with rename/merge/delete, zone types, location tree with copy branch); seed import for Gennadi 822A | §9, §11.1–11.3, §11.5 (login), §15 | 0, 1 | Completed |
| 3 | [Records API](2026-10-03-plan-3-records-api.md) | Records CRUD for all subtypes; server-side validation with shared schemas; atomic status changes with verification and activity; decision and options; measurements; Log; Notes; must-be-done-before with cycle rejection; list filters, search, totals | §4, §5, §6, §8, §10 (data needs) | 2 | Completed (merged to main) |
| 4 | [Files and sharing](2026-10-03-plan-4-files-and-sharing.md) | Blobs and occurrences; multipart uploads; photos (three blobs); attachments, including Log attachments and download-only DWG; occurrence-level authorisation; share links (hash + AES-256-GCM copy), share view API, private-content exclusion, view counters | §5.8–5.11, §11.4, §11.5 (sharing) | 3 | Draft — pending implementation approval and closeout |
| 5 | Web interface | React/Vite app; English/Greek UI; record list and filters; quick capture; record page tabs; status dialog; location tree picker; measurement comparison views; lists management; shared record view; in-browser photo display copy, thumbnail and date taken | §3, §10 | 4 | To write |
| 6 | Print, PDF and operations | A3 print view with QR; PDF by browser print (Plan 0: Chromium cannot run on Webhosting L); deploy script; nightly backups (VACUUM INTO, integrity check, rotation); PC pull (pin → files → verify); restore guide and drill; go-live; **documentation closeout**: maintained v1 specification in `docs/specs/`, Architecture reconciled, implementation evidence recorded, design marked Historical | §11.6–11.8, §12, §13 (recovery drill); DOCS-STANDARD §2 (closeout) | 5, 0 | To write |

**Sequencing:** Plan 1 is hosting-independent and may run before Plan 0 completes (exception recorded in design §11.9). Every later plan waits for Plan 0's go result.

**Rules for every plan:** test-first (Vitest; Playwright for browser flows); one commit per task; the design is the reference — if a plan must deviate, record the deviation in the plan and update the design.
``````

#### File: `src/server/http/guards.ts`

<!-- replay task=8 phase=implementation sha256=90f766e865c2c11877ff7573710cb6444c370c80f3a7404b777a4b17fab8b7cf -->

``````ts
import type { FastifyInstance } from 'fastify';
import { findSessionUser, type SessionUser } from '../auth/sessions';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { shareHeaders } from './privacy';

export const SESSION_COOKIE = 'bb_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_API_ROUTES = new Set(['/api/health', '/api/auth/login']);

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
  interface FastifyContextConfig {
    /** Set on upload routes (Plan 4) to accept multipart/form-data instead of JSON. */
    multipart?: boolean;
    shareRead?: boolean;
    privateResponse?: boolean;
  }
}

/**
 * Request rules (design §11.5):
 * - every state-changing request needs Origin = the public origin and a JSON body
 *   (multipart only on routes that allow it);
 * - owner /api routes except health and login need a valid session;
 * - only explicitly marked shared GET/HEAD routes bypass that session requirement,
 *   and their handlers independently require a valid bearer share token;
 * - session lookup and file reads are read-only. Only a successful shared record GET
 *   updates its link's view counter; HEAD changes nothing.
 */
export function registerGuards(app: FastifyInstance, config: AppConfig, db: Db): void {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.config.privateResponse) shareHeaders(reply);
    if (SAFE_METHODS.has(request.method)) return;
    if (request.headers.origin !== config.publicOrigin) throw new HttpError(403, 'origin_rejected');
    const contentType = (request.headers['content-type']?.split(';', 1)[0] ?? '').trim().toLowerCase();
    const isJson = contentType === 'application/json';
    const isAllowedMultipart =
      contentType === 'multipart/form-data' && request.routeOptions.config?.multipart === true;
    if (!isJson && !isAllowedMultipart) throw new HttpError(415, 'unsupported_content_type');
  });

  app.addHook('preHandler', async (request) => {
    if (request.routeOptions.config.shareRead === true && (request.method === 'GET' || request.method === 'HEAD')) return;
    const token = request.cookies[SESSION_COOKIE];
    request.user = token ? findSessionUser(db, token) : null;
    const route = request.routeOptions.url ?? request.url;
    if (!route.startsWith('/api/') || PUBLIC_API_ROUTES.has(route)) return;
    if (request.user === null) throw new HttpError(401, 'unauthenticated');
  });
}
``````

- [ ] **Step 4: Verify the completed task.**

Run: `npx vitest run tests/server/share-command.test.ts tests/server/share-crypto.test.ts tests/server/files-api.test.ts`, then `npm run typecheck`. Expected: seventeen tests in three files pass; TypeScript reports no errors. Then run the whole suite and implementation closeout below.

- [ ] **Step 5: Commit only the task files.**

```powershell
git add 'README.md' 'docs/guides/share-key-management.md' 'docs/plans/2026-10-02-v1-roadmap.md' 'src/server/http/guards.ts' 'tests/server/files-api.test.ts' 'tests/server/share-command.test.ts' 'tests/server/share-crypto.test.ts'
git commit -m "docs: document share key operations and browser handoff"
```

## Implementation closeout

- [ ] Run the entire suite and TypeScript check after Task 8. Record actual implementation commits and counts. Run `git diff --check`.
- [ ] Review the implementation against the approved design and the security cases in this plan. Complete the Plan 5/6 handoffs in the key guide.
- [ ] Update this plan, the roadmap and the key guide status only when implementation is complete. Record implementation verification and merge state separately from this planning replay. Preserve the approved design as active until Plan 6 consolidates the maintained specification and Architecture.
- [ ] Commit those lifecycle updates with the completed implementation. The scratch checkpoints in this document are provenance, not a substitute for implementation commits.

## Preflight and execution checks

Before Task 1, verify the completed scratch-replay evidence and reconcile proposed decisions 11–12 with the approved design. Inspect clean status and read the approved design plus this plan. Create the execution worktree at that time. Confirm `main` includes `8324b2e`, or assess later changes by interface rather than assuming an old line number. Baseline `npm test` is 237 tests/29 files and `npm run typecheck` passes on that commit. Installation uses the documented `npm ci --ignore-scripts` / `npm rebuild esbuild` sequence. Do not run the server against the real local database just to test migrations.

Current named integration checks: `getRecordDetail`, `listOptions`, `listMeasurementSets`, `listVerifications`, `listLog`, `listActivity`; the multipart route-config flag; Log deletion's transaction; migration registration; config consumers in owner/seed scripts. Changes to authentication apply globally: rerun the original auth suite after Tasks 5–7.

## Replay and review evidence

On 2026-10-03, the complete code blocks were extracted into a second detached checkout starting at `50ac37a` (Plan 3 merged at `8324b2e`). The baseline had 237 tests in 29 files. No product implementation was added to main.

The replay applied each task's test blocks before its implementation blocks. Tasks 1–7 produced the expected failures, then passed. Task 8 deliberately began green because it adds integration verification for existing behavior. Each task passed `npm run typecheck`; every listed `git add` path was exercised successfully.

| Task | Focused replay result |
|---|---|
| 1 | 4 tests / 2 files |
| 2 | 43 tests / 2 files |
| 3 | 12 tests / 1 file |
| 4 | 9 tests / 3 files |
| 5 | 5 tests / 2 files |
| 6 | 9 tests / 2 files |
| 7 | 6 tests / 1 file |
| 8 | 17 tests / 3 files |

Final replay command `npm test -- --reporter=dot`: **319 tests passed in 40 files**. `npm run typecheck` and `git diff --check` passed. The final replay tree matches authoring checkpoint `c1de260`, ignoring CRLF/LF line endings. The document's code-block hashes were checked during extraction. The full locked dependency file is included; installation used `npm ci --ignore-scripts` followed by `npm rebuild esbuild`.

An Astra Medium reviewer examined uploads, cryptography/key management/logging, public projection and file access. The review found and resolved rejected-stream cleanup, multipart error normalization, explicit NOT NULL on the blob primary key and privacy headers on early guard failures. Upload fixes are folded into Tasks 1–3. The header correction and regression are in Task 6. The final scoped reviews reported no remaining actionable findings. These reviews are separate from the execution evidence above; they did not independently rerun the whole suite.

The command integration test starts the documented revocation script in a subprocess against temporary data with a missing or replacement key. It verifies safe output and idempotence. Other tests use synthetic multipart streams, temporary databases/files and enabled log capture. No real project data, live credentials or production environment was used.

**Limits:** verification ran on Windows with Node 24.12.0. Linux directory sync/crash durability, hosting upload limits and memory, upstream logging, browser image conversion/HEIC, the share shell, PDF and restore remain the explicit Plan 5/6 handoffs. Runtime dependency audit during authoring reported zero advisories; four pre-existing moderate development advisories were unchanged. Proposed design decisions 11–12 still need reconciliation before implementation approval. This replay establishes that the plan's proposed code runs; it does not mark Plan 4 implemented or merged.

## Technical references checked while planning

- [Fastify multipart 9.3.0 package](https://github.com/fastify/fastify-multipart/blob/v9.3.0/package.json) and [multipart streaming documentation](https://github.com/fastify/fastify-multipart): use streaming parts, explicit part/file limits and truncation handling. Multipart is not safely bounded by the ordinary JSON body limit alone.
- [Fastify logging](https://fastify.dev/docs/latest/Reference/Logging/): configure logging/serializers when constructing the app; test with logging enabled.
- [Node crypto](https://nodejs.org/api/crypto.html): built-in random bytes, SHA-256 and authenticated AES-GCM.
- [Node 24 filesystem APIs](https://nodejs.org/docs/latest-v24.x/api/fs.html): stream temporary bytes and publish using same-filesystem links without replacing an existing file.
- [Autodesk drawing-version codes](https://www.autodesk.com/es/support/technical/article/caas/sfdcarticles/sfdcarticles/ESP/drawing-version-codes-for-autocad.html): the DWG version signatures used for download-only format screening. This does not validate a drawing's contents.
