import { parseEmail } from './email';
self.onmessage = async (event: MessageEvent<{ bytes: ArrayBuffer; reader: 'eml' | 'msg' }>) => {
  try {
    const result = await parseEmail(event.data.bytes, event.data.reader);
    self.postMessage({ result }, { transfer: result.attachments.map(item => item.bytes) });
  } catch { self.postMessage({ error: true }); }
};
