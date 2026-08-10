import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3297';
const management = 'http://localhost:3298';
const system = '00000000-0000-4000-8000-000000000001';

test('STA condition cards show when-true/when-false without free-form canvas', async ({
  page,
}) => {
  mkdirSync('evidence/SYS-18', { recursive: true });
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
  const employees = (await org.json()).data.employees as { id: string; status: string }[];
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
      code: `sys18_card_${stamp}`,
      name: `SYS18 Card ${stamp}`,
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
        {
          name: 'Close',
          type: 'task',
          assigneeEmployeeId: employeeId,
          timeoutMinutes: 30,
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
  expect(
    (
      await fetch(`${api}/api/v1/workflows/${definition.id}/publish`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          versionId: definition.draftVersionId,
          definitionVersion: definition.version,
        }),
      })
    ).status,
  ).toBe(201);

  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [accessToken, refreshToken],
  );
  await page.goto(`${management}/m/workflows`);
  await page.getByLabel('步骤1名称').fill(`Lead ${stamp}`);
  await page.getByLabel('步骤1条件键').fill('vip');
  await page.getByLabel('步骤1条件值').selectOption('true');
  await expect(page.getByTestId('workflow-draft-condition-card-0')).toBeVisible();
  await expect(page.getByTestId('workflow-draft-condition-when-true-0')).toContainText(
    '满足则执行本步骤',
  );
  await expect(page.getByTestId('workflow-draft-condition-card-0')).toContainText(
    '不是自由拖拽图编辑器',
  );

  await expect(page.getByText(`SYS18 Card ${stamp}`)).toBeVisible();
  await page.getByTestId(`workflow-version-open-${definition.id}`).click();
  await expect(page.getByTestId('workflow-panel-condition-card-1')).toBeVisible();
  await expect(page.getByTestId('workflow-panel-condition-when-true-1')).toContainText(
    '满足则执行本步骤',
  );
  await expect(page.getByTestId('workflow-panel-condition-when-false-1')).toContainText(
    '进入步骤 3',
  );
  await expect(page.getByTestId('workflow-panel-condition-card-1')).toHaveAttribute(
    'data-api-limit',
    'key_equals_only',
  );
  await expect(page.getByTestId('workflow-panel-condition-card-1')).toHaveAttribute(
    'data-editor',
    'not_free_form_drag',
  );
  await expect(page.getByTestId('workflow-version-panel')).toContainText('不是自由拖拽图编辑器');
  await page.screenshot({
    path: 'evidence/SYS-18/condition-card.png',
    fullPage: true,
  });
});
