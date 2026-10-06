import { expect, it } from 'vitest';
import { recordReturnPath } from '../../src/web/core/navigation';
it.each([
  ['?status=open', '/projects/4/records?status=open'],
  ['/projects/4/records?workPackageId=none', '/projects/4/records?workPackageId=none'],
  ['/projects/4/work-packages/7', '/projects/4/work-packages/7'],
])('preserves a safe return destination %s', (from, expected) => expect(recordReturnPath(4, from)).toBe(expected));
it.each([null, '', '//evil.test', 'https://evil.test', '/projects/5/records', '/projects/4/records/3', '/projects/4/records?from=https://evil.test', '/projects/4/records?next=/projects', '/projects/4/records?q=%ZZ', '/projects/4/records\\evil', '/projects/4/work-packages/0', '/projects/4/work-packages/7?from=x'])('rejects unsafe or malformed destination %s', from => expect(recordReturnPath(4, from)).toBe('/projects/4/records'));
