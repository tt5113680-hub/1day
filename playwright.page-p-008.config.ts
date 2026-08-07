import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'platform-security-audit.spec.ts',
  outputDir: 'evidence/PAGE-P-008/playwright-output',
  use: { baseURL: 'http://localhost:3144', viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3143/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3143',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'page-p-008-browser',
        CORS_ORIGINS: 'http://localhost:3144',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/platform-web exec next dev --port 3144',
      url: 'http://localhost:3144',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3143' },
    },
  ],
});
