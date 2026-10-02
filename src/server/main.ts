import { buildApp } from './app';
import { loadEnvFile, openMigratedDatabase } from './bootstrap';
import { loadConfig } from './config';

loadEnvFile();
const config = loadConfig();
const { db, applied } = openMigratedDatabase(config);
const app = await buildApp({ config, db, logger: true });
if (applied.length > 0) app.log.info({ applied }, 'migrations applied');

let closing = false;
async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  app.log.info(`${signal} received, closing`);
  await app.close();
  db.close();
  process.exit(0);
}
// Deployment restarts the app by stopping the process (design §11.6).
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

if (config.port !== null) {
  // Local development: a port number, or a socket path.
  await app.listen(
    /^\d+$/.test(config.port)
      ? { port: Number(config.port), host: process.env.HOST ?? '127.0.0.1' }
      : { path: config.port },
  );
} else {
  // Hetzner: listen() without arguments; the platform supplies the socket (Plan 0).
  await app.ready();
  app.server.listen(() => app.log.info({ address: app.server.address() }, 'listening on the platform socket'));
}
