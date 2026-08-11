import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const list = () => read('apps/management-web/app/m/customers/page.tsx');
const detail = () => read('apps/management-web/app/m/customers/[id]/page.tsx');

test('W∞-24: /m/customers list framed as promotion-tool 客户跟进 (no store-ops 客户资产/经营动作 overclaim)', () => {
  const l = list();
  assert.match(l, /className=\{styles\.topBarTitle\}>推广员工具 · 客户跟进</);
  assert.match(l, /aria-label="客户跟进概览">\n\s*<h1>按来源与分层组织推广跟进作业<\/h1>/);
  assert.match(l, /正在加载客户跟进/);
  assert.match(l, /无权访问客户跟进/);
  assert.match(l, /请使用具备客户跟进范围的账号登录后重试/);
  assert.match(l, /客户跟进暂不可用/);
  assert.match(l, /沉淀新的客户跟进与归属/);
  assert.match(l, /aria-label="客户跟进列表"/);
  assert.match(
    l,
    /基于已沉淀的来源、标签与归属筛选客户，组织实名授权跟进；导出与归属变更均保留审批和审计记录/,
  );
  assert.doesNotMatch(l, /客户资产/);
  assert.doesNotMatch(l, /用客户分层驱动每一次经营动作/);
  assert.doesNotMatch(l, /经营管理权限/);
});

test('W∞-24: /m/customers/[id] states + back-link + eyebrow use client-followup (no 经营链路/客户资产)', () => {
  const d = detail();
  assert.match(d, /正在加载客户跟进全链路/);
  assert.match(d, /请使用具备客户跟进范围的账号/);
  assert.match(d, /客户跟进记录未能完成加载/);
  assert.match(d, /← 返回客户跟进/);
  assert.match(d, /客户跟进全链路/);
  assert.doesNotMatch(d, /客户资产/);
  assert.doesNotMatch(d, /客户经营链路/);
  assert.doesNotMatch(d, /经营管理权限/);
});

test('W∞-24: dependent e2e specs updated to the new honest follow-up copy', () => {
  const pm = read('tests/e2e/management-customers.spec.ts');
  const ui = read('tests/e2e/commercial-ui-foundation.spec.ts');
  assert.match(pm, /按来源与分层组织推广跟进作业/);
  assert.match(pm, /无权访问客户跟进/);
  assert.doesNotMatch(pm, /用客户分层驱动每一次经营动作/);
  assert.doesNotMatch(pm, /无权查看客户资产/);
  assert.match(ui, /按来源与分层组织推广跟进作业/);
  assert.doesNotMatch(ui, /用客户分层驱动每一次经营动作/);
});
