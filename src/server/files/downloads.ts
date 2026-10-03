import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PhotoVariant } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { shareHeaders } from '../http/privacy';
import { blobPath } from './storage';

export interface FileTarget {
  hash: string;
  size: number;
  contentType: string;
  filename: string;
}

function safeFilename(filename: string): string {
  return (filename.split(/[\\/]/).at(-1) ?? 'file').replace(/[\x00-\x1f\x7f]/g, '') || 'file';
}

export function resolvePhotoFile(db: Db, recordId: number, photoId: number, variant: PhotoVariant): FileTarget {
  const column = { original: 'original_hash', display: 'display_hash', thumbnail: 'thumbnail_hash' }[variant];
  const row = db.prepare(`SELECT b.hash, b.size, b.content_type AS contentType, p.original_filename AS filename
    FROM photos p JOIN blobs b ON b.hash = p.${column} WHERE p.record_id = ? AND p.id = ?`).get(recordId, photoId) as FileTarget | undefined;
  if (!row) throw new HttpError(404, 'file_not_found');
  if (variant !== 'original') row.filename = `${safeFilename(row.filename).replace(/\.[^.]*$/, '')}-${variant}.jpg`;
  return row;
}

export function resolveAttachmentFile(db: Db, recordId: number, attachmentId: number, audience: 'owner' | 'shared'): FileTarget {
  const row = db.prepare(`SELECT b.hash, b.size, b.content_type AS contentType, a.original_filename AS filename,
    l.private AS private, a.log_entry_id AS logEntryId, l.id AS existingLogId
    FROM attachments a JOIN blobs b ON b.hash = a.blob_hash
    LEFT JOIN log_entries l ON l.id = a.log_entry_id AND l.record_id = a.record_id
    WHERE a.record_id = ? AND a.id = ?`).get(recordId, attachmentId) as (FileTarget & {
      private: number | null; logEntryId: number | null; existingLogId: number | null;
    }) | undefined;
  if (!row || (audience === 'shared' && (row.private === 1 || (row.logEntryId !== null && row.existingLogId === null)))) {
    throw new HttpError(404, 'file_not_found');
  }
  return { hash: row.hash, size: row.size, contentType: row.contentType, filename: row.filename };
}

/** Authorisation and occurrence resolution must precede this function. HEAD never opens a stream. */
export async function sendFile(request: FastifyRequest, reply: FastifyReply, filesDir: string, target: FileTarget, disposition: 'inline' | 'attachment'): Promise<void> {
  const path = blobPath(filesDir, target.hash);
  let info;
  try {
    info = await stat(path);
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw new HttpError(404, 'file_not_found');
    throw new HttpError(500, 'file_unavailable', undefined, { cause: error });
  }
  if (!info.isFile() || info.size !== target.size) throw new HttpError(500, 'file_unavailable');
  let range: { start: number; end: number } | undefined;
  if (request.method === 'GET' && request.headers.range && !request.headers['if-range']) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
    const failRange = (): never => {
      shareHeaders(reply);
      reply.header('Content-Range', `bytes */${info.size}`);
      throw new HttpError(416, 'range_not_satisfiable');
    };
    if (!match || (!match[1] && !match[2])) failRange();
    const first = match![1]!;
    const last = match![2]!;
    let start: number;
    let end: number;
    if (first === '') {
      const length = Number(last);
      if (!Number.isSafeInteger(length) || length < 1) failRange();
      start = Math.max(0, info.size - length);
      end = info.size - 1;
    } else {
      start = Number(first);
      end = last === '' ? info.size - 1 : Number(last);
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) failRange();
      end = Math.min(end, info.size - 1);
    }
    if (start >= info.size || end < start) failRange();
    range = { start, end };
  }
  const filename = safeFilename(target.filename);
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  shareHeaders(reply);
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('Content-Security-Policy', target.contentType === 'image/svg+xml' ? "sandbox; default-src 'none'; style-src 'unsafe-inline'" : 'sandbox');
  reply.header('Content-Type', target.contentType);
  reply.header('Accept-Ranges', 'bytes');
  reply.header('Content-Length', range ? range.end - range.start + 1 : info.size);
  if (range) {
    reply.status(206);
    reply.header('Content-Range', `bytes ${range.start}-${range.end}/${info.size}`);
  }
  reply.header('Content-Disposition', `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`);
  if (request.method === 'HEAD') {
    reply.status(200).send();
    return;
  }
  await reply.send(createReadStream(path, range));
}
