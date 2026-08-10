import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-11-provisioning-failure-trail.spec.ts',
  workers: 1,
  outputDir: 'evidence/SYS-11/playwright-provisioning-output',
  use: { viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3301/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3301',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-11-provisioning-browser',
        CORS_ORIGINS: 'http://localhost:3302',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/platform-web exec next dev --port 3302',
      url: 'http://localhost:3302',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3301',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3301',
      },
    },
  ],
});
