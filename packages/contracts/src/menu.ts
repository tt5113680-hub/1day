export type MenuProduct = 'management' | 'platform' | 'channel' | 'circle' | 'employee';

export type MenuItemDto = {
  key: string;
  href: string;
  label: string;
  group?: string;
};

export type MenuScopeDto = {
  type: 'store' | 'channel' | 'circle' | 'tenant' | 'system';
  id: string;
  label: string;
};

export type MenuProductLink = {
  product: MenuProduct;
  label: string;
  homeHref: string;
};

export type MenuDto = {
  product: MenuProduct;
  context: string;
  roleCodes: string[];
  permissionCodes: string[];
  items: MenuItemDto[];
  homeHref: string;
  scopes: MenuScopeDto[];
  availableProducts: MenuProductLink[];
};

export type MenuCatalogItem = MenuItemDto & {
  /** User must hold every listed permission. */
  requireAll?: string[];
  /** User must hold at least one listed permission. */
  requireAny?: string[];
};

/**
 * SYS-29 / G1-W1: AdminShell section labels keyed by MenuItemDto.group.
 * Management groups follow 美团商家端 PC IA (not self-invented operate/commerce).
 */
export const MENU_GROUP_LABELS: Record<string, string> = {
  workbench: '工作台',
  store: '店铺',
  goods: '商品',
  orders: '订单',
  customer: '顾客',
  marketing: '营销',
  staff: '员工',
  settings: '设置',
  /** Sole ONEDAY custom surface — not a Meituan clone. */
  workflow: '工作流整合',
  govern: '平台治理',
  network: '渠道与商圈',
  intents: '能力边界',
  store_manager: '店长经营',
};

export type MenuNavGroup = {
  key: string;
  label: string | null;
  items: MenuItemDto[];
};

export function groupMenuItems(items: MenuItemDto[]): MenuNavGroup[] {
  const groups: MenuNavGroup[] = [];
  for (const item of items) {
    const key = item.group ?? '';
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
      continue;
    }
    groups.push({
      key,
      label: key ? (MENU_GROUP_LABELS[key] ?? key) : null,
      items: [item],
    });
  }
  return groups;
}

/**
 * Server catalog for Management AdminShell.
 * G1-W1: labels/groups align to 美团商家端 PC; routes reuse existing pages.
 * `/m/workflows` is the sole CUSTOM (非美团复刻) entry.
 */
export const MANAGEMENT_MENU_CATALOG: MenuCatalogItem[] = [
  {
    key: 'overview',
    href: '/',
    label: '工作台',
    group: 'workbench',
    requireAny: ['tenant.manage', 'tenant.read', 'customer.read'],
  },
  {
    key: 'stores',
    href: '/m/stores',
    label: '门店管理',
    group: 'store',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'external-actions',
    href: '/m/external-actions',
    label: '外链服务',
    group: 'store',
    requireAny: ['tenant.manage', 'action.read', 'action.manage'],
  },
  {
    key: 'offers',
    href: '/m/offers',
    label: '商品管理',
    group: 'goods',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'orders',
    href: '/m/orders',
    label: '订单中心',
    group: 'orders',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'customers',
    href: '/m/customers',
    label: '顾客管理',
    group: 'customer',
    requireAny: ['tenant.manage', 'customer.manage'],
  },
  {
    key: 'reviews',
    href: '/m/reviews',
    label: '评价管理',
    group: 'customer',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'attribution',
    href: '/m/attribution',
    label: '来源分析',
    group: 'customer',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'memberships',
    href: '/m/memberships',
    label: '会员中心',
    group: 'marketing',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'content',
    href: '/m/content',
    label: '营销内容',
    group: 'marketing',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'page-builder',
    href: '/m/page-builder',
    label: '店铺装修',
    group: 'marketing',
    requireAny: ['tenant.manage', 'page.manage'],
  },
  {
    key: 'marketing',
    href: '/m/marketing',
    label: '营销活动',
    group: 'marketing',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'organization',
    href: '/m/organization-employees',
    label: '员工管理',
    group: 'staff',
    requireAny: ['tenant.manage', 'employee.manage', 'organization.read', 'organization.manage'],
  },
  {
    key: 'employee-performance',
    href: '/m/employee-process-performance',
    label: '员工表现',
    group: 'staff',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'roles',
    href: '/m/roles-permissions',
    label: '角色权限',
    group: 'staff',
    requireAll: ['tenant.manage', 'organization.manage'],
  },
  {
    key: 'settings',
    href: '/m/settings',
    label: '商家设置',
    group: 'settings',
    requireAll: ['tenant.manage', 'organization.manage'],
  },
  {
    key: 'permission-audit',
    href: '/m/permission-audit',
    label: '操作审计',
    group: 'settings',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'ai-suggestions',
    href: '/m/ai-suggestions',
    label: '经营建议',
    group: 'settings',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'connectors',
    href: '/m/connectors',
    label: '连接配置',
    group: 'settings',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'workflows',
    href: '/m/workflows',
    label: '工作流整合',
    group: 'workflow',
    requireAny: ['tenant.manage', 'workflow.read', 'workflow.manage'],
  },
];

