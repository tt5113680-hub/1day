import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { OrganizationContext } from './organization.service';

@Injectable()
export class ManagementRolePermissionService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  async overview(context: OrganizationContext) {
    const [roles, permissions] = await Promise.all([
      this.pool.query(
        `select r.id,r.code,r.name,r.version,array_remove(array_agg(distinct p.code),null) permissions,count(distinct mr.membership_id)::int member_count from roles r left join role_permissions rp on rp.role_id=r.id and rp.tenant_id=r.tenant_id and rp.status='active' left join permissions p on p.id=rp.permission_id and p.status='active' left join membership_roles mr on mr.role_id=r.id and mr.tenant_id=r.tenant_id where r.tenant_id=$1 and r.status='active' group by r.id order by r.code`,
        [context.tenantId],
      ),
      this.pool.query("select code from permissions where status='active' order by code"),
    ]);
    return { roles: roles.rows, permissions: permissions.rows };
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
