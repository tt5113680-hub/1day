const {
  chromium,
} = require('D:/ONEDAY_V3/node_modules/.pnpm/@playwright+test@1.55.0/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const OUT = 'D:/ONEDAY_V3/evidence/COMMERCIAL_UI_FULL_CHAIN_AUDIT';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(['console', m.type(), m.text()]));
  page.on('pageerror', (e) => logs.push(['pageerror', e.message]));
  page.on('requestfailed', (r) =>
    logs.push(['fail', r.url(), r.failure() && r.failure().errorText]),
  );
  await page.goto('http://127.0.0.1:3203/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(5000);
  const body = await page.locator('body').innerText();
  const inputs = await page.locator('input').count();
  await page.screenshot({ path: path.join(OUT, 'debug-mgmt-login-wait.png'), fullPage: true });
  fs.writeFileSync(
    path.join(OUT, 'debug-mgmt-console.json'),
    JSON.stringify({ body, inputs, logs }, null, 2),
  );
  console.log(JSON.stringify({ body, inputs, logs: logs.slice(0, 30) }, null, 2));

  // employee full chain with proper login
  const m = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const ep = await m.newPage();
  await ep.goto('http://127.0.0.1:3202/e/login', { waitUntil: 'networkidle' });
  await ep.locator('input[name="tenantSlug"]').fill('luckin-oneday-human-pilot');
  await ep.locator('input[name="email"]').fill('pilot.storemanager@oneday.local');
  await ep.locator('input[name="password"]').fill('OnedayHumanPilot!2026');
  await ep.locator('button[type="submit"]').click();
  await ep.waitForTimeout(3000);
  await ep.screenshot({ path: path.join(OUT, 'J3-storemanager-workbench.png'), fullPage: true });
  const et = await ep.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'J3-storemanager-text.txt'), et);
  console.log('employee body slice', et.slice(0, 400));
  const task = ep.locator('a[href*="/e/tasks/"]').first();
  if (await task.count()) {
    await task.click();
    await ep.waitForTimeout(1500);
    await ep.screenshot({ path: path.join(OUT, 'J3-task-detail.png'), fullPage: true });
  }
  // try inject session into management via evaluating login API then set sessionStorage
  const mp = await context.newPage();
  const login = await mp.evaluate(async () => {
    const res = await fetch('http://127.0.0.1:3200/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: 'luckin-oneday-human-pilot',
        email: 'pilot.owner@oneday.local',
        password: 'OnedayHumanPilot!2026',
        deviceName: 'management-web',
      }),
    });
    const data = await res.json();
    return { status: res.status, data };
  });
  fs.writeFileSync(path.join(OUT, 'mgmt-api-login.json'), JSON.stringify(login, null, 2));
  console.log('mgmt api login', login.status, login.data && Object.keys(login.data));
  if (login.status === 201 || login.status === 200) {
    // Session shape from API
    const sess = login.data.data || login.data;
    await mp.goto('http://127.0.0.1:3203/login');
    await mp.evaluate((sess) => {
      const s = sess.accessToken ? sess : sess;
      sessionStorage.setItem('oneday.accessToken', s.accessToken || s.access_token);
      sessionStorage.setItem('oneday.refreshToken', s.refreshToken || s.refresh_token);
      sessionStorage.setItem(
        'oneday.accessExpiresAt',
        String(s.expiresAt || s.expires_at || Date.now() + 3600000),
      );
    }, sess);
    await mp.goto('http://127.0.0.1:3203/m/dashboard', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await mp.waitForTimeout(2000);
    await mp.screenshot({ path: path.join(OUT, 'J3-owner-dashboard.png'), fullPage: true });
    console.log('owner dash', (await mp.locator('body').innerText()).slice(0, 300));
    for (const [route, file] of [
      ['/m/customers', 'J3-customers.png'],
      ['/m/attribution', 'J3-attribution.png'],
      ['/m/stores', 'J3-stores.png'],
      ['/m/connectors', 'J3-connectors.png'],
      ['/m/ai-suggestions', 'J3-ai.png'],
      ['/m/page-builder', 'J3-page-builder.png'],
    ]) {
      await mp.goto('http://127.0.0.1:3203' + route, { waitUntil: 'networkidle', timeout: 60000 });
      await mp.waitForTimeout(800);
      await mp.screenshot({ path: path.join(OUT, file), fullPage: true });
    }
    // tenant B isolation via API token
    const bLogin = await mp.evaluate(async () => {
      const res = await fetch('http://127.0.0.1:3200/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: 'oneday-restaurant-b-human-pilot',
          email: 'pilot.tenantb.owner@oneday.local',
          password: 'OnedayHumanPilot!2026',
          deviceName: 'management-web',
        }),
      });
      return { status: res.status, data: await res.json() };
    });
    const bSess = bLogin.data.data || bLogin.data;
    await mp.evaluate((sess) => {
      sessionStorage.setItem('oneday.accessToken', sess.accessToken);
      sessionStorage.setItem('oneday.refreshToken', sess.refreshToken);
      sessionStorage.setItem(
        'oneday.accessExpiresAt',
        String(sess.expiresAt || Date.now() + 3600000),
      );
    }, bSess);
    await mp.goto('http://127.0.0.1:3203/m/customers', { waitUntil: 'networkidle' });
    await mp.waitForTimeout(1000);
    await mp.screenshot({ path: path.join(OUT, 'J6-tenantb-customers.png'), fullPage: true });
    const bText = await mp.locator('body').innerText();
    fs.writeFileSync(path.join(OUT, 'J6-tenantb-text.txt'), bText);

    // platform
    const pLogin = await mp.evaluate(async () => {
      const res = await fetch('http://127.0.0.1:3200/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: 'system',
          email: 'pilot.platform@oneday.local',
          password: 'OnedayHumanPilot!2026',
          deviceName: 'platform-web',
        }),
      });
      return { status: res.status, data: await res.json() };
    });
    const pSess = pLogin.data.data || pLogin.data;
    const pp = await context.newPage();
    await pp.goto('http://127.0.0.1:3204/login');
    await pp.evaluate((sess) => {
      sessionStorage.setItem('oneday.accessToken', sess.accessToken);
      sessionStorage.setItem('oneday.refreshToken', sess.refreshToken);
      sessionStorage.setItem(
        'oneday.accessExpiresAt',
        String(sess.expiresAt || Date.now() + 3600000),
      );
    }, pSess);
    for (const [route, file] of [
      ['/p/dashboard', 'J5-dashboard.png'],
      ['/p/tenants', 'J5-tenants.png'],
      ['/p/channels', 'J5-channels.png'],
      ['/p/business-circles', 'J5-circles.png'],
      ['/ch/dashboard', 'J5-channel-dash.png'],
      ['/bc/dashboard', 'J5-circle-dash.png'],
    ]) {
      await pp.goto('http://127.0.0.1:3204' + route, { waitUntil: 'networkidle', timeout: 60000 });
      await pp.waitForTimeout(700);
      await pp.screenshot({ path: path.join(OUT, file), fullPage: true });
    }
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
