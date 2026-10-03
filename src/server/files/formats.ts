import { extname } from 'node:path';
import type { FilePurpose } from '../../domain';
import { HttpError } from '../errors';

const begins = (bytes: Buffer, signature: Buffer) => bytes.subarray(0, signature.length).equals(signature);
const dwg = new Set(['AC1006','AC1009','AC1012','AC1014','AC1015','AC1018','AC1021','AC1024','AC1027','AC1032']);
function isHeic(bytes: Buffer): boolean {
  if (bytes.length < 16 || bytes.toString('ascii', 4, 8) !== 'ftyp') return false;
  const size = bytes.readUInt32BE(0);
  if (size < 16 || size > bytes.length || size % 4 !== 0) return false;
  const brands = [bytes.toString('ascii', 8, 12)];
  for (let at = 16; at < size; at += 4) brands.push(bytes.toString('ascii', at, at + 4));
  return brands.some(brand => ['heic','heix','hevc','hevx'].includes(brand));
}

/** Bounded format screening, not document validation or malware scanning. */
export function detectFormat(bytes: Buffer, filename: string, purpose: FilePurpose): string {
  const ext = extname(filename).toLowerCase();
  let mime: string | undefined;
  if (['.jpg','.jpeg'].includes(ext) && begins(bytes, Buffer.from('ffd8ff', 'hex'))) mime = 'image/jpeg';
  else if (ext === '.png' && begins(bytes, Buffer.from('89504e470d0a1a0a', 'hex'))) mime = 'image/png';
  else if (['.heic','.heif'].includes(ext) && isHeic(bytes)) mime = 'image/heic';
  else if (purpose === 'attachment') {
    if (ext === '.pdf' && begins(bytes, Buffer.from('%PDF-'))) mime = 'application/pdf';
    else if (ext === '.rtf' && begins(bytes, Buffer.from('{\\rtf'))) mime = 'application/rtf';
    else if (['.doc','.xls','.ppt'].includes(ext) && begins(bytes, Buffer.from('d0cf11e0a1b11ae1', 'hex'))) mime = 'application/x-cfb';
    else if (['.docx','.xlsx','.pptx','.odt','.ods','.odp'].includes(ext) && begins(bytes, Buffer.from('504b0304', 'hex'))) mime = 'application/zip';
    else if (ext === '.dwg' && dwg.has(bytes.toString('ascii', 0, 6))) mime = 'application/octet-stream';
  }
  if (!mime || ((purpose === 'photo-display' || purpose === 'photo-thumbnail') && mime !== 'image/jpeg')) throw new HttpError(415, 'unsupported_file_type');
  return mime;
}
