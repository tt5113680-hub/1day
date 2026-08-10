import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-23-attribution-menu.spec.ts',
  workers: 1,
  outputDir: 'evidence/SYS-23/playwright-attribution-menu-output',
  use: {
    baseURL: 'http://localhost:3310',
    viewport: { width: 1440, height: 1000 },
    trace: 'on',
  },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3307/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3307',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-23-attribution-menu',
        CORS_ORIGINS: 'http://localhost:3310',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3310',
      url: 'http://localhost:3310',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3307',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3307',
      },
    },
  ],
});
