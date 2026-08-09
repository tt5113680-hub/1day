import { defineConfig } from '@playwright/test';

const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'batch-2-offers.spec.ts',
  outputDir: 'evidence/BATCH-2-OFFERS/playwright-output',
  workers: 1,
  use: {
    baseURL: 'http://localhost:3228',
    viewport: { width: 1440, height: 1000 },
    trace: 'on',
  },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3227/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3227',
        DATABASE_URL: databaseUrl,
        AUTH_TOKEN_SECRET: 'batch-2-offers-browser',
        CORS_ORIGINS: 'http://localhost:3228,http://localhost:3229',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3228',
      url: 'http://localhost:3228',
      reuseExistingServer: false,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3227',
        NEXT_PUBLIC_CONSUMER_BASE_URL: 'http://localhost:3229',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3229',
      url: 'http://localhost:3229',
      reuseExistingServer: false,
      env: { ...process.env, API_BASE_URL: 'http://127.0.0.1:3227' },
    },
  ],
});
