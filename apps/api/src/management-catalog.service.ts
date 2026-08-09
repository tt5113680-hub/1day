import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const text = (value: unknown, max: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const optionalText = (value: unknown, max: number) => {
  if (value === undefined || value === null || value === '') return null;
  return text(value, max);
};
const integer = (value: unknown, min = 0) => {
  if (!Number.isInteger(value) || (value as number) < min)
    throw new BadRequestException('VALIDATION_ERROR');
  return value as number;
};
const money = (value: unknown, optional = false) => {
  if (optional && (value === undefined || value === null || value === '')) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000000)
    throw new BadRequestException('VALIDATION_ERROR');
  return Math.round(amount * 100) / 100;
};

@Injectable()
export class ManagementCatalogService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext) {
    const [stores, services, links] = await Promise.all([
      this.pool.query(
        "select id,name,status from stores where tenant_id=$1 and deleted_at is null order by status='active' desc,name",
        [context.tenantId],
      ),
      this.pool.query(
        `select ss.id,ss.store_id,ss.code,ss.name,ss.description,ss.duration_minutes,ss.price_label,ss.rank,ss.status,ss.version,
                coalesce(json_agg(jsonb_build_object(
                  'id',spo.id,'externalActionId',spo.external_action_id,'actionName',a.name,'platform',a.platform,
                  'targetUrl',a.target_url,'offerPrice',spo.offer_price,'marketPrice',spo.market_price,
                  'currency',spo.currency,'priceSource',spo.price_source,'sourceUpdatedAt',spo.source_updated_at,
                  'sortOrder',spo.sort_order,'status',spo.status,'version',spo.version
                ) order by spo.sort_order,a.name) filter (where spo.id is not null),'[]'::json) offers
         from store_services ss
         left join store_service_platform_offers spo on spo.service_id=ss.id and spo.tenant_id=ss.tenant_id and spo.deleted_at is null
         left join external_actions a on a.id=spo.external_action_id and a.tenant_id=spo.tenant_id and a.deleted_at is null
         where ss.tenant_id=$1 and ss.deleted_at is null
         group by ss.id order by ss.store_id,ss.rank desc,ss.name`,
        [context.tenantId],
      ),
      this.pool.query(
        `select sea.id as link_id,sea.store_id,a.id as action_id,a.name,a.platform,a.target_url
         from store_external_actions sea
         join external_actions a on a.id=sea.external_action_id and a.tenant_id=sea.tenant_id and a.status='active' and a.deleted_at is null
         where sea.tenant_id=$1 and sea.enabled and sea.deleted_at is null and a.action_type='link'
         order by sea.store_id,sea.sort_order,a.name`,
        [context.tenantId],
      ),
    ]);
    return stores.rows.map((store) => ({
      id: store.id,
      name: store.name,
      status: store.status,
      services: services.rows.filter((service) => service.store_id === store.id),
      externalLinks: links.rows
        .filter((link) => link.store_id === store.id)
        .map((link) => ({
          linkId: link.link_id,
          actionId: link.action_id,
          name: link.name,
          platform: link.platform,
          targetUrl: link.target_url,
        })),
    }));
  }

  async createService(
    context: OrganizationContext,
    storeId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!UUID.test(storeId) || !key.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      code: text(body.code, 80),
      name: text(body.name, 160),
      description: optionalText(body.description, 1000),
      durationMinutes:
        body.durationMinutes === undefined || body.durationMinutes === null
          ? null
          : integer(body.durationMinutes, 1),
      priceLabel: optionalText(body.priceLabel, 80),
      rank: body.rank === undefined ? 0 : integer(body.rank),
    };
    return this.idempotent(context, `catalog_service:${storeId}`, key, async (client) => {
      const store = await client.query(
        "select id from stores where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
        [storeId, context.tenantId],
      );
      if (!store.rowCount) throw new NotFoundException('NOT_FOUND');
      const id = randomUUID();
      const row = (
        await client.query(
          'insert into store_services(id,tenant_id,store_id,code,name,description,duration_minutes,price_label,rank,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning id,store_id,code,name,description,duration_minutes,price_label,rank,status,version',
          [
            id,
            context.tenantId,
            storeId,
            input.code,
            input.name,
            input.description,
            input.durationMinutes,
            input.priceLabel,
            input.rank,
            context.userId,
          ],
        )
      ).rows[0];
      await this.receipt(
        client,
        context,
        'catalog.service_created',
        'catalog.service.created.v1',
        id,
        requestId,
        row,
      );
      return row;
    });
  }

  async updateService(
    context: OrganizationContext,
    serviceId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!UUID.test(serviceId)) throw new BadRequestException('VALIDATION_ERROR');
    const status = text(body.status, 32);
    if (!['active', 'inactive'].includes(status)) throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      `update store_services set name=$1,description=$2,duration_minutes=$3,price_label=$4,rank=$5,status=$6,
       version=version+1,updated_at=now(),updated_by=$7
       where id=$8 and tenant_id=$9 and deleted_at is null and version=$10
       returning id,store_id,code,name,description,duration_minutes,price_label,rank,status,version`,
      [
        text(body.name, 160),
        optionalText(body.description, 1000),
        body.durationMinutes === undefined || body.durationMinutes === null
          ? null
          : integer(body.durationMinutes, 1),
        optionalText(body.priceLabel, 80),
        body.rank === undefined ? 0 : integer(body.rank),
        status,
        context.userId,
        serviceId,
        context.tenantId,
        integer(body.version, 1),
      ],
    );
    if (!result.rowCount) throw new ConflictException('CONFLICT');
    await this.receipt(
      this.pool,
      context,
      'catalog.service_updated',
      'catalog.service.updated.v1',
      serviceId,
      requestId,
      result.rows[0],
    );
    return result.rows[0];
  }

  async createOffer(
    context: OrganizationContext,
    serviceId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!UUID.test(serviceId) || !UUID.test(String(body.externalActionId)) || !key.trim())
      throw new BadRequestException('VALIDATION_ERROR');
    const input = this.offerInput(body);
    return this.idempotent(context, `catalog_offer:${serviceId}`, key, async (client) => {
      const source = (
        await client.query(
          `select ss.store_id,a.id as action_id
           from store_services ss
           join store_external_actions sea on sea.store_id=ss.store_id and sea.tenant_id=ss.tenant_id and sea.external_action_id=$3 and sea.enabled and sea.deleted_at is null
           join external_actions a on a.id=sea.external_action_id and a.tenant_id=sea.tenant_id and a.action_type='link' and a.status='active' and a.target_url like 'https://%' and a.deleted_at is null
           where ss.id=$1 and ss.tenant_id=$2 and ss.status='active' and ss.deleted_at is null`,
          [serviceId, context.tenantId, body.externalActionId],
        )
      ).rows[0];
      if (!source) throw new NotFoundException('NOT_FOUND');
      const id = randomUUID();
      const row = (
        await client.query(
          `insert into store_service_platform_offers(id,tenant_id,store_id,service_id,external_action_id,offer_price,market_price,currency,price_source,source_updated_at,sort_order,created_by,updated_by)
           values($1,$2,$3,$4,$5,$6,$7,'CNY',$8,$9,$10,$11,$11)
           returning id,store_id,service_id,external_action_id,offer_price,market_price,currency,price_source,source_updated_at,sort_order,status,version`,
          [
            id,
            context.tenantId,
            source.store_id,
            serviceId,
            source.action_id,
            input.offerPrice,
            input.marketPrice,
            input.priceSource,
            input.sourceUpdatedAt,
            input.sortOrder,
            context.userId,
          ],
        )
      ).rows[0];
      await this.receipt(
        client,
        context,
        'catalog.offer_created',
        'catalog.offer.created.v1',
        id,
        requestId,
        row,
      );
      return row;
    });
  }

  async updateOffer(
    context: OrganizationContext,
    offerId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!UUID.test(offerId)) throw new BadRequestException('VALIDATION_ERROR');
    const input = this.offerInput(body);
    const status = text(body.status, 32);
    if (!['active', 'inactive'].includes(status)) throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      `update store_service_platform_offers set offer_price=$1,market_price=$2,price_source=$3,source_updated_at=$4,
       sort_order=$5,status=$6,version=version+1,updated_at=now(),updated_by=$7
       where id=$8 and tenant_id=$9 and deleted_at is null and version=$10
       returning id,store_id,service_id,external_action_id,offer_price,market_price,currency,price_source,source_updated_at,sort_order,status,version`,
      [
        input.offerPrice,
        input.marketPrice,
        input.priceSource,
        input.sourceUpdatedAt,
        input.sortOrder,
        status,
        context.userId,
        offerId,
        context.tenantId,
        integer(body.version, 1),
      ],
    );
    if (!result.rowCount) throw new ConflictException('CONFLICT');
    await this.receipt(
      this.pool,
      context,
      'catalog.offer_updated',
      'catalog.offer.updated.v1',
      offerId,
      requestId,
      result.rows[0],
    );
    return result.rows[0];
  }

  private offerInput(body: Record<string, unknown>) {
    const offerPrice = money(body.offerPrice)!;
    const marketPrice = money(body.marketPrice, true);
    if (marketPrice !== null && marketPrice < offerPrice)
      throw new BadRequestException('VALIDATION_ERROR');
    const sourceUpdatedAt = new Date(text(body.sourceUpdatedAt, 40));
    if (Number.isNaN(sourceUpdatedAt.getTime()) || sourceUpdatedAt.getTime() > Date.now() + 60_000)
      throw new BadRequestException('VALIDATION_ERROR');
    return {
      offerPrice,
      marketPrice,
      priceSource: text(body.priceSource, 160),
      sourceUpdatedAt: sourceUpdatedAt.toISOString(),
      sortOrder: body.sortOrder === undefined ? 0 : integer(body.sortOrder),
    };
  }

  private async idempotent(
    context: OrganizationContext,
    type: string,
    key: string,
    action: (client: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('select pg_advisory_xact_lock(hashtext($1),hashtext($2))', [
        context.tenantId,
        `${type}:${key}`,
      ]);
      const existing = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, type, key],
      );
      if (existing.rowCount) {
        await client.query('commit');
        return existing.rows[0].response;
      }
      const data = await action(client);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, type, key, data, context.userId],
      );
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
      throw error;
    } finally {
      client.release();
    }
  }

  private async receipt(
    client: { query: PoolClient['query'] },
    context: OrganizationContext,
    action: string,
    eventType: string,
    id: string,
    requestId: string,
    details: unknown,
  ) {
    const correlationId = UUID.test(requestId) ? requestId : randomUUID();
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'commercial_catalog',$5,$6,'batch-2-catalog',$7,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, action, id, correlationId, details],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'commercial_catalog',$4,$5,$6,'batch-2-catalog',$7,$7)",
      [randomUUID(), context.tenantId, eventType, id, details, correlationId, context.userId],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
