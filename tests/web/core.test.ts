import { afterEach, expect, it, vi } from 'vitest';
import { api, ApiError, errorText, isUnknownOutcome } from '../../src/web/core/api';
afterEach(() => vi.unstubAllGlobals());
it('treats an unreadable successful response as an unknown outcome', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{', { status: 201 })));
  await expect(api('/api/projects/1/records', { method: 'POST', body: { subtype: 'task' } })).rejects.toMatchObject({ status: 0, code: 'response_unknown' });
});
it('distinguishes unknown write outcomes from confirmed request rejections', () => {
  for (const failure of [new TypeError('Failed to fetch'), new DOMException('Aborted', 'AbortError'), new ApiError(0, 'request_failed'), new ApiError(500, 'internal_error'), new ApiError(503, 'request_failed')]) expect(isUnknownOutcome(failure)).toBe(true);
  for (const status of [400, 401, 403, 404, 409, 413, 415, 429]) expect(isUnknownOutcome(new ApiError(status, 'rejected'))).toBe(false);
  expect(isUnknownOutcome(new ApiError(507, 'storage_capacity'))).toBe(false);
});
it('sends JSON for logout and deletes to satisfy the authenticated write contract', async () => {
  const fetcher = vi.fn().mockImplementation(async () => new Response('{}'));
  vi.stubGlobal('fetch', fetcher);
  await api('/api/auth/logout', { method: 'POST' });
  await api('/api/projects/1/tags/2', { method: 'DELETE' });
  for (const call of fetcher.mock.calls) expect(call[1]).toMatchObject({ headers: { 'Content-Type': 'application/json' }, body: '{}' });
});
it('separates bearer reads from cookies and never retries failed writes', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
  vi.stubGlobal('fetch', fetcher);
  await api('/api/shared/record', { token: 'secret' });
  expect(fetcher.mock.calls[0]![1]).toMatchObject({ credentials: 'omit', headers: { Authorization: 'Bearer secret' } });
  fetcher.mockResolvedValue(new Response('{"error":"invalid_input","details":[{"path":"title","message":"private"}]}', { status: 400 }));
  await expect(api('/api/projects/1/records', { method: 'POST', body: { subtype: 'task' } })).rejects.toMatchObject({ status: 400, code: 'invalid_input' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1]![1]).toMatchObject({ credentials: 'same-origin', body: '{"subtype":"task"}' });
});
it('maps errors in both languages without exposing raw details or unknown codes', () => {
  for (const code of ['invalid_input', 'storage_capacity', 'upload_too_large', 'unexpected_private_detail']) {
    const error = new ApiError(400, code, { message: 'SECRET' });
    expect(errorText(error, 'en')).not.toBe(errorText(error, 'el'));
    expect(errorText(error, 'en')).not.toContain('SECRET');
    expect(errorText(error, 'el')).not.toContain(code);
  }
});
