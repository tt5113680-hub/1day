import { defineConfig } from '@playwright/test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'management-employee-process-performance.spec.ts',
  outputDir: 'evidence/PAGE-M-011/playwright-output',
  use: { baseURL: 'http://localhost:3108', viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3107/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3107',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-m-011-browser',
        CORS_ORIGINS: 'http://localhost:3108',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3108',
      url: 'http://localhost:3108',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3107' },
    },
  ],
});
