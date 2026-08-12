import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('W∞-103: discovery API prefers store_reviews + entry_visits_30d with pilot fallback', () => {
  const api = read('apps/api/src/consumer-discovery.service.ts');
  assert.match(api, /store_reviews/);
  assert.match(api, /entry_visits_30d/);
  assert.match(api, /target_store_id/);
  assert.match(api, /storeSignals/);
  assert.match(api, /ratingSource.*store_reviews/);
  assert.match(api, /salesSource.*entry_visits_30d/);
  assert.match(api, /local_pilot/);
});

test('W∞-103: discovery UI shows honest rating/sales source labels', () => {
  const page = read('apps/consumer-web/app/c/discovery/discovery.tsx');
  assert.match(page, /ratingSource/);
  assert.match(page, /salesSource/);
  assert.match(page, /档案评价/);
  assert.match(page, /试用分/);
  assert.match(page, /30日入口/);
  assert.match(page, /试用月售/);
  assert.match(page, /不在此下单/);
  assert.doesNotMatch(page, /假 BI|mockMetrics|Math\.random\(/);
});
