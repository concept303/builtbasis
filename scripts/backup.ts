import Database from 'better-sqlite3';
import { loadEnvFile } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';
import { nightlyBackup } from '../src/server/operations/backups';

try {
  loadEnvFile();
  const config = loadConfig();
  const db = new Database(config.dbPath, { fileMustExist: true });
  try { console.log(JSON.stringify({ path: nightlyBackup(db, config.backupsDir) })); }
  finally { db.close(); }
} catch { console.error('backup_failed'); process.exitCode = 1; }
