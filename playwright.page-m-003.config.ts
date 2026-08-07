import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'management-customers.spec.ts',
  outputDir: 'evidence/PAGE-M-003/playwright-output',
  use: { baseURL: 'http://localhost:3089', viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3088/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3088',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-m-003-browser',
        CORS_ORIGINS: 'http://localhost:3089',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3089',
      url: 'http://localhost:3089',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3088' },
    },
  ],
});
