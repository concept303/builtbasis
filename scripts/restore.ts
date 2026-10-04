import { restoreBundle } from '../src/server/operations/bundles';

try {
  const [bundle, destination, offline, flag, filesDir, ...extra] = process.argv.slice(2);
  if (!bundle || !destination || offline !== '--offline-confirmed' || extra.length ||
      (flag !== undefined && (flag !== '--files-dir' || !filesDir))) throw new Error('invalid_arguments');
  const result = await restoreBundle(bundle, destination, true, filesDir);
  console.log(JSON.stringify({ restored: true, ...result }));
} catch { console.error('restore_failed'); process.exitCode = 1; }
