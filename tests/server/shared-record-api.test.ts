import { afterEach, beforeEach, expect, it } from 'vitest';
import { createPerson } from '../../src/server/lists/people';
import { createProject } from '../../src/server/lists/projects';
import { authorizeShare } from '../../src/server/sharing/links';
import { addAttachment, addPhoto } from './file-fixture';
import { get, send } from './helpers';
import { forceStatus, getRecord, makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => { f = await makeFixture(); });
afterEach(async () => { await f.ctx.close(); });

async function share(id: number) {
  const response = await send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/share-links'), { label: 'PRIVATE_SENTINEL recipient' });
  expect(response.statusCode).toBe(201);
  return { ...response.json(), token: response.json().url.split('#')[1] as string };
}
function read(token: string, method: 'GET' | 'HEAD' = 'GET') {
  return f.ctx.app.inject({ method, url: '/api/shared/record', headers: { authorization: `Bearer ${token}` } });
}
const keys = (value: object) => Object.keys(value).sort();

it('projects all visible sections and only their referenced labels, omitting private content and login identities', async () => {
  f.ctx.db.exec("UPDATE users SET username='PRIVATE_SENTINEL_LOGIN'");
  const foreignProject = createProject(f.ctx.db, { code: 'other', name: 'PRIVATE_SENTINEL project' }).id;
  createPerson(f.ctx.db, foreignProject, { code: 'HIDDEN', name: 'PRIVATE_SENTINEL foreign person', role: 'other' });
  createPerson(f.ctx.db, f.projectId, { code: 'UNUSED', name: 'PRIVATE_SENTINEL unrelated person', role: 'other' });
  const downstream = await postRecord(f, { subtype: 'task', title: 'Public successor' });
  const hidden = await postRecord(f, { subtype: 'task', title: 'PRIVATE_SENTINEL draft' });
  const record = await postRecord(f, {
    subtype: 'detail_clarification', title: 'Stone', question: 'Thickness?', notes: 'PRIVATE_SENTINEL notes', outsideScope: true, estimatedCost: 123.45,
    ballInCourtId: f.people.architect, tradeIds: [f.trades.tiling], tagIds: [f.tags.stone], locationIds: [f.locations.v1Kitchen],
    mustBeDoneBeforeIds: [downstream.id, hidden.id], instructionText: 'Old instruction',
  });
  await postRecord(f, { subtype: 'task', title: 'PRIVATE_SENTINEL predecessor', mustBeDoneBeforeIds: [record.id] });
  forceStatus(f, downstream.id, 'open');
  const option = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/options'), { label: 'Honed', description: '20 mm' });
  expect(option.statusCode).toBe(201);
  expect((await patchRecord(f, record.id, { instructionText: 'New instruction', chosenOptionId: option.json().id })).statusCode).toBe(200);
  const measurement = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/measurement-sets'), {
    date: '2026-10-03', phase: 'before', measuredById: f.people.architect, note: 'Public set note',
    rows: [{ item: 'Stone', quantity: 'Thickness', value: 20, unit: 'mm', note: 'Public row note' }],
  });
  expect(measurement.statusCode).toBe(201);
  f.ctx.db.prepare(`INSERT INTO verifications(record_id, checked_by_id, date, method, outcome, note, created_at, created_by)
    VALUES (?,?,'2026-10-03','visual','passed','Public check','2026-10-03',(SELECT id FROM users LIMIT 1))`).run(record.id, f.people.architect);
  const publicLog = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/log'), { text: 'Public Log' });
  const privateLog = await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, '/log'), { text: 'PRIVATE_SENTINEL log', private: true });
  expect(publicLog.statusCode).toBe(201);
  expect(privateLog.statusCode).toBe(201);
  await addAttachment(f, record.id, { logEntryId: privateLog.json().id, title: 'PRIVATE_SENTINEL title' }, 'PRIVATE_SENTINEL.pdf');
  const publicFile = await addAttachment(f, record.id, { logEntryId: publicLog.json().id });
  await addAttachment(f, record.id);
  await addPhoto(f, record.id);
  const userId = f.ctx.db.prepare('SELECT id FROM users').pluck().get();
  f.ctx.db.prepare(`INSERT INTO activity(record_id,at,user_id,action,field,old_value,new_value,detail)
    VALUES (?,'2026-10-04',?,'field_changed','notes',NULL,?,?)`).run(record.id, userId, JSON.stringify('PRIVATE_SENTINEL future field'), JSON.stringify({ secret: 'PRIVATE_SENTINEL detail' }));
  f.ctx.db.prepare(`UPDATE activity SET detail=? WHERE record_id=? AND field='chosenOptionId'`).run(JSON.stringify({ fromOption: null, toOption: { label: 'Historical option', description: 'Preserved', extra: 'PRIVATE_SENTINEL nested' }, unknown: 'PRIVATE_SENTINEL detail' }), record.id);
  f.ctx.db.prepare('UPDATE people SET active=0, email=?, phone=? WHERE id=?').run('PRIVATE_SENTINEL email', 'PRIVATE_SENTINEL phone', f.people.architect);
  forceStatus(f, record.id, 'open');
  const link = await share(record.id);
  const before = await getRecord(f, record.id);
  const response = await read(link.token);
  expect(response.statusCode).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  const body = response.json();
  expect(keys(body)).toEqual(['activity','attachments','labels','log','measurements','options','photos','record','verifications']);
  for (const field of ['notes','outsideScope','estimatedCost','id','projectId','createdBy','updatedBy','allowedTransitions']) expect(body.record).not.toHaveProperty(field);
  expect(JSON.stringify(body)).not.toContain('PRIVATE_SENTINEL');
  expect(body.record.mustBeDoneBefore).toEqual([{ humanId: downstream.humanId, title: downstream.title }]);
  expect(body.record.requiresFirst).toEqual([]);
  expect(keys(body.options[0])).toEqual(['description','id','label']);
  expect(keys(body.measurements[0])).toEqual(['date','id','measuredById','note','phase','rows']);
  expect(keys(body.measurements[0].rows[0])).toEqual(['item','note','quantity','unit','value']);
  expect(keys(body.verifications[0])).toEqual(['checkedById','createdAt','date','id','method','note','outcome']);
  expect(keys(body.photos[0])).toEqual(['caption','id','originalFilename','phase','takenAt','uploadedAt']);
  expect(keys(body.attachments[0])).toEqual(['contentType','id','logEntry','originalFilename','size','title','uploadedAt']);
  expect(body.log).toEqual([{ id: publicLog.json().id, eventAt: publicLog.json().eventAt, text: 'Public Log', attachmentIds: [publicFile.id] }]);
  expect(body.activity.find((a: { field: string }) => a.field === 'instructionText')).toMatchObject({ from: 'Old instruction', to: 'New instruction', detail: null });
  expect(body.activity.find((a: { field: string }) => a.field === 'chosenOptionId').detail).toEqual({ fromOption: null, toOption: { label: 'Historical option', description: 'Preserved' } });
  for (const entry of body.activity) expect(keys(entry)).toEqual(['action','at','detail','field','from','id','to']);
  expect(body.labels.people).toEqual([{ id: f.people.architect, code: 'ARCH', name: 'Person ARCH', role: 'other' }]);
  expect(body.labels.locations[0].path.map((node: { id: number }) => node.id)).toEqual([f.locations.villa1, f.locations.v1Ground, f.locations.v1Kitchen]);
  expect(body.labels.zoneTypes).toEqual([{ id: f.zones.kitchen, nameEn: 'Kitchen', nameEl: '' }]);
  expect((await get(f.ctx, f.cookie, recordUrl(f, record.id, '/share-links'))).json()[0].viewCount).toBe(1);
  expect(await getRecord(f, record.id)).toEqual(before);
});

