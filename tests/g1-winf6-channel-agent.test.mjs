import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-6: channel agent dashboard densify', () => {
  const root = process.cwd();
  const dash = readFileSync(join(root, 'apps/platform-web/app/ch/dashboard/page.tsx'), 'utf8');
  assert.match(dash, /推广员工具/);
  assert.match(dash, /不碰钱、不碰销售履约/);
  assert.match(dash, /\/p\/agents/);
  assert.match(dash, /\/ch\/merchants\/new/);
  assert.match(dash, /开通状态/);
  assert.match(dash, /跟进信号/);
  assert.match(dash, /搜索商户/);
  assert.doesNotMatch(dash, /本平台成交漏斗/);

  const agents = readFileSync(join(root, 'apps/platform-web/app/p/agents/page.tsx'), 'utf8');
  assert.match(agents, /\/ch\/dashboard/);
  assert.match(agents, /不是消费者成交/);
});
