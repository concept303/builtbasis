import { readdir } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config';
import type { StorageCapacity, StorageStatus } from '../files/capacity';

export interface BackupStatus {
  state: 'ok' | 'missing' | 'overdue' | 'unavailable';
  sourceCreatedAt: string | null; ageHours: number | null; maxAgeHours: number;
}
export interface OperationsStatus { checkedAt: string; backup: BackupStatus; storage: StorageStatus & { warningBelowBytes: string } }

/** Reads existing completed naming only; no dependency on scheduled backup/export tools. */
async function backupStatus(dir: string, maxAgeHours: number, now: Date): Promise<BackupStatus> {
  const empty = { sourceCreatedAt: null, ageHours: null, maxAgeHours };
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const names = entries.filter(entry => entry.isFile() && /^builtbasis-nightly-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.db$/.test(entry.name)).map(entry => entry.name).sort().reverse();
    if (!names[0]) return { state: 'missing', ...empty };
    const stamp = names[0].slice('builtbasis-nightly-'.length, -3).replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');
    const date = new Date(stamp);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== stamp) return { state: 'unavailable', ...empty };
    const ageHours = (now.getTime() - date.getTime()) / 3600000;
    return { state: ageHours < -5 / 60 ? 'unavailable' : ageHours > maxAgeHours ? 'overdue' : 'ok', sourceCreatedAt: stamp, ageHours: Math.max(0, ageHours), maxAgeHours };
  } catch (error) {
    return { state: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unavailable', ...empty };
  }
}
export function registerOperationsStatus(app: FastifyInstance, config: AppConfig, capacity: StorageCapacity): void {
  app.get('/api/operations/status', { config: { privateResponse: true } }, async (): Promise<OperationsStatus> => {
    const now = new Date();
    const [backup, storage] = await Promise.all([backupStatus(config.backupsDir, config.backupMaxAgeHours, now), capacity.snapshot()]);
    const warningBelowBytes = String(config.filesWarningBelowBytes);
    const state = storage.state === 'ok' && BigInt(storage.managedHeadroomBytes) < BigInt(warningBelowBytes) ? 'warning' : storage.state;
    return { checkedAt: now.toISOString(), backup, storage: { ...storage, state, warningBelowBytes } };
  });
}