it('denies malformed, unknown, expired, revoked and Draft links uniformly without granting owner access', async () => {
  const record = await postRecord(f, { subtype: 'task', title: 'Task' });
  const link = await share(record.id);
  for (const token of [link.token, '', 'a'.repeat(43), 'A'.repeat(43)]) {
    const response = await read(token);
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'not_available' });
  }
  forceStatus(f, record.id, 'open');
  f.ctx.db.prepare('UPDATE share_links SET expires_at=?').run('2026-10-03T00:00:00.000Z');
  expect(() => authorizeShare(f.ctx.db, `Bearer ${link.token}`, new Date('2026-10-03'))).toThrow('not_available');
  f.ctx.db.exec('UPDATE share_links SET expires_at=NULL');
  expect((await read(link.token)).statusCode).toBe(200);
  expect((await f.ctx.app.inject({ method: 'GET', url: recordUrl(f, record.id), headers: { authorization: `Bearer ${link.token}` } })).statusCode).toBe(401);
  expect((await f.ctx.app.inject({ method: 'GET', url: '/api/shared/not-a-route', headers: { authorization: `Bearer ${link.token}` } })).statusCode).toBe(401);
  await send(f.ctx, f.cookie, 'POST', recordUrl(f, record.id, `/share-links/${link.id}/revoke`));
  const denied = await f.ctx.app.inject({ method: 'GET', url: '/api/shared/record', headers: { cookie: f.cookie, authorization: `Bearer ${link.token}` } });
  expect(denied.json()).toEqual({ error: 'not_available' });
});

