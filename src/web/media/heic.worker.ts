import { heicTo } from 'heic-to/csp';
self.onmessage = async (event: MessageEvent<Blob>) => {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await heicTo({ blob: event.data, type: 'bitmap' });
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('preview_unavailable');
    context.drawImage(bitmap, 0, 0);
    const result = await canvas.convertToBlob({ type: 'image/jpeg', quality: .9 });
    canvas.width = canvas.height = 0;
    self.postMessage({ result });
  } catch { self.postMessage({ error: true }); }
  finally { bitmap?.close(); }
};
