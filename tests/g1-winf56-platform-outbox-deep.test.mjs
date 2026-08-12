import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/p/outbox/page.tsx');
const cCss = () => read('apps/platform-web/app/p/outbox/page.module.css');

test('G1-W∞-56: /p/outbox adds real-data 平台投递分布 panel', () => {
  assert.match(c(), /aria-label="平台投递分布"/);
  assert.doesNotMatch(c(), /AdminPageHeader/);
  assert.doesNotMatch(c(), /<Card\b/);
  assert.doesNotMatch(c(), /ONEDAY \/ 平台 Outbox 死信/);
  assert.match(c(), /eventCounts/);
  assert.match(c(), /aggregateCounts/);
  assert.match(c(), /attemptsCounts/);
  assert.match(c(), /tenantCounts/);
  for (const label of ['事件类型分布', '聚合对象分布', '重试次数分布', '租户分布']) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(items\.length, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-56: /p/outbox uses platform Meituan-parity yellow top bar + gray canvas', () => {
  assert.match(c(), /推广员工具 · 平台投递队列/);
  assert.match(c(), /<h1>Outbox 死信与平台重放<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /data-testid="platform-outbox"/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-56: /p/outbox distribution/bar CSS present + responsive stacking', () => {
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

test('G1-W∞-56: honest source=local disclaimer and replay ops preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /是平台投递与同步队列/);
  assert.match(c(), /不包含本平台收款/);
  assert.match(c(), /仅恢复本地投递状态/);
  assert.match(c(), /重放/);
  assert.match(c(), /死信队列/);
  assert.match(c(), /运维边界/);
  assert.match(c(), /items\.map/);
});
