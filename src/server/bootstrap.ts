import { existsSync } from 'node:fs';
import type { AppConfig } from './config';
import { openDatabase, type Db } from './db/connection';
import { migrate } from './db/migrate';

/** Loads ./.env when it exists (local development). On Hetzner the variables are set in konsoleH. */
export function loadEnvFile(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}

/** Opens the database and applies pending migrations (backing up first when it already has data). */
export function openMigratedDatabase(config: AppConfig): { db: Db; applied: string[] } {
  const db = openDatabase(config.dbPath);
  return { db, applied: migrate(db, { backupsDir: config.backupsDir }) };
}
