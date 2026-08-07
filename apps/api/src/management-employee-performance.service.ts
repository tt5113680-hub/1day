import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { OrganizationContext } from './organization.service';

@Injectable()
export class ManagementEmployeePerformanceService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async overview(context: OrganizationContext) {
    const result = await this.pool.query(
      `select e.id,e.employee_code,e.title,u.display_name,
        coalesce(tasks.open_count,0)::int open_tasks,coalesce(tasks.completed_count,0)::int completed_tasks,
        coalesce(tasks.overdue_count,0)::int overdue_tasks,coalesce(followups.count,0)::int follow_ups,
        coalesce(evidence.count,0)::int evidence_links,coalesce(conversions.count,0)::int contribution_orders
       from employees e
       join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id and m.status='active'
       join users u on u.id=m.user_id and u.status='active'
       left join lateral (select count(*) filter(where status in ('open','overdue')) open_count,count(*) filter(where status='completed') completed_count,count(*) filter(where status='overdue') overdue_count from tasks where tenant_id=e.tenant_id and assignee_employee_id=e.id and deleted_at is null) tasks on true
       left join lateral (select count(*) from task_follow_ups where tenant_id=e.tenant_id and employee_id=e.id and deleted_at is null) followups on true
       left join lateral (select count(*) from task_evidence_links l join tasks t on t.id=l.task_id and t.tenant_id=l.tenant_id where l.tenant_id=e.tenant_id and t.assignee_employee_id=e.id and l.deleted_at is null and t.deleted_at is null) evidence on true
       left join lateral (select count(distinct o.id) from customer_contributions c join customer_orders o on o.customer_id=c.customer_id and o.tenant_id=c.tenant_id and o.status='active' and o.deleted_at is null where c.tenant_id=e.tenant_id and c.employee_id=e.id and c.confirmed=true and c.status='active' and c.deleted_at is null) conversions on true
       where e.tenant_id=$1 and e.status='active' and e.deleted_at is null
       order by tasks.overdue_count desc,u.display_name`,
      [context.tenantId],
    );
    const employees = result.rows.map((row) => ({
      id: row.id,
      name: row.display_name,
      employeeCode: row.employee_code,
      title: row.title,
      openTasks: row.open_tasks,
      completedTasks: row.completed_tasks,
      overdueTasks: row.overdue_tasks,
      followUps: row.follow_ups,
      evidenceLinks: row.evidence_links,
      contributionOrders: row.contribution_orders,
      coaching:
        row.overdue_tasks > 0
          ? '优先复盘逾期任务与下一步跟进。'
          : row.open_tasks > 0 && row.follow_ups === 0
            ? '有待办但尚无跟进记录，建议确认客户触达计划。'
            : '过程记录完整度正常，可结合现场观察辅导。',
    }));
    return { employees, generatedAt: new Date().toISOString() };
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
