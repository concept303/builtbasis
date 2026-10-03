import { join } from 'node:path';

export interface AppConfig {
  dataDir: string;
  dbPath: string;
  backupsDir: string;
  filesDir: string;
  shareKey: Buffer | null;
  /** Explicit HTTP upload capacity settings; offline commands may omit them. */
  filesStorageBudgetBytes: number | null;
  filesFreeReserveBytes: number | null;
  /** Scheme + host (+ port) that browsers send as Origin, e.g. https://builtbasis.ktimanet.com */
  publicOrigin: string;
  secureCookies: boolean;
  /** Read the visitor IP from CF-Connecting-IP (design §11.6). */
  behindCloudflare: boolean;
  /** PORT: a port number or a socket path. null = listen like Hetzner's example (no arguments). */
  port: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataDir = env.BUILTBASIS_DATA_DIR;
  if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');
  const publicOrigin = new URL(env.PUBLIC_BASE_URL ?? 'http://localhost:3000').origin;
  const encodedKey = env.SHARE_LINK_KEY;
  if (encodedKey !== undefined && !/^[a-fA-F0-9]{64}$/.test(encodedKey)) {
    throw new Error('SHARE_LINK_KEY must contain exactly 64 hexadecimal characters');
  }
  const positiveBytes = (key: string): number | null => {
    const value = env[key];
    if (value === undefined) return null;
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
      throw new Error(`${key} must be a positive safe integer byte count`);
    }
    return Number(value);
  };
  return {
    dataDir,
    dbPath: join(dataDir, 'builtbasis.db'),
    backupsDir: join(dataDir, 'backups'),
    filesDir: join(dataDir, 'files'),
    shareKey: encodedKey === undefined ? null : Buffer.from(encodedKey, 'hex'),
    filesStorageBudgetBytes: positiveBytes('FILES_STORAGE_BUDGET_BYTES'),
    filesFreeReserveBytes: positiveBytes('FILES_FREE_RESERVE_BYTES'),
    publicOrigin,
    secureCookies: publicOrigin.startsWith('https://'),
    behindCloudflare: env.BEHIND_CLOUDFLARE === '1',
    port: env.PORT ?? null,
  };
}
