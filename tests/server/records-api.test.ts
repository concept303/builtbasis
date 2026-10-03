import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../../src/server/lists/projects';
import { updateTrade } from '../../src/server/lists/trades';
import { get, send } from './helpers';
import { forceStatus, getRecord, makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

describe('creating records (design §4.2, §10.3)', () => {
  it('creates Drafts with the next human ID per project and subtype', async () => {
    const ids = [];
    for (const subtype of ['quality_issue', 'quality_issue', 'detail_clarification', 'task']) {
      ids.push((await postRecord(f, { subtype })).humanId);
    }
    expect(ids).toEqual(['QI-0001', 'QI-0002', 'DC-0001', 'T-0001']);

    const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
    const res = await send(f.ctx, f.cookie, 'POST', `/api/projects/${other.id}/records`, { subtype: 'quality_issue' });
    expect(res.json().humanId).toBe('QI-0001');
  });

  it('returns the full record, starting as Draft', async () => {
    const record = await postRecord(f, {
      subtype: 'quality_issue',
      title: 'West door jamb',
      locationIds: [f.locations.v1Kitchen],
    });
    expect(record).toMatchObject({
      humanId: 'QI-0001',
      subtype: 'quality_issue',
      status: 'draft',
      statusReason: null,
      title: 'West door jamb',
      locationIds: [f.locations.v1Kitchen],
      tradeIds: [],
      problemTypes: [],
      safety: false,
      outsideScope: false,
      estimatedCost: null,
      mustBeDoneBefore: [],
      requiresFirst: [],
      allowedTransitions: ['open', 'cancelled'],
    });
    expect(await getRecord(f, record.id)).toEqual(record);
  });

  it('rejects unknown fields, a status, and a record of another project', async () => {
    const extra = await send(f.ctx, f.cookie, 'POST', `${f.base}/records`, { subtype: 'task', status: 'closed' });
    expect(extra.statusCode).toBe(400);
    expect(extra.json().error).toBe('invalid_input');
    const record = await postRecord(f, { subtype: 'task' });
    const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
    const res = await get(f.ctx, f.cookie, `/api/projects/${other.id}/records/${record.id}`);
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'record_not_found' });
  });
});

