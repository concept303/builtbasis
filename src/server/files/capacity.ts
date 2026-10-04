import { mkdir, readdir, stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { UPLOAD_REQUEST_LIMIT } from '../../domain';
import { HttpError } from '../errors';
import { blobPath, type StagedFile } from './storage';

export interface StoragePolicy { budgetBytes: number; freeReserveBytes: number }
export interface StorageStatus {
  state: 'ok' | 'warning' | 'unavailable'; healthy: boolean;
  retainedBytes: string; reservedBytes: string; budgetBytes: string; managedHeadroomBytes: string;
  freeReserveBytes: string; filesystemAvailableBytes: string | null; filesystemHeadroomBytes: string | null;
}
export interface UploadReservation {
  maxBodyBytes: number;
  retained: (file: StagedFile) => void;
  cleanupFailed: () => void;
  release: () => void;
}
const denied = (cause?: unknown) => new HttpError(507, 'storage_capacity', undefined, { cause });

/** One HTTP process owns this directory. Retained blobs are never deleted while it runs. */
export async function openStorageCapacity(filesDir: string, policy: StoragePolicy) {
  if (![policy.budgetBytes, policy.freeReserveBytes].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('storage_configuration_required');
  }
  const retainedPaths = new Map<string, bigint>();
  const inodes = new Set<string>();
  let retainedBytes = 0n;
  let pendingBytes = 0n;
  let healthy = true;
  const budget = BigInt(policy.budgetBytes);
  const reserve = BigInt(policy.freeReserveBytes);
  async function inventory(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await inventory(path);
      else if (entry.isFile()) {
        const info = await stat(path, { bigint: true });
        retainedPaths.set(path, info.size);
        // A crash can leave the temporary and published names for one hardlinked inode.
        const key = `${info.dev}:${info.ino}`;
        if (!inodes.has(key)) { inodes.add(key); retainedBytes += info.size; }
      } else throw new Error('unsupported_storage_entry');
    }
  }
  try { await mkdir(filesDir, { recursive: true }); await inventory(filesDir); }
  catch { throw new Error('storage_inventory_failed'); }

  return {
    async snapshot(): Promise<StorageStatus> {
      let available: bigint | null = null;
      try { const space = await statfs(filesDir, { bigint: true }); available = space.bavail * space.bsize; } catch { /* Unknown capacity must be visible. */ }
      // Read accounting after the async probe so in-flight changes are represented consistently.
      const managedHeadroom = budget - retainedBytes - pendingBytes;
      const filesystemHeadroom = available === null ? null : available - pendingBytes - reserve;
      return {
        state: available === null ? 'unavailable' : !healthy || managedHeadroom < BigInt(UPLOAD_REQUEST_LIMIT) || filesystemHeadroom! < BigInt(UPLOAD_REQUEST_LIMIT) ? 'warning' : 'ok',
        healthy, retainedBytes: String(retainedBytes), reservedBytes: String(pendingBytes), budgetBytes: String(budget),
        managedHeadroomBytes: String(managedHeadroom), freeReserveBytes: String(reserve),
        filesystemAvailableBytes: available === null ? null : String(available), filesystemHeadroomBytes: filesystemHeadroom === null ? null : String(filesystemHeadroom),
      };
    },
    async reserve(contentLength: string | undefined): Promise<UploadReservation> {
      if (contentLength !== undefined && !/^\d+$/.test(contentLength)) throw new HttpError(400, 'invalid_upload');
      const amount = contentLength === undefined ? BigInt(UPLOAD_REQUEST_LIMIT) : BigInt(contentLength);
      if (amount > BigInt(UPLOAD_REQUEST_LIMIT)) throw new HttpError(413, 'upload_too_large');
      if (!healthy || retainedBytes + pendingBytes + amount > budget) throw denied();
      // Reserve before the first await so concurrent admissions cannot spend the same headroom.
      pendingBytes += amount;
      try {
        const space = await statfs(filesDir, { bigint: true });
        if (!healthy || space.bavail * space.bsize - pendingBytes < reserve) throw denied();
      } catch (error) {
        pendingBytes -= amount;
        throw denied(error);
      }
      let released = false;
      return {
        maxBodyBytes: Number(amount),
        retained: (file: StagedFile): void => {
          const path = blobPath(filesDir, file.hash);
          const size = BigInt(file.size);
          const existing = retainedPaths.get(path);
          if (existing !== undefined) {
            if (existing !== size) healthy = false;
            return;
          }
          retainedPaths.set(path, size);
          retainedBytes += size;
        },
        cleanupFailed: (): void => { healthy = false; },
        release: (): void => {
          if (!released) { pendingBytes -= amount; released = true; }
        },
      };
    },
  };
}
export type StorageCapacity = Awaited<ReturnType<typeof openStorageCapacity>>;
