import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = (rel) => readFileSync(join(root, `apps/management-web/app/${rel}`), 'utf8');
const css = (rel) => readFileSync(join(root, `apps/management-web/app/${rel}`), 'utf8');

const pages = {
  org: 'm/organization-employees/page.tsx',
  roles: 'm/roles-permissions/page.tsx',
  content: 'm/content/page.tsx',
  builder: 'm/page-builder/page.tsx',
  settings: 'm/settings/page.tsx',
};
const cssFiles = {
  org: 'm/organization-employees/page.module.css',
  roles: 'm/roles-permissions/page.module.css',
  content: 'm/content/page.module.css',
  builder: 'm/page-builder/page.module.css',
  settings: 'm/settings/page.module.css',
};

test('W∞-43: Management MPC-10/11/12 pages use Meituan merchant PC yellow top bar + gray-white-card canvas (no AdminPageHeader/Card)', () => {
  for (const rel of Object.values(pages)) {
    const s = page(rel);
    assert.match(s, /className=\{styles\.topBar\}/, `${rel} topBar`);
    assert.match(s, /className=\{styles\.topBarTitle\}/, `${rel} topBarTitle`);
    assert.match(s, /className=\{styles\.topBarRefresh\}/, `${rel} topBarRefresh`);
    assert.match(s, /className=\{styles\.heroCard\}/, `${rel} heroCard`);
    assert.match(s, /<h1>/, `${rel} hero h1`);
    assert.doesNotMatch(s, /AdminPageHeader/, `${rel} no AdminPageHeader`);
    assert.doesNotMatch(s, /eyebrow=/, `${rel} no eyebrow prop`);
    assert.doesNotMatch(s, /<Card\b/, `${rel} no <Card`);
    assert.doesNotMatch(s, /<\/Card>/, `${rel} no </Card>`);
  }
  for (const rel of Object.values(cssFiles)) {
    const c = css(rel);
    assert.match(c, /background:\s*linear-gradient\(180deg,\s*#ffe14d/, `${rel} yellow topBar`);
    assert.match(c, /background:\s*#f5f5f5/, `${rel} gray canvas`);
    assert.match(c, /background:\s*#fff/, `${rel} white panels`);
  }
});

test('W∞-43: topBar carries the promotion-tool eyebrow; heroCard carries the h1 title', () => {
  assert.match(page(pages.org), /推广员工具 · 员工管理/);
  assert.match(page(pages.org), /<h1>让每位员工的归属、待办与离职交接可见<\/h1>/);
  assert.match(page(pages.roles), /推广员工具 · 角色权限/);
  assert.match(page(pages.roles), /<h1>在变更前看清权限范围与成员影响<\/h1>/);
  assert.match(page(pages.content), /推广员工具 · 营销内容/);
  assert.match(page(pages.content), /<h1>让内容生产、审批与渠道连接保持可追溯<\/h1>/);
  assert.match(page(pages.builder), /推广员工具 · 入口页装修/);
  assert.match(page(pages.builder), /<h1>在固定业务模块内维护模板、预览与版本<\/h1>/);
  assert.match(page(pages.settings), /推广员工具 · 工具设置/);
  assert.match(page(pages.settings), /可审计工具规则/);
});

test('W∞-43: honest promotion-tool / no-native-sales boundaries retained', () => {
  assert.match(page(pages.org), /不另造第二套\s*API/);
  assert.match(page(pages.org), /租户工具授权范围/);
  assert.match(page(pages.roles), /高风险权限必须二次确认/);
  assert.match(page(pages.content), /没有第三方授权时不会伪造发送结果/);
  assert.match(page(pages.builder), /共用一套绑定/);
  assert.match(page(pages.settings), /不碰销售成交/);
  assert.match(page(pages.settings), /不含支付金额与第三方订单成功/);
});

test('W∞-43: summaryStrip on data-list pages + loading/forbidden states preserved', () => {
  for (const key of ['org', 'roles', 'content', 'builder']) {
    assert.match(page(pages[key]), /summaryStrip/, `${key} summaryStrip`);
  }
  for (const rel of Object.values(pages)) {
    const s = page(rel);
    assert.match(s, /正在加载/, `${rel} loading`);
    assert.match(s, /无权查看/, `${rel} forbidden`);
  }
});

test('W∞-43: e2e hooks + key interactions preserved', () => {
  assert.match(page(pages.org), /data-testid="management-organization-employees"/);
  assert.match(page(pages.org), /办理离职/);
  assert.match(page(pages.org), /员工与交接风险/);
  assert.match(page(pages.roles), /data-testid="management-roles-permissions"/);
  assert.match(page(pages.roles), /查看与变更/);
  assert.match(page(pages.roles), /<h2>变更 \{selected\.name\}<\/h2>/);
  assert.match(page(pages.content), /data-testid="management-content"/);
  assert.match(page(pages.content), /创建草稿/);
  assert.match(page(pages.content), /投放到消费者门店/);
  assert.match(page(pages.builder), /data-testid="management-page-builder"/);
  assert.match(page(pages.builder), /进入装修/);
  assert.match(page(pages.builder), /发布历史/);
  assert.match(page(pages.settings), /data-testid="management-settings"/);
  assert.match(page(pages.settings), /保存工具设置/);
  assert.match(page(pages.settings), /默认时限/);
});
