import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const api = 'http://127.0.0.1:3096';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const title = 'Verify AI confirmation path';
let token = '';

test.beforeAll(async () => {
  const client = new Client({ connectionString: db });
  await client.connect();
  await client.query(
    "insert into ai_suggestions(id,tenant_id,title,reason,impact,action_type,model_name,model_version) values($1,$2,$3,'The queue has a missed SLA signal','Keep follow-up within SLA','review_tasks','rule-engine','2026.08')",
    [randomUUID(), tenant, title],
  );
  await client.end();
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  expect(response.status).toBe(201);
  token = (await response.json()).accessToken;
});

test('manager confirms an AI suggestion and records traceable feedback', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/m/ai-suggestions');
  await expect(page.getByRole('heading', { name: '把经营判断变成可确认的下一步' })).toBeVisible();
  const card = page.locator('article', { hasText: title });
  await expect(card.getByText('rule-engine · 2026.08')).toBeVisible();
  await card.getByRole('button', { name: '采纳建议' }).click();
  await expect(page.getByRole('status')).toContainText('建议已采纳');
  await card.getByLabel('反馈').fill('Confirmed by management review.');
  await card.getByRole('button', { name: '记录反馈' }).click();
  await expect(page.getByRole('status')).toContainText('反馈已记录');
  await page.screenshot({
    path: 'evidence/PAGE-M-006/management-ai-suggestions-desktop.png',
    fullPage: false,
  });
});

test('AI suggestion center recovers without a session', async ({ page }) => {
  await page.goto('/m/ai-suggestions');
  await expect(page.getByRole('heading', { name: '无权查看 AI 建议' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-006/management-ai-suggestions-forbidden.png',
    fullPage: true,
  });
});
