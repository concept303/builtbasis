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