/** Platform Admin path `/p/*`. */
export const PLATFORM_MENU_CATALOG: MenuCatalogItem[] = [
  {
    key: 'dashboard',
    href: '/p/dashboard',
    label: '平台总览',
    group: 'govern',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'onboarding',
    href: '/p/tenants/new',
    label: '开通租户',
    group: 'govern',
    requireAny: ['platform.manage'],
  },
  {
    key: 'tenants',
    href: '/p/tenants',
    label: '租户治理',
    group: 'govern',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'outbox',
    href: '/p/outbox',
    label: 'Outbox 死信',
    group: 'govern',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'security-audit',
    href: '/p/security-audit',
    label: '安全审计',
    group: 'govern',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'templates',
    href: '/p/templates',
    label: '模板目录',
    group: 'network',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'channels',
    href: '/p/channels',
    label: '渠道运营',
    group: 'network',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'business-circles',
    href: '/p/business-circles',
    label: '商圈运营',
    group: 'network',
    requireAny: ['platform.read', 'platform.manage', 'circle.manage'],
  },
  {
    key: 'connectors',
    href: '/p/connectors',
    label: '连接器',
    group: 'intents',
    requireAny: ['platform.read', 'platform.manage'],
  },
];

/** Channel Operator path `/ch/*` (platform-shell mode). */
export const CHANNEL_MENU_CATALOG: MenuCatalogItem[] = [
  {
    key: 'channel-dashboard',
    href: '/ch/dashboard',
    label: '渠道经营总览',
    requireAny: ['channel.read', 'channel.manage', 'platform.read', 'platform.manage'],
  },
  {
    key: 'channel-onboarding',
    href: '/ch/merchants/new',
    label: '商户开通交付',
    requireAny: ['channel.read', 'channel.manage', 'platform.read', 'platform.manage'],
  },
];

/** Circle Manager path `/bc/*` (platform-shell mode). */
export const CIRCLE_MENU_CATALOG: MenuCatalogItem[] = [
  {
    key: 'circle-dashboard',
    href: '/bc/dashboard',
    label: '商圈经营总览',
    requireAny: ['platform.read', 'platform.manage', 'circle.manage'],
  },
  {
    key: 'circle-merchants',
    href: '/bc/merchants',
    label: '商户准入治理',
    requireAny: ['platform.read', 'platform.manage', 'circle.manage'],
  },
];

/**
 * Employee mobile work shell (≤5 base tabs).
 * Store Manager “门店” is injected by MenuService when assignments exist.
 */
export const EMPLOYEE_MENU_CATALOG: MenuCatalogItem[] = [
  {
    key: 'workbench',
    href: '/e/workbench',
    label: '工作台',
    requireAny: ['task.read', 'task.manage', 'customer.read'],
  },
  {
    key: 'customers',
    href: '/e/customers',
    label: '客户',
    requireAny: ['customer.read', 'customer.manage', 'task.read'],
  },
  {
    key: 'tasks',
    href: '/e/tasks',
    label: '任务',
    requireAny: ['task.read', 'task.manage'],
  },
  {
    key: 'notifications',
    href: '/e/notifications',
    label: '提醒',
    requireAny: ['task.read', 'task.manage', 'customer.read'],
  },
  {
    key: 'profile',
    href: '/e/profile',
    label: '我的',
    requireAny: ['task.read', 'task.manage', 'customer.read', 'employee.read'],
  },
];

export const STORE_MANAGER_MENU_ITEM: MenuItemDto = {
  key: 'store',
  href: '/e/store',
  label: '门店',
  group: 'store_manager',
};

/**
 * Store Manager Employee chrome package (SYS-27).
 * Deep-links only to existing Employee routes — no second API surface.
 */
export const STORE_MANAGER_PACKAGE_ACTIONS: MenuItemDto[] = [
  { key: 'tasks', href: '/e/tasks', label: '今日任务', group: 'store_manager' },
  { key: 'leads', href: '/e/leads', label: '线索客户', group: 'store_manager' },
  {
    key: 'redeem',
    href: '/e/memberships',
    label: '会员核销',
    group: 'store_manager',
  },
  { key: 'share', href: '/e/share', label: '分享获客', group: 'store_manager' },
];

/** Platform Admin Shell product homes (SYS-27) — primary CTA per mode. */
export const PLATFORM_PRODUCT_HOMES: Record<
  'platform' | 'channel' | 'circle',
  { label: string; homeHref: string; description: string }
