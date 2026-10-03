import { Writable } from 'node:stream';
import { expect, it } from 'vitest';
import { buildApp } from '../../src/server/app';
import { get, send } from './helpers';
import { makeFixture, postRecord, recordUrl } from './record-fixture';

it('logs route patterns and controlled errors without URLs, credentials, parameters or response tokens', async () => {
  const f = await makeFixture();
  let captured = '';
  const stream = new Writable({ write(chunk, _encoding, callback) { captured += chunk.toString(); callback(); } });
  try {
    const record = await postRecord(f, { subtype: 'task' });
    await f.ctx.app.close();
    f.ctx.app = await buildApp({ config: f.ctx.config, db: f.ctx.db, logger: { level: 'info', stream } });
    f.ctx.app.get('/api/probe/:value', async () => { throw new Error('SECRET_THROWN_MESSAGE'); });
    const create = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/share-links'), { label: 'SECRET_LABEL' });
    expect(create.statusCode).toBe(201);
    const token = create.json().url.split('#')[1];
    await get(f.ctx, f.cookie, recordUrl(f, record.id, '/share-links'));
    await f.ctx.app.inject({ method: 'GET', url: `/api/probe/SECRET_PARAMETER?token=${token}`, headers: { cookie: f.cookie, authorization: `Bearer ${token}` } });
    await f.ctx.app.inject({ method: 'GET', url: `/unknown/${token}?session=SECRET_QUERY`, headers: { authorization: `Bearer ${token}` } });
    await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, record.id, '/share-links'), headers: { cookie: f.cookie, origin: `https://${token}.example` }, payload: { label: token } });
    await f.ctx.app.close();
    expect(captured).toContain('/api/projects/:projectId/records/:id/share-links');
    expect(captured).toContain('/api/probe/:value');
    expect(captured).toContain('<unmatched>');
    expect(captured).toContain('internal_error');
    for (const secret of [token, f.cookie.split('=')[1]!, 'SECRET_PARAMETER', 'SECRET_THROWN_MESSAGE', 'SECRET_QUERY', 'SECRET_LABEL']) expect(captured).not.toContain(secret);
  } finally { await f.ctx.close(); }
});
