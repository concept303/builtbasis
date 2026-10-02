import { describe, expect, it } from 'vitest';
import {
  compareItems,
  compareOverTime,
  duplicateRowKeys,
  normalizeLabel,
  orderSets,
  type MeasurementSet,
} from '../../src/domain/measurements';

const before: MeasurementSet = {
  id: 1,
  date: '2026-09-14',
  phase: 'before',
  rows: [
    { item: 'Left side', quantity: 'Stone thickness', value: 18, unit: 'cm' },
    { item: 'Right side', quantity: 'Stone thickness', value: 15.3, unit: 'cm' },
    { item: 'Top', quantity: 'Stone thickness', value: 20, unit: 'cm' },
    { item: 'Left side', quantity: 'White depth', value: 40.5, unit: 'cm' },
    { item: 'Left side', quantity: 'Stone thickness', value: 180, unit: 'mm' },
  ],
};
const after: MeasurementSet = {
  id: 2,
  date: '2026-10-20',
  phase: 'after',
  rows: [{ item: 'left  SIDE', quantity: 'stone thickness ', value: 15.5, unit: 'cm' }],
};

describe('measurement labels (design §5.7)', () => {
  it('normalises by trimming, collapsing whitespace and ignoring case, including Greek', () => {
    expect(normalizeLabel('  Stone   THICKNESS ')).toBe('stone thickness');
    expect(normalizeLabel('Πάχος  ΠΈΤΡΑΣ')).toBe(normalizeLabel('πάχος πέτρας'));
  });

  it('finds duplicate Item + Quantity + Unit rows within a set', () => {
    const rows = [
      { item: 'Left side', quantity: 'Width', value: 1, unit: 'cm' as const },
      { item: 'left  side', quantity: 'WIDTH', value: 2, unit: 'cm' as const },
      { item: 'Left side', quantity: 'Width', value: 3, unit: 'mm' as const },
    ];
    expect(duplicateRowKeys(rows)).toHaveLength(1);
    expect(duplicateRowKeys(before.rows)).toEqual([]);
  });
});

describe('set order (design §5.7)', () => {
  it('orders by date, then by set id', () => {
    const sets = [
      { id: 5, date: '2026-10-01' },
      { id: 3, date: '2026-10-01' },
      { id: 9, date: '2026-09-01' },
    ];
    expect(orderSets(sets).map((set) => set.id)).toEqual([9, 3, 5]);
  });
});

describe('comparison views (design §5.7)', () => {
  it('between items: same quantity and unit, difference from the first item', () => {
    expect(compareItems(before, 'stone thickness', 'cm')).toEqual([
      { item: 'Left side', value: 18, diffFromFirst: 0 },
      { item: 'Right side', value: 15.3, diffFromFirst: expect.closeTo(-2.7, 10) },
      { item: 'Top', value: 20, diffFromFirst: 2 },
    ]);
    expect(compareItems(before, 'Slope', 'percent')).toEqual([]);
  });

  it('between items: keeps sub-millimetre differences (no rounding in the domain)', () => {
    const set: MeasurementSet = {
      id: 3,
      date: '2026-10-21',
      phase: 'other',
      rows: [
        { item: 'A', quantity: 'Level', value: 1, unit: 'm' },
        { item: 'B', quantity: 'Level', value: 1.0004, unit: 'm' },
      ],
    };
    expect(compareItems(set, 'Level', 'm')[1]?.diffFromFirst).toBeCloseTo(0.0004, 10);
  });

  it('over time: same item, quantity and unit across sets, later minus earlier', () => {
    expect(compareOverTime([after, before], 'Left side', 'Stone thickness', 'cm')).toEqual([
      { setId: 1, date: '2026-09-14', phase: 'before', value: 18, changeFromPrevious: null },
      { setId: 2, date: '2026-10-20', phase: 'after', value: 15.5, changeFromPrevious: -2.5 },
    ]);
  });

  it('over time: keeps sub-millimetre changes', () => {
    const first: MeasurementSet = {
      id: 4,
      date: '2026-10-01',
      phase: 'before',
      rows: [{ item: 'A', quantity: 'Level', value: 1, unit: 'm' }],
    };
    const second: MeasurementSet = {
      id: 5,
      date: '2026-10-02',
      phase: 'after',
      rows: [{ item: 'A', quantity: 'Level', value: 1.0004, unit: 'm' }],
    };
    expect(compareOverTime([first, second], 'A', 'Level', 'm')[1]?.changeFromPrevious).toBeCloseTo(0.0004, 10);
  });

  it('over time: skips sets without a matching row and never mixes units', () => {
    expect(compareOverTime([before, after], 'Left side', 'Stone thickness', 'mm')).toEqual([
      { setId: 1, date: '2026-09-14', phase: 'before', value: 180, changeFromPrevious: null },
    ]);
  });
});
