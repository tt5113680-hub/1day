import { defineConfig } from '@playwright/test';

const api = 'http://127.0.0.1:3190';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'audit-batch-7-commercial-ux.spec.ts',
  outputDir: 'evidence/AUDIT-BATCH-7/playwright-output',
  use: { trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: `${api}/api/v1/health`,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3190',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'audit-batch-7-browser-secret-at-least-32',
        CORS_ORIGINS:
          'http://127.0.0.1:3191,http://127.0.0.1:3192,http://127.0.0.1:3193,http://127.0.0.1:3194',
      },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/consumer-web exec next dev --hostname 127.0.0.1 --port 3191',
      url: 'http://127.0.0.1:3191',
      reuseExistingServer: false,
      env: { ...process.env, API_BASE_URL: api, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/employee-web exec next dev --hostname 127.0.0.1 --port 3192',
      url: 'http://127.0.0.1:3192',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/management-web exec next dev --hostname 127.0.0.1 --port 3193',
      url: 'http://127.0.0.1:3193',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/platform-web exec next dev --hostname 127.0.0.1 --port 3194',
      url: 'http://127.0.0.1:3194',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
  ],
});
