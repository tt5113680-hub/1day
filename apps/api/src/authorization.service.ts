import { ForbiddenException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class AuthorizationService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  constructor(private readonly tenantContext: TenantContextService) {}
  async require(authorization: string | undefined, permission: string, requestedTenant?: string) {
    return this.requireAny(authorization, [permission], requestedTenant);
  }

  async requireAny(
    authorization: string | undefined,
    permissions: string[],
    requestedTenant?: string,
  ) {
    if (!permissions.length) throw new ForbiddenException('FORBIDDEN');
    const context = await this.tenantContext.fromAuthorization(authorization, requestedTenant);
    const result = await this.pool.query(
      `select 1 from memberships m
       join membership_roles mr on mr.membership_id=m.id and mr.tenant_id=m.tenant_id
       join role_permissions rp on rp.role_id=mr.role_id and rp.tenant_id=m.tenant_id and rp.status='active'
       join permissions p on p.id=rp.permission_id and p.status='active'
       where m.user_id=$1 and m.tenant_id=$2 and m.status='active' and p.code = any($3::varchar[])
       limit 1`,
      [context.userId, context.tenantId, permissions],
    );
    if (result.rowCount !== 1) throw new ForbiddenException('FORBIDDEN');
    return context;
  }
  async requirePlatform(authorization: string | undefined, permission = 'platform.read') {
    return this.requirePlatformAny(authorization, [permission]);
  }

  async requirePlatformAny(authorization: string | undefined, permissions: string[]) {
    if (!permissions.length) throw new ForbiddenException('FORBIDDEN');
    const context = await this.tenantContext.fromAuthorization(authorization);
    const result = await this.pool.query(
      `select 1 from memberships m
       join tenants t on t.id=m.tenant_id and t.slug='system' and t.status='active' and t.deleted_at is null
       join membership_roles mr on mr.membership_id=m.id and mr.tenant_id=m.tenant_id
       join role_permissions rp on rp.role_id=mr.role_id and rp.tenant_id=m.tenant_id and rp.status='active'
       join permissions p on p.id=rp.permission_id and p.status='active'
       where m.user_id=$1 and m.status='active' and p.code = any($2::varchar[])
       limit 1`,
      [context.userId, permissions],
    );
    if (result.rowCount !== 1) throw new ForbiddenException('FORBIDDEN');
    return context;
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
