import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '../db/connection';

/** Absolute expiry: 30 days after login (design §11.5). */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  userId: number;
  username: string;
}

/** Only this hash is stored, so a database or backup never contains a usable session. */
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export function createSession(db: Db, userId: number, now: Date = new Date()): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    now.toISOString(),
    expiresAt.toISOString(),
  );
  return { token, expiresAt };
}

/** Read-only: used on every request, including GET, which must never write. */
export function findSessionUser(db: Db, token: string, now: Date = new Date()): SessionUser | null {
  const row = db
    .prepare(
      `SELECT u.id AS userId, u.username AS username, s.expires_at AS expiresAt
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND u.is_active = 1`,
    )
    .get(hashToken(token)) as { userId: number; username: string; expiresAt: string } | undefined;
  if (!row || row.expiresAt <= now.toISOString()) return null;
  return { userId: row.userId, username: row.username };
}

export function deleteSession(db: Db, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function deleteUserSessions(db: Db, userId: number): number {
  return db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId).changes;
}

export function deleteExpiredSessions(db: Db, now: Date = new Date()): number {
  return db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString()).changes;
}
