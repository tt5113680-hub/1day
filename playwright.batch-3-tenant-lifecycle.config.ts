import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'batch-3-tenant-lifecycle.spec.ts',
  workers: 1,
  outputDir: 'evidence/BATCH-3-TENANT-LIFECYCLE/playwright-output',
  use: { trace: 'on' },
  webServer: {
    command: 'node apps/api/dist/main.js',
    url: 'http://127.0.0.1:3241/api/v1/health',
    reuseExistingServer: false,
    env: {
      ...process.env,
      PORT: '3241',
      DATABASE_URL: db,
      AUTH_TOKEN_SECRET: 'batch-3-tenant-lifecycle',
      CORS_ORIGINS: 'http://localhost:3242',
    },
  },
});
