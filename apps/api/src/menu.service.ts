import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  filterMenuCatalog,
  MANAGEMENT_MENU_CATALOG,
  resolveMenuProduct,
  type MenuDto,
  type MenuProduct,
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
    const items =
      product === 'management' ? filterMenuCatalog(MANAGEMENT_MENU_CATALOG, permissionCodes) : [];
    return {
      product,
      context: this.contextLabel(product),
      roleCodes,
      permissionCodes,
      items,
    };
  }

  private contextLabel(product: MenuProduct) {
    if (product === 'management') return '租户经营工作台';
    if (product === 'platform') return '平台治理';
    if (product === 'channel') return '渠道经营';
    if (product === 'circle') return '商圈经营';
    return '员工工作台';
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
