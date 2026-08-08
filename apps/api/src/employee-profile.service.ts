import { ForbiddenException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

@Injectable()
export class EmployeeProfileService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async get(context: OrganizationContext) {
    const employee = await this.pool.query(
      `select e.id,e.employee_code,e.title,e.organization_id,e.version,u.display_name,u.email,
              o.name as organization_name,o.organization_type,o.code as organization_code
       from employees e
       join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id and m.status='active' and m.deleted_at is null
       join users u on u.id=m.user_id and u.status='active' and u.deleted_at is null
       join organizations o on o.id=e.organization_id and o.tenant_id=e.tenant_id and o.status='active' and o.deleted_at is null
       where e.tenant_id=$1 and m.user_id=$2 and e.status='active' and e.deleted_at is null`,
      [context.tenantId, context.userId],
    );
    if (!employee.rowCount) throw new ForbiddenException('FORBIDDEN');
    const row = employee.rows[0];
    const [stores, permissions, preference] = await Promise.all([
      this.pool.query(
        "select id,name,address,code from stores where tenant_id=$1 and organization_id=$2 and status='active' and deleted_at is null order by name",
        [context.tenantId, row.organization_id],
      ),
      this.pool.query(
        `select distinct p.code from membership_roles mr
         join role_permissions rp on rp.role_id=mr.role_id and rp.tenant_id=mr.tenant_id and rp.status='active'
         join permissions p on p.id=rp.permission_id and p.status='active'
         join employees e on e.membership_id=mr.membership_id and e.tenant_id=mr.tenant_id
         where e.id=$1 and e.tenant_id=$2 order by p.code`,
        [row.id, context.tenantId],
      ),
      this.pool.query(
        'select do_not_disturb_until,version from employee_notification_preferences where tenant_id=$1 and employee_id=$2 and deleted_at is null',
        [context.tenantId, row.id],
      ),
    ]);
    return {
      employee: {
        id: row.id,
        displayName: row.display_name,
        email: row.email,
        employeeCode: row.employee_code,
        title: row.title,
        version: row.version,
      },
      organization: {
        id: row.organization_id,
        name: row.organization_name,
        code: row.organization_code,
        type: row.organization_type,
      },
      stores: stores.rows.map((store) => ({
        id: store.id,
        name: store.name,
        code: store.code,
        address: store.address,
      })),
      permissions: permissions.rows.map((permission) => permission.code),
      notificationPreference: preference.rowCount
        ? {
            doNotDisturbUntil: preference.rows[0].do_not_disturb_until,
            version: preference.rows[0].version,
          }
        : { doNotDisturbUntil: null, version: 0 },
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
