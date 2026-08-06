import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'consumer-process.spec.ts',
  outputDir: 'evidence/PAGE-C-006/playwright-output',
  use: { baseURL: 'http://127.0.0.1:3049', viewport: { width: 390, height: 844 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3048/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3048',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-c-006-browser',
        CORS_ORIGINS: 'http://127.0.0.1:3049',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3049',
      url: 'http://127.0.0.1:3049',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3048',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3048',
      },
    },
  ],
});
