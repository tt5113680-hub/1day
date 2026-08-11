import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-15: process + offer_compare + task inbox densify', () => {
  const root = process.cwd();
  const processPage = readFileSync(
    join(root, 'apps/consumer-web/app/c/processes/[id]/process.tsx'),
    'utf8',
  );
  const modules = readFileSync(
    join(root, 'apps/consumer-web/app/c/stores/[id]/storefront-modules.tsx'),
    'utf8',
  );
  const workbench = readFileSync(
    join(root, 'apps/employee-web/app/e/workbench/workbench.tsx'),
    'utf8',
  );
  const inbox = readFileSync(
    join(root, 'apps/employee-web/app/e/tasks/task-inbox.tsx'),
    'utf8',
  );
  const oneCode = readFileSync(
    join(root, 'apps/consumer-web/app/c/one-code/[code]/one-code-landing.tsx'),
    'utf8',
  );

  assert.match(processPage, /推广员工具 · 门店服务过程/);
  assert.match(processPage, /门店服务编号/);
  assert.match(processPage, /服务已登记/);
  assert.match(processPage, /非本平台下单/);
  assert.doesNotMatch(processPage, /订单过程查询/);
  assert.doesNotMatch(processPage, /订单已创建/);
  assert.doesNotMatch(processPage, />订单号</);

  assert.match(modules, /选好平台后经确认页跳转（不在此下单）/);
  assert.match(modules, /本地试用 · 推广员入口/);
  assert.doesNotMatch(modules, /前往下单/);

  assert.match(workbench, /任务待办/);
  assert.doesNotMatch(workbench, /订单待办/);

  assert.match(inbox, /推广员工具 · 任务收件箱/);
  assert.match(inbox, /不含第三方订单履约/);

  assert.match(oneCode, /推广员工具/);
  assert.match(oneCode, /不在此下单/);
});
