import { defineConfig } from '@playwright/test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'management-page-builder.spec.ts',
  outputDir: 'evidence/PAGE-M-014/playwright-output',
  use: { baseURL: 'http://localhost:3114', viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3113/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3113',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-m-014-browser',
        CORS_ORIGINS: 'http://localhost:3114',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3114',
      url: 'http://localhost:3114',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3113' },
    },
  ],
});
