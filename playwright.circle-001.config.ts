import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'business-circle-dashboard.spec.ts',
  outputDir: 'evidence/CIRCLE-001/playwright-output',
  use: { baseURL: 'http://localhost:3153', viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3152/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3152',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'circle-001-browser',
        CORS_ORIGINS: 'http://localhost:3153',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/platform-web exec next dev --port 3153',
      url: 'http://localhost:3153',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3152' },
    },
  ],
});
