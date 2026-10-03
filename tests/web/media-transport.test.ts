import { afterEach, expect, it, vi } from 'vitest';
import { uploadEvidence } from '../../src/web/media/transport';

afterEach(() => vi.unstubAllGlobals());
it('keeps a successful upload with unreadable JSON in the unknown-outcome path', async () => {
  class TruncatedResponse {
    upload = { onprogress: null }; status = 201; responseText = '{';
    onload?: () => void;
    open() {} setRequestHeader() {} abort() {}
    send() { queueMicrotask(() => this.onload?.()); }
  }
  vi.stubGlobal('XMLHttpRequest', TruncatedResponse);
  await expect(uploadEvidence({ mode: 'owner', base: '/api/projects/1/records/1' }, 'attachments', { file: new File(['synthetic'], 'note.txt') }, {})).rejects.toMatchObject({ status: 0, code: 'response_unknown' });
});
