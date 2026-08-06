import { defineConfig } from '@playwright/test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'consumer-service.spec.ts',
  outputDir: 'evidence/PAGE-C-004/playwright-output',
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3038/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3038',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-c-004-browser',
        CORS_ORIGINS: 'http://127.0.0.1:3039',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3039',
      url: 'http://127.0.0.1:3039',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3038',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3038',
      },
    },
  ],
  use: { screenshot: 'only-on-failure', trace: 'on' },
  projects: [
    {
      name: 'mobile-chromium',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 } },
    },
  ],
});
