import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import type { OrganizationContext } from './organization.service';
const UUID = /^[0-9a-f-]{36}$/i;
const text = (v: unknown, n: number) => {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > n)
    throw new BadRequestException('VALIDATION_ERROR');
  return v.trim();
};
const version = (v: unknown) => {
  if (typeof v !== 'number' || !Number.isInteger(v))
    throw new BadRequestException('VALIDATION_ERROR');
  return v;
};
const optionalDate = (v: unknown) => {
  if (v === undefined || v === null || v === '') return null;
  const value = text(v, 40);
  if (Number.isNaN(Date.parse(value))) throw new BadRequestException('VALIDATION_ERROR');
  return value;
};
const correlation = (requestId: string) => (UUID.test(requestId) ? requestId : randomUUID());
@Injectable()
export class TaskService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  async list(c: OrganizationContext) {
    return (
      await this.pool.query(
        'select id,customer_id,assignee_employee_id,title,due_at,status,escalation_level,version from tasks where tenant_id=$1 and deleted_at is null order by due_at',
        [c.tenantId],
      )
    ).rows;
  }
  async create(c: OrganizationContext, b: Record<string, unknown>, k: string, r: string) {
    if (!k.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const employeeId = text(b.assigneeEmployeeId, 36),
      title = text(b.title, 160),
      reason = b.reason === undefined ? null : text(b.reason, 1000),
      dueAt = text(b.dueAt, 40),
      remindAt = optionalDate(b.remindAt),
      customerId = b.customerId === undefined ? null : text(b.customerId, 36);
    if (!UUID.test(employeeId) || Number.isNaN(Date.parse(dueAt)))
      throw new BadRequestException('VALIDATION_ERROR');
    if (customerId !== null && !UUID.test(customerId))
      throw new BadRequestException('VALIDATION_ERROR');
    if (remindAt !== null && Date.parse(remindAt) > Date.parse(dueAt))
      throw new BadRequestException('VALIDATION_ERROR');
    return this.idempotent(c, 'task', k, async (q) => {
      const emp = await q.query(
        "select id from employees where id=$1 and tenant_id=$2 and status='active'",
        [employeeId, c.tenantId],
      );
      if (!emp.rowCount) throw new NotFoundException('NOT_FOUND');
      if (customerId !== null) {
        const customer = await q.query(
          "select id from customers where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
          [customerId, c.tenantId],
        );
        if (!customer.rowCount) throw new NotFoundException('NOT_FOUND');
      }
      const id = randomUUID(),
        row = (
          await q.query(
            'insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8) returning id,customer_id,assignee_employee_id,title,reason,due_at,status,escalation_level,version',
            [id, c.tenantId, customerId, employeeId, title, reason, dueAt, c.userId],
          )
        ).rows[0];
      if (remindAt !== null)
        await q.query(
          'insert into task_reminders(id,tenant_id,task_id,remind_at,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
          [randomUUID(), c.tenantId, id, remindAt, c.userId],
        );
      await this.audit(q, c, 'task.created', id, r, { ...row, remindAt });
      await this.event(q, c, 'employee.task.created.v1', id, r, row);
      return row;
    });
  }
  async complete(c: OrganizationContext, id: string, b: Record<string, unknown>, r: string) {
    if (!UUID.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const v = version(b.version);
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const row = (
        await q.query(
          "update tasks set status='completed',version=version+1,updated_by=$1,updated_at=now() where id=$2 and tenant_id=$3 and status in ('open','overdue') and version=$4 returning *",
          [c.userId, id, c.tenantId, v],
        )
      ).rows[0];
      if (!row) {
        const found = await q.query('select id from tasks where id=$1 and tenant_id=$2', [
          id,
          c.tenantId,
        ]);
        if (!found.rowCount) throw new NotFoundException('NOT_FOUND');
        throw new ConflictException('CONFLICT');
      }
      await q.query(
        "update task_reminders set status='cancelled',updated_at=now(),updated_by=$1 where task_id=$2 and tenant_id=$3 and status='pending'",
        [c.userId, id, c.tenantId],
      );
      const data = { id, status: 'completed', version: row.version };
      await this.audit(q, c, 'task.completed', id, r, data);
      await this.event(q, c, 'employee.task.completed.v1', id, r, data);
      await q.query('commit');
      return data;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  async setNotificationPreferences(c: OrganizationContext, b: Record<string, unknown>, r: string) {
    const employeeId = text(b.employeeId, 36),
      dndUntil = optionalDate(b.doNotDisturbUntil),
      expectedVersion = version(b.version);
    if (!UUID.test(employeeId)) throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const employee = await q.query(
        "select id from employees where id=$1 and tenant_id=$2 and status='active'",
        [employeeId, c.tenantId],
      );
      if (!employee.rowCount) throw new NotFoundException('NOT_FOUND');
      const current = await q.query(
        'select id,version from employee_notification_preferences where tenant_id=$1 and employee_id=$2 and deleted_at is null for update',
        [c.tenantId, employeeId],
      );
      let data: Record<string, unknown>;
      if (!current.rowCount) {
        if (expectedVersion !== 0) throw new ConflictException('CONFLICT');
        data = (
          await q.query(
            'insert into employee_notification_preferences(id,tenant_id,employee_id,do_not_disturb_until,created_by,updated_by) values($1,$2,$3,$4,$5,$5) returning employee_id,do_not_disturb_until,version',
            [randomUUID(), c.tenantId, employeeId, dndUntil, c.userId],
          )
        ).rows[0];
      } else {
        if (current.rows[0].version !== expectedVersion) throw new ConflictException('CONFLICT');
        data = (
          await q.query(
            'update employee_notification_preferences set do_not_disturb_until=$1,version=version+1,updated_at=now(),updated_by=$2 where id=$3 returning employee_id,do_not_disturb_until,version',
            [dndUntil, c.userId, current.rows[0].id],
          )
        ).rows[0];
      }
      await this.audit(q, c, 'task.notification_preference_updated', employeeId, r, data);
      await this.event(
        q,
        c,
        'employee.task.notification_preference_updated.v1',
        employeeId,
        r,
        data,
      );
      await q.query('commit');
      return data;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  async processDue(c: OrganizationContext, r: string) {
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const reminders = await q.query(
        "select r.id,r.task_id,t.assignee_employee_id from task_reminders r join tasks t on t.id=r.task_id and t.tenant_id=r.tenant_id left join employee_notification_preferences p on p.tenant_id=t.tenant_id and p.employee_id=t.assignee_employee_id and p.deleted_at is null where r.tenant_id=$1 and r.status='pending' and r.remind_at<=now() and t.status='open' and t.deleted_at is null and (p.do_not_disturb_until is null or p.do_not_disturb_until<=now()) for update of r skip locked",
        [c.tenantId],
      );
      for (const reminder of reminders.rows) {
        await q.query(
          "update task_reminders set status='sent',version=version+1,updated_at=now(),updated_by=$1 where id=$2",
          [c.userId, reminder.id],
        );
        await this.notification(q, c, reminder.task_id, reminder.assignee_employee_id, 'reminder');
        await this.audit(q, c, 'task.reminder_sent', reminder.task_id, r, reminder);
        await this.event(q, c, 'employee.task.reminder.v1', reminder.task_id, r, reminder);
      }
      const due = await q.query(
        "update tasks set status='overdue',escalation_level=escalation_level+1,version=version+1,updated_by=$1,updated_at=now() where tenant_id=$2 and status='open' and due_at<=now() returning id,assignee_employee_id,escalation_level",
        [c.userId, c.tenantId],
      );
      for (const x of due.rows) {
        await this.notification(q, c, x.id, x.assignee_employee_id, 'overdue_escalation');
        await this.audit(q, c, 'task.overdue_escalated', x.id, r, x);
        await this.event(q, c, 'employee.task.overdue.v1', x.id, r, x);
      }
      await q.query('commit');
      return { reminders: reminders.rowCount, overdue: due.rowCount };
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  private async idempotent(
    c: OrganizationContext,
    t: string,
    k: string,
    a: (q: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const p = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [c.tenantId, t, k],
      );
      if (p.rowCount) {
        await q.query('commit');
        return p.rows[0].response;
      }
      const d = await a(q);
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by)values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), c.tenantId, t, k, d, c.userId],
      );
      await q.query('commit');
      return d;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  private async event(
    q: Pool | PoolClient,
    c: OrganizationContext,
    type: string,
    id: string,
    r: string,
    p: unknown,
  ) {
    await q.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by)values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [
        randomUUID(),
        c.tenantId,
        type,
        'task',
        id,
        { payload: p },
        correlation(r),
        'core-006',
        c.userId,
      ],
    );
  }
  private async notification(
    q: PoolClient,
    c: OrganizationContext,
    taskId: string,
    employeeId: string,
    type: string,
  ) {
    await q.query(
      'insert into notification_logs(id,tenant_id,task_id,employee_id,notification_type,created_by,updated_by)values($1,$2,$3,$4,$5,$6,$6)',
      [randomUUID(), c.tenantId, taskId, employeeId, type, c.userId],
    );
  }
  private async audit(
    q: Pool | PoolClient,
    c: OrganizationContext,
    action: string,
    resourceId: string,
    requestId: string,
    details: unknown,
  ) {
    await q.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        c.tenantId,
        c.userId,
        action,
        'task',
        resourceId,
        correlation(requestId),
        'core-006',
        details,
      ],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
