import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get, send } from './helpers';
import { makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

const logUrl = (recordId: number, entryId?: number) => recordUrl(f, recordId, entryId === undefined ? '/log' : `/log/${entryId}`);

describe('Log (design §5.11)', () => {
  it('stores entries with the event time, who logged them and when', async () => {
    const dc = await postRecord(f, { subtype: 'detail_clarification' });
    const res = await send(f.ctx, f.cookie, 'POST', logUrl(dc.id), {
      eventAt: '2026-05-01T09:30:00+03:00',
      text: 'Architect sent plans',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      id: expect.any(Number),
      eventAt: '2026-05-01T06:30:00.000Z',
      text: 'Architect sent plans',
      private: false,
      loggedBy: 'Owner',
      loggedAt: expect.any(String),
      editedAt: null,
    });
  });

  it('defaults the event time to now', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const res = await send(f.ctx, f.cookie, 'POST', logUrl(task.id), { text: 'Called the plumber' });
    expect(res.statusCode).toBe(201);
    expect(res.json().eventAt).toBe(res.json().loggedAt);
  });

  it('lists newest first by event time, then by logged-at', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const add = (eventAt: string, text: string) => send(f.ctx, f.cookie, 'POST', logUrl(task.id), { eventAt, text });
    await add('2026-05-02T10:00:00Z', 'Contractor confirmed receipt');
    await add('2026-05-01T10:00:00Z', 'Architect sent plans');
    await add('2026-05-02T10:00:00Z', 'Same time, logged later');
    const texts = (await get(f.ctx, f.cookie, logUrl(task.id))).json().map((entry: { text: string }) => entry.text);
    expect(texts).toEqual(['Same time, logged later', 'Contractor confirmed receipt', 'Architect sent plans']);
  });

  it('edits text, event time and the private marker; logged-at never changes', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const entry = (await send(f.ctx, f.cookie, 'POST', logUrl(task.id), { text: 'Draft note' })).json();
    const edited = await send(f.ctx, f.cookie, 'PATCH', logUrl(task.id, entry.id), {
      text: 'Final note',
      private: true,
      eventAt: '2026-04-30T08:00:00Z',
    });
    expect(edited.json()).toEqual({
      ...entry,
      text: 'Final note',
      private: true,
      eventAt: '2026-04-30T08:00:00.000Z',
      editedAt: expect.any(String),
    });
  });

  it('deletes an entry; rejects an entry of another record and an empty text', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const other = await postRecord(f, { subtype: 'task' });
    const entry = (await send(f.ctx, f.cookie, 'POST', logUrl(other.id), { text: 'Elsewhere' })).json();
    const wrong = await send(f.ctx, f.cookie, 'DELETE', logUrl(task.id, entry.id));
    expect(wrong.statusCode).toBe(404);
    expect(wrong.json()).toEqual({ error: 'log_entry_not_found' });
    expect((await send(f.ctx, f.cookie, 'POST', logUrl(task.id), { text: ' ' })).statusCode).toBe(400);
    expect((await send(f.ctx, f.cookie, 'DELETE', logUrl(other.id, entry.id))).statusCode).toBe(200);
    expect((await get(f.ctx, f.cookie, logUrl(other.id))).json()).toEqual([]);
  });
});
