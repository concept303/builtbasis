import type { FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';
import { ZodError } from 'zod';
import { AttachmentUploadMeta, Filename, PhotoUploadMeta, type AttachmentMeta, type PhotoMeta } from '../../domain';
import { HttpError } from '../errors';
import { discardStaged, stageFile, type StagedFile } from './storage';

export interface UploadFile extends StagedFile { filename: string }
export interface UploadEnvelope {
  metadata: PhotoMeta | AttachmentMeta;
  files: Record<string, UploadFile>;
}

export async function parseUpload(request: FastifyRequest, filesDir: string, kind: 'photos' | 'attachments'): Promise<UploadEnvelope> {
  if (!request.isMultipart()) throw new HttpError(415, 'unsupported_content_type');
  const photo = kind === 'photos';
  const expected = photo ? ['original', 'display', 'thumbnail'] : ['file'];
  const files: Record<string, UploadFile> = {};
  let metadata: unknown;
  let hasMetadata = false;
  let currentFile: Readable | undefined;
  try {
    for await (const part of request.parts({
      limits: {
        files: photo ? 3 : 1,
        fields: 1,
        parts: photo ? 4 : 2,
        fileSize: photo ? 25_000_000 : 50_000_000,
        fieldSize: 16_384,
        fieldNameSize: 100,
        headerPairs: 100,
      },
    })) {
      if (part.type === 'file') {
        currentFile = part.file;
        if (!expected.includes(part.fieldname) || files[part.fieldname]) {
          part.file.resume();
          throw new HttpError(400, 'invalid_upload');
        }
        const filename = Filename.parse(part.filename);
        const purpose = photo ? `photo-${part.fieldname}` as 'photo-original' | 'photo-display' | 'photo-thumbnail' : 'attachment';
        const staged = await stageFile(filesDir, part.file, filename, purpose);
        files[part.fieldname] = { ...staged, filename };
        currentFile = undefined;
      } else {
        if (part.fieldnameTruncated || part.valueTruncated) throw new HttpError(413, 'upload_too_large');
        if (part.fieldname !== 'metadata' || hasMetadata) throw new HttpError(400, 'invalid_upload');
        hasMetadata = true;
        // Multipart parses application/json fields itself; text fields remain raw JSON strings.
        metadata = typeof part.value === 'string' ? JSON.parse(part.value) : part.value;
      }
    }
    if (!hasMetadata || expected.some(name => !files[name])) throw new HttpError(400, 'invalid_upload');
    return {
      metadata: photo ? PhotoUploadMeta.parse(metadata) : AttachmentUploadMeta.parse(metadata),
      files,
    };
  } catch (error) {
    currentFile?.destroy();
    // Stop the multipart parser and drain unread request bytes after an early rejection.
    request.raw.unpipe();
    request.raw.resume();
    await Promise.all(Object.values(files).map(discardStaged));
    if (error instanceof HttpError) throw error;
    const code = (error as { code?: string }).code;
    if (code && ['FST_REQ_FILE_TOO_LARGE', 'FST_FILES_LIMIT', 'FST_FIELDS_LIMIT', 'FST_PARTS_LIMIT'].includes(code)) {
      throw new HttpError(413, 'upload_too_large');
    }
    const malformed = ['Multipart: Boundary not found', 'Unexpected end of multipart data', 'Premature close'];
    if (error instanceof ZodError || error instanceof SyntaxError || code === 'FST_INVALID_JSON_FIELD_ERROR' || malformed.includes((error as Error).message)) {
      throw new HttpError(400, 'invalid_upload');
    }
    throw error;
  }
}
