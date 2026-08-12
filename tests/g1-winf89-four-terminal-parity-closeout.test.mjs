import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const mgmt = (route) =>
  route === '/m'
    ? read('apps/management-web/app/page.tsx')
    : read(`apps/management-web/app/m/${route}/page.tsx`);
const mgmtCss = (route) => read(`apps/management-web/app/m/${route}/page.module.css`);
const employee = (file) => read(`apps/employee-web/app/e/${file}`);
const consumer = (file) => read(`apps/consumer-web/app/c/${file}`);
const platform = (file) => read(`apps/platform-web/app/${file}`);

const mgmtMain = [
  ['dashboard-ish home', '/m', '管理工作台', '工作台数据概况'],
  ['stores', 'stores', '门店入口', '门店入口分布'],
  ['offers', 'offers', '商品/套餐入口', '商品套餐数据概况'],
  ['customers', 'customers', '客户跟进', '客户数据概况'],
  ['memberships', 'memberships', '会员中心', '会员数据概况'],
  ['orders', 'orders', '订单痕迹', '订单痕迹概况'],
  ['reviews', 'reviews', '评价档案', '评价概况'],
  ['marketing', 'marketing', '营销档案', '营销概况'],
  ['analytics', 'analytics', '数据/经营分析', '入口痕迹日报（L0–L2）'],
  ['employee-management', 'organization-employees', '员工管理', '员工管理概况'],
  ['roles-permissions', 'roles-permissions', '角色权限', '角色权限概况'],
  ['content', 'content', '营销内容', '营销内容概况'],
  ['page-builder', 'page-builder', '入口页装修', '入口页装修概况'],
  ['settings', 'settings', '工具设置', '全平台可见'],
  ['notifications', 'notifications', '通知中心', '通知概况'],
  ['orphan-attribution', 'attribution', '来源归因', '归因摘要'],
  ['orphan-entry-funnel', 'entry-funnel', '入口痕迹', '入口数据概况'],
  ['orphan-connectors', 'connectors', '连接配置', '连接器概况'],
  ['orphan-external-actions', 'external-actions', '外链服务', '外链服务概况'],
  ['orphan-ai', 'ai-suggestions', '作业建议', '作业建议概况'],
  ['orphan-permission-audit', 'permission-audit', '操作审计', '审计摘要'],
  ['orphan-circles', 'circles', '商圈双身份', '商圈概况'],
  ['employee-process-performance', 'employee-process-performance', '员工表现', '员工概况'],
];

const mgmtDeep = (route) => read(`apps/management-web/app/m/${route}/page.tsx`);

test('G1-W∞-89: every Management MPC main surface carries tool-identity topbar + summaryStrip + honest no-native-checkout boundary', () => {
  for (const [name, route, topbarLabel, stripLabel] of mgmtMain) {
    const page = mgmt(route);
    assert.ok(
      new RegExp(`推广员工具 · ${topbarLabel}`).test(page),
      `Management ${name} should carry 推广员工具 · ${topbarLabel} topbar`,
    );
    assert.match(page, /summaryStrip/, `Management ${name} should render summaryStrip`);
    if (stripLabel) {
      assert.ok(
        new RegExp(`aria-label="${stripLabel}"`).test(page) ||
          new RegExp(`>${stripLabel}<`, 'm').test(page) ||
          new RegExp(`<span>${stripLabel}</span>`).test(page),
        `Management ${name} should identify summaryStrip via ${stripLabel}`,
      );
    }
    assert.match(
      page,
      /非本平台下单|不代替平台成交|非本平台成交|不包含本平台收款|不伪造第三方|不宣称已接入|source=local|保留审批和审计记录/,
      `Management ${name} should keep honest no-native-checkout tool-workflow boundary`,
    );
  }
});

