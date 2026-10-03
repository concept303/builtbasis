import { extname } from 'node:path';
import { ACCEPTED_ATTACHMENT_EXTENSIONS, type AttachmentCapabilities, type FilePurpose } from '../../domain';
import { HttpError } from '../errors';
import { hasSvgRoot } from './svg-prefix';

/** Named positive vendor formats plus retained v1 formats. Storage acceptance is not document validation. */
export const ATTACHMENT_EXTENSIONS = new Set(ACCEPTED_ATTACHMENT_EXTENSIONS);
const extension = (filename: string) => extname(filename).slice(1).toLowerCase();
const begins = (bytes: Buffer, hex: string) => bytes.subarray(0, hex.length / 2).equals(Buffer.from(hex, 'hex'));
const native: Record<string, [AttachmentCapabilities['kind'], string, string]> = {};
function formats(extensions: string, kind: AttachmentCapabilities['kind'], mediaType: string, canonical = mediaType): void {
  for (const ext of extensions.split(' ')) native[ext] = [kind, mediaType, canonical];
}
formats('jpg jpeg jpe jfif','image','image/jpeg');
formats('png','image','image/png');
formats('heic heif','image','image/heic');
formats('gif','image','image/gif');
formats('bmp','image','image/bmp');
formats('ico','image','image/x-icon');
formats('webp','image','image/webp');
formats('tif tiff','image','image/tiff');
formats('svg','image','image/svg+xml');
formats('pdf','pdf','application/pdf');
formats('mp4','video','video/mp4','application/mp4');
formats('mov','video','video/quicktime','application/mp4');
formats('m4a','audio','audio/mp4','application/mp4');
formats('webm','video','video/webm','application/x-ebml');
formats('mkv','video','video/x-matroska','application/x-ebml');
formats('avi','video','video/x-msvideo');
formats('flv','video','video/x-flv');
formats('mpeg','video','video/mpeg');
formats('mp3','audio','audio/mpeg');
formats('wav','audio','audio/wav');
formats('ogg','audio','audio/ogg','application/ogg');

function canonicalType(bytes: Buffer, svg: boolean): string {
  if (begins(bytes,'ffd8ff')) return 'image/jpeg';
  if (begins(bytes,'89504e470d0a1a0a')) return 'image/png';
  if (/^GIF8[79]a/.test(bytes.toString('ascii',0,6))) return 'image/gif';
  if (bytes.toString('ascii',0,2) === 'BM') return 'image/bmp';
  if (begins(bytes,'00000100')) return 'image/x-icon';
  if (begins(bytes,'49492a00') || begins(bytes,'4d4d002a')) return 'image/tiff';
  if (bytes.toString('ascii',0,4) === 'RIFF') {
    const subtype = bytes.toString('ascii',8,12);
    if (subtype === 'WEBP') return 'image/webp';
    if (subtype === 'WAVE') return 'audio/wav';
    if (subtype === 'AVI ') return 'video/x-msvideo';
  }
  if (bytes.length >= 16 && bytes.toString('ascii',4,8) === 'ftyp') {
    const size = bytes.readUInt32BE(0);
    if (size >= 16 && size <= bytes.length && size % 4 === 0) {
      const brands = [bytes.toString('ascii',8,12)];
      for (let at=16; at<size; at+=4) brands.push(bytes.toString('ascii',at,at+4));
      if (brands.some(brand => ['heic','heix','hevc','hevx'].includes(brand))) return 'image/heic';
      return 'application/mp4';
    }
  }
  if (begins(bytes,'1a45dfa3')) return 'application/x-ebml';
  if (bytes.toString('ascii',0,3) === 'FLV') return 'video/x-flv';
  if (begins(bytes,'000001ba') || begins(bytes,'000001b3')) return 'video/mpeg';
  if (bytes.toString('ascii',0,3) === 'ID3' || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (bytes.toString('ascii',0,4) === 'OggS') return 'application/ogg';
  const text = bytes.toString('utf8').replace(/^\uFEFF/, '').trimStart();
  if (text.startsWith('%PDF-')) return 'application/pdf';
  if (svg) return 'image/svg+xml';
  if (text.startsWith('{\\rtf')) return 'application/rtf';
  if (begins(bytes,'d0cf11e0a1b11ae1')) return 'application/x-cfb';
  if (begins(bytes,'504b0304') || begins(bytes,'504b0506') || begins(bytes,'504b0708')) return 'application/zip';
  return 'application/octet-stream';
}

/** Content-derived storage MIME stays identical when the same bytes have different allowed names. */
export function detectFormat(bytes: Buffer, filename: string, purpose: FilePurpose, svg = hasSvgRoot(bytes)): string {
  const ext = extension(filename);
  const mime = canonicalType(bytes, svg);
  if (purpose === 'attachment') {
    if (!ATTACHMENT_EXTENSIONS.has(ext)) throw new HttpError(415,'unsupported_file_type');
    const expected = native[ext]?.[2];
    if (expected && expected !== mime) throw new HttpError(415,'unsupported_file_type');
  } else {
    const allowed = purpose === 'photo-original' ? ['image/jpeg','image/png','image/heic'] : ['image/jpeg'];
    if (!allowed.includes(mime) || native[ext]?.[2] !== mime) throw new HttpError(415,'unsupported_file_type');
  }
  return mime;
}

/** A viewer is an attempt, not a codec guarantee. Every viewer must retain an original-download fallback. */
export function attachmentCapabilities(filename: string, contentType: string): AttachmentCapabilities {
  const ext = extension(filename);
  if (ext === 'eml' || ext === 'msg') return {kind:'email',view:'email',reader:ext,download:true};
  const entry = native[ext];
  if (entry && entry[2] === contentType) return {kind:entry[0],view:'native',mediaType:entry[1],download:true};
  return {kind:'document',view:'download',download:true};
}
