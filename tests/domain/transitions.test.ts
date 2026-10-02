import { describe, expect, it } from 'vitest';
import { allowedTargets, checkTransition } from '../../src/domain/record-rules';
import { makeRecord } from './helpers';

const verification = { checkedById: 2, date: '2026-10-10', method: 'measurement' };

describe('allowedTargets (design §8.1)', () => {
  it('Draft can only become Open or Cancelled', () => {
    expect(allowedTargets(makeRecord({ status: 'draft' }))).toEqual(['open', 'cancelled']);
  });

  it('only Quality Issues and Tasks close straight from Open', () => {
    expect(allowedTargets(makeRecord({ status: 'open' }))).toContain('closed');
    expect(allowedTargets(makeRecord({ subtype: 'task', status: 'open' }))).toContain('closed');
    expect(allowedTargets(makeRecord({ subtype: 'detail_clarification', status: 'open' }))).not.toContain('closed');
  });

  it('only Detail Clarifications and Quality Issues close from Issued', () => {
    expect(allowedTargets(makeRecord({ subtype: 'detail_clarification', status: 'issued' }))).toContain('closed');
    expect(allowedTargets(makeRecord({ subtype: 'task', status: 'issued' }))).not.toContain('closed');
  });

  it('only Tasks close from In progress', () => {
    expect(allowedTargets(makeRecord({ subtype: 'task', status: 'in_progress' }))).toContain('closed');
    expect(allowedTargets(makeRecord({ status: 'in_progress' }))).not.toContain('closed');
  });

  it('Ready for verification leads only to Closed or In progress (plus Superseded for DC)', () => {
    expect(allowedTargets(makeRecord({ status: 'ready_for_verification' }))).toEqual(['closed', 'in_progress']);
    expect(allowedTargets(makeRecord({ subtype: 'detail_clarification', status: 'ready_for_verification' }))).toEqual([
      'closed',
      'in_progress',
      'superseded',
    ]);
  });

  it('On hold resumes only to the status before the hold', () => {
    expect(allowedTargets(makeRecord({ status: 'on_hold', statusBeforeHold: 'issued' }))).toEqual(['issued']);
  });

  it('Cancelled and Superseded are terminal; Closed can only reopen', () => {
    expect(allowedTargets(makeRecord({ status: 'cancelled' }))).toEqual([]);
    expect(allowedTargets(makeRecord({ subtype: 'detail_clarification', status: 'superseded' }))).toEqual([]);
    expect(allowedTargets(makeRecord({ status: 'closed' }))).toEqual(['open']);
  });

  it('Superseded is offered only to Detail Clarifications', () => {
    expect(allowedTargets(makeRecord({ subtype: 'detail_clarification', status: 'draft' }))).toContain('superseded');
    expect(allowedTargets(makeRecord({ status: 'open' }))).not.toContain('superseded');
  });
});

