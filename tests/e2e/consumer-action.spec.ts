import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const connectionString = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
let tenant = '';
let action = '';
let client: InstanceType<typeof Client>;

test.beforeAll(async () => {
  client = new Client({ connectionString });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  tenant = `action-ui-${stamp}`;
  const tenantId = randomUUID();
  action = randomUUID();
  await client.query(
    "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'动作体验商家','active',null,null)",
    [tenantId, tenant],
  );
  await client.query(
    "insert into external_actions(id,tenant_id,code,name,action_type,target_url,platform,status,created_by,updated_by) values($1,$2,$3,'打开体验服务','link',$4,'web','active',null,null)",
    [
      action,
      tenantId,
      `e2e-code-${stamp}`,
      `http://127.0.0.1:3045/c/entry?redirected=1&tenant=${tenant}`,
    ],
  );
});
test.afterAll(async () => client.end());

test('consumer confirms a redirect and can return on a 390px viewport', async ({ page }) => {
  await page.goto(
    `/c/actions/${action}?tenant=${tenant}&source=consumer:entry&returnTo=/c/entry?tenant=${tenant}`,
  );
  await expect(page.getByRole('heading', { name: '打开体验服务' })).toBeVisible();
  await page.screenshot({ path: 'evidence/PAGE-C-005/consumer-action-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '确认并打开' }).click();
  await page.waitForURL(/\/c\/entry\?redirected=1&tenant=/);
  const events = await client.query(
    'select count(*)::int as count from consumer_action_redirect_events e join tenants t on t.id=e.tenant_id where t.slug=$1 and e.action_id=$2',
    [tenant, action],
  );
  expect(events.rows[0].count).toBe(1);
});

test('unavailable actions show a mobile recovery state', async ({ page }) => {
  await page.goto(`/c/actions/${randomUUID()}?tenant=${tenant}`);
  await expect(page.getByRole('heading', { name: '动作暂不可访问' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-C-005/consumer-action-forbidden.png',
    fullPage: true,
  });
});
