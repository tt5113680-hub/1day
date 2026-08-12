import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';
import { PortalLayoutService } from './portal-layout.service';

@Injectable()
export class ManagementDashboardService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  constructor(private readonly portalLayout: PortalLayoutService) {}

  async overview(context: OrganizationContext, previewToken?: string) {
    const [metrics, anomalies, operational, storeRows, recentConsults, openLeadRows, dispositions] =
      await Promise.all([
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
         select 'ownership_approval',a.id,concat('客户归属待审批：',c.display_name),a.created_at,concat('/m/customers/',c.id::text)
         from customer_ownership_transfer_approvals a join customers c on c.id=a.customer_id and c.tenant_id=a.tenant_id
         where a.tenant_id=$1 and a.status='pending' and a.deleted_at is null
         order by occurred_at desc limit 12`,
          [context.tenantId],
        ),
        this.pool.query(
          `select
          (select count(*)::int from consumer_action_events where tenant_id=$1 and deleted_at is null and created_at::date=current_date)
          + (select count(*)::int from consumer_action_redirect_events where tenant_id=$1 and deleted_at is null and created_at::date=current_date) as consults_today,
          (select count(*)::int from employee_lead_pool_entries where tenant_id=$1 and deleted_at is null and status in ('open','claimed')) as open_leads,
          (select count(*)::int from employee_lead_pool_entries where tenant_id=$1 and deleted_at is null and created_at::date=current_date) as leads_today,
          (select count(*)::int from membership_enrollments where tenant_id=$1 and deleted_at is null and created_at::date=current_date) as enrollments_today,
          (select count(*)::int from member_benefit_ledger where tenant_id=$1 and deleted_at is null and entry_type='redeem' and created_at::date=current_date) as redemptions_today,
          (select count(*)::int from entry_funnel_events where tenant_id=$1 and occurred_at::date=current_date and event_code in ('visit','view','consult_click')) as entry_visits_today,
          (select count(*)::int from workflow_instances where tenant_id=$1 and deleted_at is null and status='active') as active_workflows`,
          [context.tenantId],
        ),
        this.pool.query(
          `select s.id,s.name,
          (select count(*)::int from consumer_action_events e where e.tenant_id=s.tenant_id and e.store_id=s.id and e.deleted_at is null and e.created_at>=now()-interval '30 days') entry_opens_30d,
          (select count(*)::int from tasks t where t.tenant_id=s.tenant_id and t.deleted_at is null and t.status in ('open','overdue')
            and exists(select 1 from customers c where c.id=t.customer_id and c.tenant_id=t.tenant_id and c.deleted_at is null)) open_tasks
         from stores s
         where s.tenant_id=$1 and s.deleted_at is null
         order by entry_opens_30d desc, open_tasks desc, s.name asc
         limit 6`,
          [context.tenantId],
        ),
        this.pool.query(
          `select 'consult' as type, e.id, coalesce(ea.name, '消费者入口动作') as title, e.created_at as occurred_at,
                concat('/m/entry-funnel') as deep_link
         from consumer_action_events e
         left join external_actions ea on ea.id=e.external_action_id and ea.tenant_id=e.tenant_id
         where e.tenant_id=$1 and e.deleted_at is null
         order by e.created_at desc limit 6`,
          [context.tenantId],
        ),
        this.pool.query(
          `select l.id, c.display_name, l.status, l.created_at,
                concat('/e/leads') as deep_link
         from employee_lead_pool_entries l
         join customers c on c.id=l.customer_id and c.tenant_id=l.tenant_id and c.deleted_at is null
         where l.tenant_id=$1 and l.deleted_at is null and l.status in ('open','claimed')
         order by l.created_at desc limit 6`,
          [context.tenantId],
        ),
        this.pool.query(
          `select queue_type, source_id, status, disposition_at
           from management_queue_dispositions
           where tenant_id=$1 and deleted_at is null`,
          [context.tenantId],
        ),
      ]);
    const result = metrics.rows[0];
    const op = operational.rows[0];
    const doneToday = Number(result.completed_tasks_today ?? 0);
    const openToday = Number(result.open_tasks_today ?? 0);
    const taskCompletionRateToday =
      doneToday + openToday > 0 ? Math.round((doneToday / (doneToday + openToday)) * 100) : null;
    const items = anomalies.rows.map((row) => ({
      type: row.type,
      id: row.id,
      title: row.title,
      occurredAt: row.occurred_at,
      deepLink: row.deep_link,
    }));
    const dispositionByKey = new Map<string, string>();
    const dispositionAtByKey = new Map<string, string>();
    for (const row of dispositions.rows) {
      dispositionByKey.set(`${row.queue_type}:${row.source_id}`, row.status);
      dispositionAtByKey.set(`${row.queue_type}:${row.source_id}`, row.disposition_at);
    }
    const withDisposition = (type: string, id: string) => {
      const key = `${type}:${id}`;
      return {
        disposition: dispositionByKey.get(key) ?? 'pending',
        dispositionAt: dispositionAtByKey.get(key) ?? null,
      };
    };
    const anomaliesWithDisposition = items.map((item) => ({
      ...item,
      ...withDisposition(item.type, item.id),
    }));
    const consults = recentConsults.rows.map((row) => ({
      id: row.id,
      title: row.title,
      occurredAt: row.occurred_at,
      deepLink: row.deep_link,
      ...withDisposition('consult', row.id),
    }));
    const leads = openLeadRows.rows.map((row) => ({
      id: row.id,
      title: row.display_name,
      status: row.status,
      occurredAt: row.created_at,
      deepLink: row.deep_link,
      ...withDisposition('lead', row.id),
    }));
    const dispositionSummary = this.dispositionSummary(
      Object.fromEntries(dispositionByKey),
      anomaliesWithDisposition,
      consults,
      leads,
    );
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
        consultsToday: op.consults_today,
        openLeads: op.open_leads,
        leadsToday: op.leads_today,
        enrollmentsToday: op.enrollments_today,
        redemptionsToday: op.redemptions_today,
        entryVisitsToday: op.entry_visits_today,
        activeWorkflows: op.active_workflows,
        taskCompletionRateToday,
      },
      storeBreakdown: storeRows.rows.map((row) => ({
        id: row.id,
        name: row.name,
        entryOpens30d: row.entry_opens_30d,
        openTasks: row.open_tasks,
      })),
      queues: {
        consults,
        leads,
      },
      anomalies: anomaliesWithDisposition,
      disposition: dispositionSummary,
      suggestions,
      generatedAt: new Date().toISOString(),
      layout: await this.portalLayout.resolve(context.tenantId, 'management', previewToken),
    };
  }
  private dispositionSummary(
    byKey: Record<string, string>,
    anomalies: { type: string; id: string }[],
    consults: { id: string }[],
    leads: { id: string }[],
  ) {
    const actionable = [
      ...anomalies.map((item) => item.type + ':' + item.id),
      ...consults.map((item) => 'consult:' + item.id),
      ...leads.map((item) => 'lead:' + item.id),
    ];
    const unique = [...new Set(actionable)];
    const pending = unique.filter(
      (key) => byKey[key] !== 'handled' && byKey[key] !== 'ignored',
    ).length;
    const handled = unique.filter((key) => byKey[key] === 'handled').length;
    const ignored = unique.filter((key) => byKey[key] === 'ignored').length;
    const rate = unique.length ? Math.round((handled / unique.length) * 100) : 100;
    return { total: unique.length, pending, handled, ignored, handledRate: rate };
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
