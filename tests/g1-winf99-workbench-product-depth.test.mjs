import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('W∞-99: management dashboard exposes早会经营 KPIs + store comparison + operational queues', () => {
  const page = read('apps/management-web/app/page.tsx');
  const portal = read('apps/management-web/app/m/management-home-modules.tsx');
  const api = read('apps/api/src/management-dashboard.service.ts');
  const kpi = read('apps/management-web/app/m/management-early-meeting-kpi.tsx');
  assert.match(page, /ManagementEarlyMeetingKpiStrip/);
  assert.match(kpi, /早会经营信号/);
  assert.match(kpi, /earlyMeetingKpiItems/);
  assert.match(kpi, /metrics\.consultsToday/);
  assert.match(page, /m\.consultsToday/);
  assert.match(page, /m\.openLeads/);
  assert.match(page, /m\.enrollmentsToday/);
  assert.match(page, /m\.redemptionsToday/);
  assert.match(page, /m\.taskCompletionRateToday/);
  assert.match(page, /aria-label="门店对比"/);
  // W∞-107: consult and lead operational queues still render with aria labels in the
  // portal (module-driven) layout, and the default path consolidates them into 早会队列处置.
  assert.match(portal, /aria-label="咨询队列"/);
  assert.match(portal, /aria-label="线索队列"/);
  assert.match(page, /早会队列处置/);
  assert.match(page, /\/m\/orders/);
  assert.match(page, /\/m\/reviews/);
  assert.match(page, /\/m\/notifications/);
  assert.match(page, /\/m\/analytics/);
  assert.match(api, /storeBreakdown/);
  assert.match(api, /queues:\s*\{/);
  assert.match(api, /consultsToday/);
  assert.match(api, /taskCompletionRateToday/);
  assert.match(api, /dispositionSummary/);
  assert.match(api, /handledRate/);
});

test('W∞-99: employee workbench adds share/nurture grid + lead/share KPIs + queues', () => {
  const page = read('apps/employee-web/app/e/workbench/workbench.tsx');
  const api = read('apps/api/src/employee-workbench.service.ts');
  assert.match(page, /\/e\/share/);
  assert.match(page, /\/e\/nurture/);
  assert.match(page, /stats\.shareOpensToday/);
  assert.match(page, /stats\.redemptionsToday/);
  assert.match(page, /aria-labelledby="lead-queue-title"/);
  assert.match(page, /aria-labelledby="share-queue-title"/);
  assert.match(page, /线索分布/);
  assert.match(page, /分享分布/);
  assert.match(api, /activeShareCodes/);
  assert.match(api, /queues:\s*\{/);
  assert.doesNotMatch(page, /假 BI|mockMetrics|Math\.random\(/);
});

test('W∞-99: platform/channel/circle dashboards add operational drill-down queues', () => {
  const platformPage = read('apps/platform-web/app/p/dashboard/page.tsx');
  const platformApi = read('apps/api/src/platform-dashboard.service.ts');
  const channelApi = read('apps/api/src/channel-dashboard.service.ts');
  const circlePage = read('apps/platform-web/app/bc/dashboard/page.tsx');
  const circleApi = read('apps/api/src/circle-dashboard.service.ts');
  assert.match(platformPage, /开通 Run 队列/);
  assert.match(platformPage, /provisioningRuns/);
  assert.match(platformPage, /Outbox 死信/);
  assert.match(platformApi, /provisioningRuns/);
  assert.match(platformApi, /request_slug/);
  assert.match(channelApi, /queues:\s*\{/);
  assert.match(channelApi, /renewal:/);
  assert.match(circlePage, /流量未转化队列/);
  assert.match(circleApi, /trafficWithoutConversion/);
});
