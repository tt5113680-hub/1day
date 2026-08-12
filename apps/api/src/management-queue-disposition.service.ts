import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const QUEUE_TYPES = new Set(['overdue_task', 'ownership_approval', 'consult', 'lead']);
const ACTIONS = new Set(['handled', 'ignored']);
const safeLink = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/') && value.length <= 320 ? value : '';

@Injectable()
export class ManagementQueueDispositionService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async create(
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
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await this.replay(client, context.tenantId, key);
      if (replay) {
        await client.query('commit');
        return replay;
      }
      const existing = await client.query(
        `select * from management_queue_dispositions
         where tenant_id=$1 and queue_type=$2 and source_id=$3 and deleted_at is null for update`,
        [context.tenantId, queueType, sourceId],
      );
      const row =
        existing.rowCount && existing.rows[0].status === action
          ? existing.rows[0]
          : (
              await client.query(
                `insert into management_queue_dispositions
                   (id,tenant_id,queue_type,source_id,status,deep_link,title,disposition_at,disposed_by,created_by,updated_by)
                 values($1,$2,$3,$4,$5,$6,$7,now(),$8,$8,$8)
                 on conflict (tenant_id,queue_type,source_id) do update
                   set status=excluded.status,deep_link=excluded.deep_link,title=excluded.title,
                       disposition_at=now(),disposed_by=excluded.disposed_by,
                       updated_at=now(),updated_by=excluded.updated_by,version=management_queue_dispositions.version+1
                 returning *`,
                [
                  randomUUID(),
                  context.tenantId,
                  queueType,
                  sourceId,
                  action,
                  deepLink,
                  title,
                  context.userId,
                ],
              )
            ).rows[0];
      const data = this.output(row);
      await this.persist(client, context, queueType, sourceId, key, requestId, data);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'management_queue_disposition', key, data, context.userId],
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

  private output(row: Record<string, unknown>) {
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
      "select response from idempotency_keys where tenant_id=$1 and resource_type='management_queue_disposition' and idempotency_key=$2 and deleted_at is null",
      [tenantId, key],
    );
    return result.rowCount ? result.rows[0].response : null;
  }

  private async persist(
    client: PoolClient,
    context: OrganizationContext,
    queueType: string,
    sourceId: string,
    key: string,
    requestId: string,
    data: unknown,
  ) {
    const correlation = UUID.test(requestId) ? requestId : randomUUID();
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'management.queue_disposition','management_queue_disposition',$4,$5,'page-m-001',$6,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, sourceId, correlation, data],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'management.queue_disposition.v1','management_queue_disposition',$3,$4,$5,'page-m-001',$6,$6)",
      [randomUUID(), context.tenantId, sourceId, data, correlation, context.userId],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
