import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-10: consumer profile + search tool densify', () => {
  const root = process.cwd();
  const channel = readFileSync(
    join(root, 'apps/consumer-web/app/c/stores/[id]/channel.tsx'),
    'utf8',
  );
  assert.match(channel, /推广员入口/);
  assert.match(channel, /\/c\/circles\?tenant=/);
  assert.match(channel, /最近到店服务记录/);
  assert.match(channel, /不代表美团\/抖音\/扫呗等第三方订单/);
  assert.match(channel, /非本平台下单/);
  assert.doesNotMatch(channel, /最近到店\/订单/);

  const search = readFileSync(join(root, 'apps/consumer-web/app/c/search/search.tsx'), 'utf8');
  assert.match(search, /推广员工具/);
  assert.match(search, /不在此下单/);
  assert.match(search, /\/c\/circles\?tenant=/);
  assert.match(search, /本地试用提示/);
});
