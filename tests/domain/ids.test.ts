import { describe, expect, it } from 'vitest';
import { formatHumanId } from '../../src/domain/ids';

describe('formatHumanId (design §4.2)', () => {
  it('uses the subtype prefix and a 4-digit sequence', () => {
    expect(formatHumanId('quality_issue', 1)).toBe('QI-0001');
    expect(formatHumanId('detail_clarification', 7)).toBe('DC-0007');
    expect(formatHumanId('task', 12)).toBe('T-0012');
  });

  it('never truncates sequences above 9999', () => {
    expect(formatHumanId('task', 12345)).toBe('T-12345');
  });

  it('rejects non-positive or fractional sequences', () => {
    expect(() => formatHumanId('task', 0)).toThrow(RangeError);
    expect(() => formatHumanId('task', 1.5)).toThrow(RangeError);
  });
});
