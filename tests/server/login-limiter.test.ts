import Fastify from 'fastify';
import { clientIp } from '../../src/server/http/client-ip';
import { describe, expect, it } from 'vitest';
import { LoginLimiter } from '../../src/server/auth/login-limiter';

const limits = { windowMs: 1000, maxPerKey: 3, maxGlobal: 5 };

describe('login limiter (design §11.5)', () => {
  it('blocks an address after the per-address limit within the window', () => {
    const limiter = new LoginLimiter(limits);
    for (let i = 0; i < 3; i += 1) {
      expect(limiter.isBlocked('a', i)).toBe(false);
      limiter.recordFailure('a', i);
    }
    expect(limiter.isBlocked('a', 3)).toBe(true);
    expect(limiter.isBlocked('b', 3)).toBe(false);
  });

  it('forgets failures once the window has passed', () => {
    const limiter = new LoginLimiter(limits);
    for (let i = 0; i < 3; i += 1) limiter.recordFailure('a', 0);
    expect(limiter.isBlocked('a', 999)).toBe(true);
    expect(limiter.isBlocked('a', 1001)).toBe(false);
  });

  it('caps failures across all addresses', () => {
    const limiter = new LoginLimiter(limits);
    for (let i = 0; i < 5; i += 1) limiter.recordFailure(`address-${i}`, 0);
    expect(limiter.isBlocked('a-new-address', 1)).toBe(true);
  });

  it('a successful login clears that address', () => {
    const limiter = new LoginLimiter(limits);
    limiter.recordFailure('a', 0);
    limiter.recordFailure('a', 0);
    limiter.recordSuccess('a');
    limiter.recordFailure('a', 0);
    expect(limiter.isBlocked('a', 0)).toBe(false);
  });
});

// Guard the exact expiry boundary and preserve the global budget after success.
describe('login limiter boundaries', () => {
  it('expires both limits at the exact window boundary', () => {
    const limiter = new LoginLimiter(limits);
    for (let i = 0; i < 5; i += 1) limiter.recordFailure('a', 0);
    expect(limiter.isBlocked('a', 999)).toBe(true);
    expect(limiter.isBlocked('b', 999)).toBe(true);
    expect(limiter.isBlocked('a', 1000)).toBe(false);
    expect(limiter.isBlocked('b', 1000)).toBe(false);
  });

  it('success preserves the global failure budget', () => {
    const limiter = new LoginLimiter(limits);
    for (let i = 0; i < 5; i += 1) limiter.recordFailure('a', 0);
    limiter.recordSuccess('a');
    expect(limiter.isBlocked('b', 1)).toBe(true);
  });
});

describe('visitor IP', () => {
  it.each([
    { behindCloudflare: true, header: ' 203.0.113.8 ', expected: '203.0.113.8' },
    { behindCloudflare: false, header: '203.0.113.8', expected: '127.0.0.1' },
    { behindCloudflare: true, header: undefined, expected: '127.0.0.1' },
    { behindCloudflare: true, header: '   ', expected: '127.0.0.1' },
  ])('resolves $expected with Cloudflare=$behindCloudflare and header=$header', async ({ behindCloudflare, header, expected }) => {
    const app = Fastify();
    app.get('/', (request) => ({ ip: clientIp(request, { behindCloudflare }) }));
    try {
      const response = await app.inject({ method: 'GET', url: '/', headers: header === undefined ? {} : { 'cf-connecting-ip': header } });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ip: expected });
    } finally {
      await app.close();
    }
  });
});
