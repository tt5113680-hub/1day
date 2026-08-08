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

const UUID = /^[0-9a-f-]{36}$/i;
const STATUSES = new Set(['available', 'claimed', 'follow_up', 'nurture']);
const PRIORITIES = new Set(['high', 'normal', 'low']);

const value = (v: unknown, max: number, optional = false) => {
  if (v === undefined || v === null || v === '') {
    if (optional) return null;
    throw new BadRequestException('VALIDATION_ERROR');
  }
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return v.trim();
};

@Injectable()
export class EmployeeLeadPoolService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext, query: Record<string, unknown>) {
    const employee = await this.employee(context);
    const status = value(query.status, 32, true);
    const source = value(query.source, 80, true);
    const priority = value(query.priority, 16, true);
    if ((status && !STATUSES.has(status)) || (priority && !PRIORITIES.has(priority)))
      throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      `select l.id,l.customer_id,l.source_type,l.priority,l.status,l.assignee_employee_id,l.claimed_at,l.converted_at,l.created_at,l.version,
              c.display_name, coalesce((select count(*) from tasks t where t.tenant_id=l.tenant_id and t.customer_id=l.customer_id and t.assignee_employee_id=l.assignee_employee_id and t.status in ('open','overdue') and t.deleted_at is null),0)::int as open_tasks
       from employee_lead_pool_entries l join customers c on c.id=l.customer_id and c.tenant_id=l.tenant_id and c.deleted_at is null
       where l.tenant_id=$1 and l.deleted_at is null
         and ($2::text is null or l.status=$2) and ($3::text is null or l.source_type=$3) and ($4::text is null or l.priority=$4)
       order by case l.priority when 'high' then 0 when 'normal' then 1 else 2 end,l.created_at desc`,
      [context.tenantId, status, source, priority],
    );
    return result.rows.map((row) => this.output(row, employee.id));
  }

  async assignees(context: OrganizationContext) {
    await this.employee(context);
    const result = await this.pool.query(
      `select e.id,u.display_name,e.title
       from employees e
       join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id
       join users u on u.id=m.user_id
       where e.tenant_id=$1 and e.status='active' and m.status='active'
         and e.deleted_at is null and m.deleted_at is null
       order by u.display_name,e.employee_code`,
      [context.tenantId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      title: row.title,
    }));
  }

  async claim(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    return this.change(context, id, body, key, requestId, 'claim');
  }

  async assign(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    return this.change(context, id, body, key, requestId, 'assign');
  }

  async convert(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    return this.change(context, id, body, key, requestId, 'convert');
  }

  async bulkAssign(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (
      !key.trim() ||
      !Array.isArray(body.items) ||
      body.items.length < 1 ||
      body.items.length > 50
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const employeeId = value(body.employeeId, 36);
    if (!employeeId || !UUID.test(employeeId)) throw new BadRequestException('VALIDATION_ERROR');
    const results = [];
    for (const item of body.items) {
      if (!item || typeof item !== 'object') throw new BadRequestException('VALIDATION_ERROR');
      const input = item as Record<string, unknown>;
      const id = String(input.id ?? '');
      if (!UUID.test(id) || !Number.isInteger(input.version))
        throw new BadRequestException('VALIDATION_ERROR');
      results.push(
        await this.assign(
          context,
          id,
          { version: input.version, employeeId },
          `${key}:${id}`,
          requestId,
        ),
      );
    }
    return { count: results.length, assigned: results };
  }

  private async change(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
    mode: 'claim' | 'assign' | 'convert',
  ) {
    if (!UUID.test(id) || !key.trim() || key.length > 200 || !Number.isInteger(body.version))
      throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3 and deleted_at is null',
        [context.tenantId, `lead_pool_${mode}`, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const found = await client.query(
        'select * from employee_lead_pool_entries where id=$1 and tenant_id=$2 and deleted_at is null for update',
        [id, context.tenantId],
      );
      if (!found.rowCount) throw new NotFoundException('NOT_FOUND');
      const row = found.rows[0];
      if (row.version !== body.version) throw new ConflictException('CONFLICT');
      let action = '';
      let taskId: string | null = null;
      if (mode === 'claim') {
        if (row.status !== 'available') throw new ConflictException('CONFLICT');
        Object.assign(
          row,
          (
            await client.query(
              "update employee_lead_pool_entries set status='claimed',assignee_employee_id=$1,claimed_at=now(),version=version+1,updated_at=now(),updated_by=$2 where id=$3 returning status,assignee_employee_id,claimed_at,version",
              [employee.id, context.userId, id],
            )
          ).rows[0],
        );
        action = 'employee.lead_claimed';
      } else if (mode === 'assign') {
        const target = value(body.employeeId, 36);
        if (!target || !UUID.test(target)) throw new BadRequestException('VALIDATION_ERROR');
        await this.requireActiveEmployee(client, context.tenantId, target);
        Object.assign(
          row,
          (
            await client.query(
              "update employee_lead_pool_entries set status='claimed',assignee_employee_id=$1,claimed_at=coalesce(claimed_at,now()),version=version+1,updated_at=now(),updated_by=$2 where id=$3 returning status,assignee_employee_id,claimed_at,version",
              [target, context.userId, id],
            )
          ).rows[0],
        );
        action = 'employee.lead_assigned';
      } else {
        if (row.assignee_employee_id !== employee.id || row.status !== 'claimed')
          throw new ForbiddenException('FORBIDDEN');
        const destination = value(body.destination, 32);
        if (destination !== 'follow_up' && destination !== 'nurture')
          throw new BadRequestException('VALIDATION_ERROR');
        if (destination === 'follow_up') {
          const title = value(body.taskTitle, 160);
          const dueAt = value(body.dueAt, 40);
          if (!title || !dueAt || Number.isNaN(Date.parse(dueAt)))
            throw new BadRequestException('VALIDATION_ERROR');
          taskId = randomUUID();
          await client.query(
            'insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8)',
            [
              taskId,
              context.tenantId,
              row.customer_id,
              employee.id,
              title,
              'Lead pool conversion',
              dueAt,
              context.userId,
            ],
          );
        } else {
          await client.query(
            "insert into employee_nurture_profiles(id,tenant_id,customer_id,employee_id,next_touch_at,created_by,updated_by) values($1,$2,$3,$4,now()+interval '7 days',$5,$5) on conflict (tenant_id,customer_id) do nothing",
            [randomUUID(), context.tenantId, row.customer_id, employee.id, context.userId],
          );
        }
        Object.assign(
          row,
          (
            await client.query(
              'update employee_lead_pool_entries set status=$1,converted_at=now(),version=version+1,updated_at=now(),updated_by=$2 where id=$3 returning status,converted_at,version',
              [destination, context.userId, id],
            )
          ).rows[0],
        );
        action =
          destination === 'follow_up'
            ? 'employee.lead_converted_to_follow_up'
            : 'employee.lead_converted_to_nurture';
      }
      const data = { ...this.output(row, employee.id), taskId };
      const correlation = UUID.test(requestId) ? requestId : randomUUID();
      await this.audit(client, context, action, id, correlation, data);
      await this.event(client, context, `${action}.v1`, id, correlation, data);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, `lead_pool_${mode}`, key, data, context.userId],
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

  private output(row: Record<string, unknown>, employeeId: string) {
    return {
      id: row.id,
      customerId: row.customer_id,
      customerName: row.display_name ?? '未命名客户',
      sourceType: row.source_type,
      priority: row.priority,
      status: row.status,
      assigneeEmployeeId: row.assignee_employee_id,
      isCurrentEmployee: row.assignee_employee_id === employeeId,
      claimedAt: row.claimed_at,
      convertedAt: row.converted_at,
      createdAt: row.created_at,
      version: row.version,
      openTasks: Number(row.open_tasks ?? 0),
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
  private async requireActiveEmployee(client: PoolClient, tenant: string, id: string) {
    const found = await client.query(
      "select id from employees where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
      [id, tenant],
    );
    if (!found.rowCount) throw new NotFoundException('NOT_FOUND');
  }
  private async audit(
    client: PoolClient,
    context: OrganizationContext,
    action: string,
    id: string,
    correlation: string,
    details: unknown,
  ) {
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'employee_lead_pool_entry',$5,$6,'page-e-006',$7,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, action, id, correlation, details],
    );
  }
  private async event(
    client: PoolClient,
    context: OrganizationContext,
    type: string,
    id: string,
    correlation: string,
    payload: unknown,
  ) {
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'employee_lead_pool_entry',$4,$5,$6,'page-e-006',$7,$7)",
      [randomUUID(), context.tenantId, type, id, payload, correlation, context.userId],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
