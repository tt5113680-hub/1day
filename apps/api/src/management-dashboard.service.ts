import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

@Injectable()
export class ManagementDashboardService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async overview(context: OrganizationContext) {
    const [metrics, anomalies] = await Promise.all([
      this.pool.query(
        `select
          (select count(*)::int from customers where tenant_id=$1 and status='active' and deleted_at is null) customers,
          (select count(*)::int from customer_orders where tenant_id=$1 and status='active' and deleted_at is null and occurred_at>=now()-interval '30 days') orders_30d,
          (select count(*)::int from tasks where tenant_id=$1 and status='completed' and deleted_at is null and updated_at>=now()-interval '30 days') completed_tasks_30d,
          (select count(*)::int from tasks where tenant_id=$1 and status in ('open','overdue') and deleted_at is null) open_tasks,
          (select count(*)::int from tasks where tenant_id=$1 and status in ('open','overdue') and deleted_at is null and coalesce(due_at, created_at)::date = current_date) open_tasks_today,
          (select count(*)::int from tasks where tenant_id=$1 and status='completed' and deleted_at is null and updated_at::date = current_date) completed_tasks_today,
          (select count(*)::int from tasks where tenant_id=$1 and status='overdue' and deleted_at is null) overdue_tasks,
          (select count(*)::int from stores where tenant_id=$1 and deleted_at is null) stores,
          (select count(distinct assignee_employee_id)::int from tasks where tenant_id=$1 and status in ('open','overdue') and deleted_at is null and assignee_employee_id is not null) active_assignees,
          (select count(*)::int from customers where tenant_id=$1 and status='active' and deleted_at is null and created_at::date = current_date) customers_today`,
        [context.tenantId],
      ),
      this.pool.query(
        `select 'overdue_task' as type,t.id,t.title,t.updated_at as occurred_at,concat('/e/tasks/',t.id::text) as deep_link
         from tasks t where t.tenant_id=$1 and t.status='overdue' and t.deleted_at is null
         union all
         select 'ownership_approval',a.id,concat('客户归属待审批：',c.display_name),a.created_at,concat('/m/dashboard?focus=approvals')
         from customer_ownership_transfer_approvals a join customers c on c.id=a.customer_id and c.tenant_id=a.tenant_id
         where a.tenant_id=$1 and a.status='pending' and a.deleted_at is null
         order by occurred_at desc limit 12`,
        [context.tenantId],
      ),
    ]);
    const result = metrics.rows[0];
    const items = anomalies.rows.map((row) => ({
      type: row.type,
      id: row.id,
      title: row.title,
      occurredAt: row.occurred_at,
      deepLink: row.deep_link,
    }));
    const suggestions = [
      ...(items.filter((item) => item.type === 'overdue_task').length
        ? [
            {
              id: 'overdue-recovery',
              title: '优先处置已逾期任务',
              reason: `检测到 ${items.filter((item) => item.type === 'overdue_task').length} 项任务已逾期，先恢复客户行动节奏。`,
              deepLink: '/m/customers',
            },
          ]
        : []),
      ...(result.open_tasks > 0
        ? [
            {
              id: 'task-capacity',
              title: '检查待办承载',
              reason: `当前有 ${result.open_tasks} 项未完成任务，建议检查负责人和到期时间。`,
              deepLink: '/m/employee-process-performance',
            },
          ]
        : [
            {
              id: 'retention',
              title: '保持客户触达节奏',
              reason: '当前无未完成任务，可从客户跟进与内容投放建立下一轮行动。',
              deepLink: '/m/customers',
            },
          ]),
    ];
    return {
      metrics: {
        customers: result.customers,
        orders30d: result.orders_30d,
        completedTasks30d: result.completed_tasks_30d,
        openTasks: result.open_tasks,
        openTasksToday: result.open_tasks_today,
        completedTasksToday: result.completed_tasks_today,
        overdueTasks: result.overdue_tasks,
        stores: result.stores,
        activeAssignees: result.active_assignees,
        customersToday: result.customers_today,
      },
      anomalies: items,
      suggestions,
      generatedAt: new Date().toISOString(),
    };
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
