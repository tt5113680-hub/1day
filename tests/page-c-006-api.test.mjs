/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3046';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3046', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-c-006-api' },
  stdio: 'ignore',
});
const hash = (token) => createHash('sha256').update(token).digest('hex');
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}
test.after(() => api.kill());

test('consumer process access requires a tenant-bound unexpired secret', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenant = randomUUID();
  const customer = randomUUID();
  const order = randomUUID();
  const process = randomUUID();
  const slug = `process-${stamp}`;
  const access = `process-access-${stamp}`;
  try {
    await c.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'流程租户','active',null,null)",
      [tenant, slug],
    );
    await c.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Private person','active',null,null)",
      [customer, tenant],
    );
    await c.query(
      "insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status,created_by,updated_by) values($1,$2,$3,'PROCESS-001',now(),'active',null,null)",
      [order, tenant, customer],
    );
    await c.query(
      "insert into verification_codes(id,tenant_id,order_id,code_hash,expires_at,status,created_by,updated_by) values($1,$2,$3,$4,'2030-01-01','redeemed',null,null)",
      [randomUUID(), tenant, order, hash('verification')],
    );
    await c.query(
      "insert into connector_results(id,tenant_id,order_id,connector_code,external_reference,result_status,payload,created_by,updated_by) values($1,$2,$3,'manual','receipt-1','succeeded','{}',null,null)",
      [randomUUID(), tenant, order],
    );
    await c.query(
      "insert into consumer_process_accesses(id,tenant_id,customer_id,order_id,access_token_hash,appointment_at,consultation_status,exception_feedback,expires_at,status,created_by,updated_by) values($1,$2,$3,$4,$5,now(),'completed','预约时间已调整','2030-01-01','active',null,null)",
      [process, tenant, customer, order, hash(access)],
    );
    const ok = await fetch(
      `${base}/api/v1/consumer/processes/${process}?tenant=${slug}&access=${access}`,
    );
    assert.equal(ok.status, 200);
    const data = (await ok.json()).data;
    assert.equal(data.order.number, 'PROCESS-001');
    assert.equal(data.process.exceptionFeedback, '预约时间已调整');
    assert.equal(JSON.stringify(data).includes('Private person'), false);
    assert.equal(
      (await fetch(`${base}/api/v1/consumer/processes/${process}?tenant=${slug}&access=wrong`))
        .status,
      404,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/consumer/processes/${process}?tenant=system&access=${access}`))
        .status,
      404,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/consumer/processes/not-a-uuid?tenant=${slug}&access=${access}`))
        .status,
      400,
    );
  } finally {
    await c.end();
  }
});
