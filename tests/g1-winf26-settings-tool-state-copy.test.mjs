import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const settings = () => read('apps/management-web/app/m/settings/page.tsx');

test('W∞-26: /m/settings operational-state copy names the tool identity 工具设置 (not store-ops 经营设置)', () => {
  const s = settings();
  assert.match(s, /eyebrow="推广员工具 · 工具设置"/);
  assert.match(s, /title="正在加载工具设置"/);
  assert.match(s, /title="无权查看租户工具设置"/);
  assert.match(s, /title="工具设置暂不可用"/);
  assert.match(s, /正在校验租户规则、版本与工具授权。/);
  assert.match(s, /请使用具备租户工具设置权限的账号。/);
  assert.match(s, /工具规则未能完成加载，请重试。/);
});

test('W∞-26: /m/settings heading + save + success note aligned to 工具设置 tool identity', () => {
  const s = settings();
  assert.match(s, /title=\{`\$\{settings\.brand\.displayName\} 的可审计工具规则`\}/);
  assert.match(s, /setNote\('工具设置已保存，并已记录审计与事件。'\)/);
  assert.match(s, /保存工具设置/);
});

test('W∞-26: /m/settings retains no store-ops 经营设置/经营规则/经营权限 framing (menu label 工具设置)', () => {
  const s = settings();
  assert.doesNotMatch(s, /经营设置/);
  assert.doesNotMatch(s, /经营规则/);
  assert.doesNotMatch(s, /经营权限/);
});

test('W∞-26: dependent e2e settings assertion follows the new copy', () => {
  const spec = read('tests/e2e/management-settings.spec.ts');
  assert.match(spec, /可审计工具规则/);
  assert.match(spec, /保存工具设置/);
  assert.doesNotMatch(spec, /可审计经营规则/);
  assert.doesNotMatch(spec, /保存经营设置/);
});
