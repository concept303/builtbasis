import { FILE_LIMITS, UPLOAD_REQUEST_LIMIT } from '../../domain/files';

export function captureTimestamp(date: unknown, offset: unknown): string | null {
  if (typeof date !== 'string' || typeof offset !== 'string' || offset === '-00:00') return null;
  const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(date);
  if (!match || !/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset) || (/^[+-]14:/.test(offset) && !offset.endsWith(':00'))) return null;
  const local = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
  const check = new Date(`${local}Z`);
  if (Number.isNaN(check.getTime()) || check.toISOString().slice(0, 19) !== local) return null;
  const instant = new Date(local + offset);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}
export function cleanFilename(value: string): string {
  return (value.split(/[\\/]/).at(-1) ?? '').replace(/[\x00-\x1f\x7f"]/g, '_').slice(0, 255) || 'download';
}
export function buildMultipart(kind: 'photos' | 'attachments', files: Record<string, Blob>, metadata: unknown, boundary = `builtbasis-${crypto.randomUUID()}`, limit = UPLOAD_REQUEST_LIMIT): { blob: Blob; contentType: string } {
  const names = kind === 'photos' ? ['original', 'display', 'thumbnail'] : ['file'];
  if (Object.keys(files).length !== names.length || names.some(name => !files[name])) throw new Error('invalid_upload');
  const parts: BlobPart[] = [`--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n${JSON.stringify(metadata)}\r\n`];
  for (const name of names) {
    const file = files[name]!;
    const purpose = kind === 'photos' ? `photo-${name}` as keyof typeof FILE_LIMITS : 'attachment';
    if (file.size > FILE_LIMITS[purpose]) throw new Error('upload_too_large');
    const filename = cleanFilename(file instanceof File ? file.name : `${name}.jpg`);
    const type = /^[\w.+-]+\/[\w.+-]+$/.test(file.type) ? file.type : 'application/octet-stream';
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`, file, '\r\n');
  }
  parts.push(`--${boundary}--\r\n`);
  const blob = new Blob(parts);
  if (blob.size > limit) throw new Error('upload_too_large');
  return { blob, contentType: `multipart/form-data; boundary=${boundary}` };
}
export function abortCheck(signal?: AbortSignal): void { signal?.throwIfAborted(); }
