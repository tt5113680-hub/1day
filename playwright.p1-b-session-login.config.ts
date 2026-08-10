import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'p1-b-session-login.spec.ts',
  outputDir: 'evidence/P1-B/playwright-output',
  fullyParallel: false,
  timeout: 90_000,
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3220/api/v1/health',
      reuseExistingServer: false,
      env: {
        PORT: '3220',
        DATABASE_URL: 'postgresql://oneday:oneday_local_only@127.0.0.1:5434/oneday_human_pilot',
        AUTH_TOKEN_SECRET: 'p1-b-session-login-auth-secret-2026-08-10',
        CORS_ORIGINS: 'http://127.0.0.1:3222,http://127.0.0.1:3223,http://127.0.0.1:3224',
      },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/employee-web exec next dev --hostname 127.0.0.1 --port 3222',
      url: 'http://127.0.0.1:3222',
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3220' },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/management-web exec next dev --hostname 127.0.0.1 --port 3223',
      url: 'http://127.0.0.1:3223',
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3220' },
    },
    {
      command:
        'pnpm.cmd --filter @oneday/platform-web exec next dev --hostname 127.0.0.1 --port 3224',
      url: 'http://127.0.0.1:3224',
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3220' },
    },
  ],
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
