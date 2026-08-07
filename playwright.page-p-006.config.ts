import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'platform-templates.spec.ts',
  outputDir: 'evidence/PAGE-P-006/playwright-output',
  use: { baseURL: 'http://localhost:3138', viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3137/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3137',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-p-006-browser',
        CORS_ORIGINS: 'http://localhost:3138',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/platform-web exec next dev --port 3138',
      url: 'http://localhost:3138',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3137' },
    },
  ],
});
