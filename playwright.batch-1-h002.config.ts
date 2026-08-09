import { defineConfig } from '@playwright/test';

const api = 'http://127.0.0.1:3270';
const consumer = 'http://127.0.0.1:3271';
const employee = 'http://127.0.0.1:3272';
const management = 'http://127.0.0.1:3273';
const platform = 'http://127.0.0.1:3274';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

process.env.H002_API_BASE = api;
process.env.H002_CONSUMER_BASE = consumer;
process.env.H002_EMPLOYEE_BASE = employee;
process.env.H002_MANAGEMENT_BASE = management;
process.env.H002_PLATFORM_BASE = platform;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'h-002-login.spec.ts',
  outputDir: 'evidence/COMMERCIAL-UI-FOUNDATION/h002-playwright-output',
  use: { trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: `${api}/api/v1/health`,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3270',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'batch-1-h002-browser-secret-at-least-32',
        CORS_ORIGINS: `${consumer},${employee},${management},${platform}`,
      },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/consumer-web exec next dev --hostname 127.0.0.1 --port 3271',
      url: consumer,
      reuseExistingServer: false,
      env: { ...process.env, API_BASE_URL: api, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/employee-web exec next dev --hostname 127.0.0.1 --port 3272',
      url: employee,
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/management-web exec next dev --hostname 127.0.0.1 --port 3273',
      url: management,
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/platform-web exec next dev --hostname 127.0.0.1 --port 3274',
      url: platform,
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
  ],
});
