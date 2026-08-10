import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_human_pilot';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'p1-b-platform-shell.spec.ts',
  workers: 1,
  timeout: 180000,
  outputDir: 'evidence/P1-B-PLATFORM-SHELL/playwright-output',
  use: { trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3346/api/v1/health',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        ...process.env,
        PORT: '3346',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'p1-b-platform-shell-browser-secret-2026-08-10',
        CORS_ORIGINS: 'http://localhost:3348',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/platform-web exec next dev --port 3348',
      url: 'http://localhost:3348',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3346',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3346',
      },
    },
  ],
});
