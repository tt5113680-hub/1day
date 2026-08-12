import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const mg = (p) => read(`apps/management-web/app/m/${p}/page.tsx`);
const mgCss = (p) => read(`apps/management-web/app/m/${p}/page.module.css`);
const pf = (p) => read(`apps/platform-web/app/p/${p}/page.tsx`);
const pfCss = (p) => read(`apps/platform-web/app/p/${p}/page.module.css`);

function assertDensifyCss(p, c, name, { summaryStrip = true } = {}) {
  assert.match(c, /background:\s*#f5f5f5/, `${name} gray canvas`);
  assert.match(c, /#ffd100|#ffe14d/, `${name} yellow topbar`);
  if (summaryStrip) assert.match(c, /\.summaryStrip/, `${name} summaryStrip css`);
  assert.match(c, /\.distribution|\.distPanel/, `${name} distribution css`);
  assert.match(c, /\.barFill/, `${name} barFill css`);
  assert.match(c, /\.barTrack/, `${name} barTrack css`);
  assert.match(c, /\.barRow/, `${name} barRow css`);
  assert.match(c, /\.barValue/, `${name} barValue css`);
  assert.match(c, /\.barLabel/, `${name} barLabel css`);
  assert.match(c, /\.honest/, `${name} honest css`);
  assert.match(c, /@media \(max-width: 900px\)/, `${name} responsive`);
  assert.doesNotMatch(p, /AdminPageHeader/, `${name} no AdminPageHeader`);
  assert.doesNotMatch(p, /<Card/, `${name} no legacy Card`);
}

test('W∞-85: /m/attribution adopts Meituan-parity densify chrome with real-data 来源归因分布', () => {
  const p = mg('attribution');
  const c = mgCss('attribution');
  assertDensifyCss(p, c, 'attribution');
  assert.match(p, /data-testid="management-attribution"/);
  assert.match(p, /推广员工具 · 来源归因/);
  assert.match(p, /aria-label="来源归因概况"/);
  assert.match(p, /aria-label="归因摘要"/);
  assert.match(p, /aria-label="来源归因分布"/);
  assert.match(p, /归因阶段分布/);
  assert.match(p, /来源类型分布/);
  assert.match(p, /证据级别分布/);
  assert.match(p, /countBy\(data\.records/);
  assert.match(p, /barWidth\(total, item\.value\)/);
  assert.match(p, /data-testid="attribution-row"/);
  assert.match(p, /暂无记录/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /请使用具备推广员工具权限的账号。/);
});

test('W∞-85: /m/entry-funnel adopts densify chrome with real-data 入口痕迹分布', () => {
  const p = mg('entry-funnel');
  const c = mgCss('entry-funnel');
  assertDensifyCss(p, c, 'entry-funnel');
  assert.match(p, /data-testid="management-entry-funnel"/);
  assert.match(p, /推广员工具 · 入口痕迹/);
  assert.match(p, /aria-label="入口痕迹概况"/);
  assert.match(p, /aria-label="入口数据概况"/);
  assert.match(p, /aria-label="入口痕迹分布"/);
  assert.match(p, /事件分布/);
  assert.match(p, /入口面分布/);
  assert.match(p, /模块分布/);
  assert.match(p, /跳转目标平台分布/);
  assert.match(p, /renderBuckets\(/);
  assert.match(p, /barWidth\(total, row\.count\)/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /请使用具备租户推广员工具权限的账号。/);
});

test('W∞-85: /m/circles adopts densify chrome with real-data 商圈分布', () => {
  const p = mg('circles');
  const c = mgCss('circles');
  assertDensifyCss(p, c, 'circles');
  assert.match(p, /data-testid="management-circles"/);
  assert.match(p, /推广员工具 · 商圈双身份/);
  assert.match(p, /aria-label="商圈双身份概况"/);
  assert.match(p, /aria-label="商圈概况"/);
  assert.match(p, /aria-label="商圈分布"/);
  assert.match(p, /自有商圈可见分布/);
  assert.match(p, /申请\/邀约来源分布/);
  assert.match(p, /申请\/邀约状态分布/);
  assert.match(p, /附近商圈行业分布/);
  assert.match(p, /countBy\(applications/);
  assert.match(p, /countBy\(nearby/);
  assert.match(p, /barWidth\(total, item\.value\)/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /商圈是商家联盟整合网络/);
  assert.match(p, /请使用具备租户推广员工具权限的账号。/);
});

test('W∞-85: /m/funnels/[id] adopts densify chrome with real-data 漏斗阶段分布', () => {
  const p = mg('funnels/[id]');
  const c = mgCss('funnels/[id]');
  assertDensifyCss(p, c, 'funnels');
  assert.match(p, /data-testid="management-funnel"/);
  assert.match(p, /推广员工具 · 来源归因漏斗/);
  assert.match(p, /aria-label="来源归因漏斗概况"/);
  assert.match(p, /aria-label="漏斗摘要"/);
  assert.match(p, /aria-label="漏斗分布"/);
  assert.match(p, /阶段结果类型分布/);
  assert.match(p, /各阶段来源转化/);
  assert.match(p, /countBy\(data\.stages/);
  assert.match(p, /barWidth\(baseline, stage\.value\)/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
});

test('W∞-85: platform /p/tenants/new adopts densify chrome with real-data 开通步骤分布', () => {
  const p = pf('tenants/new');
  const c = pfCss('tenants/new');
  assertDensifyCss(p, c, 'tenants/new', { summaryStrip: false });
  assert.match(p, /data-testid="platform-onboarding"/);
  assert.match(p, /推广员工具 · 商户开通/);
  assert.match(p, /aria-label="商户开通概况"/);
  assert.match(p, /aria-label="开通步骤分布"/);
  assert.match(p, /function OnboardingDist/);
  assert.match(p, /countBy\(run\.steps/);
  assert.match(p, /barWidth\(total, item\.value\)/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /provisioning-steps/);
  assert.match(p, /provisioning-one-code/);
});
