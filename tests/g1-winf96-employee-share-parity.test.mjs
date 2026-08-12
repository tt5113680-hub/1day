import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/share/share-codes.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/share/share.module.css'), 'utf8');

test('W∞-96: employee share-codes converges to Meituan merchant-app yellow topBar + heroCard on gray canvas', () => {
  const p = page();
  const c = css();
  assert.match(p, /styles\.topBar/);
  assert.match(p, /styles\.topBarTitle/);
  assert.match(p, /styles\.topBarRefresh/);
  assert.match(p, /推广员工具 · 获客分享/);
  assert.match(p, /data-testid="employee-share"/);
  assert.match(p, /styles\.heroCard/);
  assert.doesNotMatch(p, /styles\.header/);
  assert.doesNotMatch(p, /styles\.hero(?!Card)/);
  assert.match(c, /\.topBar\s*\{/);
  assert.match(c, /\.heroCard\s*\{/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-96: employee share-codes gains real-data summaryStrip + distribution (禁止假 BI)', () => {
  const p = page();
  assert.match(p, /aria-label="分享数据概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="分享分布"/);
  assert.match(p, /styles\.distribution/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /codes\.filter/);
  assert.match(p, /labels\[item\.scenario\]/);
  assert.doesNotMatch(p, /Math\.random\(|mockMetrics|authMetrics/);
});

test('W∞-96: employee share-codes keeps honest boundary + original interaction workflow and scope states', () => {
  const p = page();
  assert.match(p, /source=local/);
  assert.match(p, /不含第三方成交结果/);
  assert.match(p, /不代履约美团\/抖音订单/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /不含支付金额/);
  assert.match(p, /分享入口未能完成加载。/);
  assert.match(p, /生成分享码/);
  assert.match(p, /立即失效/);
  assert.match(p, /复制链接/);
  assert.match(p, /后续扫码不会进入工具入口。/);
  assert.match(p, /默认进入消费者入口，可选设置自动失效时间。/);
  assert.match(p, /employee\/share-codes/);
  assert.match(p, /分享配对/);
  assert.doesNotMatch(p, /ONEDAY \//);
});

test('W∞-96: employee share-codes retains tool identity without store-ops 经营 wording', () => {
  const p = page();
  assert.doesNotMatch(p, /经营/);
  assert.doesNotMatch(p, /本平台下单请|去支付|完成支付|发起支付/);
  assert.doesNotMatch(p, /styles\.header/);
  assert.doesNotMatch(p, /styles\.hero(?!Card)/);
  assert.doesNotMatch(p, /AdminPageHeader/);
});