describe('checkTransition (design §5.10, §6.1, §7.3, §7.4, §8)', () => {
  it('rejects transitions that are not allowed', () => {
    expect(checkTransition(makeRecord({ status: 'draft' }), { to: 'closed' })).toEqual({
      ok: false,
      errors: ['transition_not_allowed'],
    });
  });

  it('Draft → Open requires the required fields', () => {
    expect(checkTransition(makeRecord({ status: 'draft', title: null, problemTypes: [] }), { to: 'open' })).toEqual({
      ok: false,
      errors: ['required:title', 'required:problemTypes'],
    });
  });

  it('Draft → Cancelled needs only a reason', () => {
    const draft = makeRecord({ status: 'draft', title: null, problemTypes: [] });
    expect(checkTransition(draft, { to: 'cancelled', reasonCode: 'raised_in_error' })).toEqual({
      ok: true,
      verificationOutcome: null,
    });
  });

  it('a Quality Issue needs a disposition before Issued or In progress', () => {
    expect(checkTransition(makeRecord(), { to: 'issued' })).toEqual({ ok: false, errors: ['disposition_required'] });
    expect(checkTransition(makeRecord(), { to: 'in_progress' })).toEqual({
      ok: false,
      errors: ['disposition_required'],
    });
    expect(checkTransition(makeRecord({ disposition: 'rework' }), { to: 'issued' }).ok).toBe(true);
  });

  it('Repair needs Decided by and Decided on before Issued', () => {
    expect(checkTransition(makeRecord({ disposition: 'repair' }), { to: 'issued' })).toEqual({
      ok: false,
      errors: ['decision_required'],
    });
  });

  it('closing a Quality Issue without verification requires Accept as is with a decision', () => {
    expect(checkTransition(makeRecord({ disposition: 'rework' }), { to: 'closed' })).toEqual({
      ok: false,
      errors: ['accept_as_is_required'],
    });
    expect(checkTransition(makeRecord({ disposition: 'accept_as_is' }), { to: 'closed' })).toEqual({
      ok: false,
      errors: ['decision_required'],
    });
    const accepted = makeRecord({ disposition: 'accept_as_is', decidedById: 1, decidedOn: '2026-10-05' });
    expect(checkTransition(accepted, { to: 'closed' })).toEqual({ ok: true, verificationOutcome: null });
  });

  it('On hold needs a valid reason, and Other needs a note', () => {
    const issued = makeRecord({ status: 'issued', disposition: 'rework' });
    expect(checkTransition(issued, { to: 'on_hold' })).toEqual({ ok: false, errors: ['reason_required'] });
    expect(checkTransition(issued, { to: 'on_hold', reasonCode: 'raining' })).toEqual({
      ok: false,
      errors: ['reason_invalid'],
    });
    expect(checkTransition(issued, { to: 'on_hold', reasonCode: 'other' })).toEqual({
      ok: false,
      errors: ['reason_note_required'],
    });
    expect(checkTransition(issued, { to: 'on_hold', reasonCode: 'weather' }).ok).toBe(true);
  });

  it('Cancelled with Replaced needs a note naming the record', () => {
    expect(checkTransition(makeRecord(), { to: 'cancelled', reasonCode: 'replaced' })).toEqual({
      ok: false,
      errors: ['reason_note_required'],
    });
    expect(checkTransition(makeRecord(), { to: 'cancelled', reasonCode: 'replaced', reasonNote: 'QI-0042' }).ok).toBe(
      true,
    );
  });

  it('leaving Ready for verification requires a verification entry and derives the outcome', () => {
    const ready = makeRecord({ status: 'ready_for_verification', disposition: 'rework' });
    expect(checkTransition(ready, { to: 'closed' })).toEqual({ ok: false, errors: ['verification_required'] });
    expect(checkTransition(ready, { to: 'closed', verification })).toEqual({ ok: true, verificationOutcome: 'passed' });
    expect(checkTransition(ready, { to: 'in_progress', verification })).toEqual({
      ok: true,
      verificationOutcome: 'failed',
    });
    expect(
      checkTransition(ready, { to: 'closed', verification: { ...verification, method: 'guess' } }),
    ).toEqual({ ok: false, errors: ['verification_required'] });
  });

  it('superseding a Detail Clarification needs a note and creates no verification', () => {
    const dc = makeRecord({
      subtype: 'detail_clarification',
      status: 'ready_for_verification',
      problemTypes: [],
      question: 'Tile set-out in basement bathrooms?',
    });
    expect(checkTransition(dc, { to: 'superseded' })).toEqual({ ok: false, errors: ['note_required'] });
    expect(checkTransition(dc, { to: 'superseded', note: 'Replaced by DC-0009' })).toEqual({
      ok: true,
      verificationOutcome: null,
    });
  });

  it('reopening a Closed record needs a note', () => {
    const closed = makeRecord({ status: 'closed', disposition: 'rework' });
    expect(checkTransition(closed, { to: 'open' })).toEqual({ ok: false, errors: ['note_required'] });
    expect(checkTransition(closed, { to: 'open', note: 'Crack reappeared' }).ok).toBe(true);
  });

  it('any transition keeps Repair and Accept as is tied to a recorded decision', () => {
    const issuedRepair = makeRecord({ status: 'issued', disposition: 'repair' });
    expect(checkTransition(issuedRepair, { to: 'on_hold', reasonCode: 'weather' })).toEqual({
      ok: false,
      errors: ['decision_required'],
    });
  });
});
