import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;

@Injectable()
export class EmployeeCustomerDetailService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext, limit = 50) {
    const employee = await this.employee(context);
    const result = await this.pool.query(
      `select c.id,c.display_name,c.status,c.created_at,
              exists(
                select 1 from customer_ownerships o
                where o.tenant_id=c.tenant_id and o.customer_id=c.id and o.employee_id=$2
                  and o.status='active' and o.deleted_at is null
              ) as owned,
              (
                select count(*)::int from tasks t
                where t.tenant_id=c.tenant_id and t.customer_id=c.id and t.assignee_employee_id=$2
                  and t.status in ('open','overdue') and t.deleted_at is null
              ) as open_tasks
       from customers c
       where c.tenant_id=$1 and c.status='active' and c.deleted_at is null and (
         exists(select 1 from customer_ownerships o where o.tenant_id=c.tenant_id and o.customer_id=c.id and o.employee_id=$2 and o.status='active' and o.deleted_at is null)
         or exists(select 1 from tasks t where t.tenant_id=c.tenant_id and t.customer_id=c.id and t.assignee_employee_id=$2 and t.deleted_at is null)
         or exists(select 1 from customer_contributions r where r.tenant_id=c.tenant_id and r.customer_id=c.id and r.employee_id=$2 and r.status='active' and r.deleted_at is null)
       )
       order by c.updated_at desc nulls last, c.created_at desc
       limit $3`,
      [context.tenantId, employee.id, limit],
    );
    return {
      customers: result.rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        status: row.status,
        createdAt: row.created_at,
        owned: Boolean(row.owned),
        openTasks: Number(row.open_tasks) || 0,
      })),
    };
  }

  async detail(context: OrganizationContext, customerId: string) {
    if (!UUID.test(customerId)) throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const customer = await this.customer(context.tenantId, employee.id, customerId);
    const [identities, tags, sources, ownerships, tasks, events, rfm, followUps] =
      await Promise.all([
      this.pool.query(
        "select identity_type,masked_value,status from customer_identities where tenant_id=$1 and customer_id=$2 and status='active' and deleted_at is null order by created_at",
        [context.tenantId, customerId],
      ),
      this.pool.query(
        'select id,label,created_at from customer_tags where tenant_id=$1 and customer_id=$2 and deleted_at is null order by label',
        [context.tenantId, customerId],
      ),
      this.pool.query(
        "select source_role,source_type,created_at from customer_sources where tenant_id=$1 and customer_id=$2 and status='active' and deleted_at is null order by created_at",
        [context.tenantId, customerId],
      ),
      this.pool.query(
        "select employee_id,ownership_role,status,created_at from customer_ownerships where tenant_id=$1 and customer_id=$2 and status='active' and deleted_at is null order by created_at",
        [context.tenantId, customerId],
      ),
      this.pool.query(
        'select id,title,due_at,status,escalation_level,created_at from tasks where tenant_id=$1 and customer_id=$2 and assignee_employee_id=$3 and deleted_at is null order by due_at desc limit 12',
        [context.tenantId, customerId, employee.id],
      ),
      this.pool.query(
        "select action,created_at from audit_logs where tenant_id=$1 and resource_type='customer' and resource_id=$2 and deleted_at is null order by created_at desc limit 12",
        [context.tenantId, customerId],
      ),
      this.pool.query(
        'select recency_days,frequency_count,reach_count,layer,window_days,computed_at from customer_rfm_profiles where tenant_id=$1 and customer_id=$2 and deleted_at is null limit 1',
        [context.tenantId, customerId],
      ),
      this.pool.query(
        `select f.created_at,f.raw_note,f.summary
           from task_follow_ups f
           join tasks tk on tk.id=f.task_id
          where tk.tenant_id=$1 and tk.customer_id=$2 and tk.assignee_employee_id=$3
            and f.deleted_at is null
          order by f.created_at desc
          limit 20`,
        [context.tenantId, customerId, employee.id],
      ),
    ]);
    return {
      customer: {
        id: customer.id,
        displayName: customer.display_name,
        status: customer.status,
        createdAt: customer.created_at,
        identities: identities.rows.map((item) => ({
          type: item.identity_type,
          maskedValue: item.masked_value,
          status: item.status,
        })),
      },
      sources: sources.rows,
      ownerships: ownerships.rows.map((item) => ({
        ownershipRole: item.ownership_role,
        isCurrentEmployee: item.employee_id === employee.id,
        createdAt: item.created_at,
      })),
      tags: tags.rows,
      tasks: tasks.rows.map((item) => ({
        id: item.id,
        title: item.title,
        dueAt: item.due_at,
        status: item.status,
        escalationLevel: item.escalation_level,
        createdAt: item.created_at,
      })),
      rfm:
        rfm.rows[0] === undefined
          ? null
          : {
              recencyDays: rfm.rows[0].recency_days,
              frequencyCount: rfm.rows[0].frequency_count,
              reachCount: rfm.rows[0].reach_count,
              layer: rfm.rows[0].layer,
              windowDays: rfm.rows[0].window_days,
              computedAt: rfm.rows[0].computed_at,
            },
      followUps: followUps.rows.map((item) => ({
        followedAt: item.created_at,
        summary: item.summary,
        hasNote: Boolean(item.raw_note),
      })),
      timeline: [
        ...events.rows.map((item) => ({
          kind: 'customer',
          action: item.action,
          at: item.created_at,
        })),
        ...tasks.rows.map((item) => ({
          kind: 'task',
          action: item.status,
          taskId: item.id,
          title: item.title,
          at: item.created_at,
        })),
      ]
        .sort((a, b) => String(b.at).localeCompare(String(a.at)))
        .slice(0, 16),
    };
  }

  private async employee(context: OrganizationContext) {
    const result = await this.pool.query(
      "select e.id from employees e join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id where e.tenant_id=$1 and m.user_id=$2 and e.status='active' and m.status='active' and e.deleted_at is null and m.deleted_at is null",
      [context.tenantId, context.userId],
    );
    if (!result.rowCount) throw new ForbiddenException('FORBIDDEN');
    return result.rows[0];
  }

  private async customer(tenantId: string, employeeId: string, customerId: string) {
    const result = await this.pool.query(
      `select c.id,c.display_name,c.status,c.created_at from customers c
       where c.id=$1 and c.tenant_id=$2 and c.status='active' and c.deleted_at is null and (
         exists(select 1 from customer_ownerships o where o.tenant_id=c.tenant_id and o.customer_id=c.id and o.employee_id=$3 and o.status='active' and o.deleted_at is null)
         or exists(select 1 from tasks t where t.tenant_id=c.tenant_id and t.customer_id=c.id and t.assignee_employee_id=$3 and t.deleted_at is null)
         or exists(select 1 from customer_contributions r where r.tenant_id=c.tenant_id and r.customer_id=c.id and r.employee_id=$3 and r.status='active' and r.deleted_at is null)
       )`,
      [customerId, tenantId, employeeId],
    );
    if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
    return result.rows[0];
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
