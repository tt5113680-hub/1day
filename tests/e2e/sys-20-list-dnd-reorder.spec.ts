import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3297';
const management = 'http://localhost:3298';
const system = '00000000-0000-4000-8000-000000000001';

/** Same path as HTML5 onDrop — Playwright exercises list reorder without flaky DataTransfer. */
async function listDrop(
  page: import('@playwright/test').Page,
  surface: 'draft' | 'panel',
  from: number,
  to: number,
) {
  await page.evaluate(
    ({ surface: nextSurface, from: nextFrom, to: nextTo }) => {
      window.dispatchEvent(
        new CustomEvent('oneday-sta-list-reorder', {
          detail: { surface: nextSurface, from: nextFrom, to: nextTo },
        }),
      );
    },
    { surface, from, to },
  );
}

test('STA list DnD reorder persists via clone-publish without free-form canvas', async ({
  page,
}) => {
  mkdirSync('evidence/SYS-20', { recursive: true });
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
      code: `sys20_dnd_${stamp}`,
      name: `SYS20 DnD ${stamp}`,
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
  await expect(page.getByTestId('workflow-draft-timeline')).toContainText('列表拖拽重排');
  await expect(page.getByTestId('workflow-draft-drag-0')).toBeVisible();
  await expect(page.getByTestId('workflow-draft-step-0')).toHaveAttribute(
    'data-list-reorder',
    'list_native_dnd_not_free_form_canvas',
  );

  await page.getByLabel('步骤1名称').fill(`Alpha ${stamp}`);
  await page.getByTestId('workflow-draft-insert-1').click();
  await page.getByLabel('步骤2名称').fill(`Beta ${stamp}`);
  await listDrop(page, 'draft', 0, 1);
  await expect(page.getByLabel('步骤1名称')).toHaveValue(`Beta ${stamp}`);
  await expect(page.getByLabel('步骤2名称')).toHaveValue(`Alpha ${stamp}`);

  await expect(page.getByText(`SYS20 DnD ${stamp}`)).toBeVisible();
  await page.getByTestId(`workflow-version-open-${definition.id}`).click();
  await expect(page.getByTestId('workflow-panel-drag-0')).toBeVisible();
  await expect(page.getByTestId('workflow-panel-step-0')).toHaveAttribute(
    'data-list-reorder',
    'list_native_dnd_not_free_form_canvas',
  );
  await expect(page.getByTestId('workflow-panel-step-0')).toContainText('Contact');
  await listDrop(page, 'panel', 0, 2);
  await expect(page.getByTestId('workflow-panel-step-0')).toContainText('Upsell');
  await expect(page.getByTestId('workflow-panel-step-2')).toContainText('Contact');
  await page.getByTestId('workflow-version-clone-publish').click();
  await expect(page.getByText(/已发布第/)).toBeVisible({ timeout: 15000 });
  await page.getByTestId(`workflow-version-open-${definition.id}`).click();
  await expect(page.getByTestId('workflow-version-2')).toBeVisible();
  await page.getByTestId('workflow-version-2').click();
  await expect(page.getByTestId('workflow-panel-step-0')).toContainText('Upsell');
  await expect(page.getByTestId('workflow-panel-step-2')).toContainText('Contact');
  await expect(page.getByTestId('workflow-version-panel')).toContainText('不是自由拖拽图编辑器');
  await page.screenshot({
    path: 'evidence/SYS-20/list-dnd-reorder.png',
    fullPage: true,
  });
});
