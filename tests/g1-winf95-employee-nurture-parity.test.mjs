import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/nurture/nurture-workbench.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/nurture/nurture-workbench.module.css'), 'utf8');

test('W∞-95: employee nurture converges to Meituan merchant-app yellow topBar + heroCard on gray canvas', () => {
  const p = page();
  const c = css();
  assert.match(p, /styles\.topBar/);
  assert.match(p, /styles\.topBarTitle/);
  assert.match(p, /styles\.topBarRefresh/);
  assert.match(p, /推广员工具 · 客户跟进/);
  assert.match(p, /data-testid="employee-nurture"/);
  assert.match(p, /styles\.heroCard/);
  assert.doesNotMatch(p, /styles\.header/);
  assert.match(c, /\.topBar\s*\{/);
  assert.match(c, /\.heroCard\s*\{/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-95: employee nurture gains real-data summaryStrip + distribution (禁止假 BI)', () => {
  const p = page();
  assert.match(p, /aria-label="客户跟进队列概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="客户跟进队列分布"/);
  assert.match(p, /styles\.distribution/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /profiles\.map/);
  assert.doesNotMatch(p, /Math\.random\(|mockMetrics|authMetrics/);
});

test('W∞-95: nurture keeps honest boundary + original interaction workflow and scope states', () => {
  const p = page();
  assert.match(p, /source=local/);
  assert.match(p, /不代履约美团\/抖音订单/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /不含第三方订单履约与支付金额/);
  assert.match(p, /不碰销售成交/);
  assert.match(p, /客户跟进队列未能完成加载。/);
  assert.match(p, /记录触达/);
  assert.match(p, /安排跟进/);
  assert.match(p, /客户分层/);
  assert.match(p, /全部客户/);
  assert.doesNotMatch(p, /经营/);
  assert.doesNotMatch(p, /复购机会/);
  assert.doesNotMatch(p, /把下一次复购/);
});

test('W∞-95: nurture retains tool identity without native-checkout or ONEDAY-prefixed eyebrow', () => {
  const p = page();
  assert.doesNotMatch(p, /ONEDAY \//);
  assert.doesNotMatch(p, /本平台下单请|去支付|完成支付|发起支付/);
  assert.match(p, /本页只做跟进作业编排/);
});
