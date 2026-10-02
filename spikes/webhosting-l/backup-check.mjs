import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from './db.mjs';

const dataDir = process.env.BUILTBASIS_DATA_DIR;
if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');

const backupsDir = join(dataDir, 'backups');
mkdirSync(backupsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const tmp = join(backupsDir, `spike-${stamp}.db.tmp`);
const final = join(backupsDir, `spike-${stamp}.db`);

const db = await openDatabase(join(dataDir, 'spike.db'));
db.run('VACUUM INTO ?', tmp);
db.close();

const check = await openDatabase(tmp, { readonly: true });
const result = check.get('PRAGMA integrity_check').integrity_check;
check.close();
if (result !== 'ok') {
  rmSync(tmp);
  throw new Error(`integrity_check failed: ${result}`);
}
renameSync(tmp, final);
console.log(`backup ok (${db.driver}): ${final}`);
