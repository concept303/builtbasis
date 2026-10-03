import type { Db } from '../db/connection';
import { hashPassword } from './passwords';
import { deleteUserSessions } from './sessions';

/** Also the login form's limit, so every account the owner command creates can log in. */
export const MAX_USERNAME_LENGTH = 100;

export interface StoredUser {
  id: number;
  username: string;
  passwordHash: string;
  isOwner: number;
  isActive: number;
  displayName: string;
}

export function findUserByUsername(db: Db, username: string): StoredUser | null {
  const row = db
    .prepare(`SELECT id, username, password_hash AS passwordHash, is_owner AS isOwner,
      is_active AS isActive, display_name AS displayName FROM users WHERE username = ?`)
    .get(username) as StoredUser | undefined;
  return row ?? null;
}

/**
 * Creates the single owner account, or resets its password. A reset ends every session (design §11.5).
 * Used only by the server-side command `npm run owner` — there is no sign-up or reset screen.
 */
export function setOwnerPassword(
  db: Db,
  username: string,
  password: string,
  now: Date = new Date(),
  displayName?: string,
): { userId: number; created: boolean; sessionsRemoved: number } {
  // Both checks run before anything is written, so a rejected reset changes nothing.
  if (username.length === 0 || username.length > MAX_USERNAME_LENGTH) {
    throw new RangeError(`Username must be 1 to ${MAX_USERNAME_LENGTH} characters`);
  }
  const passwordHash = hashPassword(password);
  if (displayName !== undefined) validateDisplayName(displayName);
  // Reserve the write lock before checking ownership, including on first creation.
  return db.transaction(() => {
    const existing = findUserByUsername(db, username);
    if (existing) {
      if (!existing.isOwner) throw new Error('This account is a contributor, not the owner');
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ?, display_name = ? WHERE id = ?').run(
        passwordHash,
        now.toISOString(),
        displayName ?? existing.displayName,
        existing.id,
      );
      return { userId: existing.id, created: false, sessionsRemoved: deleteUserSessions(db, existing.id) };
    }
    const users = db.prepare('SELECT COUNT(*) FROM users WHERE is_owner = 1').pluck().get() as number;
    if (users > 0) throw new Error('Only one account may be the owner');
    const info = db
      .prepare(`INSERT INTO users (username, password_hash, created_at, updated_at, is_owner, display_name)
        VALUES (?, ?, ?, ?, 1, ?)`)
      .run(username, passwordHash, now.toISOString(), now.toISOString(), displayName ?? 'Owner');
    return { userId: Number(info.lastInsertRowid), created: true, sessionsRemoved: 0 };
  }).immediate();
}

export function validateDisplayName(value: string): void {
  if (value.trim().length === 0 || value.length > 200) throw new RangeError('Display name must be 1 to 200 characters');
}
