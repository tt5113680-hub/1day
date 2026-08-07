import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = 'http://127.0.0.1:3170';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'hardening-002.spec.ts',
  outputDir: 'evidence/HARDENING-002/playwright-output',
  use: { viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: `${api}/api/v1/health`,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3170',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'hardening-002-browser',
        CORS_ORIGINS: 'http://127.0.0.1:3172,http://127.0.0.1:3173,http://127.0.0.1:3174',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3171',
      url: 'http://127.0.0.1:3171',
      reuseExistingServer: false,
      env: { ...process.env, API_BASE_URL: api, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command: 'pnpm.cmd --filter @oneday/employee-web exec next dev --port 3172',
      url: 'http://127.0.0.1:3172',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3173',
      url: 'http://127.0.0.1:3173',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
    {
      command: 'pnpm.cmd --filter @oneday/platform-web exec next dev --port 3174',
      url: 'http://127.0.0.1:3174',
      reuseExistingServer: false,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: api },
    },
  ],
});
