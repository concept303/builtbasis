import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get, send } from './helpers';
import { getRecord, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

const move = (id: number, body: object) => send(f.ctx, f.cookie, 'POST', recordUrl(f, id, '/transitions'), body);

async function moveOk(id: number, body: object): Promise<void> {
  const res = await move(id, body);
  if (res.statusCode !== 200) throw new Error(`transition failed: ${res.statusCode} ${res.body}`);
}

/** A Quality Issue taken to Ready for verification. */
async function qiReadyForVerification(): Promise<number> {
  const qi = await postRecord(f, { subtype: 'quality_issue', title: 'Jamb', problemTypes: ['defect'], disposition: 'rework' });
  for (const to of ['open', 'issued', 'in_progress', 'ready_for_verification']) await moveOk(qi.id, { to });
  return qi.id;
}

const verification = () => ({ checkedById: f.people.architect, date: '2026-10-03', method: 'measurement' });

describe('status changes (design §8)', () => {
  it('opens a Draft only when its required fields are complete', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue' });
    const res = await move(qi.id, { to: 'open' });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({
      error: 'transition_rejected',
      details: { errors: ['required:title', 'required:problemTypes'] },
    });
    await send(f.ctx, f.cookie, 'PATCH', recordUrl(f, qi.id), { title: 'Jamb', problemTypes: ['defect'] });
    const opened = await move(qi.id, { to: 'open' });
    expect(opened.json()).toMatchObject({ status: 'open' });
  });

  it('refuses a transition that is not allowed', async () => {
    const task = await postRecord(f, { subtype: 'task', title: 'Paint' });
    const res = await move(task.id, { to: 'closed' });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'transition_rejected', details: { errors: ['transition_not_allowed'] } });
  });

  it('puts a record on hold with a reason and resumes it to the previous status', async () => {
    const task = await postRecord(f, { subtype: 'task', title: 'Paint' });
    await moveOk(task.id, { to: 'open' });
    await moveOk(task.id, { to: 'in_progress' });
    expect((await move(task.id, { to: 'on_hold' })).json()).toEqual({
      error: 'transition_rejected',
      details: { errors: ['reason_required'] },
    });
    const held = (await move(task.id, { to: 'on_hold', reasonCode: 'waiting_material', reasonNote: 'Paint ordered' })).json();
    expect(held).toMatchObject({
      status: 'on_hold',
      statusBeforeHold: 'in_progress',
      statusReason: { code: 'waiting_material', note: 'Paint ordered' },
      allowedTransitions: ['in_progress'],
    });
    const resumed = (await move(task.id, { to: 'in_progress' })).json();
    expect(resumed).toMatchObject({ status: 'in_progress', statusBeforeHold: null, statusReason: null });
  });

  it('records a passed verification when closing from Ready for verification', async () => {
    const id = await qiReadyForVerification();
    expect((await move(id, { to: 'closed' })).json()).toEqual({
      error: 'transition_rejected',
      details: { errors: ['verification_required'] },
    });
    const closed = await move(id, { to: 'closed', verification: { ...verification(), note: 'Both sides 18 mm' } });
    expect(closed.json()).toMatchObject({ status: 'closed', allowedTransitions: ['open'] });
    const entries = (await get(f.ctx, f.cookie, recordUrl(f, id, '/verifications'))).json();
    expect(entries).toEqual([
      {
        id: expect.any(Number),
        checkedById: f.people.architect,
        date: '2026-10-03',
        method: 'measurement',
        outcome: 'passed',
        note: 'Both sides 18 mm',
        createdAt: expect.any(String),
      },
    ]);
  });

  it('records a failed verification when sending the work back', async () => {
    const id = await qiReadyForVerification();
    await moveOk(id, { to: 'in_progress', verification: verification() });
    await moveOk(id, { to: 'ready_for_verification' });
    await moveOk(id, { to: 'closed', verification: verification() });
    const outcomes = (await get(f.ctx, f.cookie, recordUrl(f, id, '/verifications'))).json();
    expect(outcomes.map((entry: { outcome: string }) => entry.outcome)).toEqual(['passed', 'failed']);
  });

  it('creates no verification on other transitions, even when one is sent', async () => {
    const dc = await postRecord(f, { subtype: 'detail_clarification', title: 'Stone', question: 'Thickness?' });
    await moveOk(dc.id, { to: 'open' });
    await moveOk(dc.id, { to: 'issued', verification: verification() });
    const superseded = (await move(dc.id, { to: 'superseded', note: 'Replaced by DC-0002' })).json();
    expect(superseded).toMatchObject({ status: 'superseded', statusReason: { code: null, note: 'Replaced by DC-0002' } });
    expect((await get(f.ctx, f.cookie, recordUrl(f, dc.id, '/verifications'))).json()).toEqual([]);
  });

  it('rejects a verifier outside the project or no longer active', async () => {
    const id = await qiReadyForVerification();
    const res = await move(id, { to: 'closed', verification: { ...verification(), checkedById: f.people.retired } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: 'inactive_selection',
      details: { field: 'verification.checkedById', ids: [f.people.retired] },
    });
    expect((await getRecord(f, id)).status).toBe('ready_for_verification');
  });

  it('cancels with a reason; Cancelled is final', async () => {
    const task = await postRecord(f, { subtype: 'task' });
    expect((await move(task.id, { to: 'cancelled', reasonCode: 'replaced' })).json().details.errors).toEqual([
      'reason_note_required',
    ]);
    await moveOk(task.id, { to: 'cancelled', reasonCode: 'raised_in_error' });
    expect((await getRecord(f, task.id)).allowedTransitions).toEqual([]);
  });

  it('logs every status change with its reason and verification', async () => {
    const id = await qiReadyForVerification();
    await moveOk(id, { to: 'closed', verification: verification() });
    await moveOk(id, { to: 'open', note: 'Crack reappeared' });
    const activity = (await get(f.ctx, f.cookie, recordUrl(f, id, '/activity'))).json();
    const changes = activity.filter((entry: { action: string }) => entry.action === 'status_changed');
    expect(changes.map(({ from, to }: { from: string; to: string }) => `${from}→${to}`)).toEqual([
      'closed→open',
      'ready_for_verification→closed',
      'in_progress→ready_for_verification',
      'issued→in_progress',
      'open→issued',
      'draft→open',
    ]);
    expect(changes[0].detail).toEqual({ note: 'Crack reappeared' });
    expect(changes[1].detail).toEqual({
      verification: {
        id: expect.any(Number),
        outcome: 'passed',
        method: 'measurement',
        checkedById: f.people.architect,
        date: '2026-10-03',
      },
    });
  });

  it('is atomic: a failure while writing leaves status, verification and activity unchanged (design §8.2)', async () => {
    const id = await qiReadyForVerification();
    const activityBefore = (await get(f.ctx, f.cookie, recordUrl(f, id, '/activity'))).json().length;
    // Make the last write of the transaction (the activity entry) fail.
    f.ctx.db.exec("CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT, 'simulated failure'); END");
    const res = await move(id, { to: 'closed', verification: verification() });
    expect(res.statusCode).toBe(500);
    f.ctx.db.exec('DROP TRIGGER fail_activity');
    expect((await getRecord(f, id)).status).toBe('ready_for_verification');
    expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/verifications'))).json()).toEqual([]);
    expect((await get(f.ctx, f.cookie, recordUrl(f, id, '/activity'))).json()).toHaveLength(activityBefore);
  });
});
