import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/p/connectors/page.tsx');
const cCss = () => read('apps/platform-web/app/p/connectors/page.module.css');

test('G1-W∞-58: /p/connectors adds real-data 平台连接器分布 panel', () => {
  assert.match(c(), /aria-label="平台连接器分布"/);
  assert.doesNotMatch(c(), /AdminPageHeader/);
  assert.doesNotMatch(c(), /<Card\b/);
  assert.doesNotMatch(c(), /ONEDAY \/ 平台连接器治理/);
  assert.match(c(), /authModeCounts/);
  assert.match(c(), /healthCounts/);
  assert.match(c(), /authCounts/);
  assert.match(c(), /rateCounts/);
  assert.match(c(), /logCounts/);
  for (const label of [
    '授权方式分布',
    '健康状态分布',
    '租户授权分布',
    '限流带宽分布',
    '健康日志状态分布',
  ]) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(items\.length, b\.value\)/);
  assert.match(c(), /barWidth\(authCounts\.total, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-58: /p/connectors uses platform Meituan-parity yellow top bar + gray canvas', () => {
  assert.match(c(), /推广员工具 · 平台连接器/);
  assert.match(c(), /<h1>连接器目录、租户授权与健康观察<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /data-testid="platform-connectors"/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-58: /p/connectors distribution/bar CSS present + responsive stacking', () => {
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

test('G1-W∞-58: honest source=local disclaimer and connector ops preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /不包含本平台收款/);
  assert.match(c(), /观察不会调用美团\/抖音等外部平台/);
  assert.match(c(), /保存连接器定义/);
  assert.match(c(), /已定义连接器/);
  assert.match(c(), /记录健康观察/);
  assert.match(c(), /connector-delivery-boundary/);
  assert.match(c(), /items\.map/);
});
