import { defineConfig } from '@playwright/test';

const api = 'http://127.0.0.1:3180';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'audit-batch-6-commercial.spec.ts',
  outputDir: 'evidence/AUDIT-BATCH-6/playwright-output',
  use: { trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: `${api}/api/v1/health`,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3180',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'audit-batch-6-browser-secret-at-least-32',
        CORS_ORIGINS:
          'http://127.0.0.1:3181,http://127.0.0.1:3182,http://127.0.0.1:3183,http://127.0.0.1:3184',
      },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/consumer-web exec next dev --hostname 127.0.0.1 --port 3181',
      url: 'http://127.0.0.1:3181',
      reuseExistingServer: false,
      env: { ...process.env, API_BASE_URL: api, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/employee-web exec next dev --hostname 127.0.0.1 --port 3182',
      url: 'http://127.0.0.1:3182',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/management-web exec next dev --hostname 127.0.0.1 --port 3183',
      url: 'http://127.0.0.1:3183',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/platform-web exec next dev --hostname 127.0.0.1 --port 3184',
      url: 'http://127.0.0.1:3184',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
  ],
});
