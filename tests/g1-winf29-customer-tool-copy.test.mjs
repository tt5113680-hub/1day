import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const menu = () => read('packages/contracts/src/menu.ts');
const mgHome = () => read('apps/management-web/app/page.tsx');
const empWork = () => read('apps/employee-web/app/e/workbench/workbench.tsx');

test('W∞-29: Management nav catalog labels the customer surface 客户跟进 + group 客户 (aligns W∞-24 page eyebrow)', () => {
  const m = menu();
  assert.match(m, /customer: '客户',/);
  assert.match(m, /label: '客户跟进',/);
  assert.match(m, /\/m\/customers/);
  assert.doesNotMatch(m, /顾客管理/);
});

test('W∞-29: Management workbench dashboard uses 客户 (not store-ops 顾客)', () => {
  const d = mgHome();
  assert.match(d, /label: '客户', desc: '客户跟进'/);
  assert.match(d, /今日客户/);
  assert.match(d, /客户跟进 →/);
  assert.match(d, /客户总量/);
  assert.match(d, /客户总数/);
  assert.doesNotMatch(d, /顾客/);
});

test('W∞-29: Employee workbench customer shortcut uses 客户 (aligns 客户档案 desc)', () => {
  const w = empWork();
  assert.match(w, /label: '客户', desc: '客户档案'/);
  assert.doesNotMatch(w, /'顾客'/);
});

test('W∞-29: e2e nav assertions track the renamed customer nav label/group', () => {
  const sys29 = read('tests/e2e/sys-29-admin-nav-groups.spec.ts');
  const p1b = read('tests/e2e/p1-b-management-shell.spec.ts');
  assert.match(sys29, /getByText\('客户'\)/);
  assert.match(sys29, /getByRole\('link', \{ name: '客户跟进' \}\)/);
  assert.match(p1b, /name: '客户跟进'/);
  assert.doesNotMatch(sys29, /顾客管理/);
  assert.doesNotMatch(p1b, /顾客管理/);
});
