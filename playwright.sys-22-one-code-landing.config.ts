import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-22-one-code-landing.spec.ts',
  workers: 1,
  outputDir: 'evidence/SYS-22/playwright-one-code-output',
  use: { viewport: { width: 390, height: 844 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3297/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3297',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-22-one-code-landing',
        CORS_ORIGINS: 'http://localhost:3299',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3299',
      url: 'http://localhost:3299',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3297',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3297',
      },
    },
  ],
});
