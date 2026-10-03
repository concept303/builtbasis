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

export function upload(f: Fixture, recordId: number, kind: 'photos' | 'attachments', parts: MultipartPart[], headers: Record<string, string> = {}) {
  const form = multipart(parts);
  return f.ctx.app.inject({
    method: 'POST',
    url: `${f.base}/records/${recordId}/${kind}`,
    headers: { cookie: f.cookie, origin: f.ctx.origin, 'content-type': form.contentType, ...headers },
    payload: form.body,
  });
}

export async function addAttachment(f: Fixture, recordId: number, metadata: object = {}, filename = 'plan.pdf', bytes = PDF) {
  const response = await upload(f, recordId, 'attachments', [
    { name: 'metadata', data: JSON.stringify(metadata) },
    { name: 'file', filename, data: bytes },
  ]);
  expect(response.statusCode, response.body).toBe(201);
  return response.json();
}

export async function addPhoto(f: Fixture, recordId: number, metadata: object = { phase: 'before' }) {
  const response = await upload(f, recordId, 'photos', [
    { name: 'metadata', data: JSON.stringify(metadata) },
    ...['original', 'display', 'thumbnail'].map(name => ({ name, filename: name === 'original' ? 'όψη.jpg' : `${name}.jpg`, data: JPEG })),
  ]);
  expect(response.statusCode, response.body).toBe(201);
  return response.json();
}
import { expect } from 'vitest';
import type { Fixture } from './record-fixture';
