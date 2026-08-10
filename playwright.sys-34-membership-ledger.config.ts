import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-34-membership-ledger.spec.ts',
  workers: 1,
  timeout: 90_000,
  outputDir: 'evidence/SYS-34/playwright-membership-ledger-output',
  use: {
    baseURL: 'http://localhost:3358',
    viewport: { width: 1440, height: 1000 },
    trace: 'on',
  },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3357/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3357',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-34-membership-ledger',
        CORS_ORIGINS: 'http://localhost:3358',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3358',
      url: 'http://localhost:3358',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3357',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3357',
      },
    },
  ],
});
