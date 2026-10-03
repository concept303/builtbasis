import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get, send } from './helpers';
import { getRecord, makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

const optionsUrl = (recordId: number, optionId?: number) =>
  recordUrl(f, recordId, optionId === undefined ? '/options' : `/options/${optionId}`);

describe('options considered (design §5.6)', () => {
  it('adds, edits and lists options in the order they were added', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const grind = await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'Grind the stone' });
    expect(grind.statusCode).toBe(201);
    expect(grind.json()).toEqual({ id: expect.any(Number), label: 'Grind the stone', description: null });
    await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'Rebuild', description: 'Remove and reset' });
    const edited = await send(f.ctx, f.cookie, 'PATCH', optionsUrl(qi.id, grind.json().id), {
      description: 'Grind 3 mm off the left side',
    });
    expect(edited.json()).toEqual({
      id: grind.json().id,
      label: 'Grind the stone',
      description: 'Grind 3 mm off the left side',
    });
    const list = (await get(f.ctx, f.cookie, optionsUrl(qi.id))).json();
    expect(list.map((option: { label: string }) => option.label)).toEqual(['Grind the stone', 'Rebuild']);
  });

  it('chooses one of the record’s own options and logs the choice', async () => {
    const dc = await postRecord(f, { subtype: 'detail_clarification' });
    const other = await postRecord(f, { subtype: 'detail_clarification' });
    const option = (await send(f.ctx, f.cookie, 'POST', optionsUrl(dc.id), { label: '3 cm stone' })).json();
    const foreign = (await send(f.ctx, f.cookie, 'POST', optionsUrl(other.id), { label: 'Other' })).json();
    const wrong = await patchRecord(f, dc.id, { chosenOptionId: foreign.id });
    expect(wrong.statusCode).toBe(400);
    expect(wrong.json()).toEqual({ error: 'invalid_reference', details: { field: 'chosenOptionId', ids: [foreign.id] } });
    expect((await patchRecord(f, dc.id, { chosenOptionId: option.id })).json().chosenOptionId).toBe(option.id);
    const activity = (await get(f.ctx, f.cookie, recordUrl(f, dc.id, '/activity'))).json();
    expect(activity[0]).toMatchObject({ field: 'chosenOptionId', from: null, to: option.id });
  });

  it('keeps the choice history readable after the option is deleted, and never reuses option ids', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const grind = (
      await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'Grind', description: 'Grind 3 mm off' })
    ).json();
    await patchRecord(f, qi.id, { chosenOptionId: grind.id });
    await patchRecord(f, qi.id, { chosenOptionId: null });
    expect((await send(f.ctx, f.cookie, 'DELETE', optionsUrl(qi.id, grind.id))).statusCode).toBe(200);
    const rebuild = (await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'Rebuild' })).json();
    expect(rebuild.id).not.toBe(grind.id);
    const activity = (await get(f.ctx, f.cookie, recordUrl(f, qi.id, '/activity'))).json();
    const choices = activity.filter((entry: { field: string }) => entry.field === 'chosenOptionId');
    const snapshot = { label: 'Grind', description: 'Grind 3 mm off' };
    expect(choices.map(({ from, to, detail }: Record<string, unknown>) => ({ from, to, detail }))).toEqual([
      { from: grind.id, to: null, detail: { fromOption: snapshot, toOption: null } },
      { from: null, to: grind.id, detail: { fromOption: null, toOption: snapshot } },
    ]);
  });

  it('refuses to delete the chosen option; deletes others', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const a = (await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'A' })).json();
    const b = (await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'B' })).json();
    await patchRecord(f, qi.id, { chosenOptionId: a.id });
    const chosen = await send(f.ctx, f.cookie, 'DELETE', optionsUrl(qi.id, a.id));
    expect(chosen.statusCode).toBe(409);
    expect(chosen.json()).toEqual({ error: 'option_is_chosen' });
    expect((await send(f.ctx, f.cookie, 'DELETE', optionsUrl(qi.id, b.id))).statusCode).toBe(200);
    expect((await get(f.ctx, f.cookie, optionsUrl(qi.id))).json()).toEqual([a]);
  });

  it('rejects options on a Task, an empty label, and an option of another record', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const onTask = await send(f.ctx, f.cookie, 'POST', optionsUrl(task.id), { label: 'A' });
    expect(onTask.statusCode).toBe(400);
    expect(onTask.json()).toEqual({ error: 'field_not_applicable', details: { fields: ['options'] } });
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    expect((await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: '  ' })).statusCode).toBe(400);
    const other = await postRecord(f, { subtype: 'quality_issue' });
    const option = (await send(f.ctx, f.cookie, 'POST', optionsUrl(other.id), { label: 'A' })).json();
    const res = await send(f.ctx, f.cookie, 'PATCH', optionsUrl(qi.id, option.id), { label: 'B' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'option_not_found' });
  });

  it('marks the record as updated', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    f.ctx.db.prepare("UPDATE records SET updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?").run(qi.id);
    await send(f.ctx, f.cookie, 'POST', optionsUrl(qi.id), { label: 'A' });
    expect((await getRecord(f, qi.id)).updatedAt > '2000-01-01T00:00:00.000Z').toBe(true);
  });
});
