import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () => readFileSync(join(root, 'apps/management-web/app/m/settings/page.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/management-web/app/m/settings/page.module.css'), 'utf8');

test('W∞-82: /m/settings keeps Meituan-parity yellow top bar + gray canvas + hero', () => {
  const p = page();
  const c = css();
  assert.match(p, /推广员工具 · 工具设置/);
  assert.match(p, /topBar/);
  assert.match(p, /topBarRefresh/);
  assert.match(p, /heroCard/);
  assert.match(p, /<h1>{settings\.brand\.displayName} 的可审计工具规则<\/h1>/);
  assert.match(p, /保存工具设置/);
  assert.match(c, /background:\s*#f5f5f5/);
  assert.match(c, /#ffd100|#ffe14d/);
});

test('W∞-82: /m/settings adds real-data 工具规则分布 panel derived from loaded settings', () => {
  const p = page();
  const c = css();
  assert.match(p, /aria-label="工具规则分布"/);
  assert.match(p, /工具规则分布/);
  assert.match(p, /由当前工具规则档现场推导/);
  assert.match(p, /approvalDist/);
  assert.match(p, /hoursDist/);
  assert.match(p, /dndDist/);
  assert.match(p, /tagsDist/);
  assert.match(p, /allocDist/);
  assert.match(p, /visibilityDist/);
  for (const label of [
    '审批开关分布',
    '提醒时限分布',
    '免打扰分布',
    '标签规则分布',
    '归属分配分布',
    '全平台可见引流分布',
  ]) {
    assert.match(p, new RegExp(`<h3>${label}</h3>`));
  }
  assert.match(p, /barWidth\(total, item\.value\)/);
  assert.match(p, /countBy\(/);
  assert.match(p, /暂无记录/);
  assert.match(c, /\.distribution/);
  assert.match(c, /\.panelBlock/);
  assert.match(c, /\.barFill/);
  assert.match(c, /\.barTrack/);
  assert.match(c, /\.barRow/);
  assert.match(c, /\.barValue/);
  assert.match(c, /\.barLabel/);
  assert.match(c, /\.barEmpty/);
  assert.match(c, /\.honest/);
  assert.match(c, /\.summaryStrip/);
});

test('W∞-82: /m/settings distribution buckets derive from real loaded fields (no fake BI)', () => {
  const p = page();
  assert.match(p, /settings\.approvals\.requireOwnershipTransfer/);
  assert.match(p, /settings\.approvals\.requireContentApproval/);
  assert.match(p, /settings\.reminders\.defaultDueHours/);
  assert.match(p, /settings\.reminders\.escalationHours/);
  assert.match(p, /settings\.doNotDisturb\.enabled/);
  assert.match(p, /settings\.tags\.allowCustom/);
  assert.match(p, /settings\.tags\.maxPerCustomer/);
  assert.match(p, /settings\.ownership\.allocation === 'round_robin'/);
  assert.match(p, /platformVisible/);
  assert.doesNotMatch(p, /假 BI|mockMetrics|Math\.random\(/);
  assert.match(p, /api\/v1\/management\/settings/);
});

test('W∞-82: honest summary strip + source=local tool-identity boundaries preserved', () => {
  const p = page();
  assert.match(p, /aria-label="工具规则概况"/);
  assert.match(p, /审批开关/);
  assert.match(p, /默认时限/);
  assert.match(p, /归属分配/);
  assert.match(p, /全平台可见/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /不含支付金额与第三方订单成功/);
  assert.match(p, /无权查看租户工具设置/);
  assert.match(p, /推广员工具 · 工具设置/);
});
