import { describe, expect, it } from 'vitest';
import * as domain from '../../src/domain';

describe('domain public exports', () => {
  it('exposes the rules, IDs, vocabulary and measurement functions', () => {
    for (const name of [
      'checkTransition',
      'allowedTargets',
      'validateSave',
      'missingRequired',
      'formatHumanId',
      'statusesFor',
      'labelOf',
      'definitionOf',
      'isCode',
      'compareItems',
      'compareOverTime',
      'duplicateRowKeys',
    ]) {
      expect(typeof (domain as unknown as Record<string, unknown>)[name], name).toBe('function');
    }
  });
});
