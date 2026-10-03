import { expect, it } from 'vitest';
import { logDateFields, logTimestamp } from '../../src/web/record/helpers';

it.each(['2026-04-04T16:30:47.123Z', '2026-10-04T02:15:16.789Z'])('preserves exact original milliseconds when displayed event time is unchanged: %s', original => {
  const fields = logDateFields(original);
  expect(logTimestamp(fields.local, fields.offset, { original, ...fields })).toBe(original);
});
it('distinguishes both Melbourne repeated-hour instants using an explicit offset', () => {
  expect(logTimestamp('2026-04-05T02:30:47.123', '+11:00')).toBe('2026-04-04T15:30:47.123Z');
  expect(logTimestamp('2026-04-05T02:30:47.123', '+10:00')).toBe('2026-04-04T16:30:47.123Z');
});
it('rejects missing, invalid and impossible offsets or calendar dates', () => {
  for (const offset of ['', '+25:00', '+14:01', '+10:65']) expect(() => logTimestamp('2026-04-05T02:30', offset)).toThrow(RangeError);
  expect(() => logTimestamp('2026-02-30T02:30', '+10:00')).toThrow(RangeError);
});
