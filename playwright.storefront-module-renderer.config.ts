import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'storefront-module-renderer.spec.ts',
  workers: 1,
  timeout: 180000,
  outputDir: 'evidence/STOREFRONT-MODULE-RENDERER/playwright-output',
  use: { viewport: { width: 390, height: 844 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3261/api/v1/health',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        ...process.env,
        PORT: '3261',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'storefront-module-renderer-browser',
        CORS_ORIGINS: 'http://localhost:3262,http://127.0.0.1:3262',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3262',
      url: 'http://localhost:3262',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3261',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3261',
      },
    },
  ],
});
