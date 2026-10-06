import { describe, expect, it } from 'vitest';
import { PACKAGE_STATUSES, PACKAGE_SORT_ORDER, WorkPackageCreate, WorkPackagePatch } from '../../src/domain/work-packages';

describe('work package contracts', () => {
  it('defaults create only and preserves prose', () => {
    expect(WorkPackageCreate.parse({ name: '  Tiles  ' })).toEqual({ name: 'Tiles', description: null, responsibleId: null, targetDate: null, status: 'planned' });
    expect(WorkPackagePatch.parse({})).toEqual({});
    expect(WorkPackagePatch.parse({ description: ' \n' })).toEqual({ description: null });
    expect(WorkPackagePatch.parse({ description: '  Line one\nLine two  ' }).description).toBe('  Line one\nLine two  ');
    expect(WorkPackagePatch.parse({ responsibleId: null })).toEqual({ responsibleId: null });
  });
  it.each([{ name: '' }, { name: ' ' }, { name: 'x'.repeat(201) }, { name: 'Tiles', targetDate: '2026-02-30' }, { name: 'Tiles', responsibleId: 0 }, { name: 'Tiles', status: 'closed' }, { name: 'Tiles', projectId: 1 }])('rejects invalid input %j', input => {
    expect(WorkPackageCreate.safeParse(input).success).toBe(false);
  });
  it('has five bilingual statuses and the approved order', () => {
    expect(PACKAGE_STATUSES.map(s => s.code)).toEqual(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']);
    for (const entry of PACKAGE_STATUSES) for (const key of ['en', 'el', 'defEn', 'defEl'] as const) expect(entry[key].length).toBeGreaterThan(3);
    expect(PACKAGE_SORT_ORDER).toEqual(['in_progress', 'planned', 'on_hold', 'completed', 'cancelled']);
  });
});
