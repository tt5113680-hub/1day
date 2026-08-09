const {
  chromium,
} = require('D:/ONEDAY_V3/node_modules/.pnpm/@playwright+test@1.55.0/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const OUT = 'D:/ONEDAY_V3/evidence/COMMERCIAL_UI_FULL_CHAIN_AUDIT';
const API = 'http://127.0.0.1:3200';
const PASS = 'OnedayHumanPilot!2026';

async function login(tenantSlug, email) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantSlug, email, password: PASS, deviceName: 'commercial-audit' }),
  });
  const json = await res.json();
  const data = json.data || json;
  return {
    status: res.status,
    token: data.accessToken,
    refresh: data.refreshToken,
    expiresAt: data.expiresAt,
    raw: json,
  };
}
async function api(token, pathname, init = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      authorization: `Bearer ${token}`,
      'content-type': init.body ? 'application/json' : undefined,
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text: text.slice(0, 500) };
}

(async () => {
  const report = { steps: [] };
  // 1) public consumer action
  const marker = `cui_${Date.now()}`;
  const open = await fetch(
    `${API}/api/v1/consumer/actions/30000000-0000-4000-8000-000000000041/confirm?tenant=luckin-oneday-human-pilot`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': marker },
      body: JSON.stringify({ source: marker, shareCode: 'PILOTFOLLOWUP' }),
    },
  );
  // try alternate paths used by UI
  let consumerResult = { status: open.status, body: await open.text() };
  if (open.status >= 400) {
    const open2 = await fetch(
      `${API}/api/v1/consumer/actions/30000000-0000-4000-8000-000000000041/open?tenant=luckin-oneday-human-pilot`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': marker + 'b' },
        body: JSON.stringify({ source: marker, shareCode: 'PILOTFOLLOWUP' }),
      },
    );
    consumerResult = { status: open2.status, body: await open2.text(), path: 'open' };
  } else consumerResult.path = 'confirm';
  report.steps.push({ step: 'consumer_action', ...consumerResult });

  // store open path (as store page does)
  const storeOpen = await fetch(
    `${API}/api/v1/consumer/stores/30000000-0000-4000-8000-000000000021/actions/30000000-0000-4000-8000-000000000041/open?tenant=luckin-oneday-human-pilot`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': `store-${marker}` },
      body: JSON.stringify({ source: marker, shareCode: 'PILOTFOLLOWUP' }),
    },
  );
  report.steps.push({
    step: 'store_open',
    status: storeOpen.status,
    body: (await storeOpen.text()).slice(0, 800),
  });

  // employee logins
  const follow = await login('luckin-oneday-human-pilot', 'pilot.followup@oneday.local');
  const sm = await login('luckin-oneday-human-pilot', 'pilot.storemanager@oneday.local');
  const owner = await login('luckin-oneday-human-pilot', 'pilot.owner@oneday.local');
  const emp1 = await login('luckin-oneday-human-pilot', 'pilot.employee01@oneday.local');
  const tenantB = await login(
    'oneday-restaurant-b-human-pilot',
    'pilot.tenantb.owner@oneday.local',
  );
  const platform = await login('system', 'pilot.platform@oneday.local');
  report.steps.push({
    step: 'logins',
    follow: follow.status,
    storemanager: sm.status,
    owner: owner.status,
    emp1: emp1.status,
    tenantB: tenantB.status,
    platform: platform.status,
  });

  if (sm.token) {
    const wb = await api(sm.token, '/api/v1/employee/workbench');
    report.steps.push({
      step: 'storemanager_workbench',
      status: wb.status,
      sample: JSON.stringify(wb.json).slice(0, 1000),
    });
  }
  if (follow.token) {
    const wb = await api(follow.token, '/api/v1/employee/workbench');
    report.steps.push({
      step: 'followup_workbench',
      status: wb.status,
      sample: JSON.stringify(wb.json).slice(0, 1000),
    });
  }
  if (owner.token) {
    const dash = await api(owner.token, '/api/v1/management/dashboard');
    const customers = await api(owner.token, '/api/v1/management/customers');
    const stores = await api(owner.token, '/api/v1/management/stores');
    const attr = await api(owner.token, '/api/v1/management/attribution');
    const ext = await api(owner.token, '/api/v1/external-actions');
    report.steps.push({
      step: 'owner_reads',
      dash: dash.status,
      customers: customers.status,
      customerCount: customers.json?.data?.length ?? customers.json?.data?.items?.length,
      stores: stores.status,
      storeCount: stores.json?.data?.length,
      attribution: attr.status,
      externalActions: ext.status,
      externalActionRows: ext.json?.data?.length ?? ext.json?.length,
      externalSample: JSON.stringify(ext.json).slice(0, 600),
    });
    // bad links
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x']) {
      const bad = await api(owner.token, '/api/v1/external-actions', {
        method: 'POST',
        headers: { 'idempotency-key': `bad-${Date.now()}-${url.slice(0, 8)}` },
        body: JSON.stringify({
          actionType: 'link',
          code: `B${Date.now()}`.slice(0, 12),
          name: 'bad',
          targetUrl: url,
        }),
      });
      report.steps.push({ step: 'bad_link', url, status: bad.status, body: bad.text });
    }
    // employee cannot management
    if (emp1.token) {
      const denied = await api(emp1.token, '/api/v1/management/customers');
      report.steps.push({ step: 'emp_mgmt_denied', status: denied.status });
    }
    // tenant B cannot see luckin customer if we have one id
    const list = customers.json?.data || customers.json?.data?.items || [];
    const firstId = Array.isArray(list) ? list[0]?.id : null;
    if (firstId && tenantB.token) {
      const cross = await api(tenantB.token, `/api/v1/management/customers/${firstId}`);
      report.steps.push({
        step: 'tenantb_cross',
        customerId: firstId,
        status: cross.status,
        body: cross.text.slice(0, 200),
      });
    }
  }
  if (platform.token) {
    const pd = await api(platform.token, '/api/v1/platform/dashboard');
    const tenants = await api(platform.token, '/api/v1/platform/tenants');
    report.steps.push({ step: 'platform', dash: pd.status, tenants: tenants.status });
  }

  // Browser employee with long hydration wait
  const browser = await chromium.launch({ headless: true });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await mobile.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error')
      report.steps.push({ step: 'console_error', text: m.text().slice(0, 200) });
  });
  await page.goto('http://127.0.0.1:3202/e/login', { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('input[name="tenantSlug"]', { timeout: 60000 });
  await page.fill('input[name="tenantSlug"]', 'luckin-oneday-human-pilot');
  await page.fill('input[name="email"]', 'pilot.storemanager@oneday.local');
  await page.fill('input[name="password"]', PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }).catch(() => null),
    page.click('button:has-text("登录")'),
  ]);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, 'J3-storemanager-workbench.png'), fullPage: true });
  report.steps.push({
    step: 'browser_employee',
    url: page.url(),
    text: (await page.locator('body').innerText()).slice(0, 500),
  });

  // Management: try session inject despite hydration issues
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const mp = await desk.newPage();
  const chunkFails = [];
  mp.on('requestfailed', (r) => chunkFails.push({ url: r.url(), err: r.failure()?.errorText }));
  mp.on('response', async (r) => {
    if (r.url().includes('/_next/') && r.status() >= 400)
      chunkFails.push({ url: r.url(), status: r.status() });
  });
  await mp.goto('http://127.0.0.1:3203/login', { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(2000);
  if (owner.token) {
    await mp.evaluate((s) => {
      sessionStorage.setItem('oneday.accessToken', s.token);
      sessionStorage.setItem('oneday.refreshToken', s.refresh || '');
      sessionStorage.setItem('oneday.accessExpiresAt', String(s.expiresAt || Date.now() + 3600000));
    }, owner);
    await mp.goto('http://127.0.0.1:3203/m/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await mp.waitForTimeout(4000);
    await mp.screenshot({ path: path.join(OUT, 'J3-owner-dashboard.png'), fullPage: true });
    report.steps.push({
      step: 'browser_management',
      url: mp.url(),
      text: (await mp.locator('body').innerText()).slice(0, 400),
      chunkFails: chunkFails.slice(0, 20),
    });
  }

  // Platform inject
  const pp = await desk.newPage();
  const pFails = [];
  pp.on('response', (r) => {
    if (r.url().includes('/_next/') && r.status() >= 400)
      pFails.push({ url: r.url(), status: r.status() });
  });
  await pp.goto('http://127.0.0.1:3204/login', { waitUntil: 'domcontentloaded' });
  if (platform.token) {
    await pp.evaluate((s) => {
      sessionStorage.setItem('oneday.accessToken', s.token);
      sessionStorage.setItem('oneday.refreshToken', s.refresh || '');
      sessionStorage.setItem('oneday.accessExpiresAt', String(s.expiresAt || Date.now() + 3600000));
    }, platform);
    await pp.goto('http://127.0.0.1:3204/p/dashboard', { waitUntil: 'domcontentloaded' });
    await pp.waitForTimeout(4000);
    await pp.screenshot({ path: path.join(OUT, 'J5-platform-dashboard.png'), fullPage: true });
    report.steps.push({
      step: 'browser_platform',
      text: (await pp.locator('body').innerText()).slice(0, 400),
      chunkFails: pFails.slice(0, 20),
    });
  }

  fs.writeFileSync(path.join(OUT, 'API_CHAIN_VERIFY.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      report.steps.map((s) => ({
        step: s.step,
        status: s.status,
        url: s.url,
        text: s.text && s.text.slice(0, 120),
        chunkFails: s.chunkFails && s.chunkFails.length,
      })),
      null,
      2,
    ),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
