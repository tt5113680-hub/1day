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

/** Server catalog for Management AdminShell (SYS-6). */
export const MANAGEMENT_MENU_CATALOG: MenuCatalogItem[] = [
  {
    key: 'overview',
    href: '/',
    label: '经营总览',
    requireAny: ['tenant.manage', 'tenant.read', 'customer.read'],
  },
  {
    key: 'customers',
    href: '/m/customers',
    label: '客户资产',
    requireAny: ['tenant.manage', 'customer.manage'],
  },
  {
    key: 'workflows',
    href: '/m/workflows',
    label: '运营流程',
    requireAny: ['tenant.manage', 'workflow.read', 'workflow.manage'],
  },
  {
    key: 'stores',
    href: '/m/stores',
    label: '门店与外链',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'offers',
    href: '/m/offers',
    label: '套餐与 Offer',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'memberships',
    href: '/m/memberships',
    label: '会员与权益',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'content',
    href: '/m/content',
    label: '内容中心',
    requireAny: ['tenant.manage', 'tenant.read'],
  },
  {
    key: 'page-builder',
    href: '/m/page-builder',
    label: '模板与发布',
    requireAny: ['tenant.manage', 'page.manage'],
  },
  {
    key: 'organization',
    href: '/m/organization-employees',
    label: '组织与员工',
    requireAny: ['tenant.manage', 'employee.manage', 'organization.read', 'organization.manage'],
  },
  {
    key: 'roles',
    href: '/m/roles-permissions',
    label: '角色与权限',
    requireAll: ['tenant.manage', 'organization.manage'],
  },
  {
    key: 'settings',
    href: '/m/settings',
    label: '经营设置',
    requireAll: ['tenant.manage', 'organization.manage'],
  },
];

/** Platform Admin path `/p/*`. */
export const PLATFORM_MENU_CATALOG: MenuCatalogItem[] = [
  {
    key: 'dashboard',
    href: '/p/dashboard',
    label: '平台总览',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'onboarding',
    href: '/p/tenants/new',
    label: '开通租户',
    requireAny: ['platform.manage'],
  },
  {
    key: 'tenants',
    href: '/p/tenants',
    label: '租户治理',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'templates',
    href: '/p/templates',
    label: '模板目录',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'channels',
    href: '/p/channels',
    label: '渠道运营',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'business-circles',
    href: '/p/business-circles',
    label: '商圈运营',
    requireAny: ['platform.read', 'platform.manage', 'circle.manage'],
  },
  {
    key: 'connectors',
    href: '/p/connectors',
    label: '连接器',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'outbox',
    href: '/p/outbox',
    label: 'Outbox 死信',
    requireAny: ['platform.read', 'platform.manage'],
  },
  {
    key: 'security-audit',
    href: '/p/security-audit',
    label: '安全审计',
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
    href: '/e/leads',
    label: '客户',
    requireAny: ['customer.read', 'customer.manage', 'task.read'],
  },
  {
    key: 'tasks',
    href: '/e/workbench#today-title',
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
