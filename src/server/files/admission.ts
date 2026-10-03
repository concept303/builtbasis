import type { FastifyRequest } from 'fastify';
import { HttpError } from '../errors';
import type { StorageCapacity, UploadReservation } from './capacity';
import { discardStaged, publishFile } from './storage';
import { parseUpload, type UploadEnvelope } from './uploads';

/** Caller checks access before admission and rechecks session/permissions in its final write transaction. */
export async function withUpload<T>(request: FastifyRequest, filesDir: string, kind: 'photos' | 'attachments', capacity: StorageCapacity,
  consume: (envelope: UploadEnvelope) => T | Promise<T>): Promise<T> {
  let slot: UploadReservation;
  try { slot = await capacity.reserve(request.headers['content-length']); }
  catch (error) { request.raw.resume(); throw error; }
  let envelope: UploadEnvelope | undefined;
  let cleanupUncertain = false;
  const cleanupFailed = () => { cleanupUncertain = true; slot.cleanupFailed(); };
  try {
    // Admission awaits the disk probe; an abort may precede multipart listeners.
    if (request.raw.aborted || request.raw.destroyed) throw new HttpError(400, 'invalid_upload');
    envelope = await parseUpload(request, filesDir, kind, { maxBodyBytes: slot.maxBodyBytes, cleanupFailed });
    for (const file of Object.values(envelope.files)) await publishFile(filesDir, file, slot.retained);
    return await consume(envelope);
  } catch (error) {
    if (['ENOSPC', 'EDQUOT'].includes((error as NodeJS.ErrnoException).code ?? '')) throw new HttpError(507, 'storage_capacity', undefined, { cause: error });
    throw error;
  } finally {
    try {
      if (envelope) await Promise.all(Object.values(envelope.files).map(file => discardStaged(file).catch(cleanupFailed)));
    } finally {
      slot.release();
    }
    if (cleanupUncertain) throw new HttpError(507, 'storage_capacity');
  }
}
