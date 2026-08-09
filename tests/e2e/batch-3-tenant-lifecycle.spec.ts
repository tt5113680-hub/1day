import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import {
  cleanupCommercialSimulation,
  commercialSimulation,
  seedCommercialSimulation,
} from '../fixtures/commercial-simulation.mjs';

process.env.NODE_ENV = 'test';

const api = 'http://127.0.0.1:3241';
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const luckin = commercialSimulation.tenants.luckin;
const system = commercialSimulation.tenants.system;

type Session = { accessToken: string; refreshToken: string };

const headers = (token: string) => ({
  authorization: `Bearer ${token}`,
  'x-request-id': crypto.randomUUID(),
});

test.beforeAll(async () => {
  await seedCommercialSimulation(databaseUrl);
});
test.afterAll(async () => {
  await cleanupCommercialSimulation(databaseUrl);
});

test('platform suspension revokes commercial sessions and hides the public storefront until recovery', async ({
  request,
}) => {
  const login = async (account: 'platform' | 'owner' | 'employee01', tenantSlug: string) => {
    const response = await request.post(`${api}/api/v1/auth/login`, {
      data: {
        email: commercialSimulation.accounts[account],
        password: commercialSimulation.password,
        tenantSlug,
        deviceName: 'batch-3-lifecycle',
      },
    });
    expect(response.status()).toBe(201);
    return (await response.json()) as Session;
  };

  const platform = await login('platform', system.slug);
  const owner = await login('owner', luckin.slug);
  const employee = await login('employee01', luckin.slug);
  expect((await request.get(`${api}/api/v1/consumer/entry?tenant=${luckin.slug}`)).status()).toBe(
    200,
  );

  const tenants = await request.get(`${api}/api/v1/platform/tenants`, {
    headers: headers(platform.accessToken),
  });
  expect(tenants.status()).toBe(200);
  const target = ((await tenants.json()).data as Array<{ id: string; version: number }>).find(
    (tenant) => tenant.id === luckin.id,
  );
  expect(target).toBeTruthy();

  const suspend = await request.put(`${api}/api/v1/platform/tenants/${luckin.id}`, {
    headers: { ...headers(platform.accessToken), 'idempotency-key': crypto.randomUUID() },
    data: {
      plan: 'starter',
      quotas: { users: 10, customers: 1000, stores: 3 },
      riskLevel: 'low',
      status: 'suspended',
      version: target!.version,
      confirmation: `SUSPEND:${luckin.slug}`,
    },
  });
  expect(suspend.status()).toBe(200);
  const suspended = (await suspend.json()).data as { status: string; version: number };
  expect(suspended.status).toBe('suspended');

  expect(
    (
      await request.get(`${api}/api/v1/management/dashboard`, {
        headers: headers(owner.accessToken),
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.get(`${api}/api/v1/employee/workbench`, {
        headers: headers(employee.accessToken),
      })
    ).status(),
  ).toBe(401);
  expect((await request.post(`${api}/api/v1/auth/refresh`, { data: owner })).status()).toBe(401);
  expect((await request.get(`${api}/api/v1/consumer/entry?tenant=${luckin.slug}`)).status()).toBe(
    404,
  );

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const checks = await Promise.all([
      pool.query(
        "select count(*)::int as count from auth_sessions where tenant_id=$1 and status='active' and revoked_at is null",
        [luckin.id],
      ),
      pool.query(
        "select count(*)::int as count from audit_logs where tenant_id=$1 and action='platform.tenant_updated' and details->>'status'='suspended'",
        [system.id],
      ),
      pool.query(
        "select count(*)::int as count from outbox_events where tenant_id=$1 and event_type='platform.tenant.updated.v1' and payload->>'status'='suspended'",
        [system.id],
      ),
    ]);
    expect(checks.map((result) => result.rows[0].count)).toEqual([0, 1, 1]);
  } finally {
    await pool.end();
  }

  const reactivate = await request.put(`${api}/api/v1/platform/tenants/${luckin.id}`, {
    headers: { ...headers(platform.accessToken), 'idempotency-key': crypto.randomUUID() },
    data: {
      plan: 'starter',
      quotas: { users: 10, customers: 1000, stores: 3 },
      riskLevel: 'low',
      status: 'active',
      version: suspended.version,
      confirmation: `ACTIVATE:${luckin.slug}`,
    },
  });
  expect(reactivate.status()).toBe(200);
  expect((await reactivate.json()).data.status).toBe('active');
  expect((await request.get(`${api}/api/v1/consumer/entry?tenant=${luckin.slug}`)).status()).toBe(
    200,
  );
  const recoveredOwner = await login('owner', luckin.slug);
  expect(
    (
      await request.get(`${api}/api/v1/management/dashboard`, {
        headers: headers(recoveredOwner.accessToken),
      })
    ).status(),
  ).toBe(200);
});
