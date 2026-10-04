import PostalMime from 'postal-mime';
import MsgModule from '@kenjiuno/msgreader';
import { htmlToText } from './emailText';
import { cleanFilename } from './helpers';
export interface EmailPreview { subject: string; from: string; to: string; date: string; body: string; attachments: { name: string; bytes: ArrayBuffer }[] }
export async function parseEmail(bytes: ArrayBuffer, reader: 'eml' | 'msg'): Promise<EmailPreview> {
  if (reader === 'eml') {
    const message = await PostalMime.parse(bytes, { forceRfc822Attachments: true, maxRfc822NestingDepth: 0 });
    const body = message.text?.trim() || htmlToText(message.html ?? '');
    if (!body) throw new Error('preview_unavailable');
    return { subject: message.subject ?? '', from: [message.from?.name, message.from?.address].filter(Boolean).join(' '),
      to: (message.to ?? []).map(value => 'address' in value ? [value.name, value.address].filter(Boolean).join(' ') : value.name).join(', '),
      date: message.date ?? '', body,
      attachments: message.attachments.map(value => ({ name: cleanFilename(value.filename ?? 'attachment'), bytes: typeof value.content === 'string' ? new TextEncoder().encode(value.content).buffer : value.content instanceof ArrayBuffer ? value.content : new Uint8Array(value.content).buffer })) };
  }
  // CJS interop differs between Node's tests and the browser bundle.
  const MsgReader = (MsgModule as unknown as { default?: typeof MsgModule }).default ?? MsgModule;
  const parser = new MsgReader(bytes);
  const message = parser.getFileData();
  if (message.error) throw new Error('preview_unavailable');
  const body = message.body?.trim() || htmlToText(message.bodyHtml ?? (message.html ? new TextDecoder().decode(message.html) : ''));
  if (!body) throw new Error('preview_unavailable');
  return { subject: message.subject ?? '', from: [message.senderName, message.senderEmail].filter(Boolean).join(' '),
    to: (message.recipients ?? []).map(value => [value.name, value.email].filter(Boolean).join(' ')).join(', '), date: message.messageDeliveryTime ?? '', body,
    attachments: (message.attachments ?? []).map(value => { const item = parser.getAttachment(value); return { name: cleanFilename(item.fileName), bytes: new Uint8Array(item.content).buffer }; }) };
}
