import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const kpi = () => read('apps/management-web/app/m/management-early-meeting-kpi.tsx');
const orders = () => read('apps/management-web/app/m/orders/page.tsx');
const reviews = () => read('apps/management-web/app/m/reviews/page.tsx');
const notifications = () => read('apps/management-web/app/m/notifications/page.tsx');
const analytics = () => read('apps/management-web/app/m/analytics/page.tsx');
const workbench = () => read('apps/management-web/app/page.tsx');

test('W∞-100: shared early-meeting KPI fetches management dashboard (workbench同源)', () => {
  assert.match(kpi(), /management\/dashboard/);
  assert.match(kpi(), /consultsToday/);
  assert.match(kpi(), /enrollmentsToday/);
  assert.match(kpi(), /redemptionsToday/);
  assert.match(kpi(), /entryVisitsToday/);
  assert.match(kpi(), /taskCompletionRateToday/);
  assert.match(kpi(), /data-testid="management-early-meeting-kpi"/);
  assert.match(kpi(), /不含 GMV/);
  assert.doesNotMatch(kpi(), /假 BI|mockMetrics|Math\.random\(/);
});

test('W∞-100: deep pages embed shared KPI + workbench cross-nav', () => {
  for (const [name, src] of [
    ['orders', orders()],
    ['reviews', reviews()],
    ['notifications', notifications()],
    ['analytics', analytics()],
  ]) {
    assert.match(src, /ManagementEarlyMeetingKpi/, `${name} missing KPI strip`);
    assert.match(src, /page="(?:orders|reviews|notifications|analytics)"/, `${name} page id`);
  }
  assert.match(workbench(), /ManagementDeepPageNav/);
  assert.match(workbench(), /ManagementEarlyMeetingKpiStrip/);
  assert.match(workbench(), /page="workbench"/);
  assert.match(kpi(), /入口 L0–L2/);
  assert.match(kpi(), /earlyMeetingKpiItems/);
});

test('W∞-100: analytics keeps L0-L2 daily report distinct from dashboard KPI strip', () => {
  assert.match(analytics(), /入口痕迹日报（L0–L2）/);
  assert.match(analytics(), /entry-funnel\/daily-report/);
  assert.match(analytics(), /ManagementEarlyMeetingKpi page="analytics"/);
});

test('W∞-100: orders/reviews keep honest trace boundaries (no GMV as 早会 KPI)', () => {
  assert.match(orders(), /订单痕迹/);
  assert.match(orders(), /非本平台下单/);
  assert.match(reviews(), /评价档案/);
  assert.match(reviews(), /不伪造第三方评价/);
});
