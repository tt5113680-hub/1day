import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const title = `Verify AI confirmation path ${Date.now()}`;
const executedTitle = `Verify executed create task receipt ${Date.now()}`;
const executedTaskId = randomUUID();
test.beforeAll(async () => {
  const client = new Client({ connectionString: db });
  await client.connect();
  await client.query(
    "insert into ai_suggestions(id,tenant_id,title,reason,impact,action_type,model_name,model_version) values($1,$2,$3,'The queue has a missed SLA signal','Keep follow-up within SLA','review_tasks','rule-engine','2026.08')",
    [randomUUID(), tenant, title],
  );
  await client.query(
    "insert into ai_suggestions(id,tenant_id,title,reason,impact,action_type,model_name,model_version,status,execution_status,execution_result) values($1,$2,$3,'Task is ready','Show the real local result','create_task','rule-engine','2026.08','accepted','executed',$4::jsonb)",
    [
      randomUUID(),
      tenant,
      executedTitle,
      JSON.stringify({ command: 'create_task', task: { id: executedTaskId } }),
    ],
  );
  await client.end();
});

test('manager confirms an AI suggestion and records traceable feedback', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('租户标识').fill('system');
  await page.getByPlaceholder('邮箱').fill('admin@system.local');
  await page.getByPlaceholder('密码').fill('ChangeMe123!');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL('/m/dashboard');
  await page.goto('/m/ai-suggestions');
  await expect(page.getByRole('heading', { name: '把经营判断变成可确认的下一步' })).toBeVisible();
  const card = page.locator('article', { hasText: title });
  await expect(card.getByText('rule-engine · 2026.08')).toBeVisible();
  await card.getByRole('button', { name: '采纳建议' }).click();
  await expect(page.getByRole('status')).toContainText('尚未执行，需要人工进入现有业务入口处理。');
  await expect(card.getByTestId('ai-execution-status')).toContainText(
    '尚未执行，需要人工进入现有业务入口处理。',
  );
  const executedCard = page.locator('article', { hasText: executedTitle });
  await expect(executedCard.getByTestId('ai-execution-status')).toContainText('已创建跟进任务');
  await expect(executedCard.getByTestId('ai-execution-status')).not.toContainText(executedTaskId);
  await card.getByLabel('反馈').fill('Confirmed by management review.');
  await card.getByRole('button', { name: '记录反馈' }).click();
  await expect(page.getByRole('status')).toContainText('反馈已记录');
  await expect(page.getByRole('heading', { name: '把经营判断变成可确认的下一步' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-006/management-ai-suggestions-desktop.png',
    fullPage: false,
  });
});

test('AI suggestion center recovers without a session', async ({ page }) => {
  await page.goto('/m/ai-suggestions');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: '管理端登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-006/management-ai-suggestions-forbidden-v2.png',
    fullPage: true,
  });
});
