import { describe, expect, it } from 'vitest';
import {
  LIST_KEYS,
  codesOf,
  definitionOf,
  entriesOf,
  isCode,
  labelOf,
  type ListKey,
} from '../../src/domain/vocab';

// Pins the design §7 lists: a changed count means the design and the code disagree.
const EXPECTED_COUNTS: Record<ListKey, number> = {
  subtype: 3,
  status: 10,
  onHoldReason: 6,
  cancellationReason: 5,
  problemType: 6,
  stage: 4,
  disposition: 4,
  route: 5,
  severity: 3,
  priority: 4,
  personRole: 8,
  locationNodeKind: 4,
  measurementPhase: 3,
  unit: 8,
  photoPhase: 3,
  verificationMethod: 4,
  verificationOutcome: 2,
};

describe('vocabulary (design §7)', () => {
  it('contains exactly the 17 value lists', () => {
    expect([...LIST_KEYS].sort()).toEqual(Object.keys(EXPECTED_COUNTS).sort());
  });

  it.each(Object.entries(EXPECTED_COUNTS))('%s has %i values', (key, count) => {
    expect(entriesOf(key as ListKey)).toHaveLength(count);
  });

  it('every value in every list has a code, EN/EL labels and EN/EL definitions', () => {
    for (const key of LIST_KEYS) {
      for (const entry of entriesOf(key)) {
        expect(entry.code, key).toMatch(/^[a-z0-9_]+$/);
        for (const field of ['en', 'el', 'defEn', 'defEl'] as const) {
          expect(entry[field].trim(), `${key}.${entry.code}.${field}`).not.toBe('');
        }
      }
    }
  });

  it('codes are unique within each list', () => {
    for (const key of LIST_KEYS) {
      const codes = codesOf(key);
      expect(new Set(codes).size, key).toBe(codes.length);
    }
  });

  it('carries no markdown emphasis from the design tables', () => {
    for (const key of LIST_KEYS) {
      for (const entry of entriesOf(key)) {
        expect(`${entry.defEn} ${entry.defEl}`, `${key}.${entry.code}`).not.toMatch(/(^|\s)_\S/);
      }
    }
  });

  it('looks up labels and definitions by language', () => {
    expect(labelOf('status', 'in_progress', 'en')).toBe('In progress');
    expect(labelOf('status', 'in_progress', 'el')).toBe('Σε εξέλιξη');
    expect(labelOf('disposition', 'repair', 'el')).toBe('Επισκευή');
    expect(definitionOf('disposition', 'repair', 'en')).toContain('Decided by');
  });

  it('recognises valid codes and rejects unknown ones', () => {
    expect(isCode('severity', 'critical')).toBe(true);
    expect(isCode('severity', 'urgent')).toBe(false);
    expect(isCode('severity', 42)).toBe(false);
    expect(() => labelOf('severity', 'nope', 'en')).toThrow(RangeError);
  });
});
