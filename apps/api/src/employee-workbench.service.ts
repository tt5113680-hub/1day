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
const trace = 'page-e-001';

@Injectable()
export class EmployeeWorkbenchService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async overview(context: OrganizationContext) {
    const employee = await this.employee(context);
    const result = await this.pool.query(
      `select t.id,t.title,t.due_at,t.status,t.escalation_level,t.version,
              c.id as customer_id,c.display_name as customer_name
       from tasks t
       left join customers c on c.id=t.customer_id and c.tenant_id=t.tenant_id and c.deleted_at is null
       where t.tenant_id=$1 and t.assignee_employee_id=$2 and t.deleted_at is null
         and t.status in ('open','overdue')
       order by case when t.status='overdue' then 0 else 1 end,t.due_at asc`,
      [context.tenantId, employee.id],
    );
    const tasks = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      dueAt: row.due_at,
      status: row.status,
      escalationLevel: row.escalation_level,
      version: row.version,
      customer: row.customer_id ? { id: row.customer_id, displayName: row.customer_name } : null,
    }));
    const today = tasks.filter((task) => this.isToday(task.dueAt));
    const customerReminders = tasks.filter((task) => task.customer !== null).slice(0, 5);
    return {
      employee: { id: employee.id, displayName: employee.display_name, title: employee.title },
      tasks: today,
      customerReminders,
      opportunities: tasks.slice(0, 3).map((task) => ({
        taskId: task.id,
        title: task.status === 'overdue' ? `优先处理：${task.title}` : `建议推进：${task.title}`,
        reason:
          task.status === 'overdue'
            ? '来源：任务已逾期，需要优先处理并留痕。'
            : '来源：今日待办时限信号，建议在到期前完成客户动作。',
        source: 'task_due_signal',
      })),
      generatedAt: new Date().toISOString(),
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

  async onModuleDestroy() {
    await this.pool.end();
  }
}