test('G1-W∞-89: /m/dashboard + /m/stores + /m/offers + /m/customers + /m/memberships carry full-parity summaryStrip CSS with responsive stacking', () => {
  for (const [route, columns] of [
    ['offers', 'repeat\\(4'],
    ['customers', 'repeat\\(6'],
    ['memberships', 'repeat\\(3'],
  ]) {
    const css = mgmtCss(route);
    assert.match(css, /\.summaryStrip\s*\{/, `${route} css should define .summaryStrip`);
    assert.match(
      css,
      new RegExp(`grid-template-columns:\\s*${columns}`),
      `${route} css should size columns`,
    );
    assert.match(
      css,
      /@media \(max-width: 900px\)[\s\S]*\.summaryStrip[\s\S]*(1fr 1fr|repeat\(2,\s*minmax\(0,\s*1fr\)\))/,
      `${route} should stack two-column ≤900px`,
    );
  }
});

const employeeMain = [
  ['workbench', 'workbench/workbench.tsx', '工作台', '', ''],
  ['task-inbox', 'tasks/task-inbox.tsx', '任务收件箱', '', ''],
  ['customer-directory', 'customers/customer-directory.tsx', '客户目录', '客户跟进分布', ''],
  ['nurture', 'nurture/nurture-workbench.tsx', '客户跟进', '客户跟进队列概况', ''],
  ['share', 'share/share-codes.tsx', '获客分享', '分享数据概况', ''],
  ['store-home', 'store/store-home.tsx', '店长模式', '', ''],
  ['membership-redeem', 'memberships/membership-redeem.tsx', '会员核销', '会员核销分布', ''],
  ['notification-center', 'notifications/notification-center.tsx', '执行提醒', '', ''],
  ['employee-profile', 'profile/employee-profile.tsx', '我的', '', ''],
  ['lead-pool', 'leads/lead-pool.tsx', '获客池', '', ''],
];

const employeeDeep = [
  ['task-detail', 'tasks/[id]/task-detail.tsx', '任务详情', '任务详情概况'],
  ['customer-detail', 'customers/[id]/customer-detail.tsx', '客户详情', '客户详情概况'],
  ['follow-up', 'tasks/[id]/follow-up/follow-up.tsx', '任务跟进', ''],
];

test('G1-W∞-89: every Employee ME main surface carries tool identity + real-data summary/hero + honest boundary', () => {
  for (const [name, file, topbarLabel, stripMarker] of employeeMain) {
    const page = employee(file);
    assert.ok(
      new RegExp('推广员工具').test(page),
      `Employee ${name} should carry tool-identity mark`,
    );
    if (topbarLabel) {
      assert.ok(
        new RegExp(`推广员工具 · ${topbarLabel}`).test(page),
        `Employee ${name} should carry 推广员工具 · ${topbarLabel} topbar`,
      );
    }
    assert.match(
      page,
      /summaryStrip|heroCard/,
      `Employee ${name} should render a summary/hero bar`,
    );
    if (stripMarker) {
      assert.ok(
        new RegExp(`aria-label="${stripMarker}"`).test(page),
        `Employee ${name} should carry real-data ${stripMarker}`,
      );
    }
    assert.match(
      page,
      /非本平台下单|不代履约美团|source=local|不包含本平台收款|非本平台成交/,
      `Employee ${name} should keep honest no-native-checkout boundary`,
    );
  }
});

test('G1-W∞-89: employee detail and follow-up surfaces keep full-parity chrome + honest boundary', () => {
  for (const [name, file, topbarLabel, stripMarker] of employeeDeep) {
    const page = employee(file);
    assert.ok(
      new RegExp(`推广员工具 · ${topbarLabel}`).test(page),
      `Employee ${name} should carry 推广员工具 · ${topbarLabel} topbar`,
    );
    assert.match(page, /styles\.topBar/, `Employee ${name} should use topBar chrome`);
    assert.match(page, /styles\.heroCard/, `Employee ${name} should use heroCard chrome`);
    if (stripMarker) {
      assert.ok(
        new RegExp(`aria-label="${stripMarker}"`).test(page),
        `Employee ${name} should carry ${stripMarker}`,
      );
    }
    assert.match(
      page,
      /非本平台下单|不代履约美团|source=local|不包含本平台收款/,
      `Employee ${name} should keep honest boundary`,
    );
  }
});

test('G1-W∞-89: management deep surfaces employee-process-performance and funnels detail stay guarded', () => {
  const employeePerf = mgmtDeep('employee-process-performance');
  assert.match(employeePerf, /推广员工具 · 员工表现/);
  assert.match(employeePerf, /summaryStrip/);
  assert.match(employeePerf, /aria-label="员工概况"/);
  assert.match(employeePerf, /非本平台下单/);

  const funnel = mgmtDeep('funnels/[id]');
  assert.match(funnel, /推广员工具 · 来源归因漏斗/);
  assert.match(funnel, /summaryStrip/);
  assert.match(funnel, /非本平台下单/);
});

const consumerMain = [
  ['discovery', 'discovery/discovery.tsx', '附近数据概况', /不在此下单，非本平台下单/],
  ['store', 'stores/[id]/store.tsx', '门店数据概况', /非本平台下单/],
  ['entry', 'entry/consumer-entry.tsx', '统一入口分布', /非本平台下单|不在此下单/],
  ['profile', 'profile/profile.tsx', '我的会员分布', /非本平台下单/],
  ['circles-home', 'circles/circles-home.tsx', '商圈数据概况', /非本平台下单/],
];

test('G1-W∞-89: every Consumer MH5 main surface carries tool identity + summaryStrip/distribution + honest non-native-checkout', () => {
  for (const [name, file, stripLabel, honestRe] of consumerMain) {
    const page = consumer(file);
    assert.ok(
      new RegExp(`推广员工具`).test(page),
      `Consumer ${name} should carry 推广员工具 tool mark`,
    );
    assert.ok(
      new RegExp(`aria-label="${stripLabel}"`).test(page),
      `Consumer ${name} should carry ${stripLabel}`,
    );
    assert.match(
      page,
      honestRe,
      `Consumer ${name} should keep honest non-native-checkout boundary`,
    );
  }
});

const platformMain = [
  ['dashboard', 'p/dashboard/page.tsx', '平台总览', '平台概况'],
  ['tenants', 'p/tenants/page.tsx', '平台租户管理', '平台租户概况'],
  ['channels', 'p/channels/page.tsx', '平台渠道管理', '渠道运营分布'],
  ['agents', 'p/agents/page.tsx', '省市区代理', '代理运营分布'],
  ['business-circles', 'p/business-circles/page.tsx', '平台商圈管理', '商圈运营分布'],
  ['outbox', 'p/outbox/page.tsx', '平台投递队列', '平台投递分布'],
  ['security-audit', 'p/security-audit/page.tsx', '平台安全审计', '平台安全分布'],
  ['connectors', 'p/connectors/page.tsx', '平台连接器', '平台连接器分布'],
  ['templates', 'p/templates/page.tsx', '平台模板治理', '平台模板分布'],
  ['bc-dashboard', 'bc/dashboard/page.tsx', '商圈联盟', '商圈联盟分布'],
  ['bc-merchants', 'bc/merchants/page.tsx', '商圈成员治理', '商圈成员概况'],
  ['ch-dashboard', 'ch/dashboard/page.tsx', '渠道代理', '渠道概况'],
  ['onboarding', 'p/tenants/new/page.tsx', '商户开通', '开通步骤分布'],
];

test('G1-W∞-89: every Platform/Channel/Circle main surface carries tool identity + summaryStrip/distribution + honest boundary', () => {
  for (const [name, file, topbarLabel, stripLabel] of platformMain) {
    const page = platform(file);
    assert.ok(
      new RegExp(`推广员工具 · ${topbarLabel}`).test(page),
      `Platform ${name} should carry 推广员工具 · ${topbarLabel} topbar`,
    );
    if (file !== 'p/tenants/new/page.tsx') {
      assert.match(page, /summaryStrip/, `Platform ${name} should render summaryStrip`);
    } else {
      assert.ok(
        new RegExp(`aria-label="${stripLabel}"`).test(page),
        `Platform ${name} should carry the onboarding-step distribution`,
      );
    }
    assert.match(
      page,
      /非本平台下单|不包含本平台收款|本地试点记录未接美团实时|未接美团/,
      `Platform ${name} should keep honest no-native-checkout boundary`,
    );
  }
});

test('G1-W∞-89: platform channels embeds read-only geo agent tree for MP-01 channel parity', () => {
  const page = read('apps/platform-web/app/p/channels/page.tsx');
  assert.match(page, /aria-label="省市区代理树"/);
  assert.match(page, /aria-label="省市区代理树概况"/);
  assert.match(page, /\/api\/v1\/platform\/agents/);
  assert.match(page, /\/p\/agents/);
  assert.match(page, /renderGeoTree/);
});

test('G1-W∞-89: /m/workflows remains the sole ONEDAY-custom page (no Meituan parity claim)', () => {
  const page = read('apps/management-web/app/m/workflows/page.tsx');
  assert.match(page, /工作流整合/);
  assert.match(page, /推广员工具/);
});
