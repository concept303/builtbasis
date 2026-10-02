import Fastify from 'fastify';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from './db.mjs';

const dataDir = process.env.BUILTBASIS_DATA_DIR;
if (!dataDir) throw new Error('BUILTBASIS_DATA_DIR is not set');
mkdirSync(dataDir, { recursive: true });

const db = await openDatabase(join(dataDir, 'spike.db'));
db.exec('CREATE TABLE IF NOT EXISTS hits (id INTEGER PRIMARY KEY, at TEXT NOT NULL)');

const app = Fastify({ logger: true });

app.get('/health', async () => {
  db.run('INSERT INTO hits (at) VALUES (?)', new Date().toISOString());
  return {
    ok: true,
    node: process.version,
    driver: db.driver,
    sqlite: db.get('SELECT sqlite_version() AS v').v,
    journalMode: db.get('PRAGMA journal_mode').journal_mode,
    hits: db.get('SELECT COUNT(*) AS n FROM hits').n,
    rssMb: Math.round(process.memoryUsage().rss / 1048576),
    dataDir,
  };
});

// How to listen (Plan 0, Task 5 Step 1):
// - PORT set (local runs): a numeric port, or a socket/pipe path if a platform supplies one.
// - PORT unset (Hetzner konsoleH): mirror Hetzner's Hello World example, which calls
//   server.listen() without arguments and lets the platform route requests to the app.
const portEnv = process.env.PORT;
if (portEnv) {
  const options = /^\d+$/.test(portEnv)
    ? { port: Number(portEnv), host: process.env.HOST ?? '0.0.0.0' }
    : { path: portEnv };
  await app.listen(options);
} else {
  await app.ready();
  app.server.listen(() => {
    app.log.info(`Application is running (platform listener: ${JSON.stringify(app.server.address())})`);
  });
}
