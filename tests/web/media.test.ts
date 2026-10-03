import { describe, expect, it } from 'vitest';
import { captureTimestamp, cleanFilename, buildMultipart } from '../../src/web/media/helpers';
import { htmlToText } from '../../src/web/media/emailText';

describe('media capture dates', () => {
  it('requires a real date and explicit offset, preserving the instant', () => {
    expect(captureTimestamp('2026:10:04 13:15:16', '+11:00')).toBe('2026-10-04T02:15:16.000Z');
    expect(captureTimestamp('2026:10:04 13:15:16', undefined)).toBeNull();
    expect(captureTimestamp(new Date(), '+11:00')).toBeNull();
    expect(captureTimestamp('2026:02:30 13:15:16', '+11:00')).toBeNull();
    expect(captureTimestamp('2026:10:04 13:15:16', '+25:00')).toBeNull();
    expect(captureTimestamp('2026:10:04 13:15:16', '-00:00')).toBeNull();
  });
});
describe('media multipart', () => {
  it('counts headers, UTF-8 metadata, copies and closing boundary in the actual body', async () => {
    const original = new File(['original'], 'Ελληνικά.jpg', { type: 'image/jpeg' });
    const body = buildMultipart('photos', { original, display: new Blob(['display']), thumbnail: new Blob(['thumb']) }, { phase: 'before', caption: 'Ελληνικά' }, 'boundary');
    const text = await body.blob.text();
    expect(body.blob.size).toBe(new TextEncoder().encode(text).length);
    expect(text).toContain('name="original"; filename="Ελληνικά.jpg"');
    expect(text).toContain('name="display"; filename="display.jpg"');
    expect(text).toContain('name="metadata"');
    expect(text.endsWith('--boundary--\r\n')).toBe(true);
    expect(() => buildMultipart('attachments', { file: original, extra: original }, {})).toThrow();
  });
  it('rejects actual envelope overflow even when original alone fits', () => {
    const file = new File(['1234567890'], 'test.txt');
    const exact = buildMultipart('attachments', { file }, {}, 'boundary').blob.size;
    expect(() => buildMultipart('attachments', { file }, {}, 'boundary', exact - 1)).toThrow('upload_too_large');
    expect(buildMultipart('attachments', { file }, {}, 'boundary', exact).blob.size).toBe(exact);
  });
  it('cleans embedded filenames without exposing directory or control text', () => {
    expect(cleanFilename('../a\\bad\r\n".eml')).toBe('bad___.eml');
    expect(cleanFilename('')).toBe('download');
  });
});
describe('inert email HTML', () => {
  it('extracts text without script, style, template, or remote fetching', () => {
    expect(htmlToText('<p>Hello &amp; safe</p><img src="https://tracker.invalid/pixel"><script>evil()</script><style>secret</style><template>hidden</template><p>Next</p>')).toBe('Hello & safe\nNext');
  });
});
