import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE = /^[a-z0-9][a-z0-9_-]{0,62}$/i;

const text = (value: unknown, max: number, required = false) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new BadRequestException('VALIDATION_ERROR');
    return null;
  }
  if (typeof value !== 'string') throw new BadRequestException('VALIDATION_ERROR');
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new BadRequestException('VALIDATION_ERROR');
    return null;
  }
  return trimmed.slice(0, max);
};

const coordinate = (value: unknown, min: number, max: number) => {
  if (value === undefined || value === null || value === '') return null;
  const raw = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(raw) || raw < min || raw > max) throw new BadRequestException('VALIDATION_ERROR');
  return Number(raw.toFixed(6));
};

const distanceKm = (lat: number, lon: number, tLat: number, tLon: number) => {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(tLat - lat),
    dLon = rad(tLon - lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat)) * Math.cos(rad(tLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

@Injectable()
export class TenantCircleService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  /** Consumer: nearby public circles + own-tenant circles (standalone surface). */
  async listPublic(tenantSlug: string, latitudeQuery?: string, longitudeQuery?: string) {
    if (!SLUG.test(tenantSlug)) throw new BadRequestException('VALIDATION_ERROR');
    const latitude =
      latitudeQuery === undefined ? undefined : coordinate(latitudeQuery, -90, 90) ?? undefined;
    const longitude =
      longitudeQuery === undefined ? undefined : coordinate(longitudeQuery, -180, 180) ?? undefined;
    if ((latitude === undefined) !== (longitude === undefined))
      throw new BadRequestException('VALIDATION_ERROR');

    const tenant = (
      await this.pool.query(
        "select id, slug, name from tenants where slug=$1 and status='active' and deleted_at is null",
        [tenantSlug],
      )
    ).rows[0];
    if (!tenant) throw new NotFoundException('NOT_FOUND');

    const rows = (
      await this.pool.query(
        `select c.id, c.name, c.description, c.industry_tag, c.address_label, c.latitude, c.longitude,
                c.public_visible, c.tenant_id, owner.slug as owner_slug, owner.name as owner_name,
                (select count(*)::int from business_circle_merchants cm
                  where cm.business_circle_id=c.id and cm.status='active' and cm.deleted_at is null) as merchant_count
         from business_circles c
         join tenants owner on owner.id=c.tenant_id and owner.status='active' and owner.deleted_at is null
         where c.status='active' and c.deleted_at is null
           and (c.tenant_id=$1 or c.public_visible=true)
         order by c.rank asc, c.name asc`,
        [tenant.id],
      )
    ).rows;

    const items = rows
      .map((row) => {
        const hasGeo = row.latitude != null && row.longitude != null;
        const distance =
          latitude !== undefined && hasGeo
            ? Number(
                distanceKm(
                  latitude,
                  longitude as number,
                  Number(row.latitude),
                  Number(row.longitude),
                ).toFixed(1),
              )
            : null;
        return {
          id: row.id as string,
          name: row.name as string,
          description: (row.description as string | null) ?? null,
          industryTag: (row.industry_tag as string | null) ?? null,
          address: (row.address_label as string | null) ?? null,
          publicVisible: Boolean(row.public_visible),
          ownedByViewer: row.tenant_id === tenant.id,
          owner: { slug: row.owner_slug as string, name: row.owner_name as string },
          merchantCount: Number(row.merchant_count ?? 0),
          distanceKm: distance,
          entryUrl: `/c/circles/${row.id}?tenant=${encodeURIComponent(tenant.slug)}`,
        };
      })
      .filter((item) => item.distanceKm === null || item.distanceKm <= 30)
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return a.name.localeCompare(b.name, 'zh');
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });

    return {
      tenant: { slug: tenant.slug as string, name: tenant.name as string },
      locationRequired: latitude === undefined,
      items,
    };
  }

  async detailPublic(tenantSlug: string, circleId: string) {
    if (!SLUG.test(tenantSlug) || !UUID.test(circleId))
      throw new BadRequestException('VALIDATION_ERROR');
    const tenant = (
      await this.pool.query(
        "select id, slug, name from tenants where slug=$1 and status='active' and deleted_at is null",
        [tenantSlug],
      )
    ).rows[0];
    if (!tenant) throw new NotFoundException('NOT_FOUND');

    const circle = (
      await this.pool.query(
        `select c.id, c.name, c.description, c.industry_tag, c.address_label, c.latitude, c.longitude,
                c.public_visible, c.tenant_id, owner.slug as owner_slug, owner.name as owner_name
         from business_circles c
         join tenants owner on owner.id=c.tenant_id and owner.status='active' and owner.deleted_at is null
         where c.id=$1 and c.status='active' and c.deleted_at is null
           and (c.tenant_id=$2 or c.public_visible=true)`,
        [circleId, tenant.id],
      )
    ).rows[0];
    if (!circle) throw new NotFoundException('NOT_FOUND');

    const merchants = (
      await this.pool.query(
        `select m.id as merchant_id, m.name as merchant_name, mt.slug as merchant_tenant_slug, s.id as store_id
         from business_circle_merchants cm
         join merchants m on m.id=cm.merchant_id and m.status='active' and m.deleted_at is null
         join tenants mt on mt.id=m.tenant_id and mt.status='active' and mt.deleted_at is null
         left join lateral (
           select id from stores s
           where s.tenant_id=m.tenant_id and s.merchant_id=m.id and s.status='active' and s.deleted_at is null
           order by s.created_at asc limit 1
         ) s on true
         where cm.business_circle_id=$1 and cm.status='active' and cm.deleted_at is null
         order by cm.rank asc, m.name asc`,
        [circleId],
      )
    ).rows;

    return {
      tenant: { slug: tenant.slug as string, name: tenant.name as string },
      circle: {
        id: circle.id as string,
        name: circle.name as string,
        description: (circle.description as string | null) ?? null,
        industryTag: (circle.industry_tag as string | null) ?? null,
        address: (circle.address_label as string | null) ?? null,
        publicVisible: Boolean(circle.public_visible),
        ownedByViewer: circle.tenant_id === tenant.id,
        owner: { slug: circle.owner_slug as string, name: circle.owner_name as string },
      },
      merchants: merchants.map((row) => ({
        id: row.merchant_id as string,
        name: row.merchant_name as string,
        entryUrl: row.store_id
          ? `/c/stores/${row.store_id}?tenant=${encodeURIComponent(String(row.merchant_tenant_slug))}&source=consumer:circle&scene=circle_merchant`
          : null,
      })),
    };
  }

  async listOwned(context: OrganizationContext) {
    const circles = (
      await this.pool.query(
        `select c.id, c.code, c.name, c.description, c.industry_tag, c.address_label,
                c.latitude, c.longitude, c.public_visible, c.rank, c.version,
                (select count(*)::int from business_circle_merchants cm
                  where cm.business_circle_id=c.id and cm.status='active' and cm.deleted_at is null) as merchant_count,
                (select count(*)::int from business_circle_applications a
                  where a.business_circle_id=c.id and a.status='pending' and a.deleted_at is null) as pending_applications
         from business_circles c
         where c.tenant_id=$1 and c.deleted_at is null
         order by c.rank asc, c.created_at desc`,
        [context.tenantId],
      )
    ).rows;

    const nearby = (
      await this.pool.query(
        `select c.id, c.name, c.description, c.industry_tag, c.address_label, c.public_visible,
                owner.name as owner_name, owner.slug as owner_slug,
                (select a.status from business_circle_applications a
                  where a.business_circle_id=c.id and a.applicant_tenant_id=$1 and a.deleted_at is null
                  order by a.created_at desc limit 1) as my_application_status
         from business_circles c
         join tenants owner on owner.id=c.tenant_id
         where c.tenant_id<>$1 and c.status='active' and c.deleted_at is null and c.public_visible=true
         order by c.name asc
         limit 40`,
        [context.tenantId],
      )
    ).rows;

    return {
      owned: circles.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        industryTag: row.industry_tag,
        address: row.address_label,
        latitude: row.latitude != null ? Number(row.latitude) : null,
        longitude: row.longitude != null ? Number(row.longitude) : null,
        publicVisible: Boolean(row.public_visible),
        rank: row.rank,
        version: row.version,
        merchantCount: Number(row.merchant_count ?? 0),
        pendingApplications: Number(row.pending_applications ?? 0),
      })),
      nearbyToJoin: nearby.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        industryTag: row.industry_tag,
        address: row.address_label,
        owner: { slug: row.owner_slug, name: row.owner_name },
        myApplicationStatus: row.my_application_status ?? null,
      })),
    };
  }

  async create(context: OrganizationContext, body: Record<string, unknown>) {
    const code = text(body.code, 80, true);
    const name = text(body.name, 160, true);
    if (!code || !CODE.test(code) || !name) throw new BadRequestException('VALIDATION_ERROR');
    const description = text(body.description, 320);
    const industryTag = text(body.industryTag ?? body.industry_tag, 80);
    const address = text(body.addressLabel ?? body.address_label ?? body.address, 320);
    const latitude = coordinate(body.latitude, -90, 90);
    const longitude = coordinate(body.longitude, -180, 180);
    if ((latitude === null) !== (longitude === null))
      throw new BadRequestException('VALIDATION_ERROR');
    const publicVisible = Boolean(body.publicVisible ?? body.public_visible);
    const id = randomUUID();
    try {
      await this.pool.query(
        `insert into business_circles(
           id, tenant_id, code, name, description, industry_tag, address_label,
           latitude, longitude, public_visible, status, created_by, updated_by
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$11)`,
        [
          id,
          context.tenantId,
          code,
          name,
          description,
          industryTag,
          address,
          latitude,
          longitude,
          publicVisible,
          context.userId,
        ],
      );
    } catch {
      throw new BadRequestException('VALIDATION_ERROR');
    }
    return { id, code, name, publicVisible };
  }

  async update(context: OrganizationContext, circleId: string, body: Record<string, unknown>) {
    if (!UUID.test(circleId)) throw new BadRequestException('VALIDATION_ERROR');
    const existing = (
      await this.pool.query(
        `select id, version from business_circles
         where id=$1 and tenant_id=$2 and deleted_at is null`,
        [circleId, context.tenantId],
      )
    ).rows[0];
    if (!existing) throw new NotFoundException('NOT_FOUND');

    const name = text(body.name, 160);
    const description = text(body.description, 320);
    const industryTag = text(body.industryTag ?? body.industry_tag, 80);
    const address = text(body.addressLabel ?? body.address_label ?? body.address, 320);
    const latitude =
      body.latitude === undefined ? undefined : coordinate(body.latitude, -90, 90);
    const longitude =
      body.longitude === undefined ? undefined : coordinate(body.longitude, -180, 180);
    if (
      (latitude === undefined) !== (longitude === undefined) &&
      !(latitude === null && longitude === null)
    ) {
      if ((latitude == null) !== (longitude == null))
        throw new BadRequestException('VALIDATION_ERROR');
    }
    const publicVisible =
      body.publicVisible === undefined && body.public_visible === undefined
        ? undefined
        : Boolean(body.publicVisible ?? body.public_visible);

    const result = await this.pool.query(
      `update business_circles set
         name=coalesce($3, name),
         description=case when $4::boolean then $5 else description end,
         industry_tag=case when $6::boolean then $7 else industry_tag end,
         address_label=case when $8::boolean then $9 else address_label end,
         latitude=case when $10::boolean then $11 else latitude end,
         longitude=case when $12::boolean then $13 else longitude end,
         public_visible=coalesce($14, public_visible),
         updated_at=now(), updated_by=$15, version=version+1
       where id=$1 and tenant_id=$2 and deleted_at is null
       returning id, name, public_visible, version`,
      [
        circleId,
        context.tenantId,
        name,
        body.description !== undefined,
        description,
        body.industryTag !== undefined || body.industry_tag !== undefined,
        industryTag,
        body.addressLabel !== undefined ||
          body.address_label !== undefined ||
          body.address !== undefined,
        address,
        body.latitude !== undefined,
        latitude ?? null,
        body.longitude !== undefined,
        longitude ?? null,
        publicVisible ?? null,
        context.userId,
      ],
    );
    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      publicVisible: Boolean(result.rows[0].public_visible),
      version: result.rows[0].version,
    };
  }

  async invite(context: OrganizationContext, body: Record<string, unknown>) {
    const circleId = text(body.circleId ?? body.circle_id, 36, true);
    const applicantSlug = text(body.applicantTenantSlug ?? body.applicant_tenant_slug, 80, true);
    const note = text(body.note, 320);
    if (!circleId || !UUID.test(circleId) || !applicantSlug || !SLUG.test(applicantSlug))
      throw new BadRequestException('VALIDATION_ERROR');

    const circle = (
      await this.pool.query(
        `select id from business_circles
         where id=$1 and tenant_id=$2 and status='active' and deleted_at is null`,
        [circleId, context.tenantId],
      )
    ).rows[0];
    if (!circle) throw new NotFoundException('NOT_FOUND');

    const applicant = (
      await this.pool.query(
        "select id from tenants where slug=$1 and status='active' and deleted_at is null",
        [applicantSlug],
      )
    ).rows[0];
    if (!applicant || applicant.id === context.tenantId)
      throw new BadRequestException('VALIDATION_ERROR');

    const merchant = (
      await this.pool.query(
        `select m.id from merchants m
         where m.tenant_id=$1 and m.status='active' and m.deleted_at is null
         order by m.created_at asc limit 1`,
        [applicant.id],
      )
    ).rows[0];
    if (!merchant) throw new BadRequestException('NOT_AVAILABLE');

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const id = randomUUID();
      await client.query(
        `insert into business_circle_applications(
           id, tenant_id, business_circle_id, applicant_tenant_id, source, status, note,
           decided_by, decided_at, created_by, updated_by
         ) values ($1,$2,$3,$4,'invite','approved',$5,$6,now(),$6,$6)`,
        [id, context.tenantId, circleId, applicant.id, note, context.userId],
      );
      const exists = (
        await client.query(
          `select id from business_circle_merchants
           where business_circle_id=$1 and merchant_id=$2 and deleted_at is null`,
          [circleId, merchant.id],
        )
      ).rows[0];
      if (!exists) {
        await client.query(
          `insert into business_circle_merchants(
             id, tenant_id, business_circle_id, merchant_id, rank, status, created_by, updated_by
           ) values ($1,$2,$3,$4,0,'active',$5,$5)`,
          [randomUUID(), context.tenantId, circleId, merchant.id, context.userId],
        );
      }
      await client.query('commit');
      return { id, status: 'approved', source: 'invite' };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async apply(context: OrganizationContext, body: Record<string, unknown>) {
    const circleId = text(body.circleId ?? body.circle_id, 36, true);
    const note = text(body.note, 320);
    if (!circleId || !UUID.test(circleId)) throw new BadRequestException('VALIDATION_ERROR');

    const circle = (
      await this.pool.query(
        `select id, tenant_id from business_circles
         where id=$1 and status='active' and deleted_at is null and public_visible=true`,
        [circleId],
      )
    ).rows[0];
    if (!circle) throw new NotFoundException('NOT_FOUND');
    if (circle.tenant_id === context.tenantId) throw new BadRequestException('VALIDATION_ERROR');

    const pending = (
      await this.pool.query(
        `select id from business_circle_applications
         where business_circle_id=$1 and applicant_tenant_id=$2 and status='pending' and deleted_at is null`,
        [circleId, context.tenantId],
      )
    ).rows[0];
    if (pending) return { id: pending.id as string, status: 'pending', duplicate: true };

    const id = randomUUID();
    await this.pool.query(
      `insert into business_circle_applications(
         id, tenant_id, business_circle_id, applicant_tenant_id, source, status, note, created_by, updated_by
       ) values ($1,$2,$3,$4,'apply','pending',$5,$6,$6)`,
      [id, circle.tenant_id, circleId, context.tenantId, note, context.userId],
    );
    return { id, status: 'pending', source: 'apply' };
  }

  async listApplications(context: OrganizationContext) {
    const rows = (
      await this.pool.query(
        `select a.id, a.source, a.status, a.note, a.created_at, a.business_circle_id,
                c.name as circle_name, t.slug as applicant_slug, t.name as applicant_name
         from business_circle_applications a
         join business_circles c on c.id=a.business_circle_id and c.tenant_id=a.tenant_id
         join tenants t on t.id=a.applicant_tenant_id
         where a.tenant_id=$1 and a.deleted_at is null
         order by case when a.status='pending' then 0 else 1 end, a.created_at desc
         limit 100`,
        [context.tenantId],
      )
    ).rows;
    return {
      items: rows.map((row) => ({
        id: row.id,
        source: row.source,
        status: row.status,
        note: row.note,
        createdAt: row.created_at,
        circle: { id: row.business_circle_id, name: row.circle_name },
        applicant: { slug: row.applicant_slug, name: row.applicant_name },
      })),
    };
  }

  async decide(
    context: OrganizationContext,
    applicationId: string,
    body: Record<string, unknown>,
  ) {
    if (!UUID.test(applicationId)) throw new BadRequestException('VALIDATION_ERROR');
    const decision = text(body.decision ?? body.status, 32, true);
    if (decision !== 'approved' && decision !== 'rejected')
      throw new BadRequestException('VALIDATION_ERROR');

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const app = (
        await client.query(
          `select a.id, a.status, a.business_circle_id, a.applicant_tenant_id, a.tenant_id
           from business_circle_applications a
           where a.id=$1 and a.tenant_id=$2 and a.deleted_at is null
           for update`,
          [applicationId, context.tenantId],
        )
      ).rows[0];
      if (!app) throw new NotFoundException('NOT_FOUND');
      if (app.status !== 'pending') throw new BadRequestException('VALIDATION_ERROR');

      await client.query(
        `update business_circle_applications
         set status=$3, decided_by=$4, decided_at=now(), updated_at=now(), updated_by=$4, version=version+1
         where id=$1 and tenant_id=$2`,
        [applicationId, context.tenantId, decision, context.userId],
      );

      if (decision === 'approved') {
        const merchant = (
          await client.query(
            `select m.id from merchants m
             where m.tenant_id=$1 and m.status='active' and m.deleted_at is null
             order by m.created_at asc limit 1`,
            [app.applicant_tenant_id],
          )
        ).rows[0];
        if (!merchant) throw new BadRequestException('NOT_AVAILABLE');
        const exists = (
          await client.query(
            `select id from business_circle_merchants
             where business_circle_id=$1 and merchant_id=$2 and deleted_at is null`,
            [app.business_circle_id, merchant.id],
          )
        ).rows[0];
        if (!exists) {
          await client.query(
            `insert into business_circle_merchants(
               id, tenant_id, business_circle_id, merchant_id, rank, status, created_by, updated_by
             ) values ($1,$2,$3,$4,0,'active',$5,$5)`,
            [
              randomUUID(),
              context.tenantId,
              app.business_circle_id,
              merchant.id,
              context.userId,
            ],
          );
        }
      }
      await client.query('commit');
      return { id: applicationId, status: decision };
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
