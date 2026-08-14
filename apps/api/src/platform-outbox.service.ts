import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

/** Aligned with `OUTBOX_MAX_ATTEMPTS` in `@oneday/events` (worker dead-letter threshold). */
const OUTBOX_MAX_ATTEMPTS = 8;

/**
 * G1-W∞-120 — Outbox 死信一键重放 + 告警字段（Phase3 SaaS 最强，§6 W∞-SAAS-OUTBOX）。
 *
 * 观察层 `outbox_dlq_alerts`：平台运维对 `needs_attention` 死信的持久告警台账。
 * 由真实 outbox_events 行现场推导派生 alert_level（critical=已达最大重试 / warning=可重试）、
 * 凝固年龄 age_minutes、事件类型分布与 DLQ 深度；支持逐条重放与「一键重放全部」，
 * 每次重放都会把对应 alert 台账标记为 cleared 并写 audit + outbox（可审计、可重做、幂等）。
 *
 * 诚实边界：Outbox 是平台/租户内的投递与同步队列；重放只恢复「本地投递状态」，
 * 不调用美团/抖音等外部平台、不代表第三方成交、不含支付金额、非本平台下单、无 GMV。
 */
@Injectable()
export class PlatformOutboxService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  private static readonly MAX_ATTEMPTS = OUTBOX_MAX_ATTEMPTS;

  /** Upsert a single needs_attention event into the alert ledger (keyed by outbox_event_id). */
  private async materializeAlert(row: {
    id: string;
    tenant_id: string;
    event_type: string;
    aggregate_type: string;
    attempts: number;
    actorId: string | null;
  }): Promise<void> {
    const alertLevel =
      Number(row.attempts ?? 0) >= PlatformOutboxService.MAX_ATTEMPTS
        ? 'critical'
        : 'warning';
    await this.pool.query(
      `insert into outbox_dlq_alerts(
         id,outbox_event_id,tenant_id,event_type,aggregate_type,attempts,alert_level,
         age_minutes,alert_count,status,created_by,updated_by
       ) values($1,$2,$3,$4,$5,$6,$7,0,1,'active',$8,$8)
       on conflict (outbox_event_id)
       do update set attempts=excluded.attempts,alert_level=excluded.alert_level,
         last_seen_at=now(),updated_at=now(),updated_by=excluded.updated_by,
         alert_count=outbox_dlq_alerts.alert_count + 1`,
      [
        randomUUID(),
        row.id,
        row.tenant_id,
        row.event_type,
        row.aggregate_type,
        Number(row.attempts ?? 0),
        alertLevel,
        row.actorId,
      ],
    );
  }

  private async refreshAgeMinutes(): Promise<void> {
    await this.pool.query(
      `update outbox_dlq_alerts a
       set age_minutes=greatest(0, round(extract(epoch from (now() - oe.updated_at))/60)::int),
           updated_at=now(),updated_by=null
       from outbox_events oe
       where a.outbox_event_id=oe.id and a.status='active' and a.deleted_at is null and oe.deleted_at is null`,
    );
  }

  async observability(context: OrganizationContext) {
    const dead = await this.pool.query(
      `select id,tenant_id,event_type,aggregate_type,attempts
       from outbox_events
       where status='needs_attention' and deleted_at is null
       order by updated_at asc`,
    );
    for (const row of dead.rows) {
      await this.materializeAlert({ ...row, actorId: context.userId });
    }
    await this.refreshAgeMinutes();

    const summary = await this.pool.query(
      `select
         (select count(*) from outbox_events where status='needs_attention' and deleted_at is null)::int needs_attention,
         (select coalesce(min(extract(epoch from (now()-updated_at))/60),0)::int
            from outbox_events where status='needs_attention' and deleted_at is null) oldest_dead_letter_minutes,
         (select count(*) from outbox_events where status='pending' and deleted_at is null)::int total_pending,
         (select coalesce(min(extract(epoch from (now()-created_at))/60),0)::int
            from outbox_events where status='pending' and deleted_at is null) oldest_pending_minutes,
         (select count(*) from outbox_dlq_alerts where status='active' and deleted_at is null)::int active_alerts,
         (select count(*) from outbox_dlq_alerts where status='active' and deleted_at is null and alert_level='critical')::int critical_alerts`,
    );
    const s = summary.rows[0];
    const byEventType = (
      await this.pool.query(
        `select event_type,count(*)::int count from outbox_events
         where status='needs_attention' and deleted_at is null group by event_type order by count desc limit 20`,
      )
    ).rows.map((r) => ({ eventType: r.event_type, count: r.count }));
    const byAlertLevel = (
      await this.pool.query(
        `select alert_level,count(*)::int count from outbox_dlq_alerts
         where status='active' and deleted_at is null group by alert_level order by count desc`,
      )
    ).rows.map((r) => ({ alertLevel: r.alert_level, count: r.count }));

    const needsAttention = Number(s.needs_attention ?? 0);
    const oldestDeadLetterMinutes = Number(s.oldest_dead_letter_minutes ?? 0);
    const criticalAlerts = Number(s.critical_alerts ?? 0);
    const alertLevel =
      needsAttention === 0
        ? 'healthy'
        : criticalAlerts > 0 || oldestDeadLetterMinutes >= 60
          ? 'critical'
          : 'warning';

    return {
      alertLevel,
      needsAttention,
      dlqDepth: needsAttention,
      oldestDeadLetterMinutes,
      totalPending: Number(s.total_pending ?? 0),
      oldestPendingMinutes: Number(s.oldest_pending_minutes ?? 0),
      activeAlerts: Number(s.active_alerts ?? 0),
      criticalAlerts,
      byEventType,
      byAlertLevel,
    };
  }

  async listDeadLetters(limit = 50) {
    const result = await this.pool.query(
      `select oe.id,oe.tenant_id,oe.event_type,oe.aggregate_type,oe.aggregate_id,oe.correlation_id,
              oe.attempts,oe.last_error,oe.created_at,oe.updated_at,
              al.alert_level,al.age_minutes,al.status alert_status,al.alert_count,
              al.first_seen_at,al.replayed_at
       from outbox_events oe
       left join outbox_dlq_alerts al
         on al.outbox_event_id=oe.id and al.status='active' and al.deleted_at is null
       where oe.status='needs_attention' and oe.deleted_at is null
       order by oe.updated_at desc
       limit $1`,
      [Math.max(1, Math.min(limit, 200))],
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      eventType: row.event_type as string,
      aggregateType: row.aggregate_type as string,
      aggregateId: row.aggregate_id as string,
      correlationId: row.correlation_id as string,
      attempts: row.attempts as number,
      lastError: row.last_error as string | null,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
      alertLevel: (row.alert_level as string | null) ?? null,
      ageMinutes: (row.age_minutes as number | null) ?? 0,
      alertStatus: (row.alert_status as string | null) ?? null,
      alertCount: (row.alert_count as number | null) ?? 0,
      firstSeenAt: row.first_seen_at ? (row.first_seen_at as Date).toISOString() : null,
      replayedAt: row.replayed_at ? (row.replayed_at as Date).toISOString() : null,
    }));
  }

  async replayAll(context: OrganizationContext, requestId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        `update outbox_events
         set status='pending', available_at=now(), attempts=0, last_error=null, updated_at=now(), updated_by=$1
         where status='needs_attention' and deleted_at is null
         returning id`,
        [context.userId],
      );
      const ids = result.rows.map((r) => r.id as string);
      if (ids.length) {
        await client.query(
          `update outbox_dlq_alerts set status='cleared',replayed_at=now(),replayed_by=$1,updated_at=now(),version=version+1
           where outbox_event_id = any($2::uuid[]) and status='active'`,
          [context.userId, ids],
        );
        await client.query(
          "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'platform.outbox.replay_all','outbox_events',$4,$5,'page-p-120',$6,$3,$3)",
          [
            randomUUID(),
            context.tenantId,
            context.userId,
            ids[0],
            requestId,
            { replayedCount: ids.length, eventIds: ids },
          ],
        );
        await client.query(
          `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by)
           values($1,$2,'platform.outbox.replay_all.v1','outbox_dlq_alerts',$3,$4,$5,'page-p-120',$6,$6)`,
          [
            randomUUID(),
            context.tenantId,
            ids[0],
            { replayedCount: ids.length, eventIds: ids },
            requestId,
            context.userId,
          ],
        );
      }
      await client.query('commit');
      return { replayedCount: ids.length };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async replayOne(context: OrganizationContext, eventId: string, eventTenantId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(eventTenantId))
      throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        `update outbox_events
         set status='pending', available_at=now(), attempts=0, last_error=null, updated_at=now(), updated_by=$3
         where id=$1 and tenant_id=$2 and status='needs_attention' and deleted_at is null
         returning id,tenant_id`,
        [eventId, eventTenantId, context.userId],
      );
      if (result.rowCount !== 1) {
        await client.query('commit');
        throw new NotFoundException('NOT_FOUND');
      }
      await client.query(
        `update outbox_dlq_alerts set status='cleared',replayed_at=now(),replayed_by=$1,updated_at=now(),version=version+1
         where outbox_event_id=$2 and status='active'`,
        [context.userId, eventId],
      );
      await client.query('commit');
      return {
        eventId,
        tenantId: result.rows[0].tenant_id as string,
        status: 'pending',
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
