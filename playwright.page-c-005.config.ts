import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'consumer-action.spec.ts',
  outputDir: 'evidence/PAGE-C-005/playwright-output',
  use: { baseURL: 'http://127.0.0.1:3045', viewport: { width: 390, height: 844 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3044/api/v1/health',
      env: {
        ...process.env,
        PORT: '3044',
        DATABASE_URL: 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
        AUTH_TOKEN_SECRET: 'page-c-005-browser',
        CORS_ORIGINS: 'http://127.0.0.1:3045',
      },
      reuseExistingServer: false,
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3045',
      url: 'http://127.0.0.1:3045',
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3044',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3044',
      },
      reuseExistingServer: false,
    },
  ],
});
