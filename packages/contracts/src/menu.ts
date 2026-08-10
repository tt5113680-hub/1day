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

/** SYS-29: AdminShell section labels keyed by MenuItemDto.group. */
export const MENU_GROUP_LABELS: Record<string, string> = {
  operate: '经营运营',
  commerce: '门店与商品',
  people: '组织与权限',
  intents: '能力边界',
  govern: '平台治理',
  network: '渠道与商圈',
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

/** Server catalog for Management AdminShell (SYS-6). */
export const MANAGEMENT_MENU_CATALOG: MenuCatalogItem[] = [
  {
    key: 'overview',
    href: '/',
    label: '经营总览',
    group: 'operate',
    requireAny: ['tenant.manage', 'tenant.read', 'customer.read'],
  },
  {
    key: 'customers',
    href: '/m/customers',
    label: '客户资产',
    group: 'operate',
    requireAny: ['tenant.manage', 'customer.manage'],
  },
  {
    key: 'attribution',
    href: '/m/attribution',
    label: '来源归因',
    group: 'operate',
    // Matches ManagementAttributionController (`tenant.manage`).
    requireAny: ['tenant.manage'],
  },
  {
    key: 'workflows',
    href: '/m/workflows',
    label: '运营流程',
    group: 'operate',
    requireAny: ['tenant.manage', 'workflow.read', 'workflow.manage'],
  },
  {
    key: 'stores',
    href: '/m/stores',
    label: '门店与外链',
    group: 'commerce',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'external-actions',
    href: '/m/external-actions',
    label: '外链动作目录',
    group: 'commerce',
    requireAny: ['tenant.manage', 'action.read', 'action.manage'],
  },
  {
    key: 'offers',
    href: '/m/offers',
    label: '套餐与 Offer',
    group: 'commerce',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'memberships',
    href: '/m/memberships',
    label: '会员与权益',
    group: 'commerce',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'content',
    href: '/m/content',
    label: '内容中心',
    group: 'commerce',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'page-builder',
    href: '/m/page-builder',
    label: '模板与发布',
    group: 'commerce',
    requireAny: ['tenant.manage', 'page.manage'],
  },
  {
    key: 'organization',
    href: '/m/organization-employees',
    label: '组织与员工',
    group: 'people',
    requireAny: ['tenant.manage', 'employee.manage', 'organization.read', 'organization.manage'],
  },
  {
    key: 'employee-performance',
    href: '/m/employee-process-performance',
    label: '员工过程',
    group: 'people',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'roles',
    href: '/m/roles-permissions',
    label: '角色与权限',
    group: 'people',
    requireAll: ['tenant.manage', 'organization.manage'],
  },
  {
    key: 'permission-audit',
    href: '/m/permission-audit',
    label: '权限审计',
    group: 'people',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'settings',
    href: '/m/settings',
    label: '经营设置',
    group: 'people',
    requireAll: ['tenant.manage', 'organization.manage'],
  },
  {
    key: 'ai-suggestions',
    href: '/m/ai-suggestions',
    label: 'AI 建议',
    group: 'intents',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'connectors',
    href: '/m/connectors',
    label: '连接器意图',
    group: 'intents',
    requireAny: ['tenant.manage'],
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
    href: '/e/workbench#membership-redeem',
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
    links.push({ product: 'management', label: '商户经营', homeHref: '/' });
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
