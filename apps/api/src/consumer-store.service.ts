import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import { ConsumerOperatingOrchestrator } from './consumer-operating-orchestrator.service';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const source = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 160 || !/^[a-zA-Z0-9:_-]+$/.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};
const shareCode = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,48}$/.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};
const outboundUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('VALIDATION_ERROR');
  try {
    const parsed = new URL(value.trim());
    if (!['https:', 'tel:'].includes(parsed.protocol) || parsed.username || parsed.password)
      throw new Error('unsafe');
    return parsed.toString();
  } catch {
    throw new BadRequestException('VALIDATION_ERROR');
  }
};

@Injectable()
export class ConsumerStoreService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  constructor(private readonly operating: ConsumerOperatingOrchestrator) {}

  async detail(tenantSlug: string, storeId: string) {
    if (!SLUG.test(tenantSlug) || !UUID.test(storeId))
      throw new BadRequestException('VALIDATION_ERROR');
    const tenant = await this.tenant(tenantSlug);
    const store = (
      await this.pool.query(
        "select s.id,s.name,s.address,s.phone,s.business_hours,s.image_url,s.latitude,s.longitude,m.id as merchant_id,m.name as merchant_name,l.address_label from stores s join merchants m on m.id=s.merchant_id and m.tenant_id=s.tenant_id and m.status='active' and m.deleted_at is null left join merchant_locations l on l.merchant_id=m.id and l.tenant_id=m.tenant_id and l.status='active' and l.deleted_at is null where s.id=$1 and s.tenant_id=$2 and s.status='active' and s.deleted_at is null",
        [storeId, tenant.id],
      )
    ).rows[0];
    if (!store) throw new NotFoundException('NOT_FOUND');
    const [services, benefits, content, stores, actions, externalLinks, platformOffers] =
      await Promise.all([
        this.pool.query(
          "select id,name,description,duration_minutes,price_label from store_services where tenant_id=$1 and store_id=$2 and status='active' and deleted_at is null order by rank desc,name",
          [tenant.id, storeId],
        ),
        this.pool.query(
          "select b.id,b.title,b.description,b.external_action_id,a.name as action_name from store_benefits b left join external_actions a on a.id=b.external_action_id and a.tenant_id=b.tenant_id and a.status='active' and a.deleted_at is null where b.tenant_id=$1 and b.store_id=$2 and b.status='active' and b.deleted_at is null order by b.rank desc,b.title",
          [tenant.id, storeId],
        ),
        this.pool.query(
          "select id,content_type,title,summary from store_content_items where tenant_id=$1 and store_id=$2 and status='active' and deleted_at is null order by rank desc,title",
          [tenant.id, storeId],
        ),
        this.pool.query(
          "select id,name,address,business_hours,image_url from stores where tenant_id=$1 and merchant_id=$2 and status='active' and deleted_at is null order by name",
          [tenant.id, store.merchant_id],
        ),
        this.pool.query(
          "select id,name,action_type,target_url,mini_program_app_id,mini_program_path,platform from external_actions where tenant_id=$1 and status='active' and deleted_at is null order by case when action_type='platform_entry' then 0 else 1 end,created_at desc",
          [tenant.id],
        ),
        this.pool.query(
          `select sea.id as link_id,sea.description,sea.sort_order,a.id,a.name,a.action_type,a.target_url,a.platform
         from store_external_actions sea join external_actions a on a.id=sea.external_action_id and a.tenant_id=sea.tenant_id
         where sea.tenant_id=$1 and sea.store_id=$2 and sea.enabled and sea.deleted_at is null and a.status='active' and a.deleted_at is null
         order by sea.sort_order,sea.created_at`,
          [tenant.id, storeId],
        ),
        this.pool.query(
          `select spo.id as offer_id,spo.service_id,spo.external_action_id,spo.offer_price,spo.market_price,
                ss.name as service_name,ss.price_label,a.name as action_name,a.platform,a.target_url
         from store_service_platform_offers spo
         join store_services ss on ss.id=spo.service_id and ss.tenant_id=spo.tenant_id and ss.status='active' and ss.deleted_at is null
         join store_external_actions sea on sea.store_id=spo.store_id and sea.external_action_id=spo.external_action_id and sea.tenant_id=spo.tenant_id and sea.enabled and sea.deleted_at is null
         join external_actions a on a.id=spo.external_action_id and a.tenant_id=spo.tenant_id and a.status='active' and a.deleted_at is null
         where spo.tenant_id=$1 and spo.store_id=$2 and spo.status='active' and spo.deleted_at is null
         order by ss.rank desc,spo.sort_order,a.name`,
          [tenant.id, storeId],
        ),
      ]);
    return {
      tenant: { slug: tenant.slug, name: tenant.name },
      store: {
        id: store.id,
        name: store.name,
        address: store.address ?? store.address_label,
        merchant: store.merchant_name,
        phone: store.phone,
        businessHours: store.business_hours,
        imageUrl: store.image_url,
        latitude: store.latitude === null ? null : Number(store.latitude),
        longitude: store.longitude === null ? null : Number(store.longitude),
      },
      services: services.rows,
      benefits: benefits.rows,
      content: content.rows,
      actions: actions.rows.map((row) => ({
        id: row.id,
        name: row.name,
        actionType: row.action_type,
        targetUrl: row.target_url,
        miniProgramAppId: row.mini_program_app_id,
        miniProgramPath: row.mini_program_path,
        platform: row.platform,
      })),
      externalLinks: externalLinks.rows.map((row) => ({
        id: row.id,
        linkId: row.link_id,
        title: row.name,
        description: row.description,
        platformType: row.platform,
        targetUrl: row.target_url,
        actionType: row.action_type,
      })),
      platformOffers: platformOffers.rows.map((row) => ({
        id: row.external_action_id,
        offerId: row.offer_id,
        serviceId: row.service_id,
        serviceName: row.service_name,
        servicePriceLabel: row.price_label,
        title: row.action_name,
        platformType: row.platform,
        offerPrice: Number(row.offer_price),
        marketPrice: row.market_price === null ? null : Number(row.market_price),
        targetUrl: row.target_url,
      })),
      stores: stores.rows.map((row) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        businessHours: row.business_hours,
        imageUrl: row.image_url,
      })),
    };
  }

  async trackOutbound(tenantSlug: string, storeId: string, body: Record<string, unknown>) {
    if (!SLUG.test(tenantSlug) || !UUID.test(storeId))
      throw new BadRequestException('VALIDATION_ERROR');
    const tenant = await this.tenant(tenantSlug);
    const outboundType = body.outboundType;
    if (outboundType !== 'navigation' && outboundType !== 'phone')
      throw new BadRequestException('VALIDATION_ERROR');
    const targetUrl = outboundUrl(body.targetUrl);
    const eventSource = source(body.source);
    const safeScene = source(body.scene);
    const safeShareCode = shareCode(body.shareCode);
    const store = await this.pool.query(
      "select id from stores where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
      [storeId, tenant.id],
    );
    if (!store.rowCount) throw new NotFoundException('NOT_FOUND');
    const eventId = randomUUID(),
      correlationId = randomUUID(),
      traceId = randomUUID();
    const details = {
      storeId,
      outboundType,
      targetUrl,
      source: eventSource,
      scene: safeScene,
      shareCode: safeShareCode,
    };
    await this.pool.query(
      'insert into consumer_store_outbound_events(id,tenant_id,store_id,outbound_type,target_url,source,scene,share_code,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,null,null)',
      [eventId, tenant.id, storeId, outboundType, targetUrl, eventSource, safeScene, safeShareCode],
    );
    await this.pool.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,null,'consumer.store_outbound','consumer_store_outbound_event',$3,$4,$5,$6,null,null)",
      [randomUUID(), tenant.id, eventId, correlationId, traceId, details],
    );
    await this.pool.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'consumer.store.outbound.v1','consumer_store_outbound_event',$3,$4,$5,$6,null,null)",
      [randomUUID(), tenant.id, eventId, details, correlationId, traceId],
    );
    return { eventId, requestId: correlationId, traceId };
  }

  async serviceDetail(tenantSlug: string, serviceId: string) {
    if (!SLUG.test(tenantSlug) || !UUID.test(serviceId))
      throw new BadRequestException('VALIDATION_ERROR');
    const tenant = await this.tenant(tenantSlug);
    const service = (
      await this.pool.query(
        "select ss.id,ss.name,ss.description,ss.duration_minutes,ss.price_label,s.id as store_id,s.name as store_name,s.address,m.name as merchant_name from store_services ss join stores s on s.id=ss.store_id and s.tenant_id=ss.tenant_id and s.status='active' and s.deleted_at is null join merchants m on m.id=s.merchant_id and m.tenant_id=s.tenant_id and m.status='active' and m.deleted_at is null where ss.id=$1 and ss.tenant_id=$2 and ss.status='active' and ss.deleted_at is null",
        [serviceId, tenant.id],
      )
    ).rows[0];
    if (!service) throw new NotFoundException('NOT_FOUND');
    const [benefits, actions] = await Promise.all([
      this.pool.query(
        "select b.id,b.title,b.description,b.external_action_id from store_benefits b where b.tenant_id=$1 and b.store_id=$2 and b.status='active' and b.deleted_at is null order by b.rank desc,b.title",
        [tenant.id, service.store_id],
      ),
      this.pool.query(
        "select id,name,action_type,target_url,mini_program_app_id,mini_program_path,platform from external_actions where tenant_id=$1 and status='active' and deleted_at is null order by created_at desc limit 3",
        [tenant.id],
      ),
    ]);
    return {
      tenant: { slug: tenant.slug, name: tenant.name },
      service: {
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.duration_minutes,
        priceLabel: service.price_label,
      },
      store: {
        id: service.store_id,
        name: service.store_name,
        address: service.address,
        merchant: service.merchant_name,
      },
      benefits: benefits.rows,
      actions: actions.rows.map((row) => ({
        id: row.id,
        name: row.name,
        actionType: row.action_type,
        targetUrl: row.target_url,
        miniProgramAppId: row.mini_program_app_id,
        miniProgramPath: row.mini_program_path,
        platform: row.platform,
      })),
    };
  }

  async open(
    tenantSlug: string,
    storeId: string,
    actionId: string,
    key: string,
    body: Record<string, unknown>,
  ) {
    if (!SLUG.test(tenantSlug) || !UUID.test(storeId) || !UUID.test(actionId) || !key.trim())
      throw new BadRequestException('VALIDATION_ERROR');
    const tenant = await this.tenant(tenantSlug);
    const eventSource = source(body.source);
    const safeShareCode = shareCode(body.shareCode);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('select pg_advisory_xact_lock(hashtext($1),hashtext($2))', [
        tenant.id,
        `consumer-store-open:${key}`,
      ]);
      const prior = await client.query(
        'select id,external_action_id,source,store_id from consumer_action_events where tenant_id=$1 and idempotency_key=$2 and deleted_at is null',
        [tenant.id, key],
      );
      if (prior.rowCount) {
        const correlationId = randomUUID();
        const traceId = randomUUID();
        const operating = await this.operating.project(client, {
          tenantId: tenant.id,
          eventType: 'consumer_action_event',
          eventId: prior.rows[0].id,
          actionId: prior.rows[0].external_action_id,
          storeId: prior.rows[0].store_id,
          source: prior.rows[0].source,
          shareCode: safeShareCode,
          correlationId,
          traceId,
        });
        await client.query('commit');
        return {
          eventId: prior.rows[0].id,
          actionId: prior.rows[0].external_action_id,
          replayed: true,
          operating,
        };
      }
      const valid = await client.query(
        "select s.id as store_id,a.id as action_id from stores s join external_actions a on a.id=$3 and a.tenant_id=s.tenant_id and a.status='active' and a.deleted_at is null where s.id=$1 and s.tenant_id=$2 and s.status='active' and s.deleted_at is null",
        [storeId, tenant.id, actionId],
      );
      if (valid.rowCount !== 1) throw new NotFoundException('NOT_FOUND');
      const eventId = randomUUID(),
        correlationId = randomUUID(),
        traceId = randomUUID();
      await client.query(
        'insert into consumer_action_events(id,tenant_id,store_id,external_action_id,source,idempotency_key,created_by,updated_by) values($1,$2,$3,$4,$5,$6,null,null)',
        [eventId, tenant.id, storeId, actionId, eventSource, key],
      );
      const details = { storeId, actionId, source: eventSource };
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,null,'consumer.action_opened','consumer_action_event',$3,$4,$5,$6,null,null)",
        [randomUUID(), tenant.id, eventId, correlationId, traceId, details],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'consumer.action.clicked.v1','consumer_action_event',$3,$4,$5,$6,null,null)",
        [randomUUID(), tenant.id, eventId, details, correlationId, traceId],
      );
      const operating = await this.operating.project(client, {
        tenantId: tenant.id,
        eventType: 'consumer_action_event',
        eventId,
        actionId,
        storeId,
        source: eventSource,
        shareCode: safeShareCode,
        correlationId,
        traceId,
      });
      await client.query('commit');
      return { eventId, actionId, replayed: false, operating };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async tenant(slug: string) {
    const tenant = (
      await this.pool.query(
        "select id,slug,name from tenants where slug=$1 and status='active' and deleted_at is null",
        [slug],
      )
    ).rows[0];
    if (!tenant) throw new NotFoundException('NOT_FOUND');
    return tenant;
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
