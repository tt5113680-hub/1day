import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';

export interface DomainEvent {
  eventId: string;
  eventName: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  traceId: string;
  payload: unknown;
}
export function createEvent(input: Omit<DomainEvent, 'eventId'>): DomainEvent {
  return { ...input, eventId: randomUUID() };
}

export class PostgresOutbox {
  private readonly pool: Pool;
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }
  async publish(event: DomainEvent): Promise<void> {
    await this.pool.query(
      'insert into outbox_events (id, tenant_id, event_type, aggregate_type, aggregate_id, payload, correlation_id, trace_id, status, created_by, updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,null,null)',
      [
        event.eventId,
        event.tenantId,
        event.eventName,
        event.aggregateType,
        event.aggregateId,
        event.payload,
        event.correlationId,
        event.traceId,
        'pending',
      ],
    );
  }
  async consumeOnce(
    event: DomainEvent,
    consumerName: string,
    handler: () => Promise<void>,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const insert = await client.query(
        'insert into event_consumptions (id, tenant_id, event_id, consumer_name) values ($1,$2,$3,$4) on conflict (event_id, consumer_name) do nothing',
        [randomUUID(), event.tenantId, event.eventId, consumerName],
      );
      if (insert.rowCount !== 1) {
        await client.query('rollback');
        return false;
      }
      await handler();
      await client.query(
        'update outbox_events set status=$1, published_at=now() where id=$2 and tenant_id=$3',
        ['published', event.eventId, event.tenantId],
      );
      await client.query('commit');
      return true;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
  async close() {
    await this.pool.end();
  }
}

export type OutboxDispatchResult = { published: number; retried: number; skipped: number };
export type OutboxHandler = (event: DomainEvent) => Promise<void>;

/**
 * Consumes the durable outbox for internal subscribers. A published event means the worker
 * completed its internal delivery ledger only; it must never be presented as third-party delivery.
 */
export class OutboxDispatcher {
  private readonly pool: Pool;
  constructor(
    connectionString: string,
    private readonly consumerName: string,
    private readonly handler: OutboxHandler = async () => undefined,
    private readonly tenantId?: string,
  ) {
    this.pool = new Pool({ connectionString });
  }

