/**
 * Engineering-only screenshots for human product-owner review.
 * Does NOT mark PRODUCT_OWNER_UI_ACCEPTANCE PASS.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const consumer = 'http://127.0.0.1:3201';
const employee = 'http://127.0.0.1:3202';
const management = 'http://127.0.0.1:3203';
const platform = 'http://127.0.0.1:3204';
const luckin = 'luckin-oneday-human-pilot';
const password = 'OnedayHumanPilot!2026';
const store = '30000000-0000-4000-8000-000000000021';
const out = 'evidence/HUMAN-PILOT-HANDOFF/walkthrough';

async function signIn(page, loginUrl, tenant, email) {
  await page.goto(loginUrl);
  const inputs = page.locator('input');
  await inputs.nth(0).fill(tenant);
  await inputs.nth(1).fill(email);
  await inputs.nth(2).fill(password);
  await page.locator('button').first().click();
  await page.waitForTimeout(1200);
}

const browser = await chromium.launch();
mkdirSync(out, { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(
  `${consumer}/c/stores/${store}?tenant=${luckin}&source=pilot:walkthrough`,
  { waitUntil: 'networkidle' },
);
await page.screenshot({ path: `${out}/01-consumer-store-home.png`, fullPage: true });

await page.goto(
  `${consumer}/c/discovery?tenant=${luckin}&latitude=39.9087&longitude=116.4619`,
  { waitUntil: 'networkidle' },
);
await page.screenshot({ path: `${out}/02-consumer-discovery.png`, fullPage: true });

const consult = page.getByRole('link', { name: /到店咨询/ }).first();
if (await consult.count()) {
  // stay on discovery for shot 02; open store consult from store home
}
await page.goto(
  `${consumer}/c/stores/${store}?tenant=${luckin}&source=pilot:walkthrough`,
  { waitUntil: 'networkidle' },
);
await page.getByRole('link', { name: /到店咨询/ }).first().click();
await page.waitForLoadState('networkidle');
await page.screenshot({ path: `${out}/03-outbound-confirmation.png`, fullPage: true });

const emp = await browser.newPage({ viewport: { width: 390, height: 844 } });
await signIn(emp, `${employee}/e/login`, luckin, 'pilot.storemanager@oneday.local');
await emp.goto(`${employee}/e/workbench`, { waitUntil: 'networkidle' });
await emp.screenshot({ path: `${out}/04-employee-workbench.png`, fullPage: true });

const mgr = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await signIn(mgr, `${management}/login`, luckin, 'pilot.owner@oneday.local');
await mgr.goto(`${management}/m/customers`, { waitUntil: 'networkidle' });
await mgr.screenshot({ path: `${out}/05-management-customers.png`, fullPage: true });

const plat = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await signIn(plat, `${platform}/login`, 'system', 'pilot.platform@oneday.local');
await plat.goto(`${platform}/p/overview`, { waitUntil: 'networkidle' }).catch(async () => {
  await plat.goto(`${platform}/`, { waitUntil: 'networkidle' });
});
await plat.screenshot({ path: `${out}/06-platform-overview.png`, fullPage: true });

await browser.close();
console.log(JSON.stringify({ out, claim: 'LOCAL TEST ONLY — engineering screenshots; human sign-off required' }));
