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
const SEGMENTS = new Set(['active', 'repurchase', 'dormant']);
const ACTIONS = new Set(['message', 'call', 'coupon', 'other']);

const text = (value: unknown, length: number, optional = false) => {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    throw new BadRequestException('VALIDATION_ERROR');
  }
  if (typeof value !== 'string' || !value.trim() || value.trim().length > length)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};

@Injectable()
export class EmployeeNurtureService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async list(context: OrganizationContext, query: Record<string, unknown>) {
    const employee = await this.employee(context);
    const segment = text(query.segment, 32, true);
    if (segment && !SEGMENTS.has(segment)) throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      `select p.id,p.customer_id,p.segment,p.next_touch_at,p.last_touch_at,p.status,p.version,c.display_name,
              coalesce((select max(o.occurred_at) from customer_orders o where o.tenant_id=p.tenant_id and o.customer_id=p.customer_id and o.status='active' and o.deleted_at is null),null) as last_order_at,
              coalesce((select count(*) from customer_orders o where o.tenant_id=p.tenant_id and o.customer_id=p.customer_id and o.status='active' and o.deleted_at is null),0)::int as order_count,
              coalesce((select count(*) from tasks t where t.tenant_id=p.tenant_id and t.customer_id=p.customer_id and t.assignee_employee_id=p.employee_id and t.status in ('open','overdue') and t.deleted_at is null),0)::int as open_tasks
       from employee_nurture_profiles p
       join customers c on c.id=p.customer_id and c.tenant_id=p.tenant_id and c.status='active' and c.deleted_at is null
       where p.tenant_id=$1 and p.employee_id=$2 and p.status='active' and p.deleted_at is null
         and ($3::text is null or p.segment=$3)
       order by case p.segment when 'dormant' then 0 when 'repurchase' then 1 else 2 end,p.next_touch_at nulls last,p.updated_at desc`,
      [context.tenantId, employee.id, segment],
    );
    return result.rows.map((row) => this.output(row));
  }

  async updateSegment(
    context: OrganizationContext,
    customerId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (
      !UUID.test(customerId) ||
      !key.trim() ||
      key.length > 200 ||
      !Number.isInteger(body.version)
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const segment = text(body.segment, 32) ?? '';
    const nextTouchAt = text(body.nextTouchAt, 40, true);
    if (!SEGMENTS.has(segment) || (nextTouchAt && Number.isNaN(Date.parse(nextTouchAt))))
      throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await this.replay(client, context.tenantId, 'nurture_segment', key);
      if (replay) {
        await client.query('commit');
        return replay;
      }
      const profile = await this.profile(client, context.tenantId, employee.id, customerId, true);
      if (profile.version !== body.version) throw new ConflictException('CONFLICT');
      const row = (
        await client.query(
          'update employee_nurture_profiles set segment=$1,next_touch_at=$2,version=version+1,updated_at=now(),updated_by=$3 where id=$4 returning *',
          [segment, nextTouchAt, context.userId, profile.id],
        )
      ).rows[0];
      const data = this.output(row);
      await this.persist(
        client,
        context,
        'employee.nurture_segment_updated',
        customerId,
        requestId,
        data,
      );
      await this.remember(client, context, 'nurture_segment', key, data);
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async touch(
    context: OrganizationContext,
    customerId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (
      !UUID.test(customerId) ||
      !key.trim() ||
      key.length > 200 ||
      !Number.isInteger(body.version)
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const actionType = text(body.actionType, 32) ?? '';
    const note = text(body.note, 2000, true);
    const createTask = body.createTask === true;
    const taskTitle = createTask ? text(body.taskTitle, 160) : null;
    const dueAt = createTask ? text(body.dueAt, 40) : null;
    if (!ACTIONS.has(actionType) || (dueAt && Number.isNaN(Date.parse(dueAt))))
      throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await this.replay(client, context.tenantId, 'nurture_touch', key);
      if (replay) {
        await client.query('commit');
        return replay;
      }
      const profile = await this.profile(client, context.tenantId, employee.id, customerId, true);
      if (profile.version !== body.version) throw new ConflictException('CONFLICT');
      let taskId: string | null = null;
      if (createTask && taskTitle && dueAt) {
        taskId = randomUUID();
        await client.query(
          'insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8)',
          [
            taskId,
            context.tenantId,
            customerId,
            employee.id,
            taskTitle,
            'Nurture touchpoint',
            dueAt,
            context.userId,
          ],
        );
      }
      const touchpoint = (
        await client.query(
          'insert into employee_nurture_touchpoints(id,tenant_id,profile_id,customer_id,employee_id,action_type,note,task_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) returning id,action_type,note,task_id,occurred_at,version',
          [
            randomUUID(),
            context.tenantId,
            profile.id,
            customerId,
            employee.id,
            actionType,
            note,
            taskId,
            context.userId,
          ],
        )
      ).rows[0];
      const updated = (
        await client.query(
          'update employee_nurture_profiles set last_touch_at=now(),version=version+1,updated_at=now(),updated_by=$1 where id=$2 returning *',
          [context.userId, profile.id],
        )
      ).rows[0];
      const data = { ...this.output(updated), touchpoint: this.touchOutput(touchpoint), taskId };
      await this.persist(
        client,
        context,
        'employee.nurture_touch_recorded',
        customerId,
        requestId,
        data,
      );
      await this.remember(client, context, 'nurture_touch', key, data);
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private output(row: Record<string, unknown>) {
    return {
      id: row.id,
      customerId: row.customer_id,
      customerName: row.display_name ?? 'Unnamed customer',
      segment: row.segment,
      nextTouchAt: row.next_touch_at,
      lastTouchAt: row.last_touch_at,
      lastOrderAt: row.last_order_at ?? null,
      orderCount: Number(row.order_count ?? 0),
      openTasks: Number(row.open_tasks ?? 0),
      status: row.status,
      version: row.version,
    };
  }

  private touchOutput(row: Record<string, unknown>) {
    return {
      id: row.id,
      actionType: row.action_type,
      note: row.note,
      taskId: row.task_id,
      occurredAt: row.occurred_at,
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

  private async profile(
    client: PoolClient,
    tenantId: string,
    employeeId: string,
    customerId: string,
    lock = false,
  ) {
    const result = await client.query(
      `select p.*,c.display_name from employee_nurture_profiles p join customers c on c.id=p.customer_id and c.tenant_id=p.tenant_id and c.status='active' and c.deleted_at is null
       where p.tenant_id=$1 and p.employee_id=$2 and p.customer_id=$3 and p.status='active' and p.deleted_at is null${lock ? ' for update of p' : ''}`,
      [tenantId, employeeId, customerId],
    );
    if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
    return result.rows[0];
  }

  private async replay(client: PoolClient, tenantId: string, resourceType: string, key: string) {
    const result = await client.query(
      'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3 and deleted_at is null',
      [tenantId, resourceType, key],
    );
    return result.rowCount ? result.rows[0].response : null;
  }

  private async remember(
    client: PoolClient,
    context: OrganizationContext,
    resourceType: string,
    key: string,
    data: unknown,
  ) {
    await client.query(
      'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
      [randomUUID(), context.tenantId, resourceType, key, data, context.userId],
    );
  }

  private async persist(
    client: PoolClient,
    context: OrganizationContext,
    action: string,
    customerId: string,
    requestId: string,
    data: unknown,
  ) {
    const correlation = UUID.test(requestId) ? requestId : randomUUID();
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'customer',$5,$6,'page-e-007',$7,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, action, customerId, correlation, data],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'customer',$4,$5,$6,'page-e-007',$7,$7)",
      [
        randomUUID(),
        context.tenantId,
        `${action}.v1`,
        customerId,
        data,
        correlation,
        context.userId,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
