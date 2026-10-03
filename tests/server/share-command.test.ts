import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { send } from './helpers';
import { makeFixture, postRecord, recordUrl } from './record-fixture';

const exec = promisify(execFile);

it.each([{ mode: 'missing', key: undefined }, { mode: 'replacement', key: '09'.repeat(32) }])('runs the documented revocation entrypoint with a $mode key against temporary data', async ({ key }) => {
  const f = await makeFixture();
  try {
    const record = await postRecord(f, { subtype: 'task' });
    const created = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/share-links'), { label: 'Private recipient' });
    expect(created.statusCode).toBe(201);
    const token = created.json().url.split('#')[1];
    const activity = f.ctx.db.prepare('SELECT count(*) FROM activity').pluck().get();
    const env: NodeJS.ProcessEnv = { ...process.env, BUILTBASIS_DATA_DIR: f.ctx.config.dataDir };
    delete env.SHARE_LINK_KEY;
    if (key !== undefined) env.SHARE_LINK_KEY = key;
    // Run the same entrypoint as npm run shares:revoke-all. A temporary cwd prevents .env loading.
    const args = [
      '--import', new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url).href,
      fileURLToPath(new URL('../../scripts/revoke-share-links.ts', import.meta.url)),
    ];
    const first = await exec(process.execPath, args, { cwd: f.ctx.config.dataDir, env });
    expect(first.stderr).toBe('');
    expect(JSON.parse(first.stdout)).toEqual({ event: 'share_links_revoked_administratively', revokedLinks: 1 });
    expect(first.stdout).not.toContain(token);
    const second = await exec(process.execPath, args, { cwd: f.ctx.config.dataDir, env });
    expect(JSON.parse(second.stdout).revokedLinks).toBe(0);
    expect(f.ctx.db.prepare('SELECT revoked_at FROM share_links').pluck().get()).toEqual(expect.any(String));
    expect(f.ctx.db.prepare('SELECT count(*) FROM activity').pluck().get()).toBe(activity);
  } finally {
    await f.ctx.close();
  }
});
