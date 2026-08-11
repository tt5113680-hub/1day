import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/p/tenants/page.tsx');
const cCss = () => read('apps/platform-web/app/p/tenants/page.module.css');

test('G1-W∞-53: /p/tenants adds real-data 平台租户运营分布 panel', () => {
  assert.match(c(), /aria-label="平台租户运营分布"/);
  assert.doesNotMatch(c(), /AdminPageHeader/);
  assert.match(c(), /statusCounts/);
  assert.match(c(), /planCounts/);
  assert.match(c(), /riskCounts/);
  assert.match(c(), /overdueCounts/);
  assert.match(c(), /quotaCounts/);
  for (const label of [
    '租户状态分布',
    '套餐分布',
    '风险等级分布',
    '逾期任务分布',
    '用户配额分布',
  ]) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(items\.length, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-53: /p/tenants uses platform Meituan-parity yellow top bar + gray canvas', () => {
  assert.match(c(), /推广员工具 · 平台租户管理/);
  assert.match(c(), /<h1>租户开通、暂停与工具边界<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /data-testid="platform-tenants"/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-53: /p/tenants distribution/bar CSS present + responsive stacking', () => {
  assert.match(cCss(), /\.distribution\s*\{/);
  assert.match(cCss(), /\.panelBlock\s*\{/);
  assert.match(cCss(), /\.barFill\s*\{/);
  assert.match(cCss(), /\.barTrack\s*\{/);
  assert.match(cCss(), /\.barRow\s*\{/);
  assert.match(cCss(), /\.barValue\s*\{/);
  assert.match(cCss(), /\.barEmpty\s*\{/);
  assert.match(cCss(), /\.barFill\s*\{\s*display:\s*block;/);
  assert.match(cCss(), /background:\s*linear-gradient\(90deg,\s*#ffd100,\s*#f0a500\);/);
  assert.match(cCss(), /\.distribution\s*\{\s*grid-template-columns:\s*1fr;\s*\}/);
});

test('G1-W∞-53: honest source=local disclaimer and tenant lifecycle ops preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /租户是工具开通与整合经济体/);
  assert.match(c(), /不包含本平台收款/);
  assert.match(c(), /未接美团实时商户数据/);
  assert.match(c(), /二次确认/);
  assert.match(c(), /SUSPEND|ACTIVATE/);
  assert.match(c(), /保存租户设置/);
});
