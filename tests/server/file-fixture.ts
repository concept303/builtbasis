export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]);
export const PNG = Buffer.from('89504e470d0a1a0a0000000049454e44ae426082', 'hex');
export const PDF = Buffer.from('%PDF-1.7\nsynthetic fixture\n%%EOF');
export const OLE = Buffer.from('d0cf11e0a1b11ae100000000', 'hex');
export const ZIP = Buffer.from('504b030400000000', 'hex');
export const HEIC = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(4), Buffer.from('mif1heic')]);
export interface MultipartPart { name: string; filename?: string; data: Buffer | string; type?: string }
export function multipart(parts: MultipartPart[]) {
  const boundary = 'bb-synthetic-boundary';
  const chunks: Buffer[] = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"${part.filename === undefined ? '' : `; filename="${part.filename}"`}\r\n${part.filename === undefined ? '' : `Content-Type: ${part.type ?? 'application/octet-stream'}\r\n`}\r\n`));
    chunks.push(Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data), Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}
