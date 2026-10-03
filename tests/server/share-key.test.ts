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
