import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

@Injectable()
export class ManagementOrganizationEmployeeService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async overview(context: OrganizationContext) {
    const [organizations, merchants, employees, invitations, roles, stores] = await Promise.all([
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
          coalesce(array_remove(array_agg(distinct r.code),null),'{}') roles,
          coalesce((select array_agg(distinct sm.store_id) from store_managers sm where sm.tenant_id=e.tenant_id and sm.employee_id=e.id and sm.status='active' and sm.deleted_at is null),'{}') store_scope,
          (select count(*)::int from tasks t where t.tenant_id=e.tenant_id and t.assignee_employee_id=e.id and t.status in ('open','overdue') and t.deleted_at is null) open_task_count,
          (select count(*)::int from customer_ownerships co where co.tenant_id=e.tenant_id and co.employee_id=e.id and co.status='active' and co.deleted_at is null) active_customer_count
         from employees e join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id join users u on u.id=m.user_id
         left join membership_roles mr on mr.membership_id=e.membership_id and mr.tenant_id=e.tenant_id
         left join roles r on r.id=mr.role_id and r.tenant_id=e.tenant_id and r.status='active' and r.deleted_at is null
         where e.tenant_id=$1 and e.deleted_at is null
         group by e.id,m.id,u.id order by e.status='active' desc,e.employee_code`,
        [context.tenantId],
      ),
      this.pool.query(
        `select i.id,i.organization_id,i.email,i.employee_code,i.title,i.status,i.expires_at,i.version,i.role_id,i.store_id,
          r.code role_code, s.name store_name
         from membership_invitations i
         left join roles r on r.id=i.role_id and r.tenant_id=i.tenant_id
         left join stores s on s.id=i.store_id and s.tenant_id=i.tenant_id
         where i.tenant_id=$1 and i.status='pending' and i.deleted_at is null order by i.created_at desc`,
        [context.tenantId],
      ),
      this.pool.query(
        "select id,code,name from roles where tenant_id=$1 and status='active' and deleted_at is null order by code",
        [context.tenantId],
      ),
      this.pool.query(
        `select s.id,s.organization_id,s.merchant_id,s.code,s.name
         from stores s where s.tenant_id=$1 and s.deleted_at is null order by s.code`,
        [context.tenantId],
      ),
    ]);
    return {
      organizations: organizations.rows,
      merchants: merchants.rows,
      employees: employees.rows,
      invitations: invitations.rows,
      roles: roles.rows,
      stores: stores.rows,
    };
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
