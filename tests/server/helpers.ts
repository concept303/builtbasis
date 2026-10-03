import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server/app';
import type { LoginLimiter } from '../../src/server/auth/login-limiter';
import { setOwnerPassword } from '../../src/server/auth/users';
import { loadConfig, type AppConfig } from '../../src/server/config';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { SESSION_COOKIE } from '../../src/server/http/guards';

export interface TestContext {
  app: FastifyInstance;
  db: Db;
  config: AppConfig;
  origin: string;
  close: () => Promise<void>;
}

export const OWNER = { username: 'owner', password: 'correct horse battery staple' } as const;

export async function makeContext(
  options: { publicBaseUrl?: string; behindCloudflare?: boolean; limiter?: LoginLimiter } = {},
): Promise<TestContext> {
  const dataDir = mkdtempSync(join(tmpdir(), 'builtbasis-test-'));
  const config = loadConfig({
    BUILTBASIS_DATA_DIR: dataDir,
    SHARE_LINK_KEY: '07'.repeat(32),
    FILES_STORAGE_BUDGET_BYTES: '1000000000',
    FILES_FREE_RESERVE_BYTES: '1000000',
    PUBLIC_BASE_URL: options.publicBaseUrl ?? 'http://localhost:3000',
    ...(options.behindCloudflare ? { BEHIND_CLOUDFLARE: '1' } : {}),
  });
  const db = openDatabase(config.dbPath);
  migrate(db, { backupsDir: config.backupsDir });
  const app = await buildApp({ config, db, limiter: options.limiter });
  return {
    app,
    db,
    config,
    origin: config.publicOrigin,
    close: async () => {
      await app.close();
      db.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

/** Creates the owner account, logs in and returns the Cookie header value. */
export async function loginAsOwner(ctx: TestContext): Promise<string> {
  setOwnerPassword(ctx.db, OWNER.username, OWNER.password);
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { origin: ctx.origin },
    payload: { ...OWNER },
  });
  const cookie = res.cookies.find((candidate) => candidate.name === SESSION_COOKIE);
  if (!cookie) throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  return `${SESSION_COOKIE}=${cookie.value}`;
}

/** A state-changing owner request: matching Origin, session cookie, JSON body. */
export function send(ctx: TestContext, cookie: string, method: 'POST' | 'PATCH' | 'DELETE', url: string, payload: object = {}) {
  return ctx.app.inject({ method, url, headers: { origin: ctx.origin, cookie }, payload });
}

export function get(ctx: TestContext, cookie: string, url: string) {
  return ctx.app.inject({ method: 'GET', url, headers: { cookie } });
}
