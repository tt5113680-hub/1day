import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/management-web/app/m/memberships/page.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/management-web/app/m/memberships/page.module.css'), 'utf8');

const src = () => page();
const styles = () => css();

test('W∞-41: /m/memberships has Meituan merchant PC yellow top bar + gray canvas', () => {
  const s = src();
  const c = styles();
  assert.match(s, /topBar/);
  assert.match(s, /推广员工具 · 会员中心/);
  assert.match(s, /heroCard/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-41: /m/memberships renders white panels on gray canvas (no AdminPageHeader/Card)', () => {
  const s = src();
  assert.match(s, /className=\{styles\.topBar\}/);
  assert.match(s, /className=\{styles\.heroCard\}/);
  assert.match(s, /className=\{styles\.summaryStrip\}/);
  assert.match(s, /className=\{styles\.panel\}/);
  assert.doesNotMatch(s, /AdminPageHeader/);
  assert.doesNotMatch(s, /<Card/);
  assert.doesNotMatch(s, /<\/Card/);
});

test('W∞-41: /m/memberships keeps promotion-tool membership scope and honest boundaries', () => {
  const s = src();
  assert.match(s, /发放、吊销与时间线共用\s+member_benefit_ledger/);
  assert.match(s, /员工按会员码核销/);
  assert.match(s, /需要推广员工具授权或门店范围的 tenant\.read/);
  assert.match(s, /正在加载会员与权益/);
  assert.match(s, /不伪造第三方投放或本平台成交/);
  assert.doesNotMatch(s, /商户经营/);
  assert.doesNotMatch(s, /经营会员/);
});

test('W∞-41: /m/memberships preserves membership ledger operations + e2e hooks', () => {
  const s = src();
  assert.match(s, /data-testid="management-memberships"/);
  assert.match(s, /data-testid=\{`membership-card-\$\{item\.id\}`\}/);
  assert.match(s, /发放\/吊销时间线/);
  assert.match(s, /发放：\{benefit\.title\}/);
  assert.match(s, /data-testid="membership-ledger"/);
  assert.match(s, /data-testid="membership-balances"/);
  assert.match(s, /吊销 1 次/);
  assert.match(s, /data-testid="membership-entries"/);
  assert.match(s, /role="status"/);
});
