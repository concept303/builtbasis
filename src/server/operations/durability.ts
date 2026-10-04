import { closeSync, fsyncSync, openSync } from 'node:fs';

export function syncFile(path: string): void {
  const fd = openSync(path, 'r+');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
export function syncDirectory(path: string): void {
  if (process.platform === 'win32') return;
  const fd = openSync(path, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
