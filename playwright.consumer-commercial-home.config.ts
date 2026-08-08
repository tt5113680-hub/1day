import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'consumer-commercial-home.human-pilot.spec.ts',
  outputDir: 'evidence/CONSUMER-COMMERCIAL-HOME-V1/playwright-output',
  fullyParallel: false,
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
