import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3297';
const management = 'http://localhost:3298';
const system = '00000000-0000-4000-8000-000000000001';

test('STA closed loop authors 3-step conditional flow without leaving timeline', async ({
  page,
}) => {
  mkdirSync('evidence/SYS-21', { recursive: true });
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
  await expect(page.getByTestId('workflow-draft-timeline')).toBeVisible();
  await expect(page.getByTestId('workflow-draft-timeline')).toContainText('不是自由拖拽图编辑器');

  await page.getByLabel('流程编码').fill(`sys21_sta_${stamp}`);
  await page.getByLabel('流程名称').fill(`SYS21 STA ${stamp}`);
  await page.getByLabel('步骤1名称').fill('Contact');
  await page.getByTestId('workflow-draft-insert-1').click();
  await page.getByLabel('步骤2名称').fill('Upsell');
  await page.getByLabel('步骤2条件键').fill('upsell');
  await page.getByLabel('步骤2条件值').selectOption('true');
  await page.getByTestId('workflow-draft-insert-2').click();
  await page.getByLabel('步骤3名称').fill('Close');

  await expect(page.getByTestId('workflow-draft-condition-card-1')).toBeVisible();
  await expect(page.getByTestId('workflow-draft-condition-when-true-1')).toContainText(
    '满足则执行本步骤',
  );
  await expect(page.getByTestId('workflow-draft-condition-when-false-1')).toContainText(
    '进入步骤 3',
  );
  await expect(page.getByTestId('workflow-draft-preview')).toBeVisible();
  await expect(page.getByTestId('workflow-draft-start-context-presets')).toBeVisible();
  await page.getByTestId('workflow-draft-preset-select').selectOption('builtin:all-false');
  await expect(page.getByTestId('workflow-draft-node-1')).toHaveAttribute(
    'data-path-state',
    'skipped',
  );
  await expect(page.getByTestId('workflow-draft-drag-0')).toBeVisible();
  await expect(page.getByTestId('workflow-draft-step-0')).toHaveAttribute(
    'data-list-reorder',
    'list_native_dnd_not_free_form_canvas',
  );

  await page.getByTestId('workflow-draft-create-publish').click();
  await expect(page.getByText(/已创建并发布/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(`SYS21 STA ${stamp}`, { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-21/sta-closed-loop.png',
    fullPage: true,
  });
});
