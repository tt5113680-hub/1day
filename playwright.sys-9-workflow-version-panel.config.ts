import { defineConfig } from '@playwright/test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys-9-workflow-version-panel.spec.ts',
  workers: 1,
  outputDir: 'evidence/SYS-9/playwright-version-output',
  use: { viewport: { width: 1440, height: 1000 }, trace: 'on' },
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: 'http://127.0.0.1:3295/api/v1/health',
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '3295',
        DATABASE_URL: db,
        AUTH_TOKEN_SECRET: 'sys-9-workflow-version-panel',
        CORS_ORIGINS: 'http://localhost:3296',
      },
    },
    {
      command: 'pnpm.cmd --filter @oneday/management-web exec next dev --port 3296',
      url: 'http://localhost:3296',
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:3295',
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3295',
      },
    },
  ],
});
