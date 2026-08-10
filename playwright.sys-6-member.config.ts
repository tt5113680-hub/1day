import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-6-role-matrix-member-consumer.spec.ts',
  workers: 1,
  outputDir: 'evidence/SYS-6/playwright-member-output',
  use: { viewport: { width: 390, height: 844 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3281/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3281',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-6-member-browser',
        CORS_ORIGINS: 'http://localhost:3282',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3282',
      url: 'http://localhost:3282',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3281',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3281',
      },
    },
  ],
});
