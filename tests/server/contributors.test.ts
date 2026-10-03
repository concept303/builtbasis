import { afterEach, expect, it } from 'vitest';
import { createContributor, disableContributor, resetContributorPassword } from '../../src/server/auth/contributors';
import { createSession, findSessionUser } from '../../src/server/auth/sessions';
import { setOwnerPassword } from '../../src/server/auth/users';
import { loginAsOwner, makeContext, OWNER, type TestContext } from './helpers';

let ctx: TestContext;
afterEach(async () => { if (ctx) await ctx.close(); });

it('provisions a named contributor without changing the owner and refuses owner operations', async () => {
  ctx = await makeContext();
  await loginAsOwner(ctx);
  const id = createContributor(ctx.db, 'alex-login', 'Alex Builder', OWNER.password);
  expect(ctx.db.prepare('SELECT display_name, is_owner, is_active FROM users WHERE id = ?').get(id))
    .toEqual({ display_name: 'Alex Builder', is_owner: 0, is_active: 1 });
  expect(() => resetContributorPassword(ctx.db, 'owner', OWNER.password)).toThrow('owner');
  expect(() => disableContributor(ctx.db, 'owner')).toThrow('owner');
  expect(() => setOwnerPassword(ctx.db, 'alex-login', OWNER.password)).toThrow('contributor');
  expect(() => createContributor(ctx.db, 'bad', ' ', OWNER.password)).toThrow('Display name');
});

it('resets only the selected contributor sessions and disables login and stale sessions', async () => {
  ctx = await makeContext();
  await loginAsOwner(ctx);
  const id = createContributor(ctx.db, 'alex', 'Alex', OWNER.password);
  const other = createContributor(ctx.db, 'sam', 'Sam', OWNER.password);
  const session = createSession(ctx.db, id);
  const otherSession = createSession(ctx.db, other);
  expect(resetContributorPassword(ctx.db, 'alex', 'another long password')).toBe(1);
  expect(findSessionUser(ctx.db, session.token)).toBeNull();
  expect(findSessionUser(ctx.db, otherSession.token)?.userId).toBe(other);
  const next = createSession(ctx.db, id);
  expect(disableContributor(ctx.db, 'alex')).toBe(1);
  expect(findSessionUser(ctx.db, next.token)).toBeNull();
  const stale = createSession(ctx.db, id);
  expect(findSessionUser(ctx.db, stale.token)).toBeNull();
  const response = await ctx.app.inject({ method: 'POST', url: '/api/auth/login',
    headers: { origin: ctx.origin }, payload: { username: 'alex', password: 'another long password' } });
  expect(response.statusCode).toBe(401);
});

it('allows contributor session endpoints but fails closed on owner and unmarked routes', async () => {
  ctx = await makeContext();
  await loginAsOwner(ctx);
  const id = createContributor(ctx.db, 'alex', 'Alex', OWNER.password);
  const cookie = `bb_session=${createSession(ctx.db, id).token}`;
  expect((await ctx.app.inject({ url: '/api/auth/me', headers: { cookie } })).statusCode).toBe(200);
  for (const url of ['/api/projects', '/api/assigned-records/unregistered']) {
    expect((await ctx.app.inject({ url, headers: { cookie } })).statusCode).toBe(403);
  }
  expect((await ctx.app.inject({ method: 'POST', url: '/api/auth/logout',
    headers: { cookie, origin: ctx.origin }, payload: {} })).statusCode).toBe(200);
});
