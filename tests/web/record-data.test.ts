import { beforeEach, expect, it, vi } from 'vitest';
import { api } from '../../src/web/core/api';
import { loadRecord } from '../../src/web/record/data';
vi.mock('../../src/web/core/api', () => ({ api: vi.fn() }));
const request = vi.mocked(api);
beforeEach(() => { request.mockReset(); });
it('loads shared content exclusively through the token projection', async () => {
  request.mockResolvedValue({ record: { humanId: 'T-0001' } });
  const signal = new AbortController().signal;
  const data = await loadRecord({ mode: 'shared', base: '/api/shared', token: 'test-token' }, signal);
  expect(request.mock.calls).toEqual([['/api/shared/record', { signal, token: 'test-token' }]]);
  expect(data.permissions).toEqual({ canUpload: false, canAddLog: false });
  expect(data.owner).toBeUndefined();
});
it('keeps contributor upload and Log permissions independent', async () => {
  request.mockResolvedValue({ record: {}, permissions: { canUpload: true, canAddLog: false } });
  const signal = new AbortController().signal;
  const data = await loadRecord({ mode: 'contributor', base: '/api/assigned-records/8' }, signal);
  expect(request.mock.calls).toEqual([['/api/assigned-records/8', { signal }]]);
  expect(data.permissions).toEqual({ canUpload: true, canAddLog: false });
  expect(data.owner).toBeUndefined();
});
it('does not convert a failed access refresh into stale content', async () => {
  request.mockRejectedValue(new Error('revoked'));
  await expect(loadRecord({ mode: 'shared', base: '/api/shared', token: 'test-token' }, new AbortController().signal)).rejects.toThrow('revoked');
});
