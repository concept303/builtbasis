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
