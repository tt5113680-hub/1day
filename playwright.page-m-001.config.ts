import { defineConfig } from '@playwright/test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'management-dashboard.spec.ts',
  outputDir: 'evidence/PAGE-M-001/playwright-output',
  use: { baseURL: 'http://localhost:3083', viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3082/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3082',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-m-001-browser',
        CORS_ORIGINS: 'http://localhost:3083',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3083',
      url: 'http://127.0.0.1:3083',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3082' },
    },
  ],
});
