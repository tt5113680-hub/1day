import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('W∞-102: platform operational KPI + deep-nav on platform/channel/circle/outbox', () => {
  const kpi = read('apps/platform-web/app/platform-workbench-kpi.tsx');
  assert.match(kpi, /platform-operational-kpi/);
  assert.match(kpi, /channel\/dashboard/);
  assert.match(kpi, /circle\/dashboard/);
  assert.match(kpi, /platform\/dashboard/);
  assert.match(kpi, /ChannelOperationalQueues/);
  assert.match(kpi, /不含 GMV/);
  assert.match(kpi, /outbox\/dead-letters/);
  assert.match(kpi, /跟进信号队列（renewal）/);
  assert.match(kpi, /开通中队列（onboarding）/);
  assert.match(read('apps/platform-web/app/p/dashboard/page.tsx'), /PlatformOperationalKpi page="platform"/);
  assert.match(read('apps/platform-web/app/ch/dashboard/page.tsx'), /PlatformOperationalKpi page="channel"/);
  assert.match(read('apps/platform-web/app/ch/dashboard/page.tsx'), /ChannelOperationalQueues/);
  assert.match(read('apps/platform-web/app/bc/dashboard/page.tsx'), /PlatformOperationalKpi page="circle"/);
  assert.match(read('apps/platform-web/app/p/outbox/page.tsx'), /PlatformOperationalKpi page="outbox"/);
});

test('W∞-102: channel API exposes renewal/onboarding queues', () => {
  const api = read('apps/api/src/channel-dashboard.service.ts');
  assert.match(api, /queues:\s*\{/);
  assert.match(api, /renewal:/);
  assert.match(api, /onboarding:/);
  assert.match(api, /deepLink/);
});
