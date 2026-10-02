import { describe, expect, it } from 'vitest';
import { missingRequired, validateSave } from '../../src/domain/record-rules';
import { makeRecord } from './helpers';

describe('required fields (design §5.1, §6, §8.2)', () => {
  it('Draft, Cancelled and Superseded may be incomplete', () => {
    for (const status of ['draft', 'cancelled'] as const) {
      expect(missingRequired(makeRecord({ status, title: null, problemTypes: [] }))).toEqual([]);
    }
    expect(
      missingRequired(makeRecord({ subtype: 'detail_clarification', status: 'superseded', title: '', question: null })),
    ).toEqual([]);
  });

  it('active Quality Issues need a title and at least one type of problem', () => {
    expect(missingRequired(makeRecord({ title: '  ', problemTypes: [] }))).toEqual(['title', 'problemTypes']);
  });

  it('active Detail Clarifications need a title and a question', () => {
    expect(missingRequired(makeRecord({ subtype: 'detail_clarification', problemTypes: [], question: ' ' }))).toEqual([
      'question',
    ]);
  });

  it('active Tasks need only a title', () => {
    expect(missingRequired(makeRecord({ subtype: 'task', problemTypes: [] }))).toEqual([]);
    expect(missingRequired(makeRecord({ subtype: 'task', title: null, problemTypes: [] }))).toEqual(['title']);
  });
});

describe('validateSave (design §6.1, §8.2)', () => {
  it('accepts a complete open Quality Issue without a disposition', () => {
    expect(validateSave(makeRecord())).toEqual([]);
  });

  it('requires a disposition once a Quality Issue is Issued, In progress, Ready for verification or Closed', () => {
    for (const status of ['issued', 'in_progress', 'ready_for_verification', 'closed'] as const) {
      expect(validateSave(makeRecord({ status }))).toEqual(['disposition_required']);
    }
  });

  it('requires Decided by and Decided on for Repair and Accept as is', () => {
    expect(validateSave(makeRecord({ status: 'issued', disposition: 'repair' }))).toEqual(['decision_required']);
    expect(
      validateSave(makeRecord({ status: 'issued', disposition: 'repair', decidedById: 3, decidedOn: '2026-10-05' })),
    ).toEqual([]);
    expect(validateSave(makeRecord({ status: 'issued', disposition: 'rework' }))).toEqual([]);
  });

  it('reports missing required fields with a required: prefix', () => {
    expect(validateSave(makeRecord({ title: null }))).toEqual(['required:title']);
  });

  it('requires Decided by and Decided on for Repair and Accept as is in every active status', () => {
    for (const status of ['open', 'awaiting_decision', 'on_hold'] as const) {
      for (const disposition of ['repair', 'accept_as_is'] as const) {
        expect(validateSave(makeRecord({ status, disposition })), `${status}/${disposition}`).toEqual([
          'decision_required',
        ]);
      }
    }
    expect(validateSave(makeRecord({ status: 'draft', disposition: 'repair' }))).toEqual([]);
  });
});
