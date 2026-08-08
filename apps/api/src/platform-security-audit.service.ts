import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const key = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-z0-9:_-]{3,180}$/.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};
const text = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 500)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const version = (value: unknown) => {
  if (!Number.isInteger(value) || (value as number) < 1)
    throw new BadRequestException('VALIDATION_ERROR');
  return value as number;
};

@Injectable()
export class PlatformSecurityAuditService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async list(context: OrganizationContext) {
    const [risks, events] = await Promise.all([
      this.pool.query(
        `with signals as (
          select 'connector:'||id::text risk_key,'connector_health' kind,code label,health_status severity,'Connector health observation requires review.' detail from platform_connector_definitions where tenant_id=$1 and health_status in ('degraded','unavailable') and deleted_at is null
          union all
          select 'privilege:'||id::text,'privileged_change',action,'review', 'A privileged configuration change is traceable in the audit log.' from audit_logs where action in ('rbac.role_permissions_updated','platform.tenant_updated') and deleted_at is null
          union all
          select 'connector-config:'||id::text,'connector_attention',code,status,'Tenant connector authorization requires attention.' from connector_configs where status not in ('authorized','pending_authorization') and deleted_at is null
        ) select s.*,r.status review_status,r.note review_note,r.version review_version,r.reviewed_at from signals s left join platform_security_reviews r on r.tenant_id=$1 and r.risk_key=s.risk_key and r.deleted_at is null order by kind,label limit 100`,
        [context.tenantId],
      ),
      this.pool.query(
        `select action,resource_type,resource_id,correlation_id,trace_id,created_at from audit_logs where deleted_at is null and (action like 'platform.%' or action like 'connector.%' or action like 'rbac.%' or action like 'auth.%') order by created_at desc limit 80`,
      ),
    ]);
    return { risks: risks.rows, events: events.rows };
  }
  async acknowledge(
    context: OrganizationContext,
    body: Record<string, unknown>,
    idempotencyKey: string,
    requestId: string,
  ) {
    if (!idempotencyKey.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      riskKey: key(body.riskKey),
      note: text(body.note),
      version: version(body.version),
    };
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'platform_security_review', idempotencyKey],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const existing = (
        await client.query(
          'select * from platform_security_reviews where tenant_id=$1 and risk_key=$2 and deleted_at is null for update',
          [context.tenantId, input.riskKey],
        )
      ).rows[0];
      if (existing && existing.version !== input.version) throw new ConflictException('CONFLICT');
      const row = existing
        ? (
            await client.query(
              "update platform_security_reviews set status='acknowledged',note=$1,reviewed_at=now(),updated_at=now(),updated_by=$2,version=version+1 where id=$3 returning id,risk_key,status,note,version,reviewed_at",
              [input.note, context.userId, existing.id],
            )
          ).rows[0]
        : (
            await client.query(
              "insert into platform_security_reviews(id,tenant_id,risk_key,status,note,created_by,updated_by) values($1,$2,$3,'acknowledged',$4,$5,$5) returning id,risk_key,status,note,version,reviewed_at",
              [randomUUID(), context.tenantId, input.riskKey, input.note, context.userId],
            )
          ).rows[0];
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'platform.security_risk_acknowledged','platform_security_review',$4,$5,'page-p-008',$6,$3,$3)",
        [randomUUID(), context.tenantId, context.userId, row.id, requestId, row],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'platform.security_risk.acknowledged.v1','platform_security_review',$3,$4,$5,'page-p-008',$6,$6)",
        [randomUUID(), context.tenantId, row.id, row, requestId, context.userId],
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [
          randomUUID(),
          context.tenantId,
          'platform_security_review',
          idempotencyKey,
          row,
          context.userId,
        ],
      );
      await client.query('commit');
      return row;
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