describe('updating records (design §5, §6, §8.2)', () => {
  it('saves fields and returns the record', async () => {
    const record = await postRecord(f, { subtype: 'quality_issue' });
    const res = await patchRecord(f, record.id, {
      description: 'Stone thickness differs left and right.',
      severity: 'major',
      priority: 'high',
      dueDate: '2026-11-15',
      completion: 30,
      safety: true,
      problemTypes: ['defect', 'nonconformance'],
      stage: 'construction',
      notes: 'Ask about cost.',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      description: 'Stone thickness differs left and right.',
      severity: 'major',
      priority: 'high',
      dueDate: '2026-11-15',
      completion: 30,
      safety: true,
      problemTypes: ['defect', 'nonconformance'],
      stage: 'construction',
      notes: 'Ask about cost.',
    });
  });

  it('rejects fields that the subtype does not have', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    const res = await patchRecord(f, task.id, { disposition: 'rework', instructionText: 'x' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'field_not_applicable', details: { fields: ['disposition', 'instructionText'] } });
    const dc = await postRecord(f, { subtype: 'detail_clarification' });
    expect((await patchRecord(f, dc.id, { problemTypes: ['defect'] })).statusCode).toBe(400);
    expect((await patchRecord(f, dc.id, { question: 'Which stone?', instructionText: 'Use 3 cm' })).statusCode).toBe(200);
  });

  it('rejects people outside the project and newly selected inactive entries', async () => {
    const record = await postRecord(f, { subtype: 'task' });
    const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
    const foreign = (
      await send(f.ctx, f.cookie, 'POST', `/api/projects/${other.id}/people`, { code: 'X', name: 'X', role: 'other' })
    ).json();
    const outside = await patchRecord(f, record.id, { ballInCourtId: foreign.id });
    expect(outside.statusCode).toBe(400);
    expect(outside.json()).toEqual({ error: 'invalid_reference', details: { field: 'ballInCourtId', ids: [foreign.id] } });
    const inactive = await patchRecord(f, record.id, { responsibleId: f.people.retired });
    expect(inactive.statusCode).toBe(400);
    expect(inactive.json()).toEqual({
      error: 'inactive_selection',
      details: { field: 'responsibleId', ids: [f.people.retired] },
    });
    const retiredTrade = await patchRecord(f, record.id, { tradeIds: [f.trades.retired] });
    expect(retiredTrade.json().error).toBe('inactive_selection');
    const retiredNode = await patchRecord(f, record.id, { locationIds: [f.locations.retired] });
    expect(retiredNode.json().error).toBe('inactive_selection');
  });

  it('keeps an entry that was retired after it was selected (design §9.1, §9.2)', async () => {
    const record = await postRecord(f, { subtype: 'task', tradeIds: [f.trades.tiling] });
    updateTrade(f.ctx.db, f.projectId, f.trades.tiling, { active: false });
    const res = await patchRecord(f, record.id, { tradeIds: [f.trades.tiling, f.trades.masonry], title: 'Still valid' });
    expect(res.statusCode).toBe(200);
    expect(res.json().tradeIds).toEqual([f.trades.tiling, f.trades.masonry].sort((a, b) => a - b));
  });

  it('applies the save rules of the current status; a rejected save changes nothing', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue', title: 'Jamb', problemTypes: ['defect'] });
    forceStatus(f, qi.id, 'open');
    const noTitle = await patchRecord(f, qi.id, { title: '', description: 'changed' });
    expect(noTitle.statusCode).toBe(422);
    expect(noTitle.json()).toEqual({ error: 'rule_violation', details: { errors: ['required:title'] } });
    const undecided = await patchRecord(f, qi.id, { disposition: 'repair' });
    expect(undecided.json()).toEqual({ error: 'rule_violation', details: { errors: ['decision_required'] } });
    const decided = await patchRecord(f, qi.id, {
      disposition: 'repair',
      decidedById: f.people.architect,
      decidedOn: '2026-10-01',
    });
    expect(decided.statusCode).toBe(200);
    const after = await getRecord(f, qi.id);
    expect(after).toMatchObject({ title: 'Jamb', description: null, disposition: 'repair' });
  });

  it('allows incomplete records while Draft', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue', title: 'Jamb' });
    expect((await patchRecord(f, qi.id, { title: null, disposition: 'accept_as_is' })).statusCode).toBe(200);
  });

  it('takes an estimated cost only while Outside contract scope is ticked; unticking keeps it (design §5.4)', async () => {
    const record = await postRecord(f, { subtype: 'task' });
    const refused = await patchRecord(f, record.id, { estimatedCost: 100 });
    expect(refused.statusCode).toBe(422);
    expect(refused.json()).toEqual({ error: 'estimated_cost_requires_outside_scope' });
    const ticked = await patchRecord(f, record.id, { outsideScope: true, estimatedCost: 1250.5 });
    expect(ticked.json()).toMatchObject({ outsideScope: true, estimatedCost: 1250.5 });
    const unticked = await patchRecord(f, record.id, { outsideScope: false });
    expect(unticked.json()).toMatchObject({ outsideScope: false, estimatedCost: 1250.5 });
    expect((await patchRecord(f, record.id, { estimatedCost: 900 })).statusCode).toBe(422);
    expect((await patchRecord(f, record.id, { estimatedCost: null })).json().estimatedCost).toBeNull();
  });
});

describe('activity log (design §5.12)', () => {
  it('logs creation and every change to the tracked fields, newest first', async () => {
    const dc = await postRecord(f, { subtype: 'detail_clarification', ballInCourtId: f.people.architect });
    await patchRecord(f, dc.id, { title: 'Not tracked', ballInCourtId: f.people.contractor });
    await patchRecord(f, dc.id, { instructionText: 'Use 3 cm stone' });
    await patchRecord(f, dc.id, { instructionText: 'Use 2 cm stone' });
    const activity = (await get(f.ctx, f.cookie, recordUrl(f, dc.id, '/activity'))).json();
    expect(
      activity.map(({ action, field, from, to, by }: Record<string, unknown>) => ({ action, field, from, to, by })),
    ).toEqual([
      { action: 'field_changed', field: 'instructionText', from: 'Use 3 cm stone', to: 'Use 2 cm stone', by: 'Owner' },
      { action: 'field_changed', field: 'instructionText', from: null, to: 'Use 3 cm stone', by: 'Owner' },
      {
        action: 'field_changed',
        field: 'ballInCourtId',
        from: f.people.architect,
        to: f.people.contractor,
        by: 'Owner',
      },
      { action: 'field_changed', field: 'ballInCourtId', from: null, to: f.people.architect, by: 'Owner' },
      { action: 'created', field: null, from: null, to: 'draft', by: 'Owner' },
    ]);
  });

  it('writes nothing when a save is rejected', async () => {
    const record = await postRecord(f, { subtype: 'task', title: 'Before' });
    const res = await patchRecord(f, record.id, { title: 'After', ballInCourtId: f.people.retired });
    expect(res.statusCode).toBe(400);
    expect((await getRecord(f, record.id)).title).toBe('Before');
    expect((await get(f.ctx, f.cookie, recordUrl(f, record.id, '/activity'))).json()).toHaveLength(1);
  });
});

