import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3297';
const management = 'http://localhost:3298';
const system = '00000000-0000-4000-8000-000000000001';

test('STA start-context presets drive path simulator without free-form canvas', async ({
  page,
}) => {
  mkdirSync('evidence/SYS-19', { recursive: true });
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
      code: `sys19_preset_${stamp}`,
      name: `SYS19 Preset ${stamp}`,
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
      localStorage.removeItem('oneday.workflow.startContextPresets');
    },
    [accessToken, refreshToken],
  );
  await page.goto(`${management}/m/workflows`);
  await expect(page.getByText(`SYS19 Preset ${stamp}`)).toBeVisible();
  await page.getByTestId(`workflow-version-open-${definition.id}`).click();
  await expect(page.getByTestId('workflow-panel-start-context-presets')).toBeVisible();
  await expect(page.getByTestId('workflow-path-preview-summary')).toContainText('将执行 1、2');
  await page.getByTestId('workflow-panel-preset-select').selectOption('builtin:all-false');
  await expect(page.getByTestId('workflow-path-preview-upsell')).toHaveValue('false');
  await expect(page.getByTestId('workflow-path-preview-summary')).toContainText('将跳过 2');
  await expect(page.getByTestId('workflow-flow-node-1')).toHaveAttribute('data-path-state', 'skipped');
  await page.getByTestId('workflow-panel-preset-name').fill(`upsell-false-${stamp}`);
  await page.getByTestId('workflow-panel-preset-save').click();
  await expect(page.getByTestId('workflow-panel-preset-select')).toContainText(
    `upsell-false-${stamp}`,
  );
  await page.getByTestId('workflow-panel-preset-select').selectOption('builtin:all-true');
  await expect(page.getByTestId('workflow-path-preview-summary')).toContainText('将执行 1、2');
  await expect(page.getByTestId('workflow-version-panel')).toContainText('不是自由拖拽图编辑器');
  await page.screenshot({
    path: 'evidence/SYS-19/start-context-presets.png',
    fullPage: true,
  });
});
