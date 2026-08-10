import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

@Injectable()
export class ManagementOrganizationEmployeeService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async overview(context: OrganizationContext) {
    const [organizations, merchants, employees, invitations] = await Promise.all([
      this.pool.query(
        `select o.id,o.code,o.name,o.organization_type,o.status,o.version,
          coalesce((select count(*)::int from employees e where e.tenant_id=o.tenant_id and e.organization_id=o.id and e.status='active' and e.deleted_at is null),0) active_employee_count
         from organizations o where o.tenant_id=$1 and o.deleted_at is null order by o.code`,
        [context.tenantId],
      ),
      this.pool.query(
        `select m.id,m.organization_id,m.code,m.name,m.status,m.version
         from merchants m where m.tenant_id=$1 and m.deleted_at is null order by m.code`,
        [context.tenantId],
      ),
      this.pool.query(
        `select e.id,e.organization_id,e.employee_code,e.title,e.status,e.version,e.ended_at,u.display_name,u.email,
          (select count(*)::int from tasks t where t.tenant_id=e.tenant_id and t.assignee_employee_id=e.id and t.status in ('open','overdue') and t.deleted_at is null) open_task_count,
          (select count(*)::int from customer_ownerships co where co.tenant_id=e.tenant_id and co.employee_id=e.id and co.status='active' and co.deleted_at is null) active_customer_count
         from employees e join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id join users u on u.id=m.user_id
         where e.tenant_id=$1 and e.deleted_at is null order by e.status='active' desc,e.employee_code`,
        [context.tenantId],
      ),
      this.pool.query(
        "select id,organization_id,email,employee_code,title,status,expires_at,version from membership_invitations where tenant_id=$1 and status='pending' and deleted_at is null order by created_at desc",
        [context.tenantId],
      ),
    ]);
    return {
      organizations: organizations.rows,
      merchants: merchants.rows,
      employees: employees.rows,
      invitations: invitations.rows,
    };
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
