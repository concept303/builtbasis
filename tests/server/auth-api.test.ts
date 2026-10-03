import { afterEach, describe, expect, it } from 'vitest';
import { setOwnerPassword } from '../../src/server/auth/users';
import { get, loginAsOwner, makeContext, OWNER, type TestContext } from './helpers';

let ctx: TestContext;
afterEach(async () => {
  await ctx.close();
});

function login(body: object, headers: Record<string, string> = {}) {
  return ctx.app.inject({ method: 'POST', url: '/api/auth/login', headers: { origin: ctx.origin, ...headers }, payload: body });
}
const wrong = { username: OWNER.username, password: 'not the right password' };

describe('authentication and request rules (design §11.5)', () => {
  it('health is public', async () => {
    ctx = await makeContext();
    const res = await ctx.app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('login sets a host-only, HttpOnly, SameSite=Lax session cookie', async () => {
    ctx = await makeContext();
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    const res = await login({ ...OWNER });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ username: 'owner' });
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/^bb_session=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Domain=');
    expect(cookie).not.toContain('Secure');
  });

  it('marks the cookie Secure when the public URL is https', async () => {
    ctx = await makeContext({ publicBaseUrl: 'https://builtbasis.example' });
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    expect(String((await login({ ...OWNER })).headers['set-cookie'])).toContain('Secure');
  });

  it('rejects a wrong password and an unknown user alike', async () => {
    ctx = await makeContext();
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    for (const body of [wrong, { username: 'nobody', password: OWNER.password }]) {
      const res = await login(body);
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'invalid_credentials' });
    }
  });

  it('blocks an address after 5 failed attempts, even with the right password', async () => {
    ctx = await makeContext();
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    for (let i = 0; i < 5; i += 1) await login(wrong);
    const res = await login({ ...OWNER });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: 'too_many_attempts' });
  });

  it('behind Cloudflare, counts failures per CF-Connecting-IP', async () => {
    ctx = await makeContext({ behindCloudflare: true });
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    for (let i = 0; i < 5; i += 1) await login(wrong, { 'cf-connecting-ip': '203.0.113.1' });
    expect((await login({ ...OWNER }, { 'cf-connecting-ip': '203.0.113.1' })).statusCode).toBe(429);
    expect((await login({ ...OWNER }, { 'cf-connecting-ip': '203.0.113.2' })).statusCode).toBe(200);
  });

  it('caps failed attempts globally, so rotating addresses does not help', async () => {
    ctx = await makeContext({ behindCloudflare: true });
    setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
    for (let i = 0; i < 20; i += 1) await login(wrong, { 'cf-connecting-ip': `198.51.100.${i}` });
    expect((await login({ ...OWNER }, { 'cf-connecting-ip': '192.0.2.1' })).statusCode).toBe(429);
  });

  it('a valid login needs no existing session; logout ends the session', async () => {
    ctx = await makeContext();
    const cookie = await loginAsOwner(ctx);
    expect((await get(ctx, cookie, '/api/auth/me')).json()).toEqual({ username: 'owner' });
    const out = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: ctx.origin, cookie },
      payload: {},
    });
    expect(out.statusCode).toBe(200);
    expect((await get(ctx, cookie, '/api/auth/me')).statusCode).toBe(401);
  });

  it.each(['missing', 'invalid', 'expired'] as const)('rejects logout when the session is %s', async (state) => {
    ctx = await makeContext();
    let cookie: string | undefined;
    if (state === 'invalid') cookie = 'bb_session=invalid-token';
    if (state === 'expired') {
      cookie = await loginAsOwner(ctx);
      ctx.db.prepare('UPDATE sessions SET expires_at = ?').run('2000-01-01T00:00:00.000Z');
    }
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: ctx.origin, ...(cookie ? { cookie } : {}) },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'unauthenticated' });
  });
  it('rejects owner data changes without a session', async () => {
    ctx = await makeContext();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/projects/1/people',
      headers: { origin: ctx.origin },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('rejects state-changing requests with a wrong or missing Origin, including login', async () => {
    ctx = await makeContext();
    const cookie = await loginAsOwner(ctx);
    const wrongOrigin = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: 'https://evil.example', cookie },
      payload: {},
    });
    expect(wrongOrigin.statusCode).toBe(403);
    expect(wrongOrigin.json()).toEqual({ error: 'origin_rejected' });
    const noOrigin = await ctx.app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie }, payload: {} });
    expect(noOrigin.statusCode).toBe(403);
    const loginNoOrigin = await ctx.app.inject({ method: 'POST', url: '/api/auth/login', payload: { ...OWNER } });
    expect(loginNoOrigin.statusCode).toBe(403);
  });

  it('rejects state-changing requests that are not JSON', async () => {
    ctx = await makeContext();
    const cookie = await loginAsOwner(ctx);
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: ctx.origin, cookie, 'content-type': 'text/plain' },
      payload: 'logout',
    });
    expect(res.statusCode).toBe(415);
    expect(res.json()).toEqual({ error: 'unsupported_content_type' });
  });

  it('rejects media types that only begin with application/json', async () => {
    ctx = await makeContext();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: ctx.origin, 'content-type': 'application/json-extra' },
      payload: JSON.stringify(OWNER),
    });
    expect(res.statusCode).toBe(415);
    expect(res.json()).toEqual({ error: 'unsupported_content_type' });
  });

  it('GET requests never change the database', async () => {
    ctx = await makeContext();
    const cookie = await loginAsOwner(ctx);
    const changes = () => ctx.db.prepare('SELECT total_changes()').pluck().get();
    const before = changes();
    await get(ctx, cookie, '/api/auth/me');
    await get(ctx, cookie, '/api/projects');
    await get(ctx, cookie, '/api/health');
    expect(changes()).toBe(before);
  });
});
