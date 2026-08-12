import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-11: discovery nearby densify (MH5-01)', () => {
  const root = process.cwd();
  const page = readFileSync(join(root, 'apps/consumer-web/app/c/discovery/discovery.tsx'), 'utf8');
  assert.match(page, /推广员工具/);
  assert.match(page, /全平台可见引流/);
  assert.match(page, /不在此下单/);
  assert.match(page, /\/c\/circles\?tenant=/);
  assert.match(page, /本地试用提示/);
  assert.match(page, /非本平台下单/);
  assert.match(page, /仅统计观看\/访问\/跳转\/停留\/分享入口痕迹/);
});
