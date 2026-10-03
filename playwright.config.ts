import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', testMatch: '**/*.spec.ts', fullyParallel: false, workers: 1, retries: 0, timeout: 45_000, expect: { timeout: 10_000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3490', browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, trace: 'retain-on-failure' },
  webServer: [
    { command: 'node --import tsx tests/browser/server.ts', url: 'http://127.0.0.1:3490/api/health', reuseExistingServer: false, timeout: 60_000 },
    { command: 'vite --config vite.browser-test.config.ts', url: 'http://127.0.0.1:5174/tests/browser/fixtures/media-harness.html', reuseExistingServer: false, timeout: 60_000 },
  ],
});
