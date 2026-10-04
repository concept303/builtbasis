import { afterEach, expect, it } from 'vitest';
import { get, loginAsOwner, makeContext, type TestContext } from './helpers';
let ctx: TestContext;
afterEach(async () => { if (ctx) await ctx.close(); });
it('keeps ordinary authenticated API responses out of caches and search indexes', async () => {
  ctx = await makeContext();
  const cookie = await loginAsOwner(ctx);
  const result = await get(ctx, cookie, '/api/projects');
  expect(result.statusCode).toBe(200);
  expect(result.headers['cache-control']).toBe('no-store');
  expect(result.headers['referrer-policy']).toBe('no-referrer');
  expect(result.headers['x-robots-tag']).toBe('noindex, nofollow');
});
it('applies privacy headers before authentication, Origin and JSON parsing failures', async () => {
  ctx = await makeContext();
  for (const options of [
    { method: 'GET' as const, url: '/api/projects' },
    { method: 'POST' as const, url: '/api/auth/login', headers: { origin: 'https://invalid.example', 'content-type': 'application/json' }, payload: '{}' },
    { method: 'POST' as const, url: '/api/auth/login', headers: { origin: ctx.config.publicOrigin, 'content-type': 'application/json' }, payload: '{' },
  ]) {
    const result = await ctx.app.inject(options);
    expect(result.statusCode).toBeGreaterThanOrEqual(400);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers['referrer-policy']).toBe('no-referrer');
    expect(result.headers['x-robots-tag']).toBe('noindex, nofollow');
  }
});
