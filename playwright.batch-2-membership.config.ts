import { defineConfig } from '@playwright/test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'batch-2-membership.spec.ts',
  workers: 1,
  outputDir: 'evidence/BATCH-2-MEMBERSHIP/playwright-output',
  use: { viewport: { width: 390, height: 844 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3231/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3231',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'batch-2-membership-browser',
        CORS_ORIGINS: 'http://localhost:3232,http://localhost:3233,http://localhost:3234',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3232',
      url: 'http://localhost:3232',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3231',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3231',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3233',
      url: 'http://localhost:3233',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3231' },
    },
    {
      command: 'pnpm.cmd --filter @oneday/employee-web exec next dev --port 3234',
      url: 'http://localhost:3234',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3231' },
    },
  ],
});
