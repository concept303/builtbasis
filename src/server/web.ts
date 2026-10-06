import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import serveStatic from '@fastify/static';
export async function registerWeb(app: FastifyInstance, directory: string): Promise<void> {
  let html: string;
  try { html = await readFile(join(directory, 'index.html'), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  if ((await stat(join(directory, 'assets'))).isDirectory()) await app.register(serveStatic, { root: join(directory, 'assets'), prefix: '/assets/', index: false, redirect: false, dotfiles: 'deny', maxAge: '1y', immutable: true });
  for (const route of ['/', '/login', '/administration', '/projects', '/projects/:projectId/records', '/projects/:projectId/records/:id', '/projects/:projectId/records/:id/print', '/projects/:projectId/lists', '/projects/:projectId/work-packages', '/projects/:projectId/work-packages/:id', '/assigned', '/assigned/:id', '/share']) {
    app.get(route, async (_request, reply) => reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer').header('X-Content-Type-Options', 'nosniff').header('X-Robots-Tag', 'noindex, nofollow')
      .header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
      .type('text/html; charset=utf-8').send(html));
  }
}
