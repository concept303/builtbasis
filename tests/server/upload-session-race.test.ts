import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createContributor, resetContributorPassword } from '../../src/server/auth/contributors';
import { createSession } from '../../src/server/auth/sessions';
import { setOwnerPassword } from '../../src/server/auth/users';
import { openDatabase, type Db } from '../../src/server/db/connection';
import * as storage from '../../src/server/files/storage';
import { JPEG, multipart, PDF } from './file-fixture';
import { OWNER, send } from './helpers';
import { forceStatus, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
let concurrent: Db;
let id: number;
beforeEach(async () => {
  f = await makeFixture();
  id = (await postRecord(f, { subtype: 'task' })).id;
  concurrent = openDatabase(f.ctx.config.dbPath);
  concurrent.pragma('busy_timeout = 0');
});
afterEach(async () => {
  vi.restoreAllMocks();
  concurrent.close();
  await f.ctx.close();
});

function upload(kind: 'photos' | 'attachments', cookie = f.cookie, assigned = false) {
  const form = multipart([
    { name: 'metadata', data: JSON.stringify(kind === 'photos' ? { phase: 'before' } : {}) },
    ...(kind === 'photos' ? ['original', 'display', 'thumbnail'].map(name => ({ name, filename: 'photo.jpg', data: JPEG }))
      : [{ name: 'file', filename: 'file.pdf', data: PDF }]),
  ]);
  return f.ctx.app.inject({ method: 'POST', url: assigned ? `/api/assigned-records/${id}/${kind}` : recordUrl(f, id, `/${kind}`),
    headers: { cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body });
}

for (const kind of ['photos', 'attachments'] as const) {
  it.each(['logout', 'reset', 'expire', 'disable'] as const)(`rejects ${kind} when owner %s occurs during publication without mutating the record`, async action => {
    const recordBefore = f.ctx.db.prepare('SELECT * FROM records WHERE id = ?').get(id);
    const activityBefore = f.ctx.db.prepare('SELECT * FROM activity WHERE record_id = ?').all(id);
    const publish = storage.publishFile;
    let changed = false;
    vi.spyOn(storage, 'publishFile').mockImplementation(async (...args) => {
      await publish(...args);
      if (changed) return;
      changed = true;
      if (action === 'logout') {
        expect((await send(f.ctx, f.cookie, 'POST', '/api/auth/logout')).statusCode).toBe(200);
      } else if (action === 'reset') {
        setOwnerPassword(concurrent, OWNER.username, 'replacement owner password');
      } else if (action === 'expire') {
        concurrent.exec("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'");
      } else {
        // The contributor CLI deliberately cannot disable owners. Exercise the
        // active-account invariant directly through the separate connection.
        concurrent.exec('UPDATE users SET is_active = 0 WHERE is_owner = 1');
      }
    });
    const response = await upload(kind);
    expect(response.statusCode, response.body).toBe(401);
    expect(changed).toBe(true);
    expect(f.ctx.db.prepare(`SELECT COUNT(*) FROM ${kind}`).pluck().get()).toBe(0);
    expect(f.ctx.db.prepare('SELECT * FROM records WHERE id = ?').get(id)).toEqual(recordBefore);
    expect(f.ctx.db.prepare('SELECT * FROM activity WHERE record_id = ?').all(id)).toEqual(activityBefore);
  });

  it(`retains successful owner ${kind} uploads with a current session`, async () => {
    const response = await upload(kind);
    expect(response.statusCode, response.body).toBe(201);
    expect(f.ctx.db.prepare(`SELECT COUNT(*) FROM ${kind}`).pluck().get()).toBe(1);
  });
}

it.each(['owner', 'contributor'] as const)('holds the %s final write lock before reading the live session', async account => {
  let cookie = f.cookie;
  const username = account === 'owner' ? OWNER.username : 'alex';
  if (account === 'contributor') {
    const userId = createContributor(f.ctx.db, username, 'Alex', OWNER.password);
    cookie = `bb_session=${createSession(f.ctx.db, userId).token}`;
    forceStatus(f, id, 'open');
    f.ctx.db.prepare('INSERT INTO record_grants VALUES (?,?,1,0)').run(id, userId);
  }
  let published = false;
  let attempted = false;
  let resetError: unknown;
  const publish = storage.publishFile;
  vi.spyOn(storage, 'publishFile').mockImplementation(async (...args) => {
    await publish(...args);
    published = true;
  });
  const prepare = f.ctx.db.prepare.bind(f.ctx.db);
  vi.spyOn(f.ctx.db, 'prepare').mockImplementation((sql: string) => {
    if (published && !attempted && sql.includes('FROM sessions s JOIN users u')) {
      attempted = true;
      try {
        if (account === 'owner') setOwnerPassword(concurrent, username, 'replacement owner password');
        else resetContributorPassword(concurrent, username, 'replacement contributor password');
      } catch (error) { resetError = error; }
    }
    return prepare(sql);
  });
  const response = await upload('attachments', cookie, account === 'contributor');
  expect(response.statusCode, response.body).toBe(201);
  expect(attempted).toBe(true);
  expect(resetError).toMatchObject({ code: 'SQLITE_BUSY' });
  expect(f.ctx.db.prepare('SELECT COUNT(*) FROM attachments').pluck().get()).toBe(1);
  // The short lock has ended; the same administrative reset now succeeds.
  if (account === 'owner') setOwnerPassword(concurrent, username, 'replacement owner password');
  else resetContributorPassword(concurrent, username, 'replacement contributor password');
});
