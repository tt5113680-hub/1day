import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'consumer-commercial-home.human-pilot.spec.ts',
  outputDir: 'evidence/CONSUMER-COMMERCIAL-HOME-V1/playwright-output',
  fullyParallel: false,
  webServer: {
    command: 'pnpm.cmd --filter @oneday/consumer-web exec next start --port 3211',
    url: 'http://127.0.0.1:3211',
    reuseExistingServer: false,
    env: {
      API_BASE_URL: 'http://127.0.0.1:3200',
      NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3200',
    },
  },
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
