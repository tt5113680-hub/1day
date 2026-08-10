import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3297';
const management = 'http://localhost:3298';
const system = '00000000-0000-4000-8000-000000000001';

test('draft authoring preview supports reorder and path simulation', async ({ page }) => {
  mkdirSync('evidence/SYS-14', { recursive: true });
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
    },
    [accessToken, refreshToken],
  );
  await page.goto(`${management}/m/workflows`);
  await expect(page.getByText('创建并发布流程模板')).toBeVisible();

  await page.getByLabel('步骤1名称').fill('Contact');
  await page.getByRole('button', { name: '添加步骤' }).click();
  await page.getByLabel('步骤2名称').fill('Upsell');
  await page.getByLabel('步骤2条件键').fill('upsell');
  await page.getByLabel('步骤2条件值').selectOption('true');

  await expect(page.getByTestId('workflow-draft-preview')).toBeVisible();
  await expect(page.getByTestId('workflow-draft-node-1')).toContainText('Upsell');
  await expect(page.getByTestId('workflow-draft-node-1')).toHaveAttribute(
    'data-path-state',
    'applied',
  );

  await page.getByTestId('workflow-draft-move-up-1').click();
  await expect(page.getByTestId('workflow-draft-node-0')).toContainText('Upsell');
  await expect(page.getByLabel('步骤1名称')).toHaveValue('Upsell');

  await page.getByTestId('workflow-draft-preview-upsell').selectOption('false');
  await expect(page.getByTestId('workflow-draft-node-0')).toHaveAttribute(
    'data-path-state',
    'skipped',
  );
  await expect(page.getByText('不是自由拖拽图编辑器')).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-14/draft-authoring-preview.png',
    fullPage: true,
  });
});
