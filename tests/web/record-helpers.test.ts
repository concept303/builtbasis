import { describe, expect, it } from 'vitest';
import { changedPatch, localInput, measurementGroups, displayValue, signedBar } from '../../src/web/record/helpers';

describe('record form boundaries', () => {
  it('preserves text and omits unchanged hidden estimates', () => {
    expect(changedPatch({ title: 'old', outsideScope: true, estimatedCost: 12 }, { title: '  New\ntext ', outsideScope: false, estimatedCost: 12 })).toEqual({ title: '  New\ntext ', outsideScope: false });
  });
  it('does not clear arrays merely because their identities differ', () => {
    expect(changedPatch({ tagIds: [4, 8] }, { tagIds: [4, 8] })).toEqual({});
  });
  it('retains the saved estimate when an edited amount is hidden by unticking scope', () => {
    expect(changedPatch({ outsideScope: true, estimatedCost: 12 }, { outsideScope: false, estimatedCost: 25 })).toEqual({ outsideScope: false });
  });
  it('groups comparisons by normalized labels and exact units', () => {
    expect(measurementGroups([{ item: ' Left ', quantity: ' Stone  width ', unit: 'mm', value: 1 }, { item: 'left', quantity: 'stone width', unit: 'mm', value: 2 }, { item: 'left', quantity: 'stone width', unit: 'cm', value: 3 }])).toHaveLength(2);
  });
  it('formats person and vocabulary values without internal IDs', () => {
    expect(displayValue('ballInCourtId', 4, 'en', [{ id: 4, name: 'Alex' }])).toBe('Alex');
    expect(displayValue('status', 'in_progress', 'en', [])).toBe('In progress');
    expect(displayValue('instructionText', 'Keep  spacing\nexactly', 'en', [])).toBe('Keep  spacing\nexactly');
  });
  it('builds local datetime input without losing minutes', () => {
    expect(localInput(new Date(2026, 4, 2, 12, 34))).toBe('2026-05-02T12:34');
  });
  it('draws negative values to the left and positive values to the right of zero', () => {
    expect(signedBar(-5, 10)).toEqual({ left: 25, width: 25 });
    expect(signedBar(5, 10)).toEqual({ left: 50, width: 25 });
    expect(signedBar(0, 1)).toEqual({ left: 50, width: 0 });
  });
});
