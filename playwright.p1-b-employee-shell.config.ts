import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'p1-b-employee-shell.spec.ts',
  workers: 1,
  timeout: 180000,
  outputDir: 'evidence/P1-B-EMPLOYEE-SHELL/playwright-output',
  use: { trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3273/api/v1/health',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        ...process.env,
        PORT: '3273',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'p1-b-employee-shell-browser-secret-2026-08-10',
        CORS_ORIGINS: 'http://localhost:3274,http://127.0.0.1:3274',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/employee-web exec next dev --port 3274',
      url: 'http://localhost:3274',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3273',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3273',
      },
    },
  ],
});
