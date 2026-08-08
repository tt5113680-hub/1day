import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'commercial-ui-alignment.human-pilot.spec.ts',
  outputDir: 'evidence/COMMERCIAL-UI-ALIGNMENT/playwright-output',
  fullyParallel: false,
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
