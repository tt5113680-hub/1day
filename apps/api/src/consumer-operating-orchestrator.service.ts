import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

export type ConsumerOperatingInput = {
  tenantId: string;
  eventType: 'consumer_action_redirect_event' | 'consumer_action_event';
  eventId: string;
  actionId: string;
  storeId: string | null;
  source: string | null;
  shareCode: string | null;
  correlationId: string;
  traceId: string;
};

type Projection = {
  id: string;
  customerId: string;
  customerSourceId: string;
  ownershipId: string | null;
  taskId: string | null;
  leadPoolEntryId: string | null;
  assignmentBasis: 'employee_share' | 'store_manager' | 'lead_pool';
};

const SHARE_CODE = /^[A-Za-z0-9_-]{8,48}$/;

@Injectable()
export class ConsumerOperatingOrchestrator {
  async project(client: PoolClient, input: ConsumerOperatingInput): Promise<Projection> {
    // The consumer event is the idempotency boundary. The advisory lock makes a retry racing
    // with the original request observe one projection before any customer/task is inserted.
    await client.query('select pg_advisory_xact_lock(hashtext($1),hashtext($2))', [
      input.tenantId,
      `${input.eventType}:${input.eventId}`,
    ]);
    const existing = await client.query(
      `select id,customer_id,customer_source_id,ownership_id,task_id,lead_pool_entry_id,assignment_basis
       from consumer_operating_projections
       where tenant_id=$1 and consumer_event_type=$2 and consumer_event_id=$3 and deleted_at is null`,
      [input.tenantId, input.eventType, input.eventId],
    );
    if (existing.rowCount) return this.projection(existing.rows[0]);

    const assignment = await this.resolveAssignment(client, input);
    const customerId = randomUUID();
    const sourceId = randomUUID();
    await client.query(
      `insert into customers(id,tenant_id,display_name,status,created_by,updated_by)
       values($1,$2,$3,'active',null,null)`,
      [customerId, input.tenantId, `Public consumer ${input.eventId.slice(0, 8)}`],
    );
    const sourceType = assignment.basis === 'employee_share' ? 'employee_share' : 'consumer_action';
    await client.query(
      `insert into customer_sources(id,tenant_id,customer_id,source_role,source_type,source_id,metadata,created_by,updated_by)
       values($1,$2,$3,'first_source',$4,$5,$6,null,null)`,
      [
        sourceId,
        input.tenantId,
        customerId,
        sourceType,
        assignment.shareCodeId ?? input.eventId,
        {
          consumerEventId: input.eventId,
          consumerEventType: input.eventType,
          actionId: input.actionId,
          storeId: input.storeId,
          scene: input.source,
          shareCode: assignment.shareCode,
        },
      ],
    );

    let ownershipId: string | null = null;
    let taskId: string | null = null;
    let leadPoolEntryId: string | null = null;
    if (assignment.employeeId) {
      ownershipId = randomUUID();
      taskId = randomUUID();
      await client.query(
        `insert into customer_ownerships(id,tenant_id,customer_id,employee_id,ownership_role,status,created_by,updated_by)
         values($1,$2,$3,$4,'owner','active',null,null)`,
        [ownershipId, input.tenantId, customerId, assignment.employeeId],
      );
      const dueHours = await this.dueHours(client, input.tenantId);
      await client.query(
        `insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,created_by,updated_by)
         values($1,$2,$3,$4,$5,$6,now() + ($7 * interval '1 hour'),null,null)`,
        [
          taskId,
          input.tenantId,
          customerId,
          assignment.employeeId,
          'Follow up public consumer action',
          `Consumer action ${input.actionId}${input.source ? ` (${input.source})` : ''}`,
          dueHours,
        ],
      );
      await client.query(
        `insert into task_reminders(id,tenant_id,task_id,remind_at,created_by,updated_by)
         values($1,$2,$3,now() + ($4 * interval '1 hour'),null,null)`,
        [randomUUID(), input.tenantId, taskId, Math.max(1, Math.floor(dueHours / 2))],
      );
    } else {
      leadPoolEntryId = randomUUID();
      await client.query(
        `insert into employee_lead_pool_entries(id,tenant_id,customer_id,source_type,priority,status,created_by,updated_by)
         values($1,$2,$3,$4,'normal','available',null,null)`,
        [leadPoolEntryId, input.tenantId, customerId, sourceType],
      );
    }
    const projection: Projection = {
      id: randomUUID(),
      customerId,
      customerSourceId: sourceId,
      ownershipId,
      taskId,
      leadPoolEntryId,
      assignmentBasis: assignment.basis,
    };
    const details = { ...projection, consumerEventId: input.eventId, actionId: input.actionId };
    await client.query(
      `insert into consumer_operating_projections(
        id,tenant_id,consumer_event_type,consumer_event_id,customer_id,customer_source_id,ownership_id,task_id,lead_pool_entry_id,assignment_basis,payload,created_by,updated_by
       ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,null,null)`,
      [
        projection.id,
        input.tenantId,
        input.eventType,
        input.eventId,
        customerId,
        sourceId,
        ownershipId,
        taskId,
        leadPoolEntryId,
        projection.assignmentBasis,
        details,
      ],
    );
    await client.query(
      `insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by)
       values($1,$2,null,'consumer.operating_projection_created','consumer_operating_projection',$3,$4,$5,$6,null,null)`,
      [randomUUID(), input.tenantId, projection.id, input.correlationId, input.traceId, details],
    );
    await client.query(
      `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by)
       values($1,$2,'consumer.operating.projected.v1','consumer_operating_projection',$3,$4,$5,$6,null,null)`,
      [randomUUID(), input.tenantId, projection.id, details, input.correlationId, input.traceId],
    );
    return projection;
  }

