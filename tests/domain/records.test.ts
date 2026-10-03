import { describe, expect, it } from 'vitest';
import {
  fieldsNotApplicable,
  foldText,
  hasDecision,
  LogEntryBody,
  MeasurementSetBody,
  RecordCreate,
  RecordPatch,
  tagKey,
  TransitionBody,
} from '../../src/domain';

describe('record input schemas (design §5, §6)', () => {
  it('stores typed text exactly as typed; empty text becomes null', () => {
    expect(RecordPatch.parse({ title: '  Door frame ', description: '', instructionText: '   ' })).toEqual({
      title: '  Door frame ',
      description: null,
      instructionText: null,
    });
  });

  it('contains only the fields that were sent', () => {
    expect(RecordPatch.parse({ safety: true })).toEqual({ safety: true });
    expect(RecordCreate.parse({ subtype: 'task' })).toEqual({ subtype: 'task' });
  });

  it('checks codes, dates, completion steps and euro amounts', () => {
    const invalid = [
      { severity: 'huge' },
      { dueDate: '2026-13-01' },
      { completion: 55 },
      { completion: 110 },
      { estimatedCost: 10.005 },
      { estimatedCost: -1 },
      { problemTypes: ['defect', 'leak'] },
      { title: 'x'.repeat(201) },
    ];
    for (const patch of invalid) expect(RecordPatch.safeParse(patch).success, JSON.stringify(patch)).toBe(false);
    expect(RecordPatch.parse({ completion: 60, estimatedCost: 1250.5, dueDate: '2026-11-30' })).toEqual({
      completion: 60,
      estimatedCost: 1250.5,
      dueDate: '2026-11-30',
    });
  });

  it('drops duplicate ids and problem types', () => {
    expect(RecordPatch.parse({ tagIds: [3, 1, 3], problemTypes: ['defect', 'defect'] })).toEqual({
      tagIds: [3, 1],
      problemTypes: ['defect'],
    });
  });

  it('rejects unknown fields, status and a missing or unknown subtype', () => {
    expect(RecordPatch.safeParse({ status: 'closed' }).success).toBe(false);
    expect(RecordPatch.safeParse({ colour: 'red' }).success).toBe(false);
    expect(RecordCreate.safeParse({ title: 'No subtype' }).success).toBe(false);
    expect(RecordCreate.safeParse({ subtype: 'snag' }).success).toBe(false);
    expect(RecordCreate.safeParse({ subtype: 'task', colour: 'red' }).success).toBe(false);
  });
});

describe('fields per subtype (design §5.6, §6)', () => {
  it('knows which fields each subtype has', () => {
    const fields = ['title', 'problemTypes', 'question', 'issuedById', 'decidedById', 'instructionText'];
    expect(fieldsNotApplicable('quality_issue', fields)).toEqual(['question', 'issuedById']);
    expect(fieldsNotApplicable('detail_clarification', fields)).toEqual(['problemTypes']);
    expect(fieldsNotApplicable('task', fields)).toEqual([
      'problemTypes',
      'question',
      'issuedById',
      'decidedById',
      'instructionText',
    ]);
    expect(['quality_issue', 'detail_clarification', 'task'].map((s) => hasDecision(s as never))).toEqual([
      true,
      true,
      false,
    ]);
  });
});

describe('other record bodies', () => {
  it('accepts a transition with a verification and rejects unknown statuses', () => {
    const body = { to: 'closed', verification: { checkedById: 4, date: '2026-10-03', method: 'visual' } };
    expect(TransitionBody.parse(body)).toEqual(body);
    expect(TransitionBody.safeParse({ to: 'finished' }).success).toBe(false);
  });

  it('requires measurement labels with more than whitespace, and a unit code', () => {
    const set = { date: '2026-09-14', phase: 'before', rows: [{ item: 'Left', quantity: 'Width', value: 18, unit: 'mm' }] };
    expect(MeasurementSetBody.parse(set)).toEqual(set);
    expect(MeasurementSetBody.safeParse({ ...set, rows: [{ ...set.rows[0], item: '  ' }] }).success).toBe(false);
    expect(MeasurementSetBody.safeParse({ ...set, rows: [{ ...set.rows[0], unit: 'inch' }] }).success).toBe(false);
  });

  it('accepts log times with an offset and requires the entry text', () => {
    expect(LogEntryBody.parse({ eventAt: '2026-05-01T09:30:00+03:00', text: 'Architect sent plans' })).toEqual({
      eventAt: '2026-05-01T09:30:00+03:00',
      text: 'Architect sent plans',
    });
    expect(LogEntryBody.safeParse({ text: '' }).success).toBe(false);
    expect(LogEntryBody.safeParse({ eventAt: '2026-05-01', text: 'x' }).success).toBe(false);
  });
});

describe('text folding', () => {
  it('ignores case, spacing, accents and final sigma; tag keys use the same folding', () => {
    expect(foldText('  Πόρτα  ΚΟΥΖΙΝΑΣ ')).toBe('πορτα κουζινασ');
    expect(foldText('Πόρτα κουζίνας')).toBe(foldText('ΠΟΡΤΑ ΚΟΥΖΙΝΑΣ'));
    expect(tagKey('Πέτρα')).toBe(foldText('ΠΕΤΡΑ'));
  });
});
