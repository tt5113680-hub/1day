import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { OrganizationContext } from './organization.service';

@Injectable()
export class ManagementDashboardService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  async overview(context: OrganizationContext) {
    const [metrics, anomalies] = await Promise.all([
      this.pool.query(
        `select
          (select count(*)::int from customers where tenant_id=$1 and status='active' and deleted_at is null) customers,
          (select count(*)::int from customer_orders where tenant_id=$1 and status='active' and deleted_at is null and occurred_at>=now()-interval '30 days') orders_30d,
          (select count(*)::int from tasks where tenant_id=$1 and status='completed' and deleted_at is null and updated_at>=now()-interval '30 days') completed_tasks_30d,
          (select count(*)::int from tasks where tenant_id=$1 and status in ('open','overdue') and deleted_at is null) open_tasks`,
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
              deepLink: '/m/dashboard?focus=overdue',
            },
          ]
        : []),
      ...(result.open_tasks > 0
        ? [
            {
              id: 'task-capacity',
              title: '检查待办承载',
              reason: `当前有 ${result.open_tasks} 项未完成任务，建议检查负责人和到期时间。`,
              deepLink: '/m/dashboard?focus=tasks',
            },
          ]
        : [
            {
              id: 'retention',
              title: '保持客户触达节奏',
              reason: '当前无未完成任务，可从养客和获客池建立下一轮行动。',
              deepLink: '/e/nurture',
            },
          ]),
    ];
    return {
      metrics: {
        customers: result.customers,
        orders30d: result.orders_30d,
        completedTasks30d: result.completed_tasks_30d,
        openTasks: result.open_tasks,
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
