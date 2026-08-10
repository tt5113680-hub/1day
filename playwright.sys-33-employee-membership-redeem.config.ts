import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-33-employee-membership-redeem.spec.ts',
  workers: 1,
  timeout: 120000,
  outputDir: 'evidence/SYS-33/playwright-membership-redeem-output',
  use: {
    viewport: { width: 390, height: 844 },
    trace: 'on',
  },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3355/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3355',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-33-employee-membership-redeem',
        CORS_ORIGINS: 'http://localhost:3356',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/employee-web exec next dev --port 3356',
      url: 'http://localhost:3356',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3355',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3355',
      },
    },
  ],
});
