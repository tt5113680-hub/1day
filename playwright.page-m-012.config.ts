import { defineConfig } from '@playwright/test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'management-attribution.spec.ts',
  outputDir: 'evidence/PAGE-M-012/playwright-output',
  use: { baseURL: 'http://localhost:3110', viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3109/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3109',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-m-012-browser',
        CORS_ORIGINS: 'http://localhost:3110',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3110',
      url: 'http://localhost:3110',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3109' },
    },
  ],
});
