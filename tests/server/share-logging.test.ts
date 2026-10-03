import { Writable } from 'node:stream';
import * as fsPromises from 'node:fs/promises';
import { expect, it, vi } from 'vitest';
import { buildApp } from '../../src/server/app';
import { addAttachment, multipart, PDF } from './file-fixture';
import { get, send } from './helpers';
import { makeFixture, postRecord, recordUrl } from './record-fixture';

vi.mock('node:fs/promises', async importOriginal => ({ ...await importOriginal<typeof import('node:fs/promises')>() }));

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

it('preserves a controlled download permission failure diagnostic without logging the filesystem path', async () => {
  const f = await makeFixture();
  let captured = '';
  const stream = new Writable({ write(chunk, _encoding, callback) { captured += chunk.toString(); callback(); } });
  try {
    const record = await postRecord(f, { subtype: 'task' });
    const file = await addAttachment(f, record.id);
    await f.ctx.app.close();
    f.ctx.app = await buildApp({ config: f.ctx.config, db: f.ctx.db, logger: { level: 'info', stream } });
    vi.spyOn(fsPromises, 'stat').mockRejectedValueOnce(Object.assign(new Error('SECRET_PERMISSION_PATH'), {
      name: 'SECRET_ERROR_NAME', code: 'EACCES', path: 'SECRET_ABSOLUTE_PATH',
    }));
    const response = await get(f.ctx, f.cookie, recordUrl(f, record.id, `/attachments/${file.id}/file`));
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'file_unavailable' });
    expect(captured).toContain('"code":"EACCES"');
    expect(captured).not.toContain('SECRET');
  } finally { vi.restoreAllMocks(); await f.ctx.close(); }
});

it('logs only controlled diagnostic types and codes even when error properties contain secrets', async () => {
  const f = await makeFixture();
  let captured = '';
  const stream = new Writable({ write(chunk, _encoding, callback) { captured += chunk.toString(); callback(); } });
  const errors = [
    Object.assign(new Error('SECRET_PATH_AND_MESSAGE'), { name: 'SECRET_NAME', code: 'ENOSPC', path: 'SECRET_PATH' }),
    Object.assign(new Error('SECRET_SQL'), { name: 'SECRET_DATABASE_NAME', code: 'SQLITE_BUSY' }),
    Object.assign(new TypeError('SECRET_TYPE_MESSAGE'), { name: 'SECRET_TYPE_NAME', code: 'SECRET_CODE' }),
    Object.assign(new Error('SECRET_UNKNOWN'), { name: 'SECRET_ARBITRARY_NAME', code: 'SQLITE_SECRET_SUFFIX' }),
  ];
  try {
    await f.ctx.app.close();
    f.ctx.app = await buildApp({ config: f.ctx.config, db: f.ctx.db, logger: { level: 'info', stream } });
    f.ctx.app.get('/api/diagnostic/:index', async request => {
      const error = errors[Number((request.params as { index: string }).index)];
      request.log.error({ err: error }, 'controlled_probe');
      request.log.error({ err: error });
      request.log.error(error);
      throw error;
    });
    for (let i = 0; i < errors.length; i++) {
      expect((await get(f.ctx, f.cookie, `/api/diagnostic/${i}`)).statusCode).toBe(500);
    }
    await f.ctx.app.close();
    const entries = captured.trim().split('\n').map(line => JSON.parse(line));
    const diagnostics = entries.filter(entry => entry.event === 'internal_error');
    expect(diagnostics.map(({ type, code }) => ({ type, code }))).toEqual([
      { type: 'filesystem_error', code: 'ENOSPC' },
      { type: 'sqlite_error', code: 'SQLITE_BUSY' },
      { type: 'TypeError', code: undefined },
      { type: 'internal_error', code: undefined },
    ]);
    expect(entries.filter(entry => entry.err).map(entry => entry.err))
      .toEqual(diagnostics.flatMap(({ type, code }) => Array(3).fill({
        type, ...(code ? { code } : {}), message: 'internal_error', stack: '',
      })));
    expect(captured).not.toContain('SECRET');
    expect(captured).not.toContain(f.cookie.split('=')[1]!);
  } finally { await f.ctx.close(); }
});

it.each(['ENOSPC', 'EDQUOT'])('preserves %s when upload capacity errors wrap a filesystem failure', async code => {
  const f = await makeFixture();
  let captured = '';
  const stream = new Writable({ write(chunk, _encoding, callback) { captured += chunk.toString(); callback(); } });
  try {
    const record = await postRecord(f, { subtype: 'task' });
    await f.ctx.app.close();
    f.ctx.app = await buildApp({ config: f.ctx.config, db: f.ctx.db, logger: { level: 'info', stream } });
    vi.spyOn(fsPromises, 'open').mockRejectedValueOnce(Object.assign(new Error('SECRET_DISK_PATH'), { code }));
    const form = multipart([{ name: 'metadata', data: '{}' }, { name: 'file', filename: 'a.pdf', data: PDF }]);
    const response = await f.ctx.app.inject({ method: 'POST', url: recordUrl(f, record.id, '/attachments'),
      headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType }, payload: form.body });
    expect(response.statusCode).toBe(507);
    expect(response.json()).toEqual({ error: 'storage_capacity' });
    expect(captured).toContain(JSON.stringify(code));
    expect(captured).not.toContain('SECRET');
  } finally { vi.restoreAllMocks(); await f.ctx.close(); }
});
