import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const CATEGORIES = new Set(['anomaly', 'approval', 'workflow', 'renewal']);
const STATES = new Set(['all', 'unread', 'read', 'ignored']);
const BATCH_ACTIONS = new Set(['read', 'unread', 'ignore', 'unignore']);
const safeLink = (value: unknown) => {
  const link = typeof value === 'string' ? value : '';
  return /^\/m\/(?:customers|workflows|memberships)$/i.test(link) ? link : '/m/customers';
};

@Injectable()
export class ManagementNotificationService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext, query: Record<string, unknown>) {
    const category = this.choice(query.category, CATEGORIES, true);
    const state = this.choice(query.state, STATES, true) ?? 'all';
    await this.materialize(context.tenantId);
    const rows = await this.pool.query(
      `select id,category,source_id,title,body,deep_link,sent_at,read_at,status,version
       from management_notifications
       where tenant_id=$1 and deleted_at is null
         and ($2::text is null or category=$2)
         and ($3='all' and status<>'ignored'
              or ($3='unread' and status<>'ignored' and read_at is null)
              or ($3='read' and status<>'ignored' and read_at is not null)
              or ($3='ignored' and status='ignored'))
       order by sent_at desc,id desc
       limit 100`,
      [context.tenantId, category, state],
    );
    return {
      items: rows.rows.map((row) => this.output(row)),
      counts: await this.counts(context.tenantId),
    };
  }

  async markRead(
    context: OrganizationContext,
    notificationId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (
      !UUID.test(notificationId) ||
      !Number.isInteger(body.version) ||
      !key.trim() ||
      key.length > 200
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await this.replay(
        client,
        context.tenantId,
        key,
        'management_notification_read',
      );
      if (replay) {
        await client.query('commit');
        return replay;
      }
      const result = await client.query(
        'select * from management_notifications where id=$1 and tenant_id=$2 and deleted_at is null for update',
        [notificationId, context.tenantId],
      );
      if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
      const notification = result.rows[0];
      if (notification.status === 'ignored') throw new ConflictException('IGNORED');
      if (notification.version !== body.version) throw new ConflictException('CONFLICT');
      const updated = notification.read_at
        ? notification
        : (
            await client.query(
              'update management_notifications set read_at=now(),version=version+1,updated_at=now(),updated_by=$1 where id=$2 returning *',
              [context.userId, notificationId],
            )
          ).rows[0];
      const data = this.output(updated);
      await this.persist(
        client,
        context,
        notificationId,
        requestId,
        data,
        'management.notification_read',
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'management_notification_read', key, data, context.userId],
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

  async batch(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    const action = this.choice(body.action, BATCH_ACTIONS, false);
    if (!key.trim() || key.length > 200) throw new BadRequestException('VALIDATION_ERROR');
    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 200)
      throw new BadRequestException('VALIDATION_ERROR');
    if (!ids.every((id) => UUID.test(id))) throw new BadRequestException('VALIDATION_ERROR');
    const batchId = randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await this.replay(
        client,
        context.tenantId,
        key,
        'management_notification_batch',
      );
      if (replay) {
        await client.query('commit');
        return replay;
      }
      let updatedRows: Array<Record<string, unknown>> = [];
      if (action === 'read' || action === 'unread') {
        if (action === 'read') {
          const result = await client.query(
            'update management_notifications set read_at=now(),version=version+1,updated_at=now(),updated_by=$1 where tenant_id=$2 and id = any($3::uuid[]) and read_at is null and status<>$4 and deleted_at is null returning *',
            [context.userId, context.tenantId, ids, 'ignored'],
          );
          updatedRows = result.rows;
        } else {
          const result = await client.query(
            'update management_notifications set read_at=null,version=version+1,updated_at=now(),updated_by=$1 where tenant_id=$2 and id = any($3::uuid[]) and read_at is not null and status<>$4 and deleted_at is null returning *',
            [context.userId, context.tenantId, ids, 'ignored'],
          );
          updatedRows = result.rows;
        }
      } else {
        const status = action === 'ignore' ? 'ignored' : 'active';
        const result = await client.query(
          'update management_notifications set status=$4,read_at=case when $4=$5 then null else read_at end,version=version+1,updated_at=now(),updated_by=$1 where tenant_id=$2 and id = any($3::uuid[]) and status is distinct from $4 and deleted_at is null returning *',
          [context.userId, context.tenantId, ids, status, 'active'],
        );
        updatedRows = result.rows;
      }
      const data = {
        action,
        updated: updatedRows.map((row) => this.output(row)),
        updatedCount: updatedRows.length,
        requestedCount: ids.length,
      };
      await this.persist(
        client,
        context,
        batchId,
        requestId,
        data,
        'management.notification_batch',
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [batchId, context.tenantId, 'management_notification_batch', key, data, context.userId],
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

  async settingsAudit(context: OrganizationContext) {
    const rows = await this.pool.query(
      `select a.id,a.action,a.resource_id,a.correlation_id,a.trace_id,a.created_at,
         coalesce(u.display_name,'未归属操作者') actor_name,
         a.details
       from audit_logs a
       left join users u on u.id=a.actor_id
       where a.tenant_id=$1 and a.deleted_at is null
         and a.action='tenant.operating_settings_updated'
       order by a.created_at desc
       limit 100`,
      [context.tenantId],
    );
    return {
      records: rows.rows.map((row) => ({
        id: row.id,
        action: 'tool_settings_updated',
        resourceId: row.resource_id,
        actorName: row.actor_name,
        createdAt: row.created_at,
        correlationId: row.correlation_id,
        traceId: row.trace_id,
        detail: row.details,
      })),
      count: rows.rowCount,
    };
  }

  private async materialize(tenantId: string) {
    await this.pool.query(
      `insert into management_notifications(id,tenant_id,category,source_type,source_id,title,body,deep_link,sent_at,created_by,updated_by)
       select gen_random_uuid(),$1,category,source_type,aggregate_id::uuid,title,body,deep_link,occurred_at,null,null
       from (
         select 'anomaly' as category,'overdue_task'::text as source_type,t.id::uuid aggregate_id,concat('任务逾期：',t.title) title,
                concat('客户跟进任务已逾期，需即时处理，避免客户行动节奏中断。') body,'/m/customers' deep_link,t.updated_at occurred_at
         from tasks t where t.tenant_id=$1 and t.status='overdue' and t.deleted_at is null
         union all
         select 'approval','ownership_approval',a.id,concat('客户归属待审批：',c.display_name),
                '有客户归属转移请求待审批，审结后更新后续跟进归属。','/m/customers',a.created_at
         from customer_ownership_transfer_approvals a
         join customers c on c.id=a.customer_id and c.tenant_id=a.tenant_id and c.deleted_at is null
         where a.tenant_id=$1 and a.status='pending' and a.deleted_at is null
         union all
         select 'workflow','workflow_instance',i.id,concat('工作流进行中：',d.name),
                '有运行中的工作流实例待推进，可按既定步骤完成整合任务。','/m/workflows',i.started_at
         from workflow_instances i
         join workflow_definitions d on d.id=i.definition_id and d.tenant_id=i.tenant_id
         where i.tenant_id=$1 and i.status='active' and i.deleted_at is null
         union all
         select 'renewal' as category,'member_expiry'::text as source_type,e.id::uuid aggregate_id,
                concat('会员将到期：',coalesce(c.display_name,'在册会员')) title,
                concat('会员有效期临近（或已超有效周期），到期后不再列为在册。') body,
                '/m/memberships' deep_link, coalesce(e.expires_at, e.joined_at) occurred_at
         from membership_enrollments e
         join customers c on c.id=e.customer_id and c.tenant_id=e.tenant_id and c.deleted_at is null
         where e.tenant_id=$1 and e.deleted_at is null and e.enrollment_status='active'
           and (
             (e.expires_at is not null and e.expires_at > now() and e.expires_at <= now()+interval '3 days')
             or (e.last_active_at is not null and e.last_active_at <= now()-interval '90 days')
             or (e.last_active_at is null and e.joined_at is not null and e.joined_at <= now()-interval '120 days')
           )
         union all
         select 'renewal' as category,'member_expired'::text as source_type,e.id::uuid aggregate_id,
                concat('会员已过期：',coalesce(c.display_name,'在册会员')) title,
                concat('在册会员有效期已过，需确认是否续期或转出，异常提醒用于运营处置。') body,
                '/m/memberships' deep_link, e.expires_at occurred_at
         from membership_enrollments e
         join customers c on c.id=e.customer_id and c.tenant_id=e.tenant_id and c.deleted_at is null
         where e.tenant_id=$1 and e.deleted_at is null and e.enrollment_status='active'
           and e.expires_at is not null and e.expires_at < now()
       ) n
       on conflict (tenant_id,category,source_type,source_id) do nothing`,
      [tenantId],
    );
  }

  private async counts(tenantId: string) {
    const result = await this.pool.query(
      `select
        (select count(*)::int from tasks where tenant_id=$1 and status='overdue' and deleted_at is null) anomaly,
        (select count(*)::int from customer_ownership_transfer_approvals where tenant_id=$1 and status='pending' and deleted_at is null) approval,
        (select count(*)::int from workflow_instances where tenant_id=$1 and status='active' and deleted_at is null) workflow,
        (select count(*)::int from membership_enrollments where tenant_id=$1 and deleted_at is null and enrollment_status='active'
           and ((expires_at is not null and expires_at <= now()+interval '3 days')
                 or (last_active_at is not null and last_active_at <= now()-interval '90 days')
                 or (last_active_at is null and joined_at is not null and joined_at <= now()-interval '120 days')
                 or (expires_at is not null and expires_at < now()))) renewal`,
      [tenantId],
    );
    return result.rows[0];
  }

  private choice(value: unknown, options: Set<string>, optional: boolean) {
    if (value === undefined || value === null || value === '') return optional ? null : '';
    if (typeof value !== 'string' || !options.has(value))
      throw new BadRequestException('VALIDATION_ERROR');
    return value;
  }

  private output(row: Record<string, unknown>) {
    return {
      notificationId: row.id,
      category: row.category,
      id: row.source_id,
      title: row.title,
      body: row.body,
      deepLink: safeLink(row.deep_link),
      occurredAt: row.sent_at,
      readAt: row.read_at,
      status: row.status,
      version: row.version,
    };
  }

  private async replay(client: PoolClient, tenantId: string, key: string, resourceType: string) {
    const result = await client.query(
      'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3 and deleted_at is null',
      [tenantId, resourceType, key],
    );
    return result.rowCount ? result.rows[0].response : null;
  }

  private async persist(
    client: PoolClient,
    context: OrganizationContext,
    resourceId: string | null,
    requestId: string,
    data: unknown,
    action: string,
  ) {
    const correlation = UUID.test(requestId) ? requestId : randomUUID();
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'management_notification',$5,$6,'page-m-008',$7,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, action, resourceId, correlation, data],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'management_notification',$4,$5,$6,'page-m-008',$7,$7)",
      [
        randomUUID(),
        context.tenantId,
        `${action}.v1`,
        resourceId,
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
