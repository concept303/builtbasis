import type { Db } from '../db/connection';
import { hashPassword } from './passwords';
import { deleteUserSessions } from './sessions';
import { findUserByUsername, MAX_USERNAME_LENGTH, validateDisplayName } from './users';

export function createContributor(db: Db, username: string, displayName: string, password: string): number {
  if (username.length === 0 || username.length > MAX_USERNAME_LENGTH) throw new RangeError('Invalid username');
  validateDisplayName(displayName);
  const hash = hashPassword(password);
  return db.transaction(() => {
    if (findUserByUsername(db, username)) throw new Error('Account already exists');
    const now = new Date().toISOString();
    const result = db.prepare(`INSERT INTO users (username,password_hash,display_name,created_at,updated_at)
      VALUES (?,?,?,?,?)`).run(username, hash, displayName, now, now);
    return Number(result.lastInsertRowid);
  }).immediate();
}

function contributorId(db: Db, username: string): number {
  const user = findUserByUsername(db, username);
  if (!user) throw new Error('Contributor does not exist');
  if (user.isOwner) throw new Error('The contributor command cannot change the owner');
  return user.id;
}

export function resetContributorPassword(db: Db, username: string, password: string): number {
  const hash = hashPassword(password);
  return db.transaction(() => {
    const id = contributorId(db, username);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(hash, new Date().toISOString(), id);
    return deleteUserSessions(db, id);
  }).immediate();
}

export function disableContributor(db: Db, username: string): number {
  return db.transaction(() => {
    const id = contributorId(db, username);
    db.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    return deleteUserSessions(db, id);
  }).immediate();
}
