import { describe, expect, it } from 'vitest';
import { hasAName, LocationCreate, PersonCreate, PersonPatch, tagKey, TradeCreate } from '../../src/domain';

describe('managed-list names (design §3, §9)', () => {
  it('needs at least one of the English and Greek names', () => {
    expect(hasAName({ nameEn: 'Kitchen', nameEl: '' })).toBe(true);
    expect(hasAName({ nameEn: '', nameEl: 'Κουζίνα' })).toBe(true);
    expect(hasAName({ nameEn: '  ', nameEl: '' })).toBe(false);
  });

  it('matches tag names ignoring case, spacing, accents and final sigma (design §9.3)', () => {
    expect(tagKey('  Πέτρα ')).toBe(tagKey('ΠΕΤΡΑ'));
    expect(tagKey('Μόνωση  -  Στεγάνωση')).toBe(tagKey('ΜΟΝΩΣΗ - ΣΤΕΓΑΝΩΣΗ'));
    expect(tagKey('Γκαραζόπορτας')).toBe(tagKey('γκαραζοπορτασ'));
    expect(tagKey('Pool Deck')).toBe(tagKey('pool deck'));
    expect(tagKey('Πέτρα')).not.toBe(tagKey('Πέτρες'));
    expect(tagKey('   ')).toBeNull();
  });
});

describe('managed-list input schemas', () => {
  it('trims text and stores empty optional text as null', () => {
    expect(PersonCreate.parse({ code: ' ARCH-MK ', name: ' Architect ', role: 'architect', email: '' })).toEqual({
      code: 'ARCH-MK',
      name: 'Architect',
      role: 'architect',
      email: null,
    });
  });

  it('rejects unknown codes and unknown fields', () => {
    expect(PersonCreate.safeParse({ code: 'X', name: 'X', role: 'boss' }).success).toBe(false);
    expect(PersonCreate.safeParse({ code: 'X', name: 'X', role: 'other', salary: 1 }).success).toBe(false);
    expect(LocationCreate.safeParse({ kind: 'room', nameEn: 'Kitchen' }).success).toBe(false);
    expect(LocationCreate.safeParse({ kind: 'space', nameEn: 'Kitchen' }).success).toBe(true);
  });

  it('contains only the fields that were sent (no defaults that would overwrite on update)', () => {
    expect(PersonPatch.parse({ active: false })).toEqual({ active: false });
    expect(TradeCreate.parse({ code: 'TIL' })).toEqual({ code: 'TIL' });
  });
});
