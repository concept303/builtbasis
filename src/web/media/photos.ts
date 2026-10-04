import { ApiError } from '../core/api';
import { abortCheck, captureTimestamp } from './helpers';

export function workerJob<T>(worker: Worker, value: unknown, transfer: Transferable[] = [], signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const done = () => { worker.terminate(); signal?.removeEventListener('abort', cancel); };
    const cancel = () => { done(); reject(new DOMException('Aborted', 'AbortError')); };
    worker.onmessage = event => { done(); event.data.error ? reject(new Error('preview_unavailable')) : resolve(event.data.result as T); };
    worker.onerror = () => { done(); reject(new Error('preview_unavailable')); };
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) { cancel(); return; }
    worker.postMessage(value, transfer);
  });
}
export function decodeImage(blob: Blob, signal?: AbortSignal): Promise<HTMLImageElement> {
  abortCheck(signal);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const done = () => { URL.revokeObjectURL(url); img.onload = null; img.onerror = null; signal?.removeEventListener('abort', cancel); };
    const cancel = () => { done(); img.src = ''; reject(new DOMException('Aborted', 'AbortError')); };
    img.onload = () => { done(); resolve(img); };
    img.onerror = () => { done(); reject(new Error('preview_unavailable')); };
    signal?.addEventListener('abort', cancel, { once: true });
    // Detached Image only; original SVG sources must never enter the DOM.
    img.src = url;
  });
}
export async function rasterImage(blob: Blob, mime = 'image/png', maxSide = 2400, byteLimit = 5_000_000, signal?: AbortSignal): Promise<Blob> {
  const img = await decodeImage(blob, signal);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  try {
    for (;;) {
      abortCheck(signal);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('preview_unavailable');
      if (mime === 'image/jpeg') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const result = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('preview_unavailable')), mime, .85));
      abortCheck(signal);
      if (result.size <= byteLimit) return result;
      if (canvas.width === 1 && canvas.height === 1) throw new Error('upload_too_large');
      canvas.width = Math.max(1, Math.floor(canvas.width * .75));
      canvas.height = Math.max(1, Math.floor(canvas.height * .75));
    }
  } finally { canvas.width = canvas.height = 0; img.src = ''; }
}
async function preparePhotoInternal(file: File, signal?: AbortSignal): Promise<{ original: File; display: Blob; thumbnail: Blob; takenAt: string | null }> {
  abortCheck(signal);
  const exifr = await import('exifr');
  let takenAt: string | null = null;
  try {
    const tags = await exifr.parse(file, { pick: ['DateTimeOriginal', 'OffsetTimeOriginal'], reviveValues: false, translateValues: false });
    takenAt = captureTimestamp(tags?.DateTimeOriginal, tags?.OffsetTimeOriginal);
  } catch { /* No unambiguous EXIF date is a valid outcome. */ }
  abortCheck(signal);
  let source: Blob = file;
  const head = new TextDecoder().decode(await file.slice(4, 40).arrayBuffer());
  if (/ftyp(?:heic|heix|hevc|hevx|mif1|msf1)/.test(head)) {
    source = await workerJob<Blob>(new Worker(new URL('./heic.worker.ts', import.meta.url), { type: 'module' }), file, [], signal);
  }
  // Browsers apply EXIF orientation when decoding an Image. Do not rotate again.
  const display = await rasterImage(source, 'image/jpeg', 2400, 5_000_000, signal);
  const thumbnail = await rasterImage(display, 'image/jpeg', 360, 500_000, signal);
  return { original: file, display, thumbnail, takenAt };
}

export async function preparePhoto(file: File, signal?: AbortSignal): Promise<{ original: File; display: Blob; thumbnail: Blob; takenAt: string | null }> {
  try { return await preparePhotoInternal(file, signal); }
  catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw new ApiError(415, 'photo_conversion_failed');
  }
}
