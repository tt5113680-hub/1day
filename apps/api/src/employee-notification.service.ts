import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const CATEGORIES = new Set(['task', 'anomaly', 'approval', 'system']);
const STATES = new Set(['all', 'unread', 'read']);
const safeLink = (value: unknown) => {
  const link = typeof value === 'string' ? value : '';
  return /^\/e\/(?:notifications|tasks\/[0-9a-f-]{36}|customers\/[0-9a-f-]{36})$/i.test(link)
    ? link
    : '/e/notifications';
};

@Injectable()
export class EmployeeNotificationService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async list(context: OrganizationContext, query: Record<string, unknown>) {
    const category = this.choice(query.category, CATEGORIES, true);
    const state = this.choice(query.state, STATES, true) ?? 'all';
    const employee = await this.employee(context);
    await this.materialize(context, employee.id);
    const rows = await this.pool.query(
      `select id,category,title,body,deep_link,sent_at,read_at,status,version
       from employee_notifications
       where tenant_id=$1 and employee_id=$2 and status='active' and deleted_at is null
         and ($3::text is null or category=$3)
         and ($4='all' or ($4='unread' and read_at is null) or ($4='read' and read_at is not null))
       order by sent_at desc,id desc`,
      [context.tenantId, employee.id, category, state],
    );
    const unread = await this.pool.query(
      "select count(*)::int as count from employee_notifications where tenant_id=$1 and employee_id=$2 and status='active' and deleted_at is null and read_at is null",
      [context.tenantId, employee.id],
    );
    return { items: rows.rows.map((row) => this.output(row)), unreadCount: unread.rows[0].count };
  }

  async markRead(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!UUID.test(id) || !Number.isInteger(body.version) || !key.trim() || key.length > 200)
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
      const result = await client.query(
        "select * from employee_notifications where id=$1 and tenant_id=$2 and employee_id=$3 and status='active' and deleted_at is null for update",
        [id, context.tenantId, employee.id],
      );
      if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
      const notification = result.rows[0];
      if (notification.version !== body.version) throw new ConflictException('CONFLICT');
      const updated = notification.read_at
        ? notification
        : (
            await client.query(
              'update employee_notifications set read_at=now(),version=version+1,updated_at=now(),updated_by=$1 where id=$2 returning *',
              [context.userId, id],
            )
          ).rows[0];
      const data = this.output(updated);
      await this.persist(client, context, id, requestId, data);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'employee_notification_read', key, data, context.userId],
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

  private choice(value: unknown, options: Set<string>, optional: boolean) {
    if (value === undefined || value === null || value === '') return optional ? null : '';
    if (typeof value !== 'string' || !options.has(value))
      throw new BadRequestException('VALIDATION_ERROR');
    return value;
  }

  private async materialize(context: OrganizationContext, employeeId: string) {
    await this.pool.query(
      `insert into employee_notifications(id,tenant_id,employee_id,category,source_type,source_id,title,body,deep_link,sent_at,created_by,updated_by)
       select gen_random_uuid(),l.tenant_id,l.employee_id,
              case when l.notification_type='overdue_escalation' then 'anomaly' else 'task' end,
              'task_notification_log',l.id,
              case when l.notification_type='overdue_escalation' then '任务已逾期，需要处理' else '任务提醒' end,
              t.title,concat('/e/tasks/',t.id::text),l.sent_at,null,null
       from notification_logs l join tasks t on t.id=l.task_id and t.tenant_id=l.tenant_id and t.deleted_at is null
       where l.tenant_id=$1 and l.employee_id=$2 and l.status='sent' and l.deleted_at is null
       on conflict (tenant_id,employee_id,source_type,source_id) do nothing`,
      [context.tenantId, employeeId],
    );
    await this.pool.query(
      `insert into employee_notifications(id,tenant_id,employee_id,category,source_type,source_id,title,body,deep_link,sent_at,created_by,updated_by)
       select gen_random_uuid(),a.tenant_id,a.to_employee_id,'approval','ownership_transfer_approval',a.id,
              '客户归属待确认',concat(c.display_name,'：',a.reason),concat('/e/customers/',a.customer_id::text),a.created_at,null,null
       from customer_ownership_transfer_approvals a join customers c on c.id=a.customer_id and c.tenant_id=a.tenant_id and c.deleted_at is null
       where a.tenant_id=$1 and a.to_employee_id=$2 and a.status='pending' and a.deleted_at is null
       on conflict (tenant_id,employee_id,source_type,source_id) do nothing`,
      [context.tenantId, employeeId],
    );
  }

  private output(row: Record<string, unknown>) {
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      body: row.body,
      deepLink: safeLink(row.deep_link),
      sentAt: row.sent_at,
      readAt: row.read_at,
      status: row.status,
      version: row.version,
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

  private async replay(client: PoolClient, tenantId: string, key: string) {
    const result = await client.query(
      "select response from idempotency_keys where tenant_id=$1 and resource_type='employee_notification_read' and idempotency_key=$2 and deleted_at is null",
      [tenantId, key],
    );
    return result.rowCount ? result.rows[0].response : null;
  }

  private async persist(
    client: PoolClient,
    context: OrganizationContext,
    id: string,
    requestId: string,
    data: unknown,
  ) {
    const correlation = UUID.test(requestId) ? requestId : randomUUID();
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'employee.notification_read','employee_notification',$4,$5,'page-e-008',$6,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, id, correlation, data],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'employee.notification_read.v1','employee_notification',$3,$4,$5,'page-e-008',$6,$6)",
      [randomUUID(), context.tenantId, id, data, correlation, context.userId],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
