import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const EVENT_CODES = new Set([
  // L0
  'impression',
  'visit',
  'jump',
  'dwell',
  'share',
  // L1 context often paired with above; also standalone revisit
  'revisit',
  // L2
  'scroll_depth',
  'module_impression',
  'favorite_click',
  'consult_click',
  'circle_invite',
  'circle_apply',
  'share_open',
  'jump_confirm',
]);
const ACTOR_ROLES = new Set(['anonymous', 'consumer', 'employee', 'boss']);
const SURFACES = new Set([
  'nearby',
  'store',
  'circle',
  'search',
  'one_code',
  'entry',
  'share',
  'other',
]);
const PLATFORMS = new Set(['meituan', 'douyin', 'saabei', 'external']);
const DEVICES = new Set(['h5', 'pc']);

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (value: unknown, max: number) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new BadRequestException('VALIDATION_ERROR');
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};
const uuidOrNull = (value: unknown) => {
  const raw = text(value, 36);
  return raw && UUID.test(raw) ? raw : null;
};

@Injectable()
export class EntryFunnelService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async ingest(tenantSlug: string, body: Record<string, unknown>) {
    const rawEvents = body.events;
    if (!Array.isArray(rawEvents) || rawEvents.length === 0 || rawEvents.length > 50)
      throw new BadRequestException('VALIDATION_ERROR');

    let tenantId: string | null = null;
    if (tenantSlug) {
      if (!SLUG.test(tenantSlug)) throw new BadRequestException('VALIDATION_ERROR');
      const tenant = (
        await this.pool.query(
          "select id from tenants where slug=$1 and status='active' and deleted_at is null",
          [tenantSlug],
        )
      ).rows[0];
      if (!tenant) throw new BadRequestException('VALIDATION_ERROR');
      tenantId = tenant.id as string;
    }

    const inserted: string[] = [];
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      for (const item of rawEvents) {
        if (!item || typeof item !== 'object') throw new BadRequestException('VALIDATION_ERROR');
        const row = item as Record<string, unknown>;
        const eventCode = text(row.eventCode ?? row.event_code, 48);
        const surface = text(row.surface, 48);
        const actorRole = text(row.actorRole ?? row.actor_role, 32) ?? 'anonymous';
        if (!eventCode || !EVENT_CODES.has(eventCode))
          throw new BadRequestException('VALIDATION_ERROR');
        if (!surface || !SURFACES.has(surface)) throw new BadRequestException('VALIDATION_ERROR');
        if (!ACTOR_ROLES.has(actorRole)) throw new BadRequestException('VALIDATION_ERROR');

        const targetPlatform = text(row.targetPlatform ?? row.target_platform, 32);
        if (targetPlatform && !PLATFORMS.has(targetPlatform))
          throw new BadRequestException('VALIDATION_ERROR');
        const device = text(row.device, 16);
        if (device && !DEVICES.has(device)) throw new BadRequestException('VALIDATION_ERROR');

        const dwellMs =
          typeof row.dwellMs === 'number'
            ? Math.max(0, Math.min(3_600_000, Math.floor(row.dwellMs)))
            : typeof row.dwell_ms === 'number'
              ? Math.max(0, Math.min(3_600_000, Math.floor(row.dwell_ms)))
              : null;
        const scrollPct =
          typeof row.scrollPct === 'number'
            ? Math.max(0, Math.min(100, Math.floor(row.scrollPct)))
            : typeof row.scroll_pct === 'number'
              ? Math.max(0, Math.min(100, Math.floor(row.scroll_pct)))
              : null;

        const id = randomUUID();
        await client.query(
          `insert into entry_funnel_events(
             id, tenant_id, actor_role, event_code, surface, module_key, target_platform, target_url,
             target_tenant_id, target_store_id, circle_id, source, scene, share_code, session_id,
             device, geo_city, geohash, dwell_ms, scroll_pct, share_state, payload, occurred_at
           ) values (
             $1,$2,$3,$4,$5,$6,$7,$8,
             $9,$10,$11,$12,$13,$14,$15,
             $16,$17,$18,$19,$20,$21,$22,coalesce($23::timestamptz, now())
           )`,
          [
            id,
            tenantId,
            actorRole,
            eventCode,
            surface,
            text(row.moduleKey ?? row.module_key, 80),
            targetPlatform,
            text(row.targetUrl ?? row.target_url, 2000),
            uuidOrNull(row.targetTenantId ?? row.target_tenant_id),
            uuidOrNull(row.targetStoreId ?? row.target_store_id),
            uuidOrNull(row.circleId ?? row.circle_id),
            text(row.source, 160),
            text(row.scene, 160),
            text(row.shareCode ?? row.share_code, 48),
            text(row.sessionId ?? row.session_id, 64),
            device,
            text(row.geoCity ?? row.geo_city, 80),
            text(row.geohash, 16),
            dwellMs,
            scrollPct,
            text(row.shareState ?? row.share_state, 32),
            row.payload && typeof row.payload === 'object' ? JSON.stringify(row.payload) : null,
            text(row.occurredAt ?? row.occurred_at, 40),
          ],
        );
        inserted.push(id);
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
    return { accepted: inserted.length, ids: inserted };
  }

