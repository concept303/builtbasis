import type { FastifyRequest } from 'fastify';
import type { AppConfig } from '../config';

/**
 * Visitor IP. Behind Cloudflare (design §11.6) it comes from CF-Connecting-IP. A request that bypasses
 * Cloudflare could forge that header, which is why the login limiter also has a global cap.
 */
export function clientIp(request: FastifyRequest, config: Pick<AppConfig, 'behindCloudflare'>): string {
  if (config.behindCloudflare) {
    const header = request.headers['cf-connecting-ip'];
    if (typeof header === 'string' && header.trim() !== '') return header.trim();
  }
  return request.ip;
}
