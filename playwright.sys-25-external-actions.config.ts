import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-25-external-actions.spec.ts',
  workers: 1,
  timeout: 90_000,
  outputDir: 'evidence/SYS-25/playwright-external-actions-output',
  use: {
    baseURL: 'http://localhost:3330',
    viewport: { width: 1440, height: 1000 },
    trace: 'on',
  },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3327/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3327',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-25-external-actions',
        CORS_ORIGINS: 'http://localhost:3330',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3330',
      url: 'http://localhost:3330',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3327',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3327',
      },
    },
  ],
});
