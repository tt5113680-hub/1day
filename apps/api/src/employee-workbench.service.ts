import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';
import { PortalLayoutService } from './portal-layout.service';

const UUID = /^[0-9a-f-]{36}$/i;
const trace = 'page-e-001';
const QUEUE_TYPES = new Set(['open_task', 'overdue_task', 'lead', 'share_code']);
const ACTIONS = new Set(['handled', 'ignored']);
const safeLink = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/') && value.length <= 320 ? value : '';

@Injectable()
export class EmployeeWorkbenchService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  constructor(private readonly portalLayout: PortalLayoutService) {}

  async overview(context: OrganizationContext, previewToken?: string) {
    const employee = await this.employee(context);
    const [result, statsRow, leadRows, shareRows, dispositionRows] = await Promise.all([
      this.pool.query(
        `select t.id,t.title,t.due_at,t.status,t.escalation_level,t.version,
              c.id as customer_id,c.display_name as customer_name
       from tasks t
       left join customers c on c.id=t.customer_id and c.tenant_id=t.tenant_id and c.deleted_at is null
       where t.tenant_id=$1 and t.assignee_employee_id=$2 and t.deleted_at is null
         and t.status in ('open','overdue')
       order by case when t.status='overdue' then 0 else 1 end,t.due_at asc`,
        [context.tenantId, employee.id],
      ),
      this.pool.query(
        `select
          (select count(*)::int from tasks where tenant_id=$1 and assignee_employee_id=$2 and deleted_at is null and status in ('open','overdue')) as all_open_tasks,
          (select count(*)::int from tasks where tenant_id=$1 and assignee_employee_id=$2 and deleted_at is null and status='overdue') as overdue_tasks,
          (select count(*)::int from employee_lead_pool_entries where tenant_id=$1 and assignee_employee_id=$2 and deleted_at is null and status='claimed') as claimed_leads,
          (select count(*)::int from employee_lead_pool_entries where tenant_id=$1 and deleted_at is null and status='open') as pool_leads,
          (select count(*)::int from employee_share_codes where tenant_id=$1 and employee_id=$2 and deleted_at is null and status='active') as active_share_codes,
          (select count(*)::int from employee_share_code_events e
             join employee_share_codes s on s.id=e.share_code_id and s.tenant_id=e.tenant_id
             where s.tenant_id=$1 and s.employee_id=$2 and e.deleted_at is null and e.event_type='opened' and e.created_at::date=current_date) as share_opens_today,
          (select count(*)::int from member_benefit_ledger l
             where l.tenant_id=$1 and l.deleted_at is null and l.entry_type='redeem' and l.created_at::date=current_date
               and l.created_by=$3) as redemptions_today`,
        [context.tenantId, employee.id, context.userId],
      ),
      this.pool.query(
        `select l.id, c.display_name, l.status, l.created_at
         from employee_lead_pool_entries l
         join customers c on c.id=l.customer_id and c.tenant_id=l.tenant_id and c.deleted_at is null
         where l.tenant_id=$1 and l.deleted_at is null and (l.status='open' or l.assignee_employee_id=$2)
         order by l.created_at desc limit 6`,
        [context.tenantId, employee.id],
      ),
      this.pool.query(
        `select s.id, s.code, s.scenario, s.expires_at, s.status
         from employee_share_codes s
         where s.tenant_id=$1 and s.employee_id=$2 and s.deleted_at is null and s.status='active'
         order by s.created_at desc limit 6`,
        [context.tenantId, employee.id],
      ),
      this.pool.query(
        `select queue_type, source_id, status, disposition_at
         from employee_queue_dispositions
         where tenant_id=$1 and employee_id=$2 and deleted_at is null`,
        [context.tenantId, employee.id],
      ),
    ]);
    const tasks = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      dueAt: row.due_at,
      status: row.status,
      escalationLevel: row.escalation_level,
      version: row.version,
      customer: row.customer_id ? { id: row.customer_id, displayName: row.customer_name } : null,
    }));
    const dispositionByKey = new Map<string, string>();
    const dispositionAtByKey = new Map<string, string>();
    for (const row of dispositionRows.rows) {
      const key = `${row.queue_type}:${row.source_id}`;
      dispositionByKey.set(key, row.status);
      dispositionAtByKey.set(key, row.disposition_at);
    }
    const withDisposition = (type: string, id: string) => {
      const key = `${type}:${id}`;
      return {
        disposition: dispositionByKey.get(key) ?? 'pending',
        dispositionAt: dispositionAtByKey.get(key) ?? null,
      };
    };
    const tasksWithDisposition = tasks.map((task) => ({
      ...task,
      queueType: task.status === 'overdue' ? 'overdue_task' : 'open_task',
      ...withDisposition(task.status === 'overdue' ? 'overdue_task' : 'open_task', task.id),
    }));
    const today = tasksWithDisposition.filter((task) => this.isToday(task.dueAt));
    const customerReminders = tasksWithDisposition
      .filter((task) => task.customer !== null)
      .slice(0, 5);
    const leads = leadRows.rows.map((row) => ({
      id: row.id,
      title: row.display_name,
      status: row.status,
      occurredAt: row.created_at,
      deepLink: '/e/leads',
      ...withDisposition('lead', row.id),
    }));
    const shareCodes = shareRows.rows.map((row) => ({
      id: row.id,
      title: row.code,
      scenario: row.scenario,
      expiresAt: row.expires_at,
      deepLink: '/e/share',
      ...withDisposition('share_code', row.id),
    }));
    const disposition = this.dispositionSummary(dispositionByKey, today, leads, shareCodes);
    return {
      employee: { id: employee.id, displayName: employee.display_name, title: employee.title },
      tasks: today,
      customerReminders,
      opportunities: tasksWithDisposition.slice(0, 3).map((task) => ({
        taskId: task.id,
        title: task.status === 'overdue' ? `优先处理：${task.title}` : `建议推进：${task.title}`,
        reason:
          task.status === 'overdue'
            ? '来源：任务已逾期，需要优先处理并留痕。'
            : '来源：今日待办时限信号，建议在到期前完成客户动作。',
        source: 'task_due_signal',
      })),
      stats: {
        allOpenTasks: statsRow.rows[0].all_open_tasks,
        overdueTasks: statsRow.rows[0].overdue_tasks,
        claimedLeads: statsRow.rows[0].claimed_leads,
        poolLeads: statsRow.rows[0].pool_leads,
        activeShareCodes: statsRow.rows[0].active_share_codes,
        shareOpensToday: statsRow.rows[0].share_opens_today,
        redemptionsToday: statsRow.rows[0].redemptions_today,
      },
      queues: { leads, shareCodes },
      disposition,
      generatedAt: new Date().toISOString(),
      layout: await this.portalLayout.resolve(context.tenantId, 'employee', previewToken),
    };
  }

  async completeOwn(
    context: OrganizationContext,
    taskId: string,
    input: Record<string, unknown>,
    requestId: string,
  ) {
    if (!UUID.test(taskId) || !Number.isInteger(input.version))
      throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const updated = await client.query(
        `update tasks set status='completed',version=version+1,updated_by=$1,updated_at=now()
         where id=$2 and tenant_id=$3 and assignee_employee_id=$4 and status in ('open','overdue') and version=$5
         returning id,status,version`,
        [context.userId, taskId, context.tenantId, employee.id, input.version],
      );
      if (!updated.rowCount) {
        const exists = await client.query(
          'select id from tasks where id=$1 and tenant_id=$2 and assignee_employee_id=$3 and deleted_at is null',
          [taskId, context.tenantId, employee.id],
        );
        if (!exists.rowCount) throw new NotFoundException('NOT_FOUND');
        throw new ConflictException('CONFLICT');
      }
      await client.query(
        "update task_reminders set status='cancelled',updated_at=now(),updated_by=$1 where task_id=$2 and tenant_id=$3 and status='pending'",
        [context.userId, taskId, context.tenantId],
      );
      const data = updated.rows[0];
      const correlationId = UUID.test(requestId) ? requestId : randomUUID();
      await this.audit(client, context, taskId, correlationId, data);
      await this.event(client, context, taskId, correlationId, data);
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async employee(context: OrganizationContext) {
    const result = await this.pool.query(
      `select e.id,e.title,u.display_name
       from employees e join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id
       join users u on u.id=m.user_id
       where e.tenant_id=$1 and m.user_id=$2 and e.status='active' and m.status='active'
         and e.deleted_at is null and m.deleted_at is null`,
      [context.tenantId, context.userId],
    );
    if (!result.rowCount) throw new ForbiddenException('FORBIDDEN');
    return result.rows[0];
  }

  private isToday(value: string) {
    const now = new Date();
    const due = new Date(value);
    return (
      due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate()
    );
  }

  private async audit(
    client: PoolClient,
    context: OrganizationContext,
    taskId: string,
    correlationId: string,
    details: unknown,
  ) {
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'employee.workbench_task_completed','task',$4,$5,$6,$7,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, taskId, correlationId, trace, details],
    );
  }

  private async event(
    client: PoolClient,
    context: OrganizationContext,
    taskId: string,
    correlationId: string,
    payload: unknown,
  ) {
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'employee.workbench.task_completed.v1','task',$3,$4,$5,$6,$7,$7)",
      [randomUUID(), context.tenantId, taskId, { payload }, correlationId, trace, context.userId],
    );
  }

  private dispositionSummary(
    byKey: Map<string, string>,
    tasks: { queueType: string; id: string }[],
    leads: { id: string }[],
    shareCodes: { id: string }[],
  ) {
    const actionable = [
      ...tasks.map((task) => task.queueType + ':' + task.id),
      ...leads.map((item) => 'lead:' + item.id),
      ...shareCodes.map((item) => 'share_code:' + item.id),
    ];
    return this.reduceDisposition(byKey, actionable);
  }

  private reduceDisposition(byKey: Map<string, string>, keys: string[]) {
    const unique = [...new Set(keys)];
    let pending = 0;
    let handled = 0;
    let ignored = 0;
    for (const key of unique) {
      const status = byKey.get(key);
      if (status === 'handled') handled += 1;
      else if (status === 'ignored') ignored += 1;
      else pending += 1;
    }
    const handledRate = unique.length ? Math.round((handled / unique.length) * 100) : 100;
    return { total: unique.length, pending, handled, ignored, handledRate };
  }

  async dispose(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    const queueType = typeof body.queueType === 'string' ? body.queueType : '';
    const sourceId = typeof body.sourceId === 'string' ? body.sourceId : '';
    const action = typeof body.action === 'string' ? body.action : '';
    const deepLink = safeLink(body.deepLink);
    const title = typeof body.title === 'string' ? body.title.slice(0, 320) : '';
    if (!QUEUE_TYPES.has(queueType) || !UUID.test(sourceId) || !ACTIONS.has(action) || !key.trim())
      throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await this.replay(client, context.tenantId, key);
      if (replay) {
        await client.query('commit');
        return replay;
      }
      const existing = await client.query(
        `select * from employee_queue_dispositions
         where tenant_id=$1 and employee_id=$2 and queue_type=$3 and source_id=$4 and deleted_at is null for update`,
        [context.tenantId, employee.id, queueType, sourceId],
      );
      const row =
        existing.rowCount && existing.rows[0].status === action
          ? existing.rows[0]
          : (
              await client.query(
                `insert into employee_queue_dispositions
                   (id,tenant_id,employee_id,queue_type,source_id,status,deep_link,title,disposition_at,disposed_by,created_by,updated_by)
                 values($1,$2,$3,$4,$5,$6,$7,$8,now(),$9,$9,$9)
                 on conflict (tenant_id,employee_id,queue_type,source_id) do update
                   set status=excluded.status,deep_link=excluded.deep_link,title=excluded.title,
                       disposition_at=now(),disposed_by=excluded.disposed_by,
                       updated_at=now(),updated_by=excluded.updated_by,version=employee_queue_dispositions.version+1
                 returning *`,
                [
                  randomUUID(),
                  context.tenantId,
                  employee.id,
                  queueType,
                  sourceId,
                  action,
                  deepLink,
                  title,
                  context.userId,
                ],
              )
            ).rows[0];
      const data = this.disposeOutput(row);
      const correlationId = UUID.test(requestId) ? requestId : randomUUID();
      await this.persistDisposition(
        client,
        context,
        queueType,
        sourceId,
        key,
        correlationId,
        data,
        action,
        title,
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'employee_queue_disposition', key, data, context.userId],
      );
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private disposeOutput(row: Record<string, unknown>) {
    return {
      queueType: row.queue_type,
      sourceId: row.source_id,
      status: row.status,
      deepLink: row.deep_link,
      title: row.title,
      dispositionAt: row.disposition_at,
      version: row.version,
    };
  }

  private async replay(client: PoolClient, tenantId: string, key: string) {
    const result = await client.query(
      "select response from idempotency_keys where tenant_id=$1 and resource_type='employee_queue_disposition' and idempotency_key=$2 and deleted_at is null",
      [tenantId, key],
    );
    return result.rowCount ? result.rows[0].response : null;
  }

  private async persistDisposition(
    client: PoolClient,
    context: OrganizationContext,
    queueType: string,
    sourceId: string,
    key: string,
    correlationId: string,
    data: Record<string, unknown>,
    action: string,
    title: string,
  ) {
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'employee.queue_disposition','employee_queue_disposition',$4,$5,$6,$7,$3,$3)",
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        sourceId,
        correlationId,
        trace,
        { ...data, action, title },
      ],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'employee.queue_disposition.v1','employee_queue_disposition',$3,$4,$5,$6,$7,$7)",
      [
        randomUUID(),
        context.tenantId,
        sourceId,
        { ...data, action, title },
        correlationId,
        trace,
        context.userId,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
