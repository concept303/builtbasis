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
