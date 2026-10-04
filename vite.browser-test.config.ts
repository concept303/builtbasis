import { defineConfig } from 'vite';
export default defineConfig({ root: '.', optimizeDeps: { include: ['exifr', 'heic-to/csp', 'postal-mime', '@kenjiuno/msgreader', 'htmlparser2'] }, esbuild: { jsx: 'automatic' }, server: { host: '127.0.0.1', port: 5174, strictPort: true }, worker: { format: 'es' } });
