import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { createContributor } from '../../src/server/auth/contributors';
import { createSession, findSessionUser } from '../../src/server/auth/sessions';
import { loginAsOwner, makeContext, OWNER } from './helpers';

const exec = promisify(execFile);

it('runs disable and enable against temporary data, refuses owner changes and noninteractive password input', async () => {
  const ctx = await makeContext();
  try {
    await loginAsOwner(ctx);
    const id = createContributor(ctx.db, 'alex', 'Alex', OWNER.password);
    const session = createSession(ctx.db, id);
    const args = ['--import', new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url).href,
      fileURLToPath(new URL('../../scripts/user.ts', import.meta.url))];
    const options = { cwd: ctx.config.dataDir, env: { ...process.env, BUILTBASIS_DATA_DIR: ctx.config.dataDir } };
    await exec(process.execPath, [...args, 'disable', 'alex'], options);
    expect(ctx.db.prepare('SELECT is_active FROM users WHERE id = ?').pluck().get(id)).toBe(0);
    await exec(process.execPath, [...args, 'enable', 'alex'], options);
    expect(ctx.db.prepare('SELECT is_active FROM users WHERE id = ?').pluck().get(id)).toBe(1);
    expect(findSessionUser(ctx.db, session.token)).toBeNull();
    await expect(exec(process.execPath, [...args, 'disable', 'owner'], options)).rejects.toMatchObject({ code: 1 });
    await expect(exec(process.execPath, [...args, 'create', 'new', 'New Person'], options)).rejects.toMatchObject({ code: 2 });
    expect(ctx.db.prepare("SELECT is_active FROM users WHERE username = 'owner'").pluck().get()).toBe(1);
  } finally { await ctx.close(); }
});
