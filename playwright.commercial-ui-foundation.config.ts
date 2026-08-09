import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'commercial-ui-foundation.spec.ts',
  outputDir: 'evidence/COMMERCIAL-UI-FOUNDATION/playwright-output',
  fullyParallel: false,
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3210/api/v1/health',
      reuseExistingServer: false,
      env: {
        PORT: '3210',
        DATABASE_URL: 'postgresql://oneday:oneday_local_only@127.0.0.1:5434/oneday_human_pilot',
        AUTH_TOKEN_SECRET: 'local-human-pilot-auth-secret-2026-08-08-only',
        CORS_ORIGINS:
          'http://127.0.0.1:3211,http://127.0.0.1:3212,http://127.0.0.1:3213,http://127.0.0.1:3214',
      },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/consumer-web exec next dev --hostname 127.0.0.1 --port 3211',
      url: 'http://127.0.0.1:3211',
      reuseExistingServer: false,
      env: {
        API_BASE_URL: 'http://127.0.0.1:3210',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3210',
      },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/employee-web exec next dev --hostname 127.0.0.1 --port 3212',
      url: 'http://127.0.0.1:3212',
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3210' },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/management-web exec next dev --hostname 127.0.0.1 --port 3213',
      url: 'http://127.0.0.1:3213',
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3210' },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/platform-web exec next dev --hostname 127.0.0.1 --port 3214',
      url: 'http://127.0.0.1:3214',
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3210' },
    },
  ],
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
