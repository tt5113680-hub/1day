import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3295';
const management = 'http://localhost:3296';
const system = '00000000-0000-4000-8000-000000000001';

test('version panel lists steps/conditions and clones publish with edited equals', async ({
  page,
}) => {
  const stamp = `${Date.now()}`;
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: system,
    }),
  });
  expect(login.status).toBe(201);
  const { accessToken, refreshToken } = (await login.json()) as {
    accessToken: string;
    refreshToken: string;
  };

  const org = await fetch(`${api}/api/v1/management/organization-employees`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-request-id': crypto.randomUUID(),
    },
  });
  expect(org.status).toBe(200);
  const employees = (await org.json()).data.employees as {
    id: string;
    status: string;
  }[];
  const employeeId = employees.find((item) => item.status === 'active')?.id;
  expect(employeeId).toBeTruthy();

  const headers = {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
    'x-request-id': crypto.randomUUID(),
  };
  const created = await fetch(`${api}/api/v1/workflows`, {
    method: 'POST',
    headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({
      code: `sys9_panel_${stamp}`,
      name: `SYS9 Panel ${stamp}`,
      steps: [
        {
          name: 'Contact',
          type: 'task',
          assigneeEmployeeId: employeeId,
          timeoutMinutes: 60,
        },
        {
          name: 'Upsell',
          type: 'task',
          assigneeEmployeeId: employeeId,
          timeoutMinutes: 60,
          condition: { key: 'upsell', equals: true },
        },
      ],
    }),
  });
  expect(created.status).toBe(201);
  const definition = (await created.json()).data as {
    id: string;
    draftVersionId: string;
    version: number;
  };
  const published = await fetch(`${api}/api/v1/workflows/${definition.id}/publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      versionId: definition.draftVersionId,
      definitionVersion: definition.version,
    }),
  });
  expect(published.status).toBe(201);

  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [accessToken, refreshToken],
  );
  await page.goto(`${management}/m/workflows`);
  await expect(page.getByRole('heading', { name: '让每个流程实例都可定位、可推进' })).toBeVisible();
  await expect(page.getByText(`SYS9 Panel ${stamp}`)).toBeVisible();
  await page.getByTestId(`workflow-version-open-${definition.id}`).click();
  await expect(page.getByTestId('workflow-version-panel')).toBeVisible();
  await expect(page.getByTestId('workflow-version-1')).toBeVisible();
  await expect(page.getByText('upsell = true')).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-9/workflow-version-panel.png',
    fullPage: true,
  });

  await page.getByLabel('步骤2条件值').selectOption('false');
  await page.getByTestId('workflow-version-clone-publish').click();
  await expect(page.getByRole('status')).toContainText('已发布第 2 版', { timeout: 15_000 });
  await expect(page.getByTestId('workflow-version-2')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('workflow-version-2').click();
  await expect(page.getByText('upsell = false')).toBeVisible({ timeout: 10_000 });
  await page.screenshot({
    path: 'evidence/SYS-9/workflow-version-panel-v2.png',
    fullPage: true,
  });
});
