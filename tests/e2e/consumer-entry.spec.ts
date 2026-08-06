import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const api = 'http://127.0.0.1:3031/api/v1';
const tenant = '00000000-0000-4000-8000-000000000001';
const stamp = Date.now();
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const headers = (token: string, key?: string) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});

test.beforeAll(async ({ request }) => {
  const login = await request.post(`${api}/auth/login`, {
    data: { email: 'admin@system.local', password: 'ChangeMe123!', tenantId: tenant },
  });
  expect(login.status()).toBe(201);
  const token = (await login.json()).accessToken as string;
  const create = await request.post(`${api}/page-templates`, {
    headers: headers(token, `browser-template-${stamp}`),
    data: {
      code: `browser-entry-${stamp}`,
      name: 'Browser consumer entry',
      target: 'consumer',
      modules: [
        {
          moduleType: 'hero',
          config: {
            sceneLabel: '周末灵感正在发生',
            title: '把今天留给美好体验',
            summary: '精选服务、权益与咨询入口已为你整理。',
            benefit: '新客到店礼已解锁',
          },
        },
        {
          moduleType: 'action_grid',
          config: {
            recommendations: [
              { title: '午后体验预约', description: '选择适合你的到店时间' },
              { title: '发现限定权益', description: '查看本周专属福利' },
            ],
          },
        },
        {
          moduleType: 'content',
          config: {
            cards: [
              { tag: '限时', title: '双人体验礼遇', description: '与朋友一起感受新体验' },
              { tag: '会员', title: '到店积分加倍', description: '本周完成咨询即可参与' },
            ],
          },
        },
      ],
    },
  });
  expect(create.status()).toBe(201);
  const template = (await create.json()).data;
  const publish = await request.post(`${api}/page-templates/${template.id}/publish`, {
    headers: headers(token),
    data: { versionId: template.draftVersionId, templateVersion: template.version },
  });
  expect(publish.status()).toBe(201);
  const action = await request.post(`${api}/external-actions`, {
    headers: headers(token, `browser-action-${stamp}`),
    data: {
      code: `consult-${stamp}`,
      name: '咨询商家',
      actionType: 'link',
      targetUrl: 'https://example.com/consult',
      platform: 'web',
    },
  });
  expect(action.status()).toBe(201);
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [randomUUID(), `empty-${stamp}`, 'Empty consumer tenant'],
    );
  } finally {
    await client.end();
  }
});

test('consumer entry renders real published content and supports mobile navigation', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:3030/c/entry?tenant=system');
  await expect(page.getByRole('heading', { name: '把今天留给美好体验' })).toBeVisible();
  await expect(page.getByRole('link', { name: '打开咨询商家' }).first()).toHaveAttribute(
    'href',
    'https://example.com/consult',
  );
  await page.getByRole('button', { name: '发现', exact: true }).click();
  await expect(page.getByRole('button', { name: '发现', exact: true })).toHaveClass(
    /navButtonActive/,
  );
  await page.screenshot({ path: 'evidence/PAGE-C-001/consumer-entry-mobile.png', fullPage: true });
});

test('consumer entry shows real empty and unavailable states', async ({ page }) => {
  await page.goto(`http://127.0.0.1:3030/c/entry?tenant=empty-${stamp}`);
  await expect(page.getByRole('heading', { name: '商家正在准备内容' })).toBeVisible();
  await page.screenshot({ path: 'evidence/PAGE-C-001/consumer-entry-empty.png', fullPage: true });
  await page.goto('http://127.0.0.1:3030/c/entry?tenant=missing-consumer-entry');
  await expect(page.getByRole('heading', { name: '此入口暂不可用' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-C-001/consumer-entry-forbidden.png',
    fullPage: true,
  });
});
