import { loadEnvFile } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';
import { beginExport, completeBundle, releaseExport } from '../src/server/operations/bundles';

try {
  const [command, target, ...flags] = process.argv.slice(2);
  if (command === 'verify' && target) {
    let filesDir: string | undefined;
    let maxAgeHours: number | undefined;
    for (let i = 0; i < flags.length; i += 2) {
      const value = flags[i + 1];
      if (!value || value.startsWith('--')) throw new Error('invalid_arguments');
      if (flags[i] === '--files-dir' && filesDir === undefined) filesDir = value;
      else if (flags[i] === '--max-age-hours' && maxAgeHours === undefined && /^\d+(?:\.\d+)?$/.test(value)) maxAgeHours = Number(value);
      else throw new Error('invalid_arguments');
    }
    const report = await completeBundle(target, filesDir, { maxAgeHours });
    console.log(JSON.stringify({ complete: true, ...report }));
  } else {
    loadEnvFile();
    const config = loadConfig();
    if (command === 'begin' && target === undefined) console.log(JSON.stringify(await beginExport(config.backupsDir, config.filesDir)));
    else if (command === 'release' && target && flags.length === 0) { releaseExport(config.backupsDir, target); console.log(JSON.stringify({ released: true })); }
    else throw new Error('invalid_arguments');
  }
} catch (error) {
  const reasons = ['stale_source_backup', 'future_source_backup', 'future_export', 'invalid_max_age_hours'];
  const reason = error instanceof Error && reasons.includes(error.message) ? error.message : 'verification_or_transfer_failed';
  console.error(JSON.stringify({ event: 'backup_export_failed', reason }));
  process.exitCode = 1;
}
