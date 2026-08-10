import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  STORE_MANAGER_MENU_ITEM,
  defaultHomeHref,
  filterMenuCatalog,
  menuCatalogFor,
  resolveAvailableProducts,
  resolveMenuProduct,
  type MenuDto,
  type MenuItemDto,
  type MenuProduct,
  type MenuScopeDto,
} from '@oneday/contracts';
import { createApiPool } from './database-pool';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class MenuService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  constructor(private readonly tenantContext: TenantContextService) {}

  async menuFor(
    authorization: string | undefined,
    requestedTenant: string | undefined,
    productRaw: string | undefined,
  ): Promise<MenuDto> {
    const context = await this.tenantContext.fromAuthorization(authorization, requestedTenant);
    const product = resolveMenuProduct(productRaw);
    const membership = await this.pool.query<{ role_code: string; permission_code: string }>(
      `select r.code as role_code, p.code as permission_code
       from memberships m
       join membership_roles mr on mr.membership_id = m.id and mr.tenant_id = m.tenant_id
       join roles r on r.id = mr.role_id and r.tenant_id = m.tenant_id
       join role_permissions rp on rp.role_id = mr.role_id and rp.tenant_id = m.tenant_id and rp.status = 'active'
       join permissions p on p.id = rp.permission_id and p.status = 'active'
       where m.user_id = $1 and m.tenant_id = $2 and m.status = 'active'`,
      [context.userId, context.tenantId],
    );
    const roleCodes = [...new Set(membership.rows.map((row) => row.role_code))].sort();
    const permissionCodes = [...new Set(membership.rows.map((row) => row.permission_code))].sort();
    const scopes = await this.scopesFor(product, context.tenantId, context.userId, roleCodes);
    const items = this.itemsFor(product, permissionCodes, scopes, roleCodes);
    const homeHref = this.homeHrefFor(product, items, scopes, permissionCodes);
    return {
      product,
      context: this.contextLabel(product, scopes),
      roleCodes,
      permissionCodes,
      items,
      homeHref,
      scopes,
      availableProducts: resolveAvailableProducts(permissionCodes),
    };
  }

  private itemsFor(
    product: MenuProduct,
    permissionCodes: string[],
    scopes: MenuScopeDto[],
    roleCodes: string[],
  ): MenuItemDto[] {
    const items = filterMenuCatalog(menuCatalogFor(product), permissionCodes);
    if (product !== 'employee') return items;
    const isStoreManager =
      roleCodes.includes('store_manager') || scopes.some((scope) => scope.type === 'store');
    if (!isStoreManager) return items;
    if (items.some((item) => item.key === STORE_MANAGER_MENU_ITEM.key)) return items;
    const profileIndex = items.findIndex((item) => item.key === 'profile');
    if (profileIndex < 0) return [...items, STORE_MANAGER_MENU_ITEM];
    return [...items.slice(0, profileIndex), STORE_MANAGER_MENU_ITEM, ...items.slice(profileIndex)];
  }

  private homeHrefFor(
    product: MenuProduct,
    items: MenuItemDto[],
    scopes: MenuScopeDto[],
    permissionCodes: string[],
  ) {
    if (product === 'employee' && scopes.some((scope) => scope.type === 'store')) {
      return STORE_MANAGER_MENU_ITEM.href;
    }
    if (product === 'platform') {
      const perms = new Set(permissionCodes);
      if (perms.has('platform.read') || perms.has('platform.manage')) return '/p/dashboard';
      if (perms.has('circle.manage')) return '/bc/dashboard';
      return '/ch/dashboard';
    }
    return defaultHomeHref(product, items);
  }

  private async scopesFor(
    product: MenuProduct,
    tenantId: string,
    userId: string,
    roleCodes: string[],
  ): Promise<MenuScopeDto[]> {
    if (product === 'employee' || roleCodes.includes('store_manager')) {
      const stores = await this.pool.query<{ id: string; name: string }>(
        `select s.id, s.name
         from store_managers sm
         join employees e on e.id = sm.employee_id and e.tenant_id = sm.tenant_id
           and e.status = 'active' and e.deleted_at is null
         join memberships m on m.id = e.membership_id and m.tenant_id = e.tenant_id
           and m.user_id = $2 and m.status = 'active' and m.deleted_at is null
         join stores s on s.id = sm.store_id and s.tenant_id = sm.tenant_id
           and s.status = 'active' and s.deleted_at is null
         where sm.tenant_id = $1 and sm.status = 'active' and sm.deleted_at is null
         order by s.name`,
        [tenantId, userId],
      );
      return stores.rows.map((store) => ({
        type: 'store' as const,
        id: store.id,
        label: store.name,
      }));
    }
    if (product === 'platform' || product === 'channel' || product === 'circle') {
      return [{ type: 'system', id: tenantId, label: '系统租户' }];
    }
    return [{ type: 'tenant', id: tenantId, label: '当前租户' }];
  }

  private contextLabel(product: MenuProduct, scopes: MenuScopeDto[]) {
    if (product === 'management') return '租户经营工作台';
    if (product === 'platform') return '平台治理 · 系统租户';
    if (product === 'channel') return '渠道负责人 · 授权渠道范围';
    if (product === 'circle') return '商圈负责人 · 授权商圈范围';
    const stores = scopes.filter((scope) => scope.type === 'store');
    if (stores.length === 1) return `店长工作台 · ${stores[0]?.label ?? '授权门店'}`;
    if (stores.length > 1) return `店长工作台 · ${stores.length} 家门店`;
    return '员工工作台';
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
