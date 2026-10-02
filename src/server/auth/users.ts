import type { Db } from '../db/connection';
import { hashPassword } from './passwords';
import { deleteUserSessions } from './sessions';

/** Also the login form's limit, so every account the owner command creates can log in. */
export const MAX_USERNAME_LENGTH = 100;

export interface StoredUser {
  id: number;
  username: string;
  passwordHash: string;
}

export function findUserByUsername(db: Db, username: string): StoredUser | null {
  const row = db
    .prepare('SELECT id, username, password_hash AS passwordHash FROM users WHERE username = ?')
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
): { userId: number; created: boolean; sessionsRemoved: number } {
  // Both checks run before anything is written, so a rejected reset changes nothing.
  if (username.length === 0 || username.length > MAX_USERNAME_LENGTH) {
    throw new RangeError(`Username must be 1 to ${MAX_USERNAME_LENGTH} characters`);
  }
  const passwordHash = hashPassword(password);
  const existing = findUserByUsername(db, username);
  if (existing) {
    return db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
        passwordHash,
        now.toISOString(),
        existing.id,
      );
      return { userId: existing.id, created: false, sessionsRemoved: deleteUserSessions(db, existing.id) };
    })();
  }
  const users = db.prepare('SELECT COUNT(*) FROM users').pluck().get() as number;
  if (users > 0) throw new Error('An owner account already exists; v1 supports exactly one account');
  const info = db
    .prepare('INSERT INTO users (username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(username, passwordHash, now.toISOString(), now.toISOString());
  return { userId: Number(info.lastInsertRowid), created: true, sessionsRemoved: 0 };
}
