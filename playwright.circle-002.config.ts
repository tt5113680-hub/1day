import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'business-circle-merchants.spec.ts',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:3156', viewport: { width: 1440, height: 980 }, trace: 'on' },
  outputDir: 'evidence/CIRCLE-002/playwright-output',
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3155/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3155',
        DATABASE_URL: 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
        AUTH_TOKEN_SECRET: 'circle-002-browser',
        CORS_ORIGINS: 'http://localhost:3156',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/platform-web exec next dev --port 3156',
      url: 'http://localhost:3156',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3155' },
    },
  ],
});
