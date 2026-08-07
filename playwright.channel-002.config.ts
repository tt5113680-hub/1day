import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'channel-merchant-onboarding.spec.ts',
  outputDir: 'evidence/CHANNEL-002/playwright-output',
  use: { baseURL: 'http://localhost:3150', viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3149/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3149',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'channel-002-browser',
        CORS_ORIGINS: 'http://localhost:3150',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/platform-web exec next dev --port 3150',
      url: 'http://localhost:3150',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3149' },
    },
  ],
});
