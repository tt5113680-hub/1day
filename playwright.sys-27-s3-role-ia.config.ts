import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-27-s3-role-ia.spec.ts',
  workers: 1,
  timeout: 120000,
  outputDir: 'evidence/SYS-27/playwright-s3-role-ia-output',
  use: {
    viewport: { width: 1440, height: 1000 },
    trace: 'on',
  },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3341/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3341',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-27-s3-role-ia',
        CORS_ORIGINS: 'http://localhost:3342,http://localhost:3343',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/platform-web exec next dev --port 3342',
      url: 'http://localhost:3342',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3341',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3341',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/employee-web exec next dev --port 3343',
      url: 'http://localhost:3343',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3341',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3341',
      },
    },
  ],
});
