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
        "select c.id as collection_id,c.name as collection_name,c.description,m.id as merchant_id,m.name as merchant_name,s.id as store_id from discovery_channels c join discovery_channel_merchants cm on cm.channel_id=c.id and cm.tenant_id=c.tenant_id and cm.status='active' and cm.deleted_at is null join merchants m on m.id=cm.merchant_id and m.tenant_id=cm.tenant_id and m.status='active' and m.deleted_at is null left join lateral (select id from stores s where s.tenant_id=m.tenant_id and s.merchant_id=m.id and s.status='active' and s.deleted_at is null order by s.created_at asc limit 1) s on true where c.tenant_id=$1 and c.status='active' and c.deleted_at is null order by c.rank desc,cm.rank desc,m.name",
        [tenant.id],
      )
    ).rows;
    const circleRows = (
      await this.pool.query(
        "select c.id as collection_id,c.name as collection_name,c.description,m.id as merchant_id,m.name as merchant_name,s.id as store_id from business_circles c join business_circle_merchants cm on cm.business_circle_id=c.id and cm.tenant_id=c.tenant_id and cm.status='active' and cm.deleted_at is null join merchants m on m.id=cm.merchant_id and m.tenant_id=cm.tenant_id and m.status='active' and m.deleted_at is null left join lateral (select id from stores s where s.tenant_id=m.tenant_id and s.merchant_id=m.id and s.status='active' and s.deleted_at is null order by s.created_at asc limit 1) s on true where c.tenant_id=$1 and c.status='active' and c.deleted_at is null order by c.rank desc,cm.rank desc,m.name",
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
      collection.merchants.push({
        id: String(row.merchant_id),
        name: String(row.merchant_name),
        entryUrl: row.store_id ? `/c/stores/${row.store_id}?tenant=${tenantSlug}` : null,
      });
      result.set(id, collection);
    }
    return [...result.values()];
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