it('checks project ownership even for a previously selected trade', async () => {
  const record = await postRecord(f, { subtype: 'task', tradeIds: [f.trades.tiling] });
  const other = createProject(f.ctx.db, { code: 'p2', name: 'Project 2' });
  f.ctx.db.prepare('UPDATE trades SET project_id = ? WHERE id = ?').run(other.id, f.trades.tiling);
  const res = await patchRecord(f, record.id, { tradeIds: [f.trades.tiling] });
  expect(res.statusCode).toBe(400);
  expect(res.json()).toEqual({ error: 'invalid_reference', details: { field: 'tradeIds', ids: [f.trades.tiling] } });
});

it('stores whole cents and rejects fractional cents on create and update', async () => {
  const bad = await send(f.ctx, f.cookie, 'POST', `${f.base}/records`, {
    subtype: 'task', outsideScope: true, estimatedCost: 1.005,
  });
  expect(bad.statusCode).toBe(400);
  const record = await postRecord(f, { subtype: 'task', outsideScope: true, estimatedCost: 0.29 });
  expect(record.humanId).toBe('T-0001');
  expect(record.estimatedCost).toBe(0.29);
  expect(f.ctx.db.prepare('SELECT estimated_cost_cents FROM records WHERE id = ?').pluck().get(record.id)).toBe(29);
  expect((await patchRecord(f, record.id, { estimatedCost: 2.345 })).statusCode).toBe(400);
  expect((await getRecord(f, record.id)).estimatedCost).toBe(0.29);
});

it('rejects foreign options and preserves chosen and unchosen option snapshots', async () => {
  const record = await postRecord(f, { subtype: 'detail_clarification' });
  const other = await postRecord(f, { subtype: 'detail_clarification' });
  const insert = f.ctx.db.prepare(
    'INSERT INTO decision_options (record_id, label, description, sort_order, created_at) VALUES (?, ?, ?, 0, ?)',
  );
  const optionId = Number(insert.run(record.id, 'Stone A', 'Original detail', '2026-10-03').lastInsertRowid);
  const foreignId = Number(insert.run(other.id, 'Foreign', null, '2026-10-03').lastInsertRowid);
  const refused = await patchRecord(f, record.id, { chosenOptionId: foreignId });
  expect(refused.statusCode).toBe(400);
  expect(refused.json().error).toBe('invalid_reference');
  expect((await patchRecord(f, record.id, { chosenOptionId: optionId })).statusCode).toBe(200);
  f.ctx.db.prepare('UPDATE decision_options SET label = ? WHERE id = ?').run('Stone B', optionId);
  expect((await patchRecord(f, record.id, { chosenOptionId: null })).statusCode).toBe(200);
  f.ctx.db.prepare('DELETE FROM decision_options WHERE id = ?').run(optionId);
  const activity = (await get(f.ctx, f.cookie, recordUrl(f, record.id, '/activity'))).json();
  expect(activity.filter((entry: { field: string }) => entry.field === 'chosenOptionId').map((entry: { detail: unknown }) => entry.detail)).toEqual([
    { fromOption: { label: 'Stone B', description: 'Original detail' }, toOption: null },
    { fromOption: null, toOption: { label: 'Stone A', description: 'Original detail' } },
  ]);
});

it('rolls back columns, selections, precedence and activity after save rules reject the result', async () => {
  const later = await postRecord(f, { subtype: 'task' });
  const record = await postRecord(f, { subtype: 'task', title: 'Before', tradeIds: [f.trades.tiling] });
  forceStatus(f, record.id, 'open');
  const before = await getRecord(f, record.id);
  const rejected = await patchRecord(f, record.id, {
    title: null, priority: 'high', tradeIds: [f.trades.masonry], mustBeDoneBeforeIds: [later.id],
  });
  expect(rejected.statusCode).toBe(422);
  expect(await getRecord(f, record.id)).toEqual(before);
  expect((await getRecord(f, later.id)).requiresFirst).toEqual([]);
  expect((await get(f.ctx, f.cookie, recordUrl(f, record.id, '/activity'))).json()).toHaveLength(1);
  const badCreate = await send(f.ctx, f.cookie, 'POST', `${f.base}/records`, { subtype: 'quality_issue', responsibleId: f.people.retired });
  expect(badCreate.statusCode).toBe(400);
  expect((await postRecord(f, { subtype: 'quality_issue' })).humanId).toBe('QI-0001');
});
