import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () => readFileSync(join(root, 'apps/management-web/app/m/stores/page.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/management-web/app/m/stores/page.module.css'), 'utf8');

test('W∞-80: /m/stores keeps Meituan-parity yellow top bar + gray canvas + hero + summary', () => {
  const p = page();
  const c = css();
  assert.match(p, /推广员工具 · 门店入口/);
  assert.match(p, /<h1>门店入口<\/h1>/);
  assert.match(p, /topBar/);
  assert.match(p, /heroCard/);
  assert.match(p, /summaryStrip/);
  assert.match(p, /aria-label="门店概况"/);
  assert.match(p, /门店数/);
  assert.match(p, /营业中/);
  assert.match(p, /待跟进任务/);
  assert.match(p, /近30日入口打开/);
  assert.match(c, /background:\s*#f5f5f5/);
  assert.match(c, /#ffd100|#ffe14d/);
});

test('W∞-80: /m/stores adds real-data 门店入口分布 panel derived from store rows', () => {
  const p = page();
  const c = css();
  assert.match(p, /aria-label="门店入口分布"/);
  assert.match(p, /门店入口分布/);
  assert.match(p, /由真实门店档案行推导/);
  assert.match(p, /statusDist/);
  assert.match(p, /ownerDist/);
  assert.match(p, /entryDist/);
  assert.match(p, /servicesDist/);
  assert.match(p, /opensDist/);
  assert.match(p, /tasksDist/);
  for (const label of [
    '营业状态分布',
    '负责人指派分布',
    '启用平台入口分布',
    '服务覆盖分布',
    '近30日入口打开分布',
    '待跟进负载分布',
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
});

test('W∞-80: /m/stores distribution buckets derive from real fields (no fake BI)', () => {
  const p = page();
  assert.match(p, /store\.status === 'active'/);
  assert.match(p, /store\.managers\.length/);
  assert.match(p, /store\.entryCount/);
  assert.match(p, /store\.activeServices/);
  assert.match(p, /store\.entryOpens30d/);
  assert.match(p, /store\.openTasks/);
  assert.doesNotMatch(p, /假 BI|mockMetrics|Math\.random\(/);
  assert.match(p, /api\/v1\/management\/stores/);
});

test('W∞-80: honest source=local disclaimer and tool-identity boundaries preserved', () => {
  const p = page();
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /第三方入口仅记录跳转/);
  assert.match(p, /不代替平台下单/);
  assert.match(p, /推广员工具 · 门店入口/);
  assert.match(p, /无权访问门店入口/);
});
