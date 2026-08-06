import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'consumer-discovery.spec.ts',
  outputDir: 'evidence/PAGE-C-002/playwright-output',
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3033/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3033',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-c-002-browser',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3032',
      url: 'http://127.0.0.1:3032',
      reuseExistingServer: false,
      env: { ...process.env, API_BASE_URL: 'http://127.0.0.1:3033' },
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
