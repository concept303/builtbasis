import { describe, expect, it } from 'vitest';
import { parseEmail } from '../../src/web/media/email';
import { burn } from '@kenjiuno/msgreader/lib/Burner';

const arrayBuffer = (text: string) => new TextEncoder().encode(text).buffer;
describe('email parsing', () => {
  it('reads encoded headers, strips active HTML and exposes embedded original bytes only', async () => {
    const message = ['From: Sender <sender@example.test>', 'To: Reader <reader@example.test>', 'Subject: =?UTF-8?B?U3ludGhldGljIOKckw==?=', 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary=outer', '', '--outer', 'Content-Type: text/html; charset=utf-8', '', '<p>Hello &amp; safe</p><script>evil()</script><img src="https://tracker.invalid/pixel">', '--outer', 'Content-Type: message/rfc822', 'Content-Disposition: attachment; filename="nested.eml"', '', 'Subject: Nested', '', 'Nested original body', '--outer--', ''].join('\r\n');
    const parsed = await parseEmail(arrayBuffer(message), 'eml');
    expect(parsed.subject).toBe('Synthetic ✓');
    expect(parsed.body).toBe('Hello & safe');
    expect(parsed.attachments[0]?.name).toBe('nested.eml');
    expect(new TextDecoder().decode(parsed.attachments[0]?.bytes)).toContain('Nested original body');
  });
  it('reads a genuine compound MSG with Unicode fields', async () => {
    const values = [['__substg1.0_0037001F', 'Synthetic MSG ✓'], ['__substg1.0_1000001F', 'Message body'], ['__substg1.0_0C1A001F', 'Sender']];
    const entries = [{ name: 'Root Entry', type: 5, children: [1, 2, 3], length: 0 }, ...values.map(([name, value]) => {
      const bytes = new Uint8Array(Buffer.from(value! + '\0', 'utf16le')); return { name: name!, type: 2, length: bytes.length, binaryProvider: () => bytes };
    })];
    const bytes = burn(entries);
    const result = await parseEmail(new Uint8Array(bytes).buffer, 'msg');
    expect(result.subject).toBe('Synthetic MSG ✓'); expect(result.body).toBe('Message body');
  });
  it('rejects malformed MSG and unsupported RTF-only or encrypted EML', async () => {
    await expect(parseEmail(arrayBuffer('broken'), 'msg')).rejects.toThrow();
    await expect(parseEmail(arrayBuffer('Subject: Encrypted\r\nContent-Type: application/pkcs7-mime\r\n\r\nYWJj'), 'eml')).rejects.toThrow('preview_unavailable');
  });
});
