import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const page = () => read('apps/management-web/app/m/analytics/page.tsx');
const css = () => read('apps/management-web/app/m/analytics/page.module.css');
const service = () => read('apps/api/src/entry-funnel.service.ts');
const controller = () => read('apps/api/src/entry-funnel.controller.ts');
const menu = () => read('packages/contracts/src/menu.ts');

test('W∞-44: /m/analytics uses Meituan merchant PC yellow top bar + gray-white-card canvas (no AdminPageHeader/Card)', () => {
  const s = page();
  assert.match(s, /className=\{styles\.topBar\}/, 'topBar');
  assert.match(s, /className=\{styles\.topBarTitle\}/, 'topBarTitle');
  assert.match(s, /className=\{styles\.topBarRefresh\}/, 'topBarRefresh');
  assert.match(s, /className=\{styles\.heroCard\}/, 'heroCard');
  assert.match(s, /<h1>按美团经营日报密度审视入口分流<\/h1>/, 'hero h1');
  assert.doesNotMatch(s, /AdminPageHeader/, 'no AdminPageHeader');
  assert.doesNotMatch(s, /eyebrow=/, 'no eyebrow prop');
  assert.doesNotMatch(s, /<Card\b/, 'no <Card');
  assert.doesNotMatch(s, /<\/Card>/, 'no </Card>');
  const c = css();
  assert.match(c, /background:\s*linear-gradient\(180deg,\s*#ffe14d/, 'yellow topBar');
  assert.match(c, /background:\s*#f5f5f5/, 'gray canvas');
  assert.match(c, /background:\s*#fff/, 'white panels');
});

test('W∞-44: topBar carries the promotion-tool eyebrow; page uses daily-report density (summary + per-day table)', () => {
  const s = page();
  assert.match(s, /推广员工具 · 数据\/经营分析/);
  assert.match(s, /className=\{styles\.summaryStrip\}/, 'summaryStrip');
  assert.match(s, /data\.today\.impressions/, 'today impressions card');
  assert.match(s, /data\.today\.visits/, 'today visits card');
  assert.match(s, /data\.today\.jumps/, 'today jumps card');
  assert.match(s, /data\.daily\]\.reverse\(\)/, 'per-day time series table');
  assert.match(s, /<th>日期<\/th>/, 'table date column');
  assert.match(s, /data-testid="management-analytics"/, 'e2e hook');
});

test('W∞-44: daily report reads the honest L0–L2 entry-trace endpoint (no payment/deal fields)', () => {
  const svc = service();
  assert.match(
    svc,
    /async dailyReport\(tenantId: string, daysRaw: unknown\)/,
    'dailyReport method',
  );
  assert.match(svc, /from entry_funnel_events/, 'reads entry_funnel_events only');
  assert.match(
    svc,
    /to_char\(occurred_at at time zone 'Asia\/Shanghai', 'YYYY-MM-DD'\)/,
    'per-day',
  );
  assert.match(svc, /event_code='impression'/, 'impression bucket');
  assert.match(svc, /event_code='visit'/, 'visit bucket');
  assert.match(svc, /event_code='jump'/, 'jump bucket');
  assert.match(svc, /event_code='dwell'/, 'dwell bucket');
  const fromMeth = svc.indexOf('async dailyReport');
  const toMeth = svc.indexOf('generatedAt: new Date().toISOString(),', fromMeth);
  const dailySection = svc.slice(fromMeth, toMeth);
  assert.doesNotMatch(dailySection, /consumer_orders/, 'no consumer_orders');
  assert.doesNotMatch(dailySection, /amount/, 'no amount column');
  assert.doesNotMatch(dailySection, /payment/, 'no payment column');
  const ctl = controller();
  assert.match(ctl, /@Get\('management\/entry-funnel\/daily-report'\)/, 'controller route');
  assert.match(ctl, /\.dailyReport\(context\.tenantId, days\)/, 'controller forwards');
});

test('W∞-44: honest promotion-tool / no-native-sales boundaries retained on the page', () => {
  const s = page();
  assert.match(s, /不含支付、成交或第三方订单数据/);
  assert.match(s, /全部来自真实 L0–L2 痕迹表/);
  assert.match(s, /仅代表入口承接，不代表成交/);
  assert.match(s, /不含支付成交/);
  assert.match(s, /m\/entry-funnel">入口痕迹看板/, 'cross-link to entry-funnel');
  assert.match(s, /\/attribution">来源分析/, 'cross-link to attribution');
});

test('W∞-44: menu exposes data/operation analysis under orders group requiring tenant.manage', () => {
  const m = menu();
  assert.match(m, /key: 'analytics',/);
  assert.match(m, /href: '\/m\/analytics',/);
  assert.match(m, /label: '数据\/经营分析',/);
  assert.match(m, /group: 'orders',/);
  assert.match(m, /requireAny: \['tenant\.manage'\],/);
});

test('W∞-44: loading / forbidden states preserved with tool wording', () => {
  const s = page();
  assert.match(s, /正在汇总入口痕迹日报/, 'loading');
  assert.match(s, /无权查看数据分析/, 'forbidden');
  assert.match(s, /请使用具备租户推广员工具权限的账号/, 'tool permission copy');
  assert.match(s, /数据分析暂不可用/, 'error');
});
