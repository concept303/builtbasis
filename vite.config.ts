import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({ root: 'src/web', esbuild: { jsx: 'automatic' }, build: { outDir: resolve('dist/web'), emptyOutDir: true }, server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000' } }, worker: { format: 'es' } });
