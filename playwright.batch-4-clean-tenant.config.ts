import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'batch-4-clean-tenant.spec.ts',
  workers: 1,
  timeout: 180000,
  outputDir: 'evidence/BATCH-4/playwright-output',
  use: { viewport: { width: 390, height: 844 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3251/api/v1/health',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        ...process.env,
        PORT: '3251',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'batch-4-clean-tenant-browser',
        CORS_ORIGINS:
          'http://localhost:3252,http://localhost:3253,http://localhost:3254,http://127.0.0.1:3252,http://127.0.0.1:3253,http://127.0.0.1:3254',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3252',
      url: 'http://localhost:3252',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3251',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3251',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3253',
      url: 'http://localhost:3253',
      reuseExistingServer: false,
      timeout: 120000,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3251' },
    },
    {
      command: 'pnpm.cmd --filter @oneday/employee-web exec next dev --port 3254',
      url: 'http://localhost:3254',
      reuseExistingServer: false,
      timeout: 120000,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3251' },
    },
  ],
});
