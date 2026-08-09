const {
  chromium,
} = require('D:/ONEDAY_V3/node_modules/.pnpm/@playwright+test@1.55.0/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const OUT = 'D:/ONEDAY_V3/evidence/COMMERCIAL_UI_FULL_CHAIN_AUDIT';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  for (const [ctx, url, file] of [
    [mobile, 'http://127.0.0.1:3202/e/login', 'debug-emp-login'],
    [desk, 'http://127.0.0.1:3203/login', 'debug-mgmt-login'],
    [desk, 'http://127.0.0.1:3204/login', 'debug-plat-login'],
  ]) {
    const page = await ctx.newPage();
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    const html = await page.content();
    fs.writeFileSync(path.join(OUT, file + '.html'), html.slice(0, 12000));
    await page.screenshot({ path: path.join(OUT, file + '.png'), fullPage: true });
    const info = await page.evaluate(() => ({
      title: document.title,
      inputs: [...document.querySelectorAll('input')].map((i) => ({
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
      })),
      buttons: [...document.querySelectorAll('button')].map((b) => ({
        type: b.type,
        text: (b.textContent || '').trim(),
      })),
      body: ((document.body && document.body.innerText) || '').slice(0, 500),
    }));
    console.log(url, 'status', resp && resp.status(), JSON.stringify(info));
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
