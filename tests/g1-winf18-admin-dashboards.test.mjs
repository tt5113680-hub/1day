import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-18: management/platform dashboards + consumer profile densify', () => {
  const root = process.cwd();
  const read = (rel) => readFileSync(join(root, rel), 'utf8');

  const management = read('apps/management-web/app/page.tsx');
  const platform = read('apps/platform-web/app/p/dashboard/page.tsx');
  const circleDash = read('apps/platform-web/app/bc/dashboard/page.tsx');
  const profile = read('apps/consumer-web/app/c/profile/profile.tsx');

  assert.match(management, /推广员工具 · 管理工作台/);
  assert.match(management, /不含支付金额/);
  assert.match(management, /近30日服务档案/);
  assert.match(management, /作业数据/);
  assert.doesNotMatch(management, /美团商家端 PC · 商家中心/);
  assert.doesNotMatch(management, /对标美团商家端快捷入口/);

  assert.match(platform, /推广员工具 · 平台总览/);
  assert.match(platform, /不含本平台收款/);

  assert.match(circleDash, /推广员工具 · 商圈联盟/);
  assert.match(circleDash, /已确认入口转化/);
  assert.match(circleDash, /非本平台下单/);
  assert.doesNotMatch(circleDash, /已确认订单/);

  assert.match(profile, /推广员工具 · 我的会员资料/);
  assert.match(profile, /非本平台下单/);
});
