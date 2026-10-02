import type { RecordState } from '../../src/domain/record-rules';

/** A complete, open Quality Issue; override any field per test. */
export function makeRecord(overrides: Partial<RecordState> = {}): RecordState {
  return {
    subtype: 'quality_issue',
    status: 'open',
    statusBeforeHold: null,
    title: 'Stone step at entrance',
    problemTypes: ['defect'],
    question: null,
    disposition: null,
    decidedById: null,
    decidedOn: null,
    ...overrides,
  };
}
