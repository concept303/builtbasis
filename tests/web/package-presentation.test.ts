import { expect, it } from 'vitest';
import { codesOf } from '../../src/domain';
import { STATUS_GROUPS } from '../../src/web/packages/PackageStatusBar';
import { recordStatusFamily } from '../../src/web/core/StatusBadge';
it('puts every record status in one bar group and preserves approved colour families', () => {
  const statuses = STATUS_GROUPS.flatMap(group => group.statuses);
  expect([...statuses].sort()).toEqual(codesOf('status').sort());
  expect(new Set(statuses).size).toBe(statuses.length);
  expect(recordStatusFamily('ready_for_verification')).toBe('plum');
  expect(recordStatusFamily('closed')).toBe('green');
  expect(recordStatusFamily('on_hold')).toBe('amber');
});
