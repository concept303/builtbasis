import { expect, it } from 'vitest';
import { ApiError, errorText } from '../../src/web/core/api';

it('explains rejected record conditions in each interface language', () => {
  const error = new ApiError(422, 'transition_rejected', { errors: ['required:title', 'decision_required', 'verification_required'] });
  expect(errorText(error, 'en')).toContain('Record who decided');
  expect(errorText(error, 'el')).toContain('ημερομηνία απόφασης');
  expect(errorText(error, 'el')).not.toContain('decision_required');
});
it('does not render arbitrary error-detail payload as record content', () => {
  const error = new ApiError(422, 'rule_violation', { errors: ['INTERNAL_SENTINEL', { privateText: 'PRIVATE_SENTINEL' }] });
  expect(errorText(error, 'en')).not.toMatch(/INTERNAL_SENTINEL|PRIVATE_SENTINEL/);
});