  async dispatch(limit = 50): Promise<OutboxDispatchResult> {
    const client = await this.pool.connect();
    const result: OutboxDispatchResult = { published: 0, retried: 0, skipped: 0 };
    try {
      await client.query('begin');
      const events = await client.query(
        `select id,tenant_id,event_type,aggregate_type,aggregate_id,correlation_id,trace_id,payload,attempts
         from outbox_events where status='pending' and available_at<=now() and deleted_at is null
         ${this.tenantId ? 'and tenant_id=$2' : ''}
         order by available_at,created_at for update skip locked limit $1`,
        this.tenantId
          ? [Math.max(1, Math.min(limit, 200)), this.tenantId]
          : [Math.max(1, Math.min(limit, 200))],
      );
      for (const row of events.rows) {
        await client.query('savepoint outbox_event');
        try {
          const consumption = await client.query(
            `insert into event_consumptions(id,tenant_id,event_id,consumer_name)
             values($1,$2,$3,$4) on conflict(event_id,consumer_name) do nothing`,
            [randomUUID(), row.tenant_id, row.id, this.consumerName],
          );
          if (!consumption.rowCount) {
            await client.query(
              "update outbox_events set status='published',published_at=coalesce(published_at,now()),updated_at=now() where id=$1 and tenant_id=$2",
              [row.id, row.tenant_id],
            );
            result.skipped += 1;
          } else {
            await this.handler({
              eventId: row.id,
              eventName: row.event_type,
              tenantId: row.tenant_id,
              aggregateType: row.aggregate_type,
              aggregateId: row.aggregate_id,
              correlationId: row.correlation_id,
              traceId: row.trace_id,
              payload: row.payload,
            });
            await client.query(
              "update outbox_events set status='published',published_at=now(),updated_at=now() where id=$1 and tenant_id=$2",
              [row.id, row.tenant_id],
            );
            result.published += 1;
          }
          await client.query('release savepoint outbox_event');
        } catch (error) {
          await client.query('rollback to savepoint outbox_event');
          const message =
            error instanceof Error ? error.message.slice(0, 1000) : 'worker handler failed';
          await client.query(
            `update outbox_events set attempts=attempts+1,available_at=now() + (least(attempts + 1, 8) * interval '15 seconds'),
             last_error=$3,updated_at=now() where id=$1 and tenant_id=$2`,
            [row.id, row.tenant_id, message],
          );
          await client.query('release savepoint outbox_event');
          result.retried += 1;
        }
      }
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

export type TaskDispatchResult = { reminders: number; overdue: number };
export type TaskDispatchScope = {
  tenantId?: string;
  actorId?: string | null;
  correlationId: string;
  traceId: string;
};

/** Shared state machine for API fallback and system Worker scheduling. */
export class TaskDispatchScheduler {
  private readonly pool: Pool;
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async dispatch(scope: TaskDispatchScope): Promise<TaskDispatchResult> {
    const client = await this.pool.connect();
    const tenantClause = scope.tenantId ? 'and r.tenant_id=$1' : '';
    const dueTenantClause = scope.tenantId ? 'and tenant_id=$2' : '';
    const tenantValues = scope.tenantId ? [scope.tenantId] : [];
    const result: TaskDispatchResult = { reminders: 0, overdue: 0 };
    try {
      await client.query('begin');
      const reminders = await client.query(
        `select r.id,r.tenant_id,r.task_id,t.assignee_employee_id from task_reminders r
         join tasks t on t.id=r.task_id and t.tenant_id=r.tenant_id
         left join employee_notification_preferences p on p.tenant_id=t.tenant_id and p.employee_id=t.assignee_employee_id and p.deleted_at is null
         where r.status='pending' and r.remind_at<=now() and t.status='open' and t.deleted_at is null
         and (p.do_not_disturb_until is null or p.do_not_disturb_until<=now()) ${tenantClause}
         for update of r skip locked`,
        tenantValues,
      );
      for (const reminder of reminders.rows) {
        await client.query(
          "update task_reminders set status='sent',version=version+1,updated_at=now(),updated_by=$1 where id=$2 and tenant_id=$3",
          [scope.actorId ?? null, reminder.id, reminder.tenant_id],
        );
        await this.notification(
          client,
          reminder.tenant_id,
          reminder.task_id,
          reminder.assignee_employee_id,
          'reminder',
          scope.actorId ?? null,
        );
        await this.auditAndEvent(
          client,
          scope,
          reminder.tenant_id,
          'task.reminder_sent',
          'employee.task.reminder.v1',
          reminder.task_id,
          reminder,
        );
        result.reminders += 1;
      }
      const due = await client.query(
        `update tasks set status='overdue',escalation_level=escalation_level+1,version=version+1,updated_by=$1,updated_at=now()
         where status='open' and due_at<=now() ${dueTenantClause} returning id,tenant_id,assignee_employee_id,escalation_level`,
        scope.tenantId ? [scope.actorId ?? null, scope.tenantId] : [scope.actorId ?? null],
      );
      for (const task of due.rows) {
        await this.notification(
          client,
          task.tenant_id,
          task.id,
          task.assignee_employee_id,
          'overdue_escalation',
          scope.actorId ?? null,
        );
        await this.auditAndEvent(
          client,
          scope,
          task.tenant_id,
          'task.overdue_escalated',
          'employee.task.overdue.v1',
          task.id,
          task,
        );
        result.overdue += 1;
      }
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async notification(
    client: PoolClient,
    tenantId: string,
    taskId: string,
    employeeId: string,
    type: string,
    actorId: string | null,
  ) {
    await client.query(
      'insert into notification_logs(id,tenant_id,task_id,employee_id,notification_type,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
      [randomUUID(), tenantId, taskId, employeeId, type, actorId],
    );
  }

  private async auditAndEvent(
    client: PoolClient,
    scope: TaskDispatchScope,
    tenantId: string,
    action: string,
    eventType: string,
    taskId: string,
    payload: unknown,
  ) {
    await client.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        tenantId,
        scope.actorId ?? null,
        action,
        'task',
        taskId,
        scope.correlationId,
        scope.traceId,
        payload,
      ],
    );
    await client.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [
        randomUUID(),
        tenantId,
        eventType,
        'task',
        taskId,
        payload,
        scope.correlationId,
        scope.traceId,
        scope.actorId ?? null,
      ],
    );
  }

  async close() {
    await this.pool.end();
  }
}
