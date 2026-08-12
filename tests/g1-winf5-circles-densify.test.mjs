import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-5: consumer circles densify (MH5-13)', () => {
  const root = process.cwd();
  const home = readFileSync(join(root, 'apps/consumer-web/app/c/circles/circles-home.tsx'), 'utf8');
  assert.match(home, /行业分类/);
  assert.match(home, /本店经营的商圈/);
  assert.match(home, /附近公开商圈/);
  assert.match(home, /距离优先/);
  assert.match(home, /不表示第三方成交/);
  assert.match(home, /非本平台下单/);

  const detail = readFileSync(
    join(root, 'apps/consumer-web/app/c/circles/[id]/circle-detail.tsx'),
    'utf8',
  );
  assert.match(detail, /circleId=\{data\.circle\.id\}/);
  assert.match(detail, /本页只统计入口痕迹/);
  assert.match(detail, /消费者视角|本店经营/);

  const beacon = readFileSync(join(root, 'apps/consumer-web/app/c/funnel-page-beacon.tsx'), 'utf8');
  assert.match(beacon, /circleId/);

  const discovery = readFileSync(
    join(root, 'apps/consumer-web/app/c/discovery/discovery.tsx'),
    'utf8',
  );
  assert.match(discovery, /\/c\/circles\?tenant=/);
  assert.match(discovery, /互助引流只计观看/);
});
