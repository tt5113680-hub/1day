import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-29-admin-nav-groups.spec.ts',
  workers: 1,
  timeout: 120000,
  outputDir: 'evidence/SYS-29/playwright-nav-groups-output',
  use: {
    baseURL: 'http://localhost:3347',
    viewport: { width: 1440, height: 1000 },
    trace: 'on',
  },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3346/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3346',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-29-admin-nav-groups',
        CORS_ORIGINS: 'http://localhost:3347',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3347',
      url: 'http://localhost:3347',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3346',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3346',
      },
    },
  ],
});