> = {
  platform: {
    label: '平台运营',
    homeHref: '/p/dashboard',
    description: '租户治理、开通编排、模板与安全。',
  },
  channel: {
    label: '渠道经营',
    homeHref: '/ch/dashboard',
    description: '授权渠道范围内的商户招募与交付。',
  },
  circle: {
    label: '商圈经营',
    homeHref: '/bc/dashboard',
    description: '授权商圈的准入、展示与退出治理。',
  },
};

export function menuCatalogFor(product: MenuProduct): MenuCatalogItem[] {
  if (product === 'platform') return PLATFORM_MENU_CATALOG;
  if (product === 'channel') return CHANNEL_MENU_CATALOG;
  if (product === 'circle') return CIRCLE_MENU_CATALOG;
  if (product === 'employee') return EMPLOYEE_MENU_CATALOG;
  return MANAGEMENT_MENU_CATALOG;
}

export function filterMenuCatalog(
  catalog: MenuCatalogItem[],
  permissionCodes: string[],
): MenuItemDto[] {
  const perms = new Set(permissionCodes);
  return catalog
    .filter((item) => {
      if (item.requireAll?.length && !item.requireAll.every((code) => perms.has(code))) {
        return false;
      }
      if (item.requireAny?.length && !item.requireAny.some((code) => perms.has(code))) {
        return false;
      }
      return true;
    })
    .map(({ key, href, label, group }) => ({ key, href, label, group }));
}

export function resolveMenuProduct(product: string | undefined): MenuProduct {
  if (
    product === 'platform' ||
    product === 'channel' ||
    product === 'circle' ||
    product === 'employee'
  ) {
    return product;
  }
  return 'management';
}

export function defaultHomeHref(product: MenuProduct, items: MenuItemDto[]): string {
  if (items[0]?.href) return items[0].href.split('#')[0] ?? items[0].href;
  if (product === 'platform') return '/p/dashboard';
  if (product === 'channel') return '/ch/dashboard';
  if (product === 'circle') return '/bc/dashboard';
  if (product === 'employee') return '/e/workbench';
  return '/';
}

export function resolveAvailableProducts(permissionCodes: string[]): MenuProductLink[] {
  const perms = new Set(permissionCodes);
  const links: MenuProductLink[] = [];
  if (perms.has('tenant.manage') || perms.has('tenant.read') || perms.has('customer.read')) {
    links.push({ product: 'management', label: '商家中心', homeHref: '/' });
  }
  const hasPlatform = perms.has('platform.read') || perms.has('platform.manage');
  const hasChannel = perms.has('channel.read') || perms.has('channel.manage');
  const hasCircle = perms.has('circle.manage');
  if (hasPlatform) {
    links.push({ product: 'platform', label: '平台运营', homeHref: '/p/dashboard' });
  }
  if (hasPlatform || hasChannel) {
    links.push({ product: 'channel', label: '渠道经营', homeHref: '/ch/dashboard' });
  }
  if (hasPlatform || hasCircle) {
    links.push({ product: 'circle', label: '商圈经营', homeHref: '/bc/dashboard' });
  }
  if (
    perms.has('task.read') ||
    perms.has('task.manage') ||
    perms.has('customer.read') ||
    perms.has('employee.read')
  ) {
    links.push({ product: 'employee', label: '员工工作台', homeHref: '/e/workbench' });
  }
  return links;
}

export type PlatformShellMode = 'platform' | 'channel' | 'circle';

/** SYS-28: which AdminShell modes a permission set may enter. */
export function resolvePlatformShellAccess(permissionCodes: string[]): {
  allowed: PlatformShellMode[];
  preferred: PlatformShellMode;
  homeHref: string;
} {
  const shellLinks = resolveAvailableProducts(permissionCodes).filter((link) =>
    ['platform', 'channel', 'circle'].includes(link.product),
  ) as Array<MenuProductLink & { product: PlatformShellMode }>;
  const allowed = shellLinks.map((link) => link.product);
  if (allowed.includes('platform')) {
    return { allowed, preferred: 'platform', homeHref: PLATFORM_PRODUCT_HOMES.platform.homeHref };
  }
  if (allowed.includes('channel')) {
    return { allowed, preferred: 'channel', homeHref: PLATFORM_PRODUCT_HOMES.channel.homeHref };
  }
  if (allowed.includes('circle')) {
    return { allowed, preferred: 'circle', homeHref: PLATFORM_PRODUCT_HOMES.circle.homeHref };
  }
  return { allowed: [], preferred: 'platform', homeHref: PLATFORM_PRODUCT_HOMES.platform.homeHref };
}

export function shellModeAllows(
  mode: PlatformShellMode,
  permissionCodes: string[],
): boolean {
  return resolvePlatformShellAccess(permissionCodes).allowed.includes(mode);
}
