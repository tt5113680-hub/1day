import { expect, test } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
let tenant = '';
let tenantId = '';
let profileId = '';
let access = '';
let client: Client;

test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  tenantId = randomUUID();
  const customer = randomUUID();
  const organization = randomUUID();
  const merchant = randomUUID();
  const store = randomUUID();
  profileId = randomUUID();
  tenant = `browser-profile-${stamp}`;
  access = `browser-profile-access-${stamp}`;
  await client.query(
    "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'Browser profile tenant','active',null,null)",
    [tenantId, tenant],
  );
  await client.query(
    "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Mobile Member','active',null,null)",
    [customer, tenantId],
  );
  await client.query(
    "insert into customer_identities(id,tenant_id,customer_id,identity_type,identity_value_hash,masked_value,status,created_by,updated_by) values($1,$2,$3,'phone',$4,'139****9000','active',null,null)",
    [randomUUID(), tenantId, customer, hash('13900009000')],
  );
  await client.query(
    "insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status,created_by,updated_by) values($1,$2,$3,'MOBILE-PROFILE-001',now(),'active',null,null)",
    [randomUUID(), tenantId, customer],
  );
  await client.query(
    "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Browser profile organization','enterprise','active',null,null)",
    [organization, tenantId, `browser-profile-org-${stamp}`],
  );
  await client.query(
    "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'Browser profile merchant','active',null,null)",
    [merchant, tenantId, organization, `browser-profile-merchant-${stamp}`],
  );
  await client.query(
    "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Browser profile store','active',null,null)",
    [store, tenantId, organization, merchant, `browser-profile-store-${stamp}`],
  );
  await client.query(
    "insert into store_benefits(id,tenant_id,store_id,title,description,status,created_by,updated_by) values($1,$2,$3,'Mobile member benefit','Visible only to this tenant','active',null,null)",
    [randomUUID(), tenantId, store],
  );
  await client.query(
    "insert into consumer_profile_accesses(id,tenant_id,customer_id,access_token_hash,consent_version,expires_at,status,created_by,updated_by) values($1,$2,$3,$4,'v1','2030-01-01','active',null,null)",
    [profileId, tenantId, customer, hash(access)],
  );
});
test.afterAll(async () => client.end());

test('consumer profile shows masked membership data and can revoke consent at 390px', async ({
  page,
}) => {
  await page.goto(`/c/profile?tenant=${tenant}&profile=${profileId}&access=${access}`);
  await expect(page.getByRole('heading', { name: 'Mobile Member' })).toBeVisible();
  await expect(page.getByText('139****9000')).toBeVisible();
  await expect(page.getByText('Mobile member benefit')).toBeVisible();
  await expect(page.getByText('MOBILE-PROFILE-001')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-C-007/consumer-profile-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '撤回授权' }).click();
  await expect(page.getByText('授权已撤回')).toBeVisible();
  const result = await client.query(
    "select (select count(*) from audit_logs where tenant_id=$1 and action='consumer.profile_consent_revoked')::int as audits,(select count(*) from outbox_events where tenant_id=$1 and event_type='consumer.profile.consent.revoked.v1')::int as outbox",
    [tenantId],
  );
  expect(result.rows[0]).toEqual({ audits: 1, outbox: 1 });
});

test('invalid consumer profile access shows recovery state at 390px', async ({ page }) => {
  await page.goto(`/c/profile?tenant=${tenant}&profile=${profileId}&access=wrong`);
  await expect(page.getByRole('heading', { name: '资料暂不可访问' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-C-007/consumer-profile-forbidden.png',
    fullPage: true,
  });
});
