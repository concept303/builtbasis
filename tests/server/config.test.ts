import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/server/config';

describe('loadConfig (design §11.6)', () => {
  it('requires BUILTBASIS_DATA_DIR', () => {
    expect(() => loadConfig({})).toThrow('BUILTBASIS_DATA_DIR');
  });

  it('derives database and backup paths and local defaults', () => {
    const config = loadConfig({ BUILTBASIS_DATA_DIR: '/data' });
    expect(config.dbPath).toMatch(/builtbasis\.db$/);
    expect(config.backupsDir).toMatch(/backups$/);
    expect(config.publicOrigin).toBe('http://localhost:3000');
    expect(config.secureCookies).toBe(false);
    expect(config.behindCloudflare).toBe(false);
    expect(config.port).toBeNull();
  });

  it('uses the public origin, secure cookies and Cloudflare mode in production', () => {
    const config = loadConfig({
      BUILTBASIS_DATA_DIR: '/data',
      PUBLIC_BASE_URL: 'https://builtbasis.ktimanet.com/',
      BEHIND_CLOUDFLARE: '1',
      PORT: '3000',
    });
    expect(config.publicOrigin).toBe('https://builtbasis.ktimanet.com');
    expect(config.secureCookies).toBe(true);
    expect(config.behindCloudflare).toBe(true);
    expect(config.port).toBe('3000');
  });
});