it('HEAD skips projection and counters, and projection failures never increment views', async () => {
  const record = await postRecord(f, { subtype: 'task', title: 'Task' });
  forceStatus(f, record.id, 'open');
  const link = await share(record.id);
  // listActivity cannot decode this row. HEAD must never call the projection.
  f.ctx.db.prepare("UPDATE activity SET detail='bad-json' WHERE record_id=?").run(record.id);
  const changes = f.ctx.db.prepare('SELECT total_changes()').pluck().get();
  const head = await read(link.token, 'HEAD');
  expect(head.statusCode).toBe(200);
  expect(head.body).toBe('');
  expect(f.ctx.db.prepare('SELECT total_changes()').pluck().get()).toBe(changes);
  expect((await read(link.token)).statusCode).toBe(500);
  expect(f.ctx.db.prepare('SELECT view_count,last_viewed_at FROM share_links WHERE id=?').get(link.id)).toEqual({ view_count: 0, last_viewed_at: null });
});

it('allowlists status history details and resolves visible historical people without publishing unknown objects', async () => {
  const record = await postRecord(f, { subtype: 'task', title: 'History' });
  forceStatus(f, record.id, 'open');
  const userId = f.ctx.db.prepare('SELECT id FROM users').pluck().get();
  const insert = f.ctx.db.prepare('INSERT INTO activity(record_id,at,user_id,action,field,old_value,new_value,detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insert.run(record.id, '2026-01-02', userId, 'status_changed', 'status', '"ready_for_verification"', '"closed"', JSON.stringify({
    reasonCode: null, note: 'Public note', hidden: 'PRIVATE_SENTINEL',
    verification: { id: 1, outcome: 'passed', method: 'visual', checkedById: f.people.retired, date: '2026-01-02', hidden: 'PRIVATE_SENTINEL' },
  }));
  insert.run(record.id, '2026-01-03', userId, 'field_changed', 'responsibleId', JSON.stringify({ secret: 'PRIVATE_SENTINEL' }), 'null', null);
  insert.run(record.id, '2026-01-04', userId, 'future_action', 'instructionText', 'null', '"PRIVATE_SENTINEL"', null);
  const link = await share(record.id);
  const response = await read(link.token);
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(JSON.stringify(body)).not.toContain('PRIVATE_SENTINEL');
  expect(body.activity.find((entry: { action: string }) => entry.action === 'status_changed')).toMatchObject({ action: 'status_changed', field: 'status', detail: {
    reasonCode: null, note: 'Public note', verification: { id: 1, outcome: 'passed', method: 'visual', checkedById: f.people.retired, date: '2026-01-02' },
  } });
  expect(body.labels.people).toEqual([{ id: f.people.retired, code: 'OLD', name: 'Person OLD', role: 'other' }]);
});
