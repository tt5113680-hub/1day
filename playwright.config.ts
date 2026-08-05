import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'evidence/FOUNDATION-010/playwright-output',
  webServer: {
    command: 'pnpm.cmd --filter @oneday/consumer-web exec next dev --port 3020',
    url: 'http://127.0.0.1:3020',
    reuseExistingServer: false,
  },
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
  ],
});
