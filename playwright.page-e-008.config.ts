import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'employee-notifications.spec.ts',
  outputDir: 'evidence/PAGE-E-008/playwright-output',
  use: { baseURL: 'http://127.0.0.1:3077', viewport: { width: 390, height: 844 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3076/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3076',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-e-008-browser',
        CORS_ORIGINS: 'http://127.0.0.1:3077',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/employee-web exec next dev --port 3077',
      url: 'http://127.0.0.1:3077',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3076' },
    },
  ],
});
