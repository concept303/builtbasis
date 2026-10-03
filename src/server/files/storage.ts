import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, mkdir, open, stat, unlink, type FileHandle } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Readable } from 'node:stream';
import { FILE_LIMITS, Filename, type FilePurpose } from '../../domain';
import { HttpError } from '../errors';
import { detectFormat } from './formats';
import { SvgPrefix } from './svg-prefix';

export interface StagedFile { path: string; hash: string; size: number; contentType: string }
export function blobPath(filesDir: string, hash: string): string {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('invalid_blob_hash');
  return join(filesDir, hash.slice(0, 2), hash);
}
export async function discardStaged(staged: Pick<StagedFile, 'path'>): Promise<void> {
  try { await unlink(staged.path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
export async function stageFile(filesDir: string, source: Readable, filename: string, purpose: FilePurpose, onCleanupFailure?: () => void): Promise<StagedFile> {
  let file: FileHandle | undefined;
  let path: string | undefined;
  try {
    const name = Filename.parse(filename);
    const tempDir = join(filesDir, '.tmp');
    await mkdir(tempDir, { recursive: true });
    const candidate = join(tempDir, randomBytes(24).toString('hex'));
    file = await open(candidate, 'wx', 0o600);
    path = candidate;
    const hash = createHash('sha256');
    let size = 0;
    let prefix = Buffer.alloc(0);
    const svg = new SvgPrefix();
    for await (const chunk of source) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > FILE_LIMITS[purpose]) throw new HttpError(413, 'upload_too_large');
      if (prefix.length < 512) prefix = Buffer.concat([prefix, bytes.subarray(0, 512 - prefix.length)]);
      svg.write(bytes);
      hash.update(bytes);
      for (let offset = 0; offset < bytes.length;) {
        const result = await file.write(bytes, offset, bytes.length - offset);
        if (result.bytesWritten === 0) throw new Error('file_write_incomplete');
        offset += result.bytesWritten;
      }
    }
    if ((source as Readable & { truncated?: boolean }).truncated) throw new HttpError(413, 'upload_too_large');
    if (size === 0) throw new HttpError(415, 'unsupported_file_type');
    const contentType = detectFormat(prefix, name, purpose, svg.isSvg);
    await file.sync();
    await file.close();
    file = undefined;
    return { path, hash: hash.digest('hex'), size, contentType };
  } catch (error) {
    source.destroy();
    // Try both cleanup operations even if close itself fails; retain the original error.
    if (file) await file.close().catch(() => onCleanupFailure?.());
    if (path) await discardStaged({ path }).catch(() => onCleanupFailure?.());
    throw error;
  }
}
export async function publishFile(filesDir: string, staged: StagedFile, onRetained?: (file: StagedFile) => void): Promise<void> {
  const destination = blobPath(filesDir, staged.hash);
  const dir = dirname(destination);
  await mkdir(dir, { recursive: true });
  try { await link(staged.path, destination); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if ((await stat(destination)).size !== staged.size) throw new Error('blob_collision');
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(destination)) hash.update(chunk);
    if (hash.digest('hex') !== staged.hash) throw new Error('blob_collision');
  }
  // Charge retained bytes before sync or cleanup can fail. Database rollback never removes this blob.
  onRetained?.(staged);
  if (process.platform !== 'win32') {
    // Persist newly created directory entries as well as the published file entry.
    for (const path of [dirname(filesDir), filesDir, dir]) {
      const handle = await open(path, 'r');
      try { await handle.sync(); } finally { await handle.close(); }
    }
  }
  await discardStaged(staged);
}
