# Email viewer feasibility probe

Research fixture only, not production viewer code. See [research findings](../../2026-10-03-attachment-formats-and-viewers.md) for tested cases and limits.

From this directory:

```powershell
npm ci --ignore-scripts
npm rebuild esbuild
npx esbuild probe.mjs --bundle --platform=browser --format=esm --outfile=browser-probe.mjs
node --experimental-vm-modules run.mjs
```

The probe generates synthetic EML and MSG messages. It bundles for browser execution and runs without Node globals, DOM or network access. It does not implement the Plan 5 viewer or establish large-file/mobile compatibility. Never substitute real correspondence as a fixture.

Generated node_modules and browser-probe.mjs are disposable. The package lock preserves exact dependency resolution; root application dependencies are unchanged.
