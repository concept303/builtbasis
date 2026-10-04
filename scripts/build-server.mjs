import { build } from 'esbuild';
await build({
  entryPoints: {
    main: 'src/server/main.ts', owner: 'scripts/owner.ts', user: 'scripts/user.ts',
    'revoke-share-links': 'scripts/revoke-share-links.ts', backup: 'scripts/backup.ts',
    'backup-export': 'scripts/backup-export.ts', restore: 'scripts/restore.ts',
    'runtime-check': 'scripts/runtime-check.ts',
  },
  outdir: 'dist/server', outExtension: { '.js': '.mjs' }, platform: 'node', target: 'node22',
  format: 'esm', bundle: true, packages: 'external', sourcemap: false,
});
