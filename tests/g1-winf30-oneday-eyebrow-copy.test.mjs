import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const mgAttribution = () => read('apps/management-web/app/m/attribution/page.tsx');
const mgEntryFunnel = () => read('apps/management-web/app/m/entry-funnel/page.tsx');
const mgCircles = () => read('apps/management-web/app/m/circles/page.tsx');
const mgCustomerDetail = () => read('apps/management-web/app/m/customers/[id]/page.tsx');
const empShare = () => read('apps/employee-web/app/e/share/share-codes.tsx');
const empFollowUp = () => read('apps/employee-web/app/e/tasks/[id]/follow-up/follow-up.tsx');
const empCustomerDetail = () => read('apps/employee-web/app/e/customers/[id]/customer-detail.tsx');

function scanTsx(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) scanTsx(p, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(p);
  }
  return acc;
}

test('W∞-30: management tool pages drop ONEDAY / prefix (align W∞-25 eyebrow pattern)', () => {
  for (const src of [mgAttribution(), mgEntryFunnel(), mgCircles(), mgCustomerDetail()]) {
    assert.doesNotMatch(src, /ONEDAY \//);
    assert.match(src, /推广员工具 ·/);
  }
});

test('W∞-30: management customer detail eyebrow uses 客户跟进 (not 客户跟进全链路 in header)', () => {
  const d = mgCustomerDetail();
  assert.match(d, /styles\.topBarTitle/);
  assert.match(d, /\{`推广员工具 · 客户跟进 · \$\{businessLabel\(data\.customer\.segment\)/);
  assert.doesNotMatch(d, /eyebrow=\{`ONEDAY \/ 客户跟进全链路/);
});

test('W∞-30: employee tool pages drop ONEDAY / prefix', () => {
  for (const src of [empShare(), empFollowUp(), empCustomerDetail()]) {
    assert.doesNotMatch(src, /ONEDAY \//);
    assert.match(src, /推广员工具 ·/);
  }
});

test('W∞-30: management/employee app TSX has no ONEDAY / eyebrow remnants', () => {
  const mgFiles = scanTsx(join(root, 'apps/management-web/app'));
  const empFiles = scanTsx(join(root, 'apps/employee-web/app'));
  for (const file of [...mgFiles, ...empFiles]) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /ONEDAY \//, `${file} must not contain ONEDAY / eyebrow`);
  }
});
