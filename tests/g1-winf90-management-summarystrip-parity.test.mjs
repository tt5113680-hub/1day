import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const pageCss = (route) => read(`apps/management-web/app/m/${route}/page.module.css`);
const sharedCommerceCss = () => read('apps/management-web/app/m/_commerce.module.css');

// Every Management MPC main surface that renders a summaryStrip must carry the
// single full-parity yellow-strip visual convention (黄边浅黄底 白卡概况条) used
// across the Management MPC deep pages, and must NOT regress to per-item white
// cards (.summaryStrip > div). /m/workflows stays the sole CUSTOM page (no strip).
const summaryStripCssFiles = [
  ['offers', pageCss('offers')],
  ['customers', pageCss('customers')],
  ['memberships', pageCss('memberships')],
  ['stores', pageCss('stores')],
  ['content', pageCss('content')],
  ['orders-reviews-marketing-notifications (shared)', sharedCommerceCss()],
  ['ai-suggestions', pageCss('ai-suggestions')],
  ['analytics', pageCss('analytics')],
  ['attribution', pageCss('attribution')],
  ['circles', pageCss('circles')],
  ['connectors', pageCss('connectors')],
  ['employee-process-performance', pageCss('employee-process-performance')],
  ['entry-funnel', pageCss('entry-funnel')],
  ['external-actions', pageCss('external-actions')],
  ['permission-audit', pageCss('permission-audit')],
  ['settings', pageCss('settings')],
  ['organization-employees', pageCss('organization-employees')],
  ['page-builder', pageCss('page-builder')],
  ['roles-permissions', pageCss('roles-permissions')],
];

test('G1-W∞-90: every Management MPC summaryStrip carries the full-parity yellow-strip overview-bar CSS', () => {
  for (const [name, css] of summaryStripCssFiles) {
    assert.match(css, /\.summaryStrip\s*\{/, `${name} css should define .summaryStrip`);
    assert.match(
      css,
      /linear-gradient\(135deg, #fff9db 0%, #fffef5 100%\)/,
      `${name} summaryStrip should use the light-yellow parity background`,
    );
    assert.match(
      css,
      /rgb\(255 209 0 \/ 35%\)/,
      `${name} summaryStrip should use the yellow parity border`,
    );
    assert.match(css, /\.summaryStrip span\s*\{/, `${name} should style summaryStrip span`);
    assert.match(css, /\.summaryStrip strong\s*\{/, `${name} should style summaryStrip strong`);
    assert.match(
      css,
      /@media \(max-width: 900px\)[\s\S]*\.summaryStrip[\s\S]*(1fr 1fr|repeat\(2,\s*minmax\(0,\s*1fr\)\))/,
      `${name} should stack the summaryStrip two-column ≤900px`,
    );
    assert.doesNotMatch(
      css,
      /\.summaryStrip > div\s*\{[^}]*background:\s*#fff/,
      `${name} should not regress to per-item white card summaryStrip`,
    );
  }
});

test('G1-W∞-90: /m/workflows stays the sole ONEDAY-custom page with no Meituan-parity summaryStrip', () => {
  const page = read('apps/management-web/app/m/workflows/page.tsx');
  const css = pageCss('workflows');
  assert.match(page, /工作流整合/);
  assert.match(page, /推广员工具/);
  assert.doesNotMatch(css, /\.summaryStrip/, 'workflows should not carry a parity summaryStrip');
});
