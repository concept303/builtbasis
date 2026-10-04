import { ApiError } from '../core/api';
import type { ViewContext } from '../core/types';
import { abortCheck, buildMultipart, cleanFilename } from './helpers';

export function isAccessLost(error: unknown): boolean { return error instanceof ApiError && [401, 403, 404].includes(error.status); }
export async function fetchBytes(context: ViewContext, suffix: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(context.base + suffix, { credentials: context.token ? 'omit' : 'same-origin',
    headers: context.token ? { Authorization: `Bearer ${context.token}` } : {}, cache: 'no-store', signal });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, data.error ?? 'request_failed');
  }
  return response.blob();
}
export function downloadBlob(blob: Blob, filename: string, signal?: AbortSignal): void {
  abortCheck(signal);
  // Original bytes and embedded attachments are always explicit downloads.
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url; link.download = cleanFilename(filename); link.rel = 'noopener';
  const release = () => { URL.revokeObjectURL(url); clearTimeout(timer); signal?.removeEventListener('abort', release); };
  const timer = setTimeout(release, 1000);
  signal?.addEventListener('abort', release, { once: true });
  document.body.append(link); link.click(); link.remove();
}
export async function downloadOriginal(context: ViewContext, suffix: string, filename: string, signal?: AbortSignal): Promise<void> {
  downloadBlob(await fetchBytes(context, suffix, signal), filename, signal);
}
export async function uploadEvidence(context: ViewContext, kind: 'photos' | 'attachments', files: Record<string, Blob>, metadata: unknown, signal?: AbortSignal, onProgress?: (percent: number) => void): Promise<unknown> {
  abortCheck(signal);
  if (context.mode === 'shared') throw new ApiError(403, 'permission_denied');
  let envelope: ReturnType<typeof buildMultipart>;
  try { envelope = buildMultipart(kind, files, metadata); }
  catch (error) { throw new ApiError(error instanceof Error && error.message === 'upload_too_large' ? 413 : 400, error instanceof Error ? error.message : 'invalid_upload'); }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const cancel = () => xhr.abort();
    const done = () => signal?.removeEventListener('abort', cancel);
    xhr.open('POST', `${context.base}/${kind}`);
    xhr.setRequestHeader('Content-Type', envelope.contentType);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => {
      done(); let data: { error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch {
        if (xhr.status >= 200 && xhr.status < 300) { reject(new ApiError(0, 'response_unknown')); return; }
        // A non-success status still supplies a controlled rejection below.
      }
      if (xhr.status >= 200 && xhr.status < 300) { onProgress?.(100); resolve(data); }
      else reject(new ApiError(xhr.status, data.error ?? 'request_failed'));
    };
    xhr.onerror = () => { done(); reject(new ApiError(0, 'request_failed')); };
    xhr.onabort = () => { done(); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', cancel, { once: true });
    xhr.send(envelope.blob);
  });
}
