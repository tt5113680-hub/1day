import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const api = 'http://127.0.0.1:3317';
const management = 'http://localhost:3320';
const tenant = '00000000-0000-4000-8000-000000000001';

const headers = (token: string, key?: string) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});

test('SYS-24 customer detail can request transfer, approve, and merge via existing APIs', async ({
  page,
}) => {
  mkdirSync('evidence/SYS-24', { recursive: true });
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  expect(login.status).toBe(201);
  const { accessToken, refreshToken } = (await login.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const createCustomer = async (name: string) => {
    const response = await fetch(`${api}/api/v1/customers`, {
      method: 'POST',
      headers: headers(accessToken, `sys24-ui-create-${name}-${stamp}`),
      body: JSON.stringify({
        displayName: name,
        identities: [{ type: 'wechat', value: `sys24_ui_${name}_${stamp}` }],
      }),
    });
    expect(response.status).toBe(201);
    return (await response.json()).data as { id: string; version: number };
  };
  const source = await createCustomer(`SYS24 UI Source ${stamp}`);
  const target = await createCustomer(`SYS24 UI Target ${stamp}`);

  const organization = await fetch(`${api}/api/v1/organizations`, {
    method: 'POST',
    headers: headers(accessToken, `sys24-ui-org-${stamp}`),
    body: JSON.stringify({
      code: `s24ui-${stamp}`.slice(0, 32),
      name: `SYS24 UI Org ${stamp}`,
      organizationType: 'team',
    }),
  });
  expect(organization.status).toBe(201);
  const organizationId = (await organization.json()).data.id as string;
  const invite = await fetch(`${api}/api/v1/employees/invitations`, {
    method: 'POST',
    headers: headers(accessToken, `sys24-ui-invite-${stamp}`),
    body: JSON.stringify({
      email: `sys24-ui-${stamp}@example.test`,
      organizationId,
      employeeCode: `U24-${stamp}`.slice(0, 24),
      title: 'Advisor',
    }),
  });
  expect(invite.status).toBe(201);
  const invitation = (await invite.json()).data as { id: string; invitationToken: string };
  const accept = await fetch(`${api}/api/v1/employees/invitations/${invitation.id}/accept`, {
    method: 'POST',
    headers: headers(accessToken, `sys24-ui-accept-${stamp}`),
    body: JSON.stringify({
      invitationToken: invitation.invitationToken,
      displayName: `SYS24 UI Advisor ${stamp}`,
    }),
  });
  expect(accept.status).toBe(201);
  const employeeId = (await accept.json()).data.id as string;

  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [accessToken, refreshToken],
  );

  await page.goto(`${management}/m/customers/${source.id}`);
  await expect(page.getByTestId('customer-ops')).toBeVisible({ timeout: 15000 });
  await page.getByLabel('转入员工').selectOption(employeeId);
  await page.getByRole('button', { name: '发起归属审批' }).click();
  await expect(page.getByRole('status')).toContainText('已发起归属转移审批', { timeout: 15000 });
  await page.getByRole('button', { name: '批准转移' }).click();
  await expect(page.getByRole('status')).toContainText('归属转移已批准', { timeout: 15000 });
  await page.screenshot({
    path: 'evidence/SYS-24/customer-transfer-approved.png',
    fullPage: false,
  });

  await page.getByLabel('目标客户 ID').fill(target.id);
  await page.getByRole('button', { name: '合并到目标客户' }).click();
  await expect(page).toHaveURL(new RegExp(`/m/customers/${target.id}`), { timeout: 15000 });
  await expect(page.getByRole('heading', { name: new RegExp(`SYS24 UI Target ${stamp}`) })).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-24/customer-merged-target.png',
    fullPage: false,
  });

  await page.goto(`${management}/m/customers/${source.id}`);
  await expect(page.getByText('当前档案已不可再写入归属或合并')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('customer-ops')).toHaveCount(0);
  await page.screenshot({
    path: 'evidence/SYS-24/customer-merged-source-readonly.png',
    fullPage: false,
  });
});