  private async resolveAssignment(client: PoolClient, input: ConsumerOperatingInput) {
    if (input.shareCode && SHARE_CODE.test(input.shareCode)) {
      const shared = await client.query(
        `select s.id,s.code,s.employee_id from employee_share_codes s
         join employees e on e.id=s.employee_id and e.tenant_id=s.tenant_id and e.status='active' and e.deleted_at is null
         where s.tenant_id=$1 and s.code=$2 and s.status='active' and s.deleted_at is null
           and (s.expires_at is null or s.expires_at > now())`,
        [input.tenantId, input.shareCode],
      );
      if (shared.rowCount) {
        return {
          basis: 'employee_share' as const,
          employeeId: shared.rows[0].employee_id as string,
          shareCodeId: shared.rows[0].id as string,
          shareCode: shared.rows[0].code as string,
        };
      }
    }
    if (input.storeId) {
      const manager = await client.query(
        `select sm.employee_id from store_managers sm
         join employees e on e.id=sm.employee_id and e.tenant_id=sm.tenant_id and e.status='active' and e.deleted_at is null
         where sm.tenant_id=$1 and sm.store_id=$2 and sm.status='active' and sm.deleted_at is null
         order by sm.created_at asc limit 1`,
        [input.tenantId, input.storeId],
      );
      if (manager.rowCount)
        return {
          basis: 'store_manager' as const,
          employeeId: manager.rows[0].employee_id as string,
          shareCodeId: null,
          shareCode: null,
        };
    }
    return { basis: 'lead_pool' as const, employeeId: null, shareCodeId: null, shareCode: null };
  }

  private async dueHours(client: PoolClient, tenantId: string) {
    const result = await client.query(
      `select coalesce(nullif((reminder_policy->>'defaultDueHours')::int, 0), 24) as due_hours
       from tenant_operating_settings where tenant_id=$1 and deleted_at is null`,
      [tenantId],
    );
    return Number(result.rows[0]?.due_hours ?? 24);
  }

  private projection(row: Record<string, unknown>): Projection {
    return {
      id: row.id as string,
      customerId: row.customer_id as string,
      customerSourceId: row.customer_source_id as string,
      ownershipId: (row.ownership_id as string | null) ?? null,
      taskId: (row.task_id as string | null) ?? null,
      leadPoolEntryId: (row.lead_pool_entry_id as string | null) ?? null,
      assignmentBasis: row.assignment_basis as Projection['assignmentBasis'],
    };
  }
}
