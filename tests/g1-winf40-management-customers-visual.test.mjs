import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = (path) =>
  readFileSync(join(root, `apps/management-web/app/m/customers/${path}`), 'utf8');
const css = (path) =>
  readFileSync(join(root, `apps/management-web/app/m/customers/${path}`), 'utf8');

const list = () => page('page.tsx');
const listCss = () => css('page.module.css');
const detail = () => page('[id]/page.tsx');
const detailCss = () => css('[id]/page.module.css');

test('W∞-40: /m/customers list has Meituan merchant PC yellow top bar + gray canvas', () => {
  const l = list();
  const c = listCss();
  assert.match(l, /topBar/);
  assert.match(l, /推广员工具 · 客户跟进/);
  assert.match(l, /heroCard/);
  assert.match(l, /按来源与分层组织推广跟进作业/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-40: /m/customers list renders white panels on gray canvas (no AdminPageHeader/Card)', () => {
  const l = list();
  assert.match(l, /className=\{styles\.topBar\}/);
  assert.match(l, /className=\{styles\.heroCard\}/);
  assert.match(l, /className=\{styles\.filters\}/);
  assert.match(l, /className=\{styles\.batch\}/);
  assert.match(l, /className=\{styles\.tableWrap\}/);
  assert.doesNotMatch(l, /AdminPageHeader/);
  assert.doesNotMatch(l, /<Card/);
});

test('W∞-40: /m/customers list keeps honest promotion-tool follow-up copy and boundaries', () => {
  const l = list();
  assert.match(
    l,
    /基于已沉淀的来源、标签与归属筛选客户，组织实名授权跟进；导出与归属变更均保留审批和审计记录/,
  );
  assert.match(l, /正在加载客户跟进/);
  assert.match(l, /无权访问客户跟进/);
  assert.match(l, /客户跟进暂不可用/);
  assert.match(l, /aria-label="客户跟进列表"/);
  assert.doesNotMatch(l, /客户资产/);
  assert.match(l, /非本平台下单/);
  assert.doesNotMatch(l, /在本平台下单/);
});

test('W∞-40: /m/customers/[id] detail has Meituan merchant PC yellow top bar + gray canvas', () => {
  const d = detail();
  const c = detailCss();
  assert.match(d, /topBar/);
  assert.match(d, /推广员工具 · 客户跟进/);
  assert.match(d, /heroCard/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-40: /m/customers/[id] detail renders white panels (no AdminPageHeader/Card) and keeps scope copy', () => {
  const d = detail();
  assert.match(d, /className=\{styles\.topBar\}/);
  assert.match(d, /className=\{styles\.heroCard\}/);
  assert.match(d, /className=\{styles\.panel\}/);
  assert.match(d, /className=\{styles\.ops\}/);
  assert.match(d, /className=\{styles\.timeline\}/);
  assert.doesNotMatch(d, /AdminPageHeader/);
  assert.doesNotMatch(d, /<Card/);
  assert.doesNotMatch(d, /<\/Card/);
});

test('W∞-40: /m/customers/[id] detail keeps follow-up scope and honest boundaries', () => {
  const d = detail();
  assert.match(d, /← 返回客户跟进/);
  assert.match(d, /正在加载客户跟进全链路/);
  assert.match(d, /请使用具备客户跟进范围的账号/);
  assert.match(d, /客户跟进记录未能完成加载/);
  assert.match(d, /aria-label="跟进异常"/);
  assert.doesNotMatch(d, /客户经营链路/);
  assert.doesNotMatch(d, /经营管理权限/);
  assert.doesNotMatch(d, /经营/);
});
