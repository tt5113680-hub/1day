import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const uuid = /^[0-9a-f-]{36}$/i;
const code = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-z0-9-]{2,80}$/.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};
const text = (value: unknown, limit: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const benefits = (value: unknown) => {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 8 ||
    value.some((x) => typeof x !== 'string' || !x.trim() || x.trim().length > 120)
  )
    throw new BadRequestException('VALIDATION_ERROR');
  return value.map((x) => (x as string).trim());
};

@Injectable()
export class PlatformBusinessCircleService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext) {
    const [circles, merchantPool] = await Promise.all([
      this.pool.query(
        `select c.id,c.code,c.name,c.description,c.status,c.version,
          coalesce(json_agg(json_build_object('tenantId',m.merchant_tenant_id,'name',t.name,'slug',t.slug,'benefits',m.benefits,'recommendationReason',m.recommendation_reason,'approvalStatus',m.approval_status,'version',m.version) order by t.name) filter(where m.id is not null),'[]') merchants
         from platform_business_circles c
         left join platform_business_circle_merchants m on m.circle_id=c.id and m.tenant_id=c.tenant_id and m.deleted_at is null
         left join tenants t on t.id=m.merchant_tenant_id and t.deleted_at is null
         where c.tenant_id=$1 and c.deleted_at is null group by c.id order by c.created_at`,
        [context.tenantId],
      ),
      this.pool.query(
        "select id as tenant_id,slug,name from tenants where id<>$1 and status='active' and deleted_at is null order by created_at desc",
        [context.tenantId],
      ),
    ]);
    return {
      circles: circles.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        status: row.status,
        version: row.version,
        merchants: row.merchants,
      })),
      merchantPool: merchantPool.rows.map((row) => ({
        tenantId: row.tenant_id,
        slug: row.slug,
        name: row.name,
      })),
    };
  }

  async create(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || !uuid.test(requestId)) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      code: code(body.code),
      name: text(body.name, 160),
      description: text(body.description, 320),
      merchantTenantId: text(body.merchantTenantId, 36),
      benefits: benefits(body.benefits),
      recommendationReason: text(body.recommendationReason, 320),
    };
    if (!uuid.test(input.merchantTenantId)) throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const replay = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'platform_business_circle', key],
      );
      if (replay.rowCount) {
        await q.query('commit');
        return replay.rows[0].response;
      }
      const merchant = (
        await q.query(
          "select id,slug,name from tenants where id=$1 and status='active' and deleted_at is null",
          [input.merchantTenantId],
        )
      ).rows[0];
      if (!merchant) throw new BadRequestException('MERCHANT_TENANT_NOT_AVAILABLE');
      const circleId = randomUUID();
      try {
        await q.query(
          'insert into platform_business_circles(id,tenant_id,code,name,description,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
          [circleId, context.tenantId, input.code, input.name, input.description, context.userId],
        );
      } catch (error: unknown) {
        if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
        throw error;
      }
      const membershipId = randomUUID();
      await q.query(
        'insert into platform_business_circle_merchants(id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7)',
        [
          membershipId,
          context.tenantId,
          circleId,
          merchant.id,
          JSON.stringify(input.benefits),
          input.recommendationReason,
          context.userId,
        ],
      );
      const response = {
        id: circleId,
        code: input.code,
        name: input.name,
        merchant: { tenantId: merchant.id, name: merchant.name, slug: merchant.slug },
        approvalStatus: 'pending',
        membershipId,
      };
      await this.record(
        q,
        context,
        'platform.business_circle_created',
        'platform.business_circle.created.v1',
        circleId,
        response,
        requestId,
      );
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'platform_business_circle', key, response, context.userId],
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

  async approve(
    context: OrganizationContext,
    circleId: string,
    merchantTenantId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (
      !uuid.test(circleId) ||
      !uuid.test(merchantTenantId) ||
      !key.trim() ||
      !uuid.test(requestId) ||
      !Number.isInteger(body.version)
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const replay = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'platform_business_circle_approval', key],
      );
      if (replay.rowCount) {
        await q.query('commit');
        return replay.rows[0].response;
      }
      const membership = (
        await q.query(
          "select * from platform_business_circle_merchants where tenant_id=$1 and circle_id=$2 and merchant_tenant_id=$3 and approval_status='pending' and deleted_at is null for update",
          [context.tenantId, circleId, merchantTenantId],
        )
      ).rows[0];
      if (!membership || membership.version !== body.version)
        throw new ConflictException('CONFLICT');
      const updated = (
        await q.query(
          "update platform_business_circle_merchants set approval_status='approved',approved_by=$1,approved_at=now(),updated_at=now(),updated_by=$1,version=version+1 where id=$2 returning id,circle_id,merchant_tenant_id,approval_status,version",
          [context.userId, membership.id],
        )
      ).rows[0];
      const response = {
        id: updated.id,
        circleId: updated.circle_id,
        merchantTenantId: updated.merchant_tenant_id,
        approvalStatus: updated.approval_status,
        version: updated.version,
      };
      await this.record(
        q,
        context,
        'platform.business_circle_merchant_approved',
        'platform.business_circle.merchant.approved.v1',
        updated.id,
        response,
        requestId,
      );
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [
          randomUUID(),
          context.tenantId,
          'platform_business_circle_approval',
          key,
          response,
          context.userId,
        ],
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
    q: { query: (text: string, values: unknown[]) => Promise<unknown> },
    context: OrganizationContext,
    action: string,
    event: string,
    resourceId: string,
    response: Record<string, unknown>,
    requestId: string,
  ) {
    await q.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'platform_business_circle',$5,$6,'page-p-005',$7,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, action, resourceId, requestId, response],
    );
    await q.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'platform_business_circle',$4,$5,$6,'page-p-005',$7,$7)",
      [randomUUID(), context.tenantId, event, resourceId, response, requestId, context.userId],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
