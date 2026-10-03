import { afterEach, expect, it, vi } from 'vitest';
import * as passwords from '../../src/server/auth/passwords';
import { createContributor, disableContributor, resetContributorPassword } from '../../src/server/auth/contributors';
import { setOwnerPassword } from '../../src/server/auth/users';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { makeContext, OWNER, type TestContext } from './helpers';

let ctx: TestContext;
let concurrent: Db;
afterEach(async () => {
  vi.restoreAllMocks();
  concurrent?.close();
  await ctx?.close();
});

it.each(['owner', 'contributor'] as const)('rejects a %s password reset completed after verification but before session creation', async account => {
  ctx = await makeContext();
  const username = account === 'owner' ? OWNER.username : 'alex';
  if (account === 'owner') setOwnerPassword(ctx.db, username, OWNER.password);
  else createContributor(ctx.db, username, 'Alex', OWNER.password);
  concurrent = openDatabase(ctx.config.dbPath);
  const verify = passwords.verifyPassword;
  vi.spyOn(passwords, 'verifyPassword').mockImplementationOnce((password, hash) => {
    const verified = verify(password, hash);
    expect(verified).toBe(true);
    // A separate connection models the administrative CLI while this handler still
    // holds the previously read/verified hash. There is no production test hook.
    if (account === 'owner') setOwnerPassword(concurrent, username, 'replacement owner password');
    else resetContributorPassword(concurrent, username, 'replacement contributor password');
    return verified;
  });
  const response = await ctx.app.inject({ method: 'POST', url: '/api/auth/login',
    headers: { origin: ctx.origin }, payload: { username, password: OWNER.password } });
  expect(response.statusCode).toBe(401);
  expect(response.json()).toEqual({ error: 'invalid_credentials' });
  expect(response.headers['set-cookie']).toBeUndefined();
  expect(ctx.db.prepare('SELECT COUNT(*) FROM sessions').pluck().get()).toBe(0);
});

it('rejects an account disabled on another connection after password verification', async () => {
  ctx = await makeContext();
  createContributor(ctx.db, 'alex', 'Alex', OWNER.password);
  concurrent = openDatabase(ctx.config.dbPath);
  const verify = passwords.verifyPassword;
  vi.spyOn(passwords, 'verifyPassword').mockImplementationOnce((password, hash) => {
    const verified = verify(password, hash);
    disableContributor(concurrent, 'alex');
    return verified;
  });
  const response = await ctx.app.inject({ method: 'POST', url: '/api/auth/login',
    headers: { origin: ctx.origin }, payload: { username: 'alex', password: OWNER.password } });
  expect(response.statusCode).toBe(401);
  expect(response.headers['set-cookie']).toBeUndefined();
  expect(ctx.db.prepare('SELECT COUNT(*) FROM sessions').pluck().get()).toBe(0);
});
