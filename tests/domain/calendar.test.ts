import { expect, it } from 'vitest';
import { calendarToday, calendarDayDifference, isOutstanding, isOverdue, isPastTarget } from '../../src/domain/calendar';

it.each([
  ['2026-10-06T20:59:59Z', '2026-10-06'], ['2026-10-06T21:00:00Z', '2026-10-07'],
  ['2026-12-01T21:59:59Z', '2026-12-01'], ['2026-12-01T22:00:00Z', '2026-12-02'],
])('uses Athens calendar date for %s', (instant, expected) => expect(calendarToday(new Date(instant))).toBe(expected));
it('counts calendar days across DST and rejects invalid dates', () => {
  expect(calendarDayDifference('2026-03-28', '2026-03-30')).toBe(2);
  expect(calendarDayDifference('2026-10-26', '2026-10-24')).toBe(-2);
  expect(() => calendarDayDifference('2026-02-30', '2026-03-01')).toThrow();
});
it('counts draft as outstanding and compares deadlines strictly', () => {
  expect(isOutstanding('draft')).toBe(true);
  for (const status of ['closed', 'cancelled', 'superseded'] as const) expect(isOutstanding(status)).toBe(false);
  expect(isOverdue('draft', '2026-10-05', '2026-10-06')).toBe(true);
  expect(isOverdue('open', '2026-10-06', '2026-10-06')).toBe(false);
  expect(isOverdue('closed', '2026-10-05', '2026-10-06')).toBe(false);
  expect(isOverdue('open', null, '2026-10-06')).toBe(false);
  expect(isPastTarget('planned', '2026-10-05', '2026-10-06')).toBe(true);
  for (const status of ['completed', 'cancelled'] as const) expect(isPastTarget(status, '2026-10-05', '2026-10-06')).toBe(false);
});
