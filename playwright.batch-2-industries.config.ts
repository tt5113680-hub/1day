import { defineConfig } from '@playwright/test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'batch-2-industries.spec.ts',
  workers: 1,
  outputDir: 'evidence/BATCH-2-INDUSTRIES/playwright-output',
  use: { trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3236/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3236',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'batch-2-industries',
        CORS_ORIGINS: 'http://localhost:3237',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3237',
      url: 'http://localhost:3237',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3236',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3236',
      },
    },
  ],
});
