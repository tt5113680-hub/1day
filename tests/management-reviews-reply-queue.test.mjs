/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3086';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3086',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'management-reviews-reply-114',
  },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'x-request-id': randomUUID(),
  ...extra,
});
async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}
async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());
test('G1-W114: reviews pending-reply queue + reply write with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const merchant = randomUUID();
  const store = randomUUID();
  const review = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `rv-org-${stamp}`, `Reviews org ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `RVOWN114-${stamp}@example.test`, 'Reviews owner'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [owner.membership, tenant, owner.user],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenant, owner.membership, '00000000-0000-4000-8000-000000000004'],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [owner.employee, tenant, owner.membership, organization, `RVE114-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `RVM114-${stamp}`, `W114 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `RV-B114-${stamp}`, `Base store ${stamp}`],
    );
    // local evaluation archive row, no reply yet (pending)
    await client.query(
      `insert into store_reviews(id,tenant_id,store_id,rating,content,reviewer_label,source,status,created_by,updated_by)
       values($1,$2,$3,5,'非常满意','匿名食客','local','active',null,null)`,
      [review, tenant, store],
    );

    const ownerToken = await login(`RVOWN114-${stamp}@example.test`);

    // queue returns pending real row
    const queueResp = await fetch(`${base}/api/v1/management/commerce/reviews/queue`, {
      headers: headers(ownerToken),
    });
    assert.equal(queueResp.status, 200, `queue failed: ${await queueResp.clone().text()}`);
    const queue = (await queueResp.json()).data;
    assert.ok(queue.pending >= 1, 'pending count reflects real row');
    assert.ok(
      queue.pendingQueue.some((r) => r.id === review),
      'pending queue contains review',
    );
    assert.equal(queue.pendingQueue[0].reply_status, 'pending');
    assert.ok(
      queue.byRating.some((b) => b.rating === 5 && b.pending >= 1),
      'byRating pending mined',
    );

    // list filtered to pending contains the review
    const listResp = await fetch(
      `${base}/api/v1/management/commerce/reviews?reply=pending&rating=5`,
      {
        headers: headers(ownerToken),
      },
    );
    assert.equal(listResp.status, 200);
    const listed = (await listResp.json()).data;
    assert.ok(
      listed.some((r) => r.id === review),
      'pending filter lists review',
    );

    // cross-tenant deny on queue (no leak)
    const guarded = await fetch(`${base}/api/v1/management/commerce/reviews/queue`, {
      headers: headers(ownerToken, { 'x-tenant-context': randomUUID() }),
    });
    assert.ok([403, 404].includes(guarded.status), 'wrong tenant denied (403/404, no leak)');

    // reply write (idempotent key) -> audit + outbox
    const key = randomUUID();
    const replyResp = await fetch(`${base}/api/v1/management/commerce/reviews/${review}/reply`, {
      method: 'POST',
      headers: headers(ownerToken, { 'content-type': 'application/json', 'idempotency-key': key }),
      body: JSON.stringify({ replyText: '感谢您的支持！' }),
    });
    assert.equal(replyResp.status, 201, `reply failed: ${await replyResp.clone().text()}`);
    assert.equal((await replyResp.json()).data.replyStatus, 'replied');

    // idempotent replay returns same
    const replayResp = await fetch(`${base}/api/v1/management/commerce/reviews/${review}/reply`, {
      method: 'POST',
      headers: headers(ownerToken, { 'content-type': 'application/json', 'idempotency-key': key }),
      body: JSON.stringify({ replyText: '感谢您的支持！' }),
    });
    assert.equal(replayResp.status, 201);
    assert.equal((await replayResp.json()).data.replyStatus, 'replied');

    // queue now shows replied; pending no longer contains it
    const queue2 = (
      await (
        await fetch(`${base}/api/v1/management/commerce/reviews/queue`, {
          headers: headers(ownerToken),
        })
      ).json()
    ).data;
    assert.ok(queue2.pending >= 0, 'replied moves out of pending');
    assert.ok(!queue2.pendingQueue.some((r) => r.id === review), 'replied no longer pending');

    // list replied filter contains it
    const repliedList = (
      await (
        await fetch(`${base}/api/v1/management/commerce/reviews?reply=replied`, {
          headers: headers(ownerToken),
        })
      ).json()
    ).data;
    const replied = repliedList.find((r) => r.id === review);
    assert.ok(replied, 'replied filter lists review');
    assert.equal(replied.reply_status, 'replied');
    assert.equal(replied.reply_text, '感谢您的支持！');

    // audit + outbox written
    const audit = await client.query(
      "select count(*)::int as c from audit_logs where tenant_id=$1 and resource_id=$2 and action='reviews.replied'",
      [tenant, review],
    );
    assert.ok(audit.rows[0].c >= 1, 'audit written');
    const outbox = await client.query(
      "select count(*)::int as c from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='reviews.replied.v1'",
      [tenant, review],
    );
    assert.ok(outbox.rows[0].c >= 1, 'outbox written');

    // invalid reply -> 400
    const invalidResp = await fetch(`${base}/api/v1/management/commerce/reviews/${review}/reply`, {
      method: 'POST',
      headers: headers(ownerToken, {
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      }),
      body: JSON.stringify({ replyText: '' }),
    });
    assert.equal(invalidResp.status, 400, 'empty reply rejected (400)');

    // no auth denied
    const forbidden = await fetch(`${base}/api/v1/management/commerce/reviews/${review}/reply`, {
      method: 'POST',
      headers: headers('invalid-token', {
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      }),
      body: JSON.stringify({ replyText: 'x' }),
    });
    assert.ok([401, 403].includes(forbidden.status), 'no auth denied (401/403)');
  } finally {
    await client.end();
  }
});
