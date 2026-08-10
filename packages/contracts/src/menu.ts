export type MenuProduct = 'management' | 'platform' | 'channel' | 'circle' | 'employee';

export type MenuItemDto = {
  key: string;
  href: string;
  label: string;
  group?: string;
};

export type MenuDto = {
  product: MenuProduct;
  context: string;
  roleCodes: string[];
  permissionCodes: string[];
  items: MenuItemDto[];
};

export type MenuCatalogItem = MenuItemDto & {
  /** User must hold every listed permission. */
  requireAll?: string[];
  /** User must hold at least one listed permission. */
  requireAny?: string[];
};

/** Server catalog for Management AdminShell (SYS-6 scaffold). */
export const MANAGEMENT_MENU_CATALOG: MenuCatalogItem[] = [
  {
    key: 'overview',
    href: '/',
    label: '经营总览',
    requireAny: ['tenant.manage', 'customer.read'],
  },
  {
    key: 'customers',
    href: '/m/customers',
    label: '客户资产',
    requireAny: ['tenant.manage', 'customer.read'],
  },
  {
    key: 'workflows',
    href: '/m/workflows',
    label: '运营流程',
    requireAny: ['tenant.manage', 'workflow.read'],
  },
  {
    key: 'stores',
    href: '/m/stores',
    label: '门店与外链',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'offers',
    href: '/m/offers',
    label: '套餐与 Offer',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'memberships',
    href: '/m/memberships',
    label: '会员与权益',
    requireAny: ['tenant.manage'],
  },
  {
    key: 'content',
    href: '/m/content',
    label: '内容中心',
    requireAny: ['tenant.manage'],
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
    requireAny: ['tenant.manage', 'employee.manage'],
  },
  {
    key: 'roles',
    href: '/m/roles-permissions',
    label: '角色与权限',
    requireAll: ['tenant.manage'],
  },
  {
    key: 'settings',
    href: '/m/settings',
    label: '经营设置',
    requireAll: ['tenant.manage'],
  },
];

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
