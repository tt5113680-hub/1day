import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const uuid = /^[0-9a-f-]{36}$/i;
const string = (value: unknown, max: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const config = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('VALIDATION_ERROR');
  const input = value as Record<string, unknown>;
  if (
    typeof input.visible !== 'boolean' ||
    !Number.isInteger(input.sortOrder) ||
    (input.sortOrder as number) < 0 ||
    (input.sortOrder as number) > 999 ||
    (input.headline !== undefined &&
      (typeof input.headline !== 'string' || input.headline.length > 120))
  )
    throw new BadRequestException('VALIDATION_ERROR');
  return {
    visible: input.visible,
    sortOrder: input.sortOrder,
    headline: typeof input.headline === 'string' ? input.headline.trim() : null,
  };
};
const benefits = (value: unknown) => {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 8 ||
    value.some((item) => typeof item !== 'string' || !item.trim() || item.trim().length > 120)
  )
    throw new BadRequestException('VALIDATION_ERROR');
  return value.map((item) => (item as string).trim());
};

@Injectable()
export class CircleMerchantService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(tenantId: string, circleIds: string[] | null = null) {
    const scoped = circleIds !== null;
    const memberFilter = scoped ? ' and m.circle_id = any($2::uuid[])' : '';
    const memberParams = scoped ? [tenantId, circleIds] : [tenantId];
    const [members, merchantPool] = await Promise.all([
      this.pool.query(
        `select m.id,m.circle_id,c.code circle_code,c.name circle_name,m.merchant_tenant_id,t.name,t.slug,m.benefits,m.invitation_status,m.invitation_note,m.circle_approval_status,m.approval_status,m.display_config,m.exit_reason,m.version from platform_business_circle_merchants m join platform_business_circles c on c.id=m.circle_id and c.tenant_id=m.tenant_id and c.deleted_at is null join tenants t on t.id=m.merchant_tenant_id and t.deleted_at is null where m.tenant_id=$1 and m.deleted_at is null${memberFilter} order by c.name,t.name`,
        memberParams,
      ),
      this.pool.query(
        `select t.id tenant_id,t.name,t.slug from tenants t where t.id<>$1 and t.status='active' and t.deleted_at is null and not exists(select 1 from platform_business_circle_merchants m where m.tenant_id=$1 and m.merchant_tenant_id=t.id and m.deleted_at is null) order by t.name`,
        [tenantId],
      ),
    ]);
    return {
      members: members.rows.map((row) => ({
        id: row.id,
        circleId: row.circle_id,
        circleCode: row.circle_code,
        circleName: row.circle_name,
        merchantTenantId: row.merchant_tenant_id,
        name: row.name,
        slug: row.slug,
        benefits: row.benefits,
        invitationStatus: row.invitation_status,
        invitationNote: row.invitation_note,
        circleApprovalStatus: row.circle_approval_status,
        platformApprovalStatus: row.approval_status,
        displayConfig: row.display_config,
        exitReason: row.exit_reason,
        version: row.version,
      })),
      merchantPool: merchantPool.rows.map((row) => ({
        tenantId: row.tenant_id,
        name: row.name,
        slug: row.slug,
      })),
    };
  }

  async invite(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || !uuid.test(requestId)) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      circleId: string(body.circleId, 36),
      merchantTenantId: string(body.merchantTenantId, 36),
      benefits: benefits(body.benefits),
      invitationNote: string(body.invitationNote, 320),
      displayConfig: config(body.displayConfig),
    };
    if (!uuid.test(input.circleId) || !uuid.test(input.merchantTenantId))
      throw new BadRequestException('VALIDATION_ERROR');
    return this.transaction(context, 'circle_merchant_invitation', key, requestId, async (q) => {
      const [circle, merchant] = await Promise.all([
        q.query(
          "select id from platform_business_circles where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
          [input.circleId, context.tenantId],
        ),
        q.query("select id from tenants where id=$1 and status='active' and deleted_at is null", [
          input.merchantTenantId,
        ]),
      ]);
      if (!circle.rowCount || !merchant.rowCount) throw new BadRequestException('NOT_AVAILABLE');
      const id = randomUUID();
      try {
        await q.query(
          "insert into platform_business_circle_merchants(id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,invitation_status,invitation_note,circle_approval_status,display_config,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'prepared',$7,'pending',$8,$9,$9)",
          [
            id,
            context.tenantId,
            input.circleId,
            input.merchantTenantId,
            JSON.stringify(input.benefits),
            input.invitationNote,
            input.invitationNote,
            JSON.stringify(input.displayConfig),
            context.userId,
          ],
        );
      } catch (error: unknown) {
        if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
        throw error;
      }
      return this.record(
        q,
        context,
        'circle.merchant_invited',
        'circle.merchant.invited.v1',
        id,
        {
          id,
          ...input,
          invitationStatus: 'prepared',
          circleApprovalStatus: 'pending',
          platformApprovalStatus: 'pending',
          version: 1,
        },
        requestId,
      );
    });
  }

  async circleApprove(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    return this.transition(
      context,
      id,
      body,
      key,
      requestId,
      'circle_merchant_circle_approval',
      "circle_approval_status='approved'",
      "circle_approval_status='pending' and approval_status='pending'",
      'circle.merchant_circle_approved',
      'circle.merchant.circle_approved.v1',
    );
  }
  async platformApprove(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    return this.transition(
      context,
      id,
      body,
      key,
      requestId,
      'circle_merchant_platform_approval',
      "invitation_status='accepted',approval_status='approved',approved_by=$1,approved_at=now()",
      "circle_approval_status='approved' and approval_status='pending'",
      'circle.merchant_platform_approved',
      'circle.merchant.platform_approved.v1',
    );
  }

  async display(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    const displayConfig = config(body.displayConfig);
    return this.transaction(context, 'circle_merchant_display', key, requestId, async (q) => {
      if (!uuid.test(id) || !Number.isInteger(body.version))
        throw new BadRequestException('VALIDATION_ERROR');
      const updated = (
        await q.query(
          "update platform_business_circle_merchants set display_config=$1,version=version+1,updated_at=now(),updated_by=$2 where id=$3 and tenant_id=$4 and approval_status='approved' and version=$5 and deleted_at is null returning id,version",
          [JSON.stringify(displayConfig), context.userId, id, context.tenantId, body.version],
        )
      ).rows[0];
      if (!updated) throw new ConflictException('CONFLICT');
      return this.record(
        q,
        context,
        'circle.merchant_display_updated',
        'circle.merchant.display_updated.v1',
        id,
        { id, displayConfig, version: updated.version },
        requestId,
      );
    });
  }

  async exit(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    const reason = string(body.reason, 320);
    return this.transaction(context, 'circle_merchant_exit', key, requestId, async (q) => {
      if (!uuid.test(id) || !Number.isInteger(body.version))
        throw new BadRequestException('VALIDATION_ERROR');
      const updated = (
        await q.query(
          "update platform_business_circle_merchants set approval_status='exited',circle_approval_status='exited',status='exited',exit_reason=$1,exited_at=now(),version=version+1,updated_at=now(),updated_by=$2 where id=$3 and tenant_id=$4 and approval_status in ('pending','approved') and version=$5 and deleted_at is null returning id,version",
          [reason, context.userId, id, context.tenantId, body.version],
        )
      ).rows[0];
      if (!updated) throw new ConflictException('CONFLICT');
      return this.record(
        q,
        context,
        'circle.merchant_exited',
        'circle.merchant.exited.v1',
        id,
        { id, reason, version: updated.version },
        requestId,
      );
    });
  }

  private async transition(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
    resource: string,
    set: string,
    condition: string,
    action: string,
    event: string,
  ) {
    return this.transaction(context, resource, key, requestId, async (q) => {
      if (!uuid.test(id) || !Number.isInteger(body.version))
        throw new BadRequestException('VALIDATION_ERROR');
      const updated = (
        await q.query(
          `update platform_business_circle_merchants set ${set},version=version+1,updated_at=now(),updated_by=$1 where id=$2 and tenant_id=$3 and ${condition} and version=$4 and deleted_at is null returning id,circle_approval_status,approval_status,version`,
          [context.userId, id, context.tenantId, body.version],
        )
      ).rows[0];
      if (!updated) throw new ConflictException('CONFLICT');
      return this.record(
        q,
        context,
        action,
        event,
        id,
        {
          id: updated.id,
          circleApprovalStatus: updated.circle_approval_status,
          platformApprovalStatus: updated.approval_status,
          version: updated.version,
        },
        requestId,
      );
    });
  }

  private async transaction(
    context: OrganizationContext,
    resource: string,
    key: string,
    requestId: string,
    work: (q: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    if (!key.trim() || !uuid.test(requestId)) throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const replay = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, resource, key],
      );
      if (replay.rowCount) {
        await q.query('commit');
        return replay.rows[0].response;
      }
      const response = await work(q);
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, resource, key, response, context.userId],
      );
      await q.query('commit');
      return response;
    } catch (error) {
      await q.query('rollback');
      throw error;
    } finally {
      q.release();
    }
  }

  private async record(
    q: PoolClient,
    context: OrganizationContext,
    action: string,
    event: string,
    id: string,
    response: Record<string, unknown>,
    requestId: string,
  ) {
    await q.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'platform_business_circle_merchant',$5,$6,'circle-002',$7,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, action, id, requestId, response],
    );
    await q.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'platform_business_circle_merchant',$4,$5,$6,'circle-002',$7,$7)",
      [randomUUID(), context.tenantId, event, id, response, requestId, context.userId],
    );
    return response;
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
