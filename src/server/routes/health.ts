import type { FastifyInstance } from 'fastify';

/** Public liveness check. Reveals nothing about versions or paths. */
export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/api/health', async () => ({ ok: true }));
}
