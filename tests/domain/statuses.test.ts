import { describe, expect, it } from 'vitest';
import { isActive, isNonTerminal, statusesFor } from '../../src/domain/statuses';

describe('status sets (design §7.2, §8)', () => {
  it('Quality Issue and Task use every status except Superseded', () => {
    for (const subtype of ['quality_issue', 'task'] as const) {
      const statuses = statusesFor(subtype);
      expect(statuses).toHaveLength(9);
      expect(statuses).not.toContain('superseded');
    }
  });

  it('Detail Clarification uses all 10 statuses', () => {
    expect(statusesFor('detail_clarification')).toHaveLength(10);
    expect(statusesFor('detail_clarification')).toContain('superseded');
  });

  it('active statuses are all except Draft, Cancelled and Superseded', () => {
    expect(isActive('draft')).toBe(false);
    expect(isActive('cancelled')).toBe(false);
    expect(isActive('superseded')).toBe(false);
    expect(isActive('open')).toBe(true);
    expect(isActive('on_hold')).toBe(true);
    expect(isActive('closed')).toBe(true);
  });

  it('non-terminal statuses are all except Closed, Cancelled and Superseded', () => {
    expect(isNonTerminal('closed')).toBe(false);
    expect(isNonTerminal('cancelled')).toBe(false);
    expect(isNonTerminal('superseded')).toBe(false);
    expect(isNonTerminal('draft')).toBe(true);
    expect(isNonTerminal('ready_for_verification')).toBe(true);
  });
});