  async setPlatformVisibleTraffic(tenantSlug: string, enabled: boolean) {
    if (!SLUG.test(tenantSlug)) throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      `update tenants set platform_visible_traffic=$2, updated_at=now(), version=version+1
       where slug=$1 and status='active' and deleted_at is null
       returning id, slug, platform_visible_traffic`,
      [tenantSlug, enabled],
    );
    if (!result.rows[0]) throw new BadRequestException('VALIDATION_ERROR');
    return {
      tenantSlug: result.rows[0].slug as string,
      platformVisibleTraffic: Boolean(result.rows[0].platform_visible_traffic),
    };
  }

  async setPlatformVisibleTrafficById(tenantId: string, enabled: boolean) {
    const result = await this.pool.query(
      `update tenants set platform_visible_traffic=$2, updated_at=now(), version=version+1
       where id=$1 and status='active' and deleted_at is null
       returning id, slug, platform_visible_traffic`,
      [tenantId, enabled],
    );
    if (!result.rows[0]) throw new BadRequestException('VALIDATION_ERROR');
    return {
      tenantSlug: result.rows[0].slug as string,
      platformVisibleTraffic: Boolean(result.rows[0].platform_visible_traffic),
    };
  }

  async getPlatformVisibleTrafficById(tenantId: string) {
    const result = await this.pool.query(
      `select slug, platform_visible_traffic from tenants
       where id=$1 and status='active' and deleted_at is null`,
      [tenantId],
    );
    if (!result.rows[0]) throw new BadRequestException('VALIDATION_ERROR');
    return {
      tenantSlug: result.rows[0].slug as string,
      platformVisibleTraffic: Boolean(result.rows[0].platform_visible_traffic),
    };
  }

  /** Module-named entry-trace board (no payment / deal metrics). */
  async summary(tenantId: string, daysRaw: unknown) {
    const days =
      typeof daysRaw === 'number'
        ? Math.max(1, Math.min(90, Math.floor(daysRaw)))
        : typeof daysRaw === 'string' && /^\d{1,2}$/.test(daysRaw)
          ? Math.max(1, Math.min(90, Number(daysRaw)))
          : 7;

    const [totals, byCode, bySurface, byModule, byPlatform] = await Promise.all([
      this.pool.query(
        `select count(*)::int as total,
                count(*) filter (where event_code='impression')::int as impressions,
                count(*) filter (where event_code='visit')::int as visits,
                count(*) filter (where event_code='jump')::int as jumps,
                count(*) filter (where event_code='dwell')::int as dwells,
                count(*) filter (where event_code in ('share','share_open'))::int as shares,
                coalesce(avg(dwell_ms) filter (where event_code='dwell'), 0)::int as avg_dwell_ms
         from entry_funnel_events
         where tenant_id=$1 and occurred_at >= now() - make_interval(days => $2)`,
        [tenantId, days],
      ),
      this.pool.query(
        `select event_code as key, count(*)::int as count
         from entry_funnel_events
         where tenant_id=$1 and occurred_at >= now() - make_interval(days => $2)
         group by event_code order by count desc`,
        [tenantId, days],
      ),
      this.pool.query(
        `select surface as key, count(*)::int as count
         from entry_funnel_events
         where tenant_id=$1 and occurred_at >= now() - make_interval(days => $2)
         group by surface order by count desc`,
        [tenantId, days],
      ),
      this.pool.query(
        `select coalesce(nullif(module_key,''), '(未命名模块)') as key, count(*)::int as count
         from entry_funnel_events
         where tenant_id=$1 and occurred_at >= now() - make_interval(days => $2)
         group by 1 order by count desc limit 40`,
        [tenantId, days],
      ),
      this.pool.query(
        `select coalesce(target_platform, '(站内)') as key, count(*)::int as count
         from entry_funnel_events
         where tenant_id=$1 and occurred_at >= now() - make_interval(days => $2)
           and event_code in ('jump','jump_confirm')
         group by 1 order by count desc`,
        [tenantId, days],
      ),
    ]);

    const t = totals.rows[0] ?? {};
    return {
      days,
      disclaimer: '仅统计至观看/访问/跳转/停留/分享等入口痕迹；不含支付与成交。',
      totals: {
        total: Number(t.total ?? 0),
        impressions: Number(t.impressions ?? 0),
        visits: Number(t.visits ?? 0),
        jumps: Number(t.jumps ?? 0),
        dwells: Number(t.dwells ?? 0),
        shares: Number(t.shares ?? 0),
        avgDwellMs: Number(t.avg_dwell_ms ?? 0),
      },
      byEventCode: byCode.rows.map((r) => ({ key: r.key as string, count: Number(r.count) })),
      bySurface: bySurface.rows.map((r) => ({ key: r.key as string, count: Number(r.count) })),
      byModule: byModule.rows.map((r) => ({ key: r.key as string, count: Number(r.count) })),
      byTargetPlatform: byPlatform.rows.map((r) => ({
        key: r.key as string,
        count: Number(r.count),
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
