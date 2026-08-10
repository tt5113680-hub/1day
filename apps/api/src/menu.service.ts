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
import { DataScopeService } from './data-scope.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class MenuService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly dataScopes: DataScopeService,
  ) {}

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
    const scopes = await this.scopesFor(product, context.tenantId, context.userId);
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
  ): Promise<MenuScopeDto[]> {
    if (product === 'employee') {
      return this.dataScopes.resolveStoreScopes(tenantId, userId);
    }
    if (product === 'management') {
      const active = await this.dataScopes.listActive(tenantId, userId);
      const stores = await this.dataScopes.resolveStoreScopes(tenantId, userId);
      if (stores.length) return stores;
      if (active.length) return active;
      return [{ type: 'tenant', id: tenantId, label: '当前租户' }];
    }
    if (product === 'platform' || product === 'channel' || product === 'circle') {
      const active = await this.dataScopes.listActive(tenantId, userId);
      const scoped = active.filter((scope) =>
        product === 'channel'
          ? scope.type === 'channel'
          : product === 'circle'
            ? scope.type === 'circle'
            : scope.type === 'system' || scope.type === 'channel' || scope.type === 'circle',
      );
      if (scoped.length) return scoped;
      return [{ type: 'system', id: tenantId, label: '系统租户' }];
    }
    return [{ type: 'tenant', id: tenantId, label: '当前租户' }];
  }

  private contextLabel(product: MenuProduct, scopes: MenuScopeDto[]) {
    if (product === 'management') {
      const stores = scopes.filter((scope) => scope.type === 'store');
      if (stores.length === 1) return `门店经营范围 · ${stores[0]?.label ?? '授权门店'}`;
      if (stores.length > 1) return `门店经营范围 · ${stores.length} 家门店`;
      return '租户经营工作台';
    }
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
