import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createApiPool } from './database-pool';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const coordinate = (value: string | undefined, min: number, max: number) => {
  if (value === undefined) return undefined;
  if (!/^-?\d{1,3}(\.\d{1,6})?$/.test(value)) throw new BadRequestException('VALIDATION_ERROR');
  const parsed = Number(value);
  if (parsed < min || parsed > max) throw new BadRequestException('VALIDATION_ERROR');
  return parsed;
};
const distanceKm = (
  latitude: number,
  longitude: number,
  targetLatitude: number,
  targetLongitude: number,
) => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const lat = radians(targetLatitude - latitude),
    lon = radians(targetLongitude - longitude);
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(latitude)) * Math.cos(radians(targetLatitude)) * Math.sin(lon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

@Injectable()
export class ConsumerDiscoveryService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async discovery(tenantSlug: string, latitudeQuery?: string, longitudeQuery?: string) {
    if (!SLUG.test(tenantSlug)) throw new BadRequestException('VALIDATION_ERROR');
    const latitude = coordinate(latitudeQuery, -90, 90),
      longitude = coordinate(longitudeQuery, -180, 180);
    if ((latitude === undefined) !== (longitude === undefined))
      throw new BadRequestException('VALIDATION_ERROR');
    const tenant = (
      await this.pool.query(
        "select id,slug,name from tenants where slug=$1 and status='active' and deleted_at is null",
        [tenantSlug],
      )
    ).rows[0];
    if (!tenant) throw new NotFoundException('NOT_FOUND');
    const channelRows = (
      await this.pool.query(
        `select c.id as collection_id,c.name as collection_name,c.description,m.id as merchant_id,m.name as merchant_name,null as merchant_slug,s.id as store_id
         from discovery_channels c
         join discovery_channel_merchants cm on cm.channel_id=c.id and cm.tenant_id=c.tenant_id and cm.status='active' and cm.deleted_at is null
         join merchants m on m.id=cm.merchant_id and m.tenant_id=cm.tenant_id and m.status='active' and m.deleted_at is null
         left join lateral (select id from stores s where s.tenant_id=m.tenant_id and s.merchant_id=m.id and s.status='active' and s.deleted_at is null order by s.created_at asc limit 1) s on true
         where c.tenant_id=$1 and c.status='active' and c.deleted_at is null
         union all
         select pc.id as collection_id,pc.name as collection_name,null as description,m.id as merchant_id,m.name as merchant_name,merchant_tenant.slug as merchant_slug,s.id as store_id
         from platform_channels pc
         join tenants system_tenant on system_tenant.id=pc.tenant_id and system_tenant.slug='system' and system_tenant.status='active' and system_tenant.deleted_at is null
         join platform_channel_merchants viewer on viewer.channel_id=pc.id and viewer.tenant_id=pc.tenant_id and viewer.merchant_tenant_id=$1 and viewer.status='active' and viewer.onboarding_status='active' and viewer.service_status='ready' and viewer.deleted_at is null
         join platform_channel_merchants membership on membership.channel_id=pc.id and membership.tenant_id=pc.tenant_id and membership.status='active' and membership.onboarding_status='active' and membership.service_status='ready' and membership.deleted_at is null
         join tenants merchant_tenant on merchant_tenant.id=membership.merchant_tenant_id and merchant_tenant.status='active' and merchant_tenant.deleted_at is null
         join merchants m on m.tenant_id=merchant_tenant.id and m.status='active' and m.deleted_at is null
         left join lateral (select id from stores s where s.tenant_id=m.tenant_id and s.merchant_id=m.id and s.status='active' and s.deleted_at is null order by s.created_at asc limit 1) s on true
         where pc.status='active' and pc.service_status='ready' and pc.deleted_at is null`,
        [tenant.id],
      )
    ).rows;
    const circleRows = (
      await this.pool.query(
        `select c.id as collection_id,c.name as collection_name,c.description,m.id as merchant_id,m.name as merchant_name,null as merchant_slug,s.id as store_id
         from business_circles c
         join business_circle_merchants cm on cm.business_circle_id=c.id and cm.tenant_id=c.tenant_id and cm.status='active' and cm.deleted_at is null
         join merchants m on m.id=cm.merchant_id and m.tenant_id=cm.tenant_id and m.status='active' and m.deleted_at is null
         left join lateral (select id from stores s where s.tenant_id=m.tenant_id and s.merchant_id=m.id and s.status='active' and s.deleted_at is null order by s.created_at asc limit 1) s on true
         where c.tenant_id=$1 and c.status='active' and c.deleted_at is null
         union all
         select pc.id as collection_id,pc.name as collection_name,pc.description,m.id as merchant_id,m.name as merchant_name,merchant_tenant.slug as merchant_slug,s.id as store_id
         from platform_business_circles pc
         join tenants system_tenant on system_tenant.id=pc.tenant_id and system_tenant.slug='system' and system_tenant.status='active' and system_tenant.deleted_at is null
         join platform_business_circle_merchants viewer on viewer.circle_id=pc.id and viewer.tenant_id=pc.tenant_id and viewer.merchant_tenant_id=$1 and viewer.status='active' and viewer.invitation_status='accepted' and viewer.circle_approval_status='approved' and viewer.approval_status='approved' and coalesce((viewer.display_config->>'visible')::boolean,false) and viewer.deleted_at is null
         join platform_business_circle_merchants membership on membership.circle_id=pc.id and membership.tenant_id=pc.tenant_id and membership.status='active' and membership.invitation_status='accepted' and membership.circle_approval_status='approved' and membership.approval_status='approved' and coalesce((membership.display_config->>'visible')::boolean,false) and membership.deleted_at is null
         join tenants merchant_tenant on merchant_tenant.id=membership.merchant_tenant_id and merchant_tenant.status='active' and merchant_tenant.deleted_at is null
         join merchants m on m.tenant_id=merchant_tenant.id and m.status='active' and m.deleted_at is null
         left join lateral (select id from stores s where s.tenant_id=m.tenant_id and s.merchant_id=m.id and s.status='active' and s.deleted_at is null order by s.created_at asc limit 1) s on true
         where pc.status='active' and pc.deleted_at is null`,
        [tenant.id],
      )
    ).rows;
    const nearbyRows =
      latitude === undefined
        ? []
        : (
            await this.pool.query(
              "select m.id,m.name,l.latitude,l.longitude,l.address_label,s.id as store_id from merchant_locations l join merchants m on m.id=l.merchant_id and m.tenant_id=l.tenant_id left join lateral (select id from stores s where s.tenant_id=m.tenant_id and s.merchant_id=m.id and s.status='active' and s.deleted_at is null order by s.created_at asc limit 1) s on true where l.tenant_id=$1 and l.status='active' and l.deleted_at is null and m.status='active' and m.deleted_at is null",
              [tenant.id],
            )
          ).rows;
    return {
      tenant: { slug: tenant.slug, name: tenant.name },
      channels: this.collections(channelRows, tenant.slug),
      circles: this.collections(circleRows, tenant.slug),
      nearby:
        latitude === undefined
          ? []
          : nearbyRows
              .map((row) => ({
                id: row.id,
                name: row.name,
                address: row.address_label,
                entryUrl: row.store_id ? `/c/stores/${row.store_id}?tenant=${tenant.slug}` : null,
                distanceKm: Number(
                  distanceKm(
                    latitude,
                    longitude as number,
                    Number(row.latitude),
                    Number(row.longitude),
                  ).toFixed(1),
                ),
              }))
              .filter((row) => row.distanceKm <= 20)
              .sort((left, right) => left.distanceKm - right.distanceKm)
              .slice(0, 20),
      locationRequired: latitude === undefined,
    };
  }

  private collections(rows: Record<string, unknown>[], tenantSlug: string) {
    const result = new Map<
      string,
      {
        id: string;
        name: string;
        description: string | null;
        merchants: { id: string; name: string; entryUrl: string | null }[];
      }
    >();
    for (const row of rows) {
      const id = String(row.collection_id);
      const collection = result.get(id) ?? {
        id,
        name: String(row.collection_name),
        description: typeof row.description === 'string' ? row.description : null,
        merchants: [],
      };
      if (!collection.merchants.some((merchant) => merchant.id === String(row.merchant_id)))
        collection.merchants.push({
          id: String(row.merchant_id),
          name: String(row.merchant_name),
          entryUrl: row.store_id
            ? `/c/stores/${row.store_id}?tenant=${String(row.merchant_slug ?? tenantSlug)}`
            : null,
        });
      result.set(id, collection);
    }
    return [...result.values()];
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
