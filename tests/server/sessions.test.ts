import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_PASSWORD_LENGTH, verifyPassword } from '../../src/server/auth/passwords';
import { createSession, deleteExpiredSessions, deleteSession, findSessionUser, SESSION_TTL_MS } from '../../src/server/auth/sessions';
import { findUserByUsername, MAX_USERNAME_LENGTH, setOwnerPassword } from '../../src/server/auth/users';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';

let db: Db;
let userId: number;

beforeEach(() => {
  db = openDatabase(':memory:');
  migrate(db, { backupsDir: 'unused' });
  userId = setOwnerPassword(db, 'owner', 'correct horse battery').userId;
});

afterEach(() => db.close());

describe('sessions and the owner account (design §11.5)', () => {
  it('stores only a hash of the session token', () => {
    const { token } = createSession(db, userId);
    const stored = db.prepare('SELECT token_hash FROM sessions').pluck().all() as string[];
    expect(stored).toHaveLength(1);
    expect(stored[0]).not.toBe(token);
    expect(stored[0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('finds the user for a valid token and nothing for an unknown one', () => {
    const { token } = createSession(db, userId);
    expect(findSessionUser(db, token)).toEqual({ userId, username: 'owner' });
    expect(findSessionUser(db, 'not-a-token')).toBeNull();
  });

  it('expires a session 30 days after login', () => {
    const start = new Date('2026-10-03T00:00:00Z');
    const { token, expiresAt } = createSession(db, userId, start);
    expect(expiresAt.getTime() - start.getTime()).toBe(SESSION_TTL_MS);
    expect(expiresAt.toISOString()).toBe('2026-11-02T00:00:00.000Z');
    expect(findSessionUser(db, token, new Date(start.getTime() + SESSION_TTL_MS - 1))).not.toBeNull();
    expect(findSessionUser(db, token, expiresAt)).toBeNull();
    expect(db.prepare('SELECT COUNT(*) FROM sessions').pluck().get()).toBe(1);
  });

  it('logout deletes the session', () => {
    const { token } = createSession(db, userId);
    deleteSession(db, token);
    expect(findSessionUser(db, token)).toBeNull();
  });

  it('a password reset ends every session', () => {
    const first = createSession(db, userId);
    const second = createSession(db, userId);
    expect(setOwnerPassword(db, 'owner', 'another long password')).toEqual({
      userId,
      created: false,
      sessionsRemoved: 2,
    });
    expect(findSessionUser(db, first.token)).toBeNull();
    expect(findSessionUser(db, second.token)).toBeNull();
    expect(verifyPassword('another long password', findUserByUsername(db, 'owner')?.passwordHash ?? '')).toBe(true);
  });

  it('allows exactly one owner account', () => {
    expect(() => setOwnerPassword(db, 'someone-else', 'yet another long password')).toThrow('one account');
  });

  it('prevents a competing connection from creating a second owner between the check and insert', () => {
    const dir = mkdtempSync(join(tmpdir(), 'builtbasis-owner-'));
    const first = openDatabase(join(dir, 'owner.db'));
    const competing = openDatabase(join(dir, 'owner.db'));
    try {
      migrate(first, { backupsDir: join(dir, 'backups') });
      competing.pragma('busy_timeout = 0');
      const prepare = first.prepare.bind(first);
      let competingError: unknown;
      // Pause at the vulnerable boundary without sleeps or process scheduling.
      // Both account operations and all SQL still execute against real SQLite.
      const interception = vi.spyOn(first, 'prepare').mockImplementation((sql: string) => {
        if (sql.startsWith('INSERT INTO users')) {
          try {
            setOwnerPassword(competing, 'second-owner', 'correct horse battery');
          } catch (error) {
            competingError = error;
          }
        }
        return prepare(sql);
      });
      setOwnerPassword(first, 'first-owner', 'correct horse battery');
      interception.mockRestore();
      expect(first.prepare('SELECT username FROM users').pluck().all()).toEqual(['first-owner']);
      expect(competingError).toMatchObject({ code: 'SQLITE_BUSY' });
      expect(() => setOwnerPassword(competing, 'second-owner', 'correct horse battery')).toThrow('one account');
    } finally {
      vi.restoreAllMocks();
      competing.close();
      first.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a rejected password reset keeps the previous password and sessions', () => {
    const session = createSession(db, userId);
    expect(() => setOwnerPassword(db, 'owner', 'x'.repeat(MAX_PASSWORD_LENGTH + 1))).toThrow(RangeError);
    expect(() => setOwnerPassword(db, 'owner', 'short')).toThrow(RangeError);
    expect(findSessionUser(db, session.token)).not.toBeNull();
    expect(verifyPassword('correct horse battery', findUserByUsername(db, 'owner')?.passwordHash ?? '')).toBe(true);
  });

  it('refuses a username the login form would not accept', () => {
    for (const username of ['', 'x'.repeat(MAX_USERNAME_LENGTH + 1)]) {
      expect(() => setOwnerPassword(db, username, 'a long enough password'), username).toThrow(RangeError);
    }
  });

  it('prunes expired sessions while preserving active sessions', () => {
    const start = new Date('2026-10-03T00:00:00Z');
    const expired = createSession(db, userId, start);
    const active = createSession(db, userId, new Date(start.getTime() + 1));
    expect(deleteExpiredSessions(db, expired.expiresAt)).toBe(1);
    expect(deleteExpiredSessions(db, expired.expiresAt)).toBe(0);
    expect(findSessionUser(db, active.token, expired.expiresAt)).toEqual({ userId, username: 'owner' });
  });

  it('rolls back a password reset when session deletion fails', () => {
    const session = createSession(db, userId);
    db.exec("CREATE TRIGGER reject_session_delete BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT, 'session deletion failed'); END");
    expect(() => setOwnerPassword(db, 'owner', 'another long password')).toThrow('session deletion failed');
    expect(verifyPassword('correct horse battery', findUserByUsername(db, 'owner')?.passwordHash ?? '')).toBe(true);
    expect(findSessionUser(db, session.token)).toEqual({ userId, username: 'owner' });
  });
});
