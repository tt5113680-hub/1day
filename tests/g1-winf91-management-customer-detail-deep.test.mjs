import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/management-web/app/m/customers/[id]/page.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/management-web/app/m/customers/[id]/page.module.css'), 'utf8');

test('G1-W∞-91: /m/customers/[id] carries a full-parity yellow overview bar 客户详情数据概况 derived from real record rows', () => {
  const d = page();
  const c = css();
  assert.match(d, /推广员工具 · 客户跟进/);
  assert.match(d, /className=\{styles\.heroCard\}/);
  assert.match(d, /aria-label="客户详情数据概况"/);
  for (const key of ['来源记录', '归属记录', '任务', '订单结果', '跟进异常', '链路事件']) {
    assert.ok(new RegExp(`<span>${key}</span>`).test(d), `summaryStrip should include ${key}`);
  }
  assert.match(d, /sourceCount/);
  assert.match(d, /ownershipCount/);
  assert.match(d, /anomalyCount/);
  assert.match(d, /timelineCount/);
  assert.match(c, /\.summaryStrip\s*\{/);
  assert.match(c, /linear-gradient\(135deg, #fff9db 0%, #fffef5 100%\)/);
  assert.match(c, /rgb\(255 209 0 \/ 35%\)/);
  assert.match(c, /\.summaryStrip span\s*\{/);
  assert.match(c, /\.summaryStrip strong\s*\{/);
  assert.match(
    c,
    /@media \(max-width: 900px\)[\s\S]*\.summaryStrip[\s\S]*(1fr 1fr|repeat\(2,\s*minmax\(0,\s*1fr\)\))/,
    'summaryStrip should stack two-column ≤900px',
  );
});

test('G1-W∞-91: /m/customers/[id] renders a real-data 客户详情分布 panel (barWidth bars, no fake BI)', () => {
  const d = page();
  const c = css();
  assert.match(d, /aria-label="客户详情分布"/);
  for (const block of [
    '任务状态分布',
    '来源状态分布',
    '归属角色分布',
    '归属审批状态分布',
    '订单结果状态分布',
    '跟进异常类型分布',
    '来源角色与贡献',
    '链路事件类型分布',
  ]) {
    assert.ok(
      new RegExp(`<h2>${block}</h2>`).test(d),
      `distribution should include ${block} block`,
    );
  }
  assert.match(d, /barWidth\(/);
  assert.match(d, /countBy\(/);
  assert.match(d, /className=\{styles\.bars\}/);
  assert.match(d, /className=\{styles\.barRow\}/);
  assert.match(d, /className=\{styles\.barTrack\}/);
  assert.match(d, /className=\{styles\.barFill\}/);
  assert.match(c, /\.distribution\s*\{/);
  assert.match(c, /\.panelBlock\s*\{/);
  assert.match(c, /\.barTrack\s*\{/);
  assert.match(c, /\.barFill\s*\{/);
  assert.match(c, /linear-gradient\(90deg, #ffd100, #f0a500\)/);
  assert.match(c, /\.barEmpty\s*\{/);
  assert.match(
    c,
    /@media \(max-width: 900px\)[\s\S]*\.distribution[\s\S]*1fr/,
    'distribution should stack single-column ≤900px',
  );
});

test('G1-W∞-91: /m/customers/[id] keeps honest no-native-checkout boundary and does not regress scope copy', () => {
  const d = page();
  assert.match(d, /source=local|非本平台下单|不包含本平台收款|不代表第三方成交/);
  assert.match(d, /className=\{styles\.honest\}/);
  assert.match(d, /正在加载客户跟进全链路/);
  assert.match(d, /请使用具备客户跟进范围的账号/);
  assert.match(d, /客户跟进记录未能完成加载/);
  assert.match(d, /← 返回客户跟进/);
  assert.match(d, /aria-label="跟进异常"/);
  assert.doesNotMatch(d, /经营/);
  assert.doesNotMatch(d, /AdminPageHeader/);
  assert.doesNotMatch(d, /<\/Card/);
});
