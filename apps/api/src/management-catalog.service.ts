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

  async list(context: OrganizationContext, storeIds: string[] | null = null) {
    const scoped = storeIds !== null;
    const params = scoped ? [context.tenantId, storeIds] : [context.tenantId];
    const storeFilter = scoped ? 'and id = any($2::uuid[])' : '';
    const serviceFilter = scoped ? 'and ss.store_id = any($2::uuid[])' : '';
    const linkFilter = scoped ? 'and sea.store_id = any($2::uuid[])' : '';
    const [stores, services, links] = await Promise.all([
      this.pool.query(
        `select id,name,status from stores where tenant_id=$1 and deleted_at is null ${storeFilter} order by status='active' desc,name`,
        params,
      ),
      this.pool.query(
        `select ss.id,ss.store_id,ss.code,ss.name,ss.description,ss.duration_minutes,ss.price_label,ss.category,ss.rank,ss.status,ss.version,
                coalesce(json_agg(jsonb_build_object(
                  'id',spo.id,'externalActionId',spo.external_action_id,'actionName',a.name,'platform',a.platform,
                  'targetUrl',a.target_url,'offerPrice',spo.offer_price,'marketPrice',spo.market_price,
                  'currency',spo.currency,'priceSource',spo.price_source,'sourceUpdatedAt',spo.source_updated_at,
                  'sortOrder',spo.sort_order,'status',spo.status,'version',spo.version
                ) order by spo.sort_order,a.name) filter (where spo.id is not null),'[]'::json) offers
         from store_services ss
         left join store_service_platform_offers spo on spo.service_id=ss.id and spo.tenant_id=ss.tenant_id and spo.deleted_at is null
         left join external_actions a on a.id=spo.external_action_id and a.tenant_id=spo.tenant_id and a.deleted_at is null
         where ss.tenant_id=$1 and ss.deleted_at is null ${serviceFilter}
         group by ss.id order by ss.store_id,ss.rank desc,ss.name`,
        params,
      ),
      this.pool.query(
        `select sea.id as link_id,sea.store_id,a.id as action_id,a.name,a.platform,a.target_url
         from store_external_actions sea
         join external_actions a on a.id=sea.external_action_id and a.tenant_id=sea.tenant_id and a.status='active' and a.deleted_at is null
         where sea.tenant_id=$1 and sea.enabled and sea.deleted_at is null and a.action_type='link' ${linkFilter}
         order by sea.store_id,sea.sort_order,a.name`,
        params,
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

  async serviceStoreId(tenantId: string, serviceId: string) {
    if (!UUID.test(serviceId)) return null;
    const row = (
      await this.pool.query(
        'select store_id from store_services where id=$1 and tenant_id=$2 and deleted_at is null',
        [serviceId, tenantId],
      )
    ).rows[0];
    return row?.store_id ? String(row.store_id) : null;
  }

  async offerStoreId(tenantId: string, offerId: string) {
    if (!UUID.test(offerId)) return null;
    const row = (
      await this.pool.query(
        'select store_id from store_service_platform_offers where id=$1 and tenant_id=$2 and deleted_at is null',
        [offerId, tenantId],
      )
    ).rows[0];
    return row?.store_id ? String(row.store_id) : null;
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
      category: optionalText(body.category, 80),
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
          'insert into store_services(id,tenant_id,store_id,code,name,description,duration_minutes,price_label,category,rank,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) returning id,store_id,code,name,description,duration_minutes,price_label,category,rank,status,version',
          [
            id,
            context.tenantId,
            storeId,
            input.code,
            input.name,
            input.description,
            input.durationMinutes,
            input.priceLabel,
            input.category,
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
      `update store_services set name=$1,description=$2,duration_minutes=$3,price_label=$4,category=$5,rank=$6,status=$7,
       version=version+1,updated_at=now(),updated_by=$8
       where id=$9 and tenant_id=$10 and deleted_at is null and version=$11
       returning id,store_id,code,name,description,duration_minutes,price_label,category,rank,status,version`,
      [
        text(body.name, 160),
        optionalText(body.description, 1000),
        body.durationMinutes === undefined || body.durationMinutes === null
          ? null
          : integer(body.durationMinutes, 1),
        optionalText(body.priceLabel, 80),
        optionalText(body.category, 80),
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

  /**
   * G1-W∞-112 — 商品分类树（MPC-03）：按 category 分组，返回树形层级。
   * 分类维度组 + 组内套餐 + 覆盖门店；诚实边界：仅为入口组织维度，不涉及成交/支付。
   */
  async categoryTree(context: OrganizationContext, storeIds: string[] | null) {
    const scoped = storeIds !== null;
    const params: unknown[] = scoped ? [context.tenantId, storeIds] : [context.tenantId];
    const storeFilter = scoped ? 'and s.id = any($2::uuid[])' : '';
    const rows = (
      await this.pool.query(
        `select s.id as store_id, s.name as store_name,
                ss.id as service_id, ss.code as service_code, ss.name as service_name,
                ss.description, ss.duration_minutes, ss.price_label, ss.category, ss.rank, ss.status, ss.version,
                ss.offer_count
         from (
           select ssg.*, (
             select count(*) from store_service_platform_offers o
             where o.service_id = ssg.id and o.tenant_id = ssg.tenant_id and o.deleted_at is null
           )::int as offer_count
           from store_services ssg
         ) ss
         join stores s on s.id = ss.store_id and s.tenant_id = ss.tenant_id and s.deleted_at is null
         where ss.tenant_id=$1 and ss.deleted_at is null ${storeFilter}
         order by coalesce(nullif(ss.category,''), '~未分类') asc, ss.store_id, ss.rank desc, ss.name`,
        params,
      )
    ).rows;

    const categories = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const category = row.category ? String(row.category) : '(未分类)';
      if (!categories.has(category)) {
        categories.set(category, {
          category,
          unassigned: !row.category,
          services: [] as unknown[],
          storeIds: new Set<string>(),
        });
      }
      const group = categories.get(category)!;
      (group.storeIds as Set<string>).add(String(row.store_id));
      (group.services as unknown[]).push({
        id: row.service_id,
        storeId: row.store_id,
        storeName: row.store_name,
        code: row.service_code,
        name: row.service_name,
        description: row.description,
        durationMinutes: row.duration_minutes,
        priceLabel: row.price_label,
        rank: Number(row.rank),
        status: row.status,
        version: Number(row.version),
        offerCount: Number(row.offer_count),
      });
    }
    return {
      categories: [...categories.values()].map((group) => ({
        category: group.category,
        unassigned: group.unassigned,
        storeCount: (group.storeIds as Set<string>).size,
        serviceCount: (group.services as unknown[]).length,
        services: group.services,
      })),
      disclaimer:
        '分类是商品/套餐入口的组织维度（source=local）；条目与计数均由真实套餐档案行推导，不含支付与第三方成交。',
    };
  }

  /**
   * G1-W∞-112 — 批量上下架（MPC-03）：对一个门店（或 scoped）内多个套餐批量置上下架。
   * 幂等 + audit + outbox；仅登记套餐可见状态，不碰价格/成交。
   */
  async batchSetServiceStatus(
    context: OrganizationContext,
    storeId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!UUID.test(storeId) || !key.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const rawIds = body.serviceIds;
    if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 200)
      throw new BadRequestException('VALIDATION_ERROR');
    const status = text(body.status, 32);
    if (!['active', 'inactive'].includes(status)) throw new BadRequestException('VALIDATION_ERROR');
    const serviceIds = rawIds.map((id) => {
      if (typeof id !== 'string' || !UUID.test(id))
        throw new BadRequestException('VALIDATION_ERROR');
      return id;
    });
    return this.idempotent(context, `catalog_service_batch:${storeId}`, key, async (client) => {
      const update = await client.query(
        `update store_services set status=$1, updated_at=now(), updated_by=$2, version=version+1
         where tenant_id=$3 and store_id=$4 and id = any($5::uuid[]) and deleted_at is null
         returning id, code, name, status, version`,
        [status, context.userId, context.tenantId, storeId, serviceIds],
      );
      const updated = update.rows as {
        id: string;
        code: string;
        name: string;
        status: string;
        version: number;
      }[];
      await this.receipt(
        client,
        context,
        `catalog.service_batch_${status}`,
        `catalog.service.batch_${status}.v1`,
        storeId,
        requestId,
        {
          status,
          serviceIds: updated.map((row) => row.id),
          count: updated.length,
          names: updated.map((row) => row.name),
        },
      );
      return {
        storeId,
        status,
        effected: updated.length,
        services: updated,
      };
    });
  }

  /**
   * G1-W∞-112 — 跳转排行（MPC-03）：按真实 entry_funnel_events 中 jump/jump_confirm 聚合到
   * 具体套餐（offer）→ 归一到套餐。诚实边界：仅统计入口出站跳转痕迹，**不含支付、不含成交、不代第三方成交**。
   */
  async jumpRank(context: OrganizationContext, storeIds: string[] | null, daysRaw: unknown) {
    const days =
      typeof daysRaw === 'number'
        ? Math.max(1, Math.min(90, Math.floor(daysRaw)))
        : typeof daysRaw === 'string' && /^\d{1,2}$/.test(daysRaw)
          ? Math.max(1, Math.min(90, Number(daysRaw)))
          : 30;
    const scoped = storeIds !== null;
    const params: unknown[] = scoped
      ? [context.tenantId, days, storeIds]
      : [context.tenantId, days];
    const storeFilter = scoped ? 'and ss.store_id = any($3::uuid[])' : '';
    const rows = (
      await this.pool.query(
        `select ss.id as service_id, ss.name as service_name, ss.store_id,
                coalesce(pair.jump_total,0)::int as jump_total,
                coalesce(pair.confirm_total,0)::int as confirm_total,
                coalesce(pair.distinct_modules,0)::int as distinct_modules
         from store_services ss
         left join (
           select sef.service_id,
                  sum(case when e.event_code='jump' then 1 else 0 end)::int as jump_total,
                  sum(case when e.event_code='jump_confirm' then 1 else 0 end)::int as confirm_total,
                  count(distinct e.module_key) filter (where e.module_key is not null and e.module_key <> '')::int as distinct_modules
           from store_service_platform_offers sef
           join external_actions a
             on a.id = sef.external_action_id and a.tenant_id = sef.tenant_id and a.deleted_at is null
           join entry_funnel_events e
             on e.tenant_id = sef.tenant_id
             and e.event_code in ('jump','jump_confirm')
             and e.occurred_at >= now() - make_interval(days => $2)
             and e.target_url is not null
             and (e.target_url = a.target_url or e.module_key = a.name)
           where sef.tenant_id=$1 and sef.deleted_at is null
           group by sef.service_id
         ) pair on pair.service_id = ss.id
         where ss.tenant_id=$1 and ss.deleted_at is null ${storeFilter}
           and coalesce(pair.jump_total,0) > 0
         order by coalesce(pair.jump_total,0) desc, ss.name asc`,
        params,
      )
    ).rows;
    const totalJumps = rows.reduce((acc, row) => acc + Number(row.jump_total ?? 0), 0);
    const totalConfirms = rows.reduce((acc, row) => acc + Number(row.confirm_total ?? 0), 0);
    return {
      days,
      totalJumps,
      totalConfirms,
      items: rows.map((row) => ({
        serviceId: row.service_id,
        serviceName: row.service_name,
        storeId: row.store_id,
        jumps: Number(row.jump_total ?? 0),
        jumpConfirms: Number(row.confirm_total ?? 0),
        distinctModules: Number(row.distinct_modules ?? 0),
        sharePct:
          totalJumps > 0
            ? Number(((Number(row.jump_total ?? 0) / totalJumps) * 100).toFixed(1))
            : 0,
      })),
      disclaimer:
        '跳转排行仅聚合入口痕迹中的出站跳转（event_code = jump / jump_confirm，source=local）；不接美团/抖音实时，也不代表第三方成交或支付。',
    };
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
