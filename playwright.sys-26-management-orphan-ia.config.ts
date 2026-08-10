import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-26-management-orphan-ia.spec.ts',
  workers: 1,
  outputDir: 'evidence/SYS-26/playwright-orphan-ia-output',
  use: {
    baseURL: 'http://localhost:3340',
    viewport: { width: 1440, height: 1000 },
    trace: 'on',
  },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3337/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3337',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-26-management-orphan-ia',
        CORS_ORIGINS: 'http://localhost:3340',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3340',
      url: 'http://localhost:3340',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3337',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3337',
      },
    },
  ],
});
