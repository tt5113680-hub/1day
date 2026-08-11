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
    return this.writeEvents(tenantId, rawEvents);
  }

  /** Authenticated management/employee emit (tenant from session). */
  async ingestAuthenticated(tenantId: string, body: Record<string, unknown>) {
    const rawEvents = body.events;
    if (!Array.isArray(rawEvents) || rawEvents.length === 0 || rawEvents.length > 50)
      throw new BadRequestException('VALIDATION_ERROR');
    return this.writeEvents(tenantId, rawEvents);
  }

  private async writeEvents(tenantId: string | null, rawEvents: unknown[]) {
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

    const [totals, byCode, bySurfaceRows, byModuleRows, byPlatform, sharePair] = await Promise.all([
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
      this.pool.query(
        `select
           (select count(distinct share_code)::int from entry_funnel_events
            where tenant_id=$1 and occurred_at >= now() - make_interval(days => $2)
              and event_code='share' and share_code is not null) as sent_codes,
           (select count(distinct share_code)::int from entry_funnel_events
            where tenant_id=$1 and occurred_at >= now() - make_interval(days => $2)
              and event_code='share_open' and share_code is not null) as opened_codes,
           (select count(distinct s.share_code)::int from entry_funnel_events s
            where s.tenant_id=$1 and s.occurred_at >= now() - make_interval(days => $2)
              and s.event_code='share' and s.share_code is not null
              and exists (
                select 1 from entry_funnel_events o
                where o.tenant_id=s.tenant_id and o.event_code='share_open'
                  and o.share_code=s.share_code
                  and o.occurred_at >= now() - make_interval(days => $2)
              )) as paired_codes`,
        [tenantId, days],
      ),
    ]);

    const t = totals.rows[0] ?? {};
    const byEventCode = byCode.rows.map((r) => ({ key: r.key as string, count: Number(r.count) }));
    const bySurface = bySurfaceRows.rows.map((r) => ({
      key: r.key as string,
      count: Number(r.count),
    }));
    const byModule = byModuleRows.rows.map((r) => ({ key: r.key as string, count: Number(r.count) }));
    const byTargetPlatform = byPlatform.rows.map((r) => ({
      key: r.key as string,
      count: Number(r.count),
    }));

    const countOf = (rows: { key: string; count: number }[], key: string) =>
      rows.find((r) => r.key === key)?.count ?? 0;
    const moduleCount = (key: string) => countOf(byModule, key);
    const visits = Number(t.visits ?? 0);
    const jumps = Number(t.jumps ?? 0);
    const shares = Number(t.shares ?? 0);
    const moduleImpressions = countOf(byEventCode, 'module_impression');
    const consultClicks = countOf(byEventCode, 'consult_click');
    const jumpConfirms = countOf(byEventCode, 'jump_confirm');
    const shareOpens = countOf(byEventCode, 'share_open');
    const circleSurface = countOf(bySurface, 'circle');

    const industryTemplates = {
      restaurant: {
        id: 'restaurant' as const,
        label: '餐饮',
        focusModules: ['offer_compare', 'banner_carousel', 'quick_actions', 'store_hero'],
        insights: buildRestaurantInsights({
          visits,
          jumps,
          offerCompare: moduleCount('offer_compare'),
          moduleImpressions,
          jumpConfirms,
          meituanJumps: countOf(byTargetPlatform, 'meituan'),
          douyinJumps: countOf(byTargetPlatform, 'douyin'),
        }),
      },
      beauty: {
        id: 'beauty' as const,
        label: '美业',
        focusModules: ['member_entry', 'quick_actions', 'consult', 'floating_consult'],
        insights: buildBeautyInsights({
          visits,
          consultClicks,
          memberEntry: moduleCount('member_entry'),
          moduleImpressions,
          avgDwellMs: Number(t.avg_dwell_ms ?? 0),
        }),
      },
      retail: {
        id: 'retail' as const,
        label: '零售',
        focusModules: ['content_feed', 'banner_carousel', 'offer_compare'],
        insights: buildRetailInsights({
          visits,
          jumps,
          contentFeed: moduleCount('content_feed'),
          banner: moduleCount('banner_carousel'),
          shares,
          shareOpens,
          circleSurface,
        }),
      },
    };

    return {
      days,
      disclaimer:
        '仅统计至观看/访问/跳转/停留/分享等入口痕迹；不含支付与成交。行业模板只解读已有 L0–L2，不编造成交。',
      totals: {
        total: Number(t.total ?? 0),
        impressions: Number(t.impressions ?? 0),
        visits,
        jumps,
        dwells: Number(t.dwells ?? 0),
        shares,
        avgDwellMs: Number(t.avg_dwell_ms ?? 0),
        moduleImpressions,
        consultClicks,
        jumpConfirms,
      },
      byEventCode,
      bySurface,
      byModule,
      byTargetPlatform,
      sharePairing: {
        sentCodes: Number(sharePair.rows[0]?.sent_codes ?? 0),
        openedCodes: Number(sharePair.rows[0]?.opened_codes ?? 0),
        pairedCodes: Number(sharePair.rows[0]?.paired_codes ?? 0),
        note: '员工发出分享 ↔ 消费者打开分享（按 share_code 去重配对）；不含成交。',
      },
      industryTemplates,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Meituan daily-report-density: per-day L0–L2 entry-trace time series + today vs prior-window deltas. */
  async dailyReport(tenantId: string, daysRaw: unknown) {
    const days = parseDays(daysRaw);

    const [dailyRows, todayRows] = await Promise.all([
      this.pool.query(
        `select to_char(occurred_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD') as day,
                count(*) filter (where event_code='impression')::int as impressions,
                count(*) filter (where event_code='visit')::int as visits,
                count(*) filter (where event_code='jump')::int as jumps,
                count(*) filter (where event_code='dwell')::int as dwells,
                count(*) filter (where event_code in ('share','share_open'))::int as shares,
                count(*) filter (where event_code='module_impression')::int as module_impressions,
                count(*) filter (where event_code='consult_click')::int as consult_clicks,
                count(*) filter (where event_code='jump_confirm')::int as jump_confirms
         from entry_funnel_events
         where tenant_id=$1 and occurred_at >= now() - make_interval(days => $2)
           and occurred_at < date_trunc('day', now() at time zone 'Asia/Shanghai') + interval '1 day'
         group by 1
         order by 1 asc`,
        [tenantId, days],
      ),
      this.pool.query(
        `select count(*) filter (where event_code='impression')::int as impressions,
                count(*) filter (where event_code='visit')::int as visits,
                count(*) filter (where event_code='jump')::int as jumps,
                count(*) filter (where event_code='dwell')::int as dwells,
                count(*) filter (where event_code in ('share','share_open'))::int as shares,
                count(*) filter (where event_code='module_impression')::int as module_impressions,
                count(*) filter (where event_code='consult_click')::int as consult_clicks,
                count(*) filter (where event_code='jump_confirm')::int as jump_confirms,
                count(distinct share_code) filter (where event_code='share' and share_code is not null)::int as sent_codes
         from entry_funnel_events
         where tenant_id=$1 and occurred_at >= now() - make_interval(days => $2)
           and occurred_at >= date_trunc('day', now() at time zone 'Asia/Shanghai')`,
        [tenantId, days],
      ),
    ]);

    const today = todayRows.rows[0] ?? {};
    const todayImpressions = Number(today.impressions ?? 0);
    const todayVisits = Number(today.visits ?? 0);
    const todayJumps = Number(today.jumps ?? 0);
    const todayDwells = Number(today.dwells ?? 0);
    const todayShares = Number(today.shares ?? 0);
    const todayModuleImpressions = Number(today.module_impressions ?? 0);
    const todayConsultClicks = Number(today.consult_clicks ?? 0);
    const todayJumpConfirms = Number(today.jump_confirms ?? 0);
    const todaySentCodes = Number(today.sent_codes ?? 0);

    const daily = dailyRows.rows.map((row) => {
      const impressions = Number(row.impressions ?? 0);
      const visits = Number(row.visits ?? 0);
      const jumps = Number(row.jumps ?? 0);
      return {
        day: row.day as string,
        impressions,
        visits,
        jumps,
        dwells: Number(row.dwells ?? 0),
        shares: Number(row.shares ?? 0),
        moduleImpressions: Number(row.module_impressions ?? 0),
        consultClicks: Number(row.consult_clicks ?? 0),
        jumpConfirms: Number(row.jump_confirms ?? 0),
        visitRate: impressions > 0 ? Number((visits / impressions).toFixed(2)) : 0,
        jumpRate: visits > 0 ? Number((jumps / visits).toFixed(2)) : 0,
      };
    });

    const sum = (pick: (row: (typeof daily)[number]) => number) =>
      daily.reduce((acc, row) => acc + pick(row), 0);
    const totalImpressions = sum((r) => r.impressions);
    const totalVisits = sum((r) => r.visits);
    const totalJumps = sum((r) => r.jumps);

    const vsPrior = {
      impressions:
        totalImpressions > 0
          ? Number((((todayImpressions - totalImpressions) / totalImpressions) * 100).toFixed(1))
          : 0,
      visits:
        totalVisits > 0
          ? Number((((todayVisits - totalVisits) / totalVisits) * 100).toFixed(1))
          : 0,
      jumps:
        totalJumps > 0 ? Number((((todayJumps - totalJumps) / totalJumps) * 100).toFixed(1)) : 0,
    };

    return {
      days,
      disclaimer:
        '美团式经营日报密度，但数据仅为入口痕迹（观看/访问/跳转/停留/分享，含 L2 模块曝光/咨询/跳转确认）。不含支付、成交或第三方订单数据。',
      today: {
        impressions: todayImpressions,
        visits: todayVisits,
        jumps: todayJumps,
        dwells: todayDwells,
        shares: todayShares,
        moduleImpressions: todayModuleImpressions,
        consultClicks: todayConsultClicks,
        jumpConfirms: todayJumpConfirms,
        sentCodes: todaySentCodes,
        visitRate: todayImpressions > 0 ? Number((todayVisits / todayImpressions).toFixed(2)) : 0,
        jumpRate: todayVisits > 0 ? Number((todayJumps / todayVisits).toFixed(2)) : 0,
      },
      vsPrior,
      daily,
      generatedAt: new Date().toISOString(),
    };
  }

  /** DIY: group entry traces by chosen dimension with optional filters (no payment fields). */
  async query(tenantId: string, params: Record<string, unknown>) {
    const days = parseDays(params.days);
    const groupBy = textOpt(params.groupBy ?? params.group_by, 32) ?? 'surface';
    const allowedGroup = new Set([
      'surface',
      'module_key',
      'target_platform',
      'event_code',
      'day',
    ]);
    if (!allowedGroup.has(groupBy)) throw new BadRequestException('VALIDATION_ERROR');

    const surface = textOpt(params.surface, 48);
    const moduleKey = textOpt(params.moduleKey ?? params.module_key, 80);
    const targetPlatform = textOpt(params.targetPlatform ?? params.target_platform, 32);
    const eventCode = textOpt(params.eventCode ?? params.event_code, 48);
    if (surface && !SURFACES.has(surface)) throw new BadRequestException('VALIDATION_ERROR');
    if (targetPlatform && !PLATFORMS.has(targetPlatform))
      throw new BadRequestException('VALIDATION_ERROR');
    if (eventCode && !EVENT_CODES.has(eventCode)) throw new BadRequestException('VALIDATION_ERROR');

    const filters: string[] = ['tenant_id=$1', 'occurred_at >= now() - make_interval(days => $2)'];
    const values: unknown[] = [tenantId, days];
    const add = (clause: string, value: string) => {
      values.push(value);
      filters.push(clause.replace('$N', `$${values.length}`));
    };
    if (surface) add('surface=$N', surface);
    if (moduleKey) add('module_key=$N', moduleKey);
    if (targetPlatform) add('target_platform=$N', targetPlatform);
    if (eventCode) add('event_code=$N', eventCode);

    const dimExpr =
      groupBy === 'day'
        ? `to_char(occurred_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD')`
        : groupBy === 'module_key'
          ? `coalesce(nullif(module_key,''), '(未命名模块)')`
          : groupBy === 'target_platform'
            ? `coalesce(target_platform, '(站内)')`
            : groupBy;

    const result = await this.pool.query(
      `select ${dimExpr} as key, count(*)::int as count
       from entry_funnel_events
       where ${filters.join(' and ')}
       group by 1
       order by count desc, key asc
       limit 80`,
      values,
    );

    return {
      days,
      groupBy,
      filters: {
        surface,
        moduleKey,
        targetPlatform,
        eventCode,
      },
      rows: result.rows.map((r) => ({ key: String(r.key), count: Number(r.count) })),
      disclaimer: '自助分析仅聚合入口痕迹；不含支付与成交。',
      generatedAt: new Date().toISOString(),
    };
  }

  /** AI-assist style interpret: rule engine over L0–L2 only; never invent deals. */
  async interpret(tenantId: string, body: Record<string, unknown>) {
    const days = parseDays(body.days);
    const summary = await this.summary(tenantId, days);
    const query = await this.query(tenantId, {
      days,
      groupBy: body.groupBy ?? body.group_by ?? 'module_key',
      surface: body.surface,
      moduleKey: body.moduleKey ?? body.module_key,
      targetPlatform: body.targetPlatform ?? body.target_platform,
      eventCode: body.eventCode ?? body.event_code,
    });

    const prev = await this.pool.query(
      `select count(*)::int as total,
              count(*) filter (where event_code='visit')::int as visits,
              count(*) filter (where event_code='jump')::int as jumps,
              count(*) filter (where event_code in ('share','share_open'))::int as shares
       from entry_funnel_events
       where tenant_id=$1
         and occurred_at >= now() - make_interval(days => $2)
         and occurred_at < now() - make_interval(days => $3)`,
      [tenantId, days * 2, days],
    );
    const prior = prev.rows[0] ?? {};
    const priorVisits = Number(prior.visits ?? 0);
    const priorJumps = Number(prior.jumps ?? 0);
    const curVisits = summary.totals.visits;
    const curJumps = summary.totals.jumps;

    const insights = buildInterpretInsights({
      days,
      visits: curVisits,
      priorVisits,
      jumps: curJumps,
      priorJumps,
      shares: summary.totals.shares,
      shareOpens: summary.byEventCode.find((r) => r.key === 'share_open')?.count ?? 0,
      moduleImpressions: summary.totals.moduleImpressions ?? 0,
      consultClicks: summary.totals.consultClicks ?? 0,
      topModules: query.rows.slice(0, 5),
      topSurfaces: summary.bySurface.slice(0, 5),
      jumpConfirms: summary.totals.jumpConfirms ?? 0,
    });

    return {
      days,
      mode: 'interpret_only',
      disclaimer:
        'AI 辅助只解读已有观看/访问/跳转/停留/分享/模块曝光等痕迹；禁止编造成交、支付或第三方订单结果。',
      insights,
      comparedToPriorWindow: {
        priorDays: days,
        visitsDelta: curVisits - priorVisits,
        jumpsDelta: curJumps - priorJumps,
      },
      queryPreview: query.rows.slice(0, 12),
      generatedAt: new Date().toISOString(),
    };
  }

  async listSavedViews(context: OrganizationContext) {
    const rows = (
      await this.pool.query(
        `select id, name, days, group_by, surface, module_key, target_platform, event_code,
                industry_template, version, updated_at
         from entry_funnel_saved_views
         where tenant_id=$1 and status='active' and deleted_at is null
         order by updated_at desc
         limit 50`,
        [context.tenantId],
      )
    ).rows;
    return {
      items: rows.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        days: Number(row.days),
        groupBy: row.group_by as string,
        surface: (row.surface as string | null) ?? null,
        moduleKey: (row.module_key as string | null) ?? null,
        targetPlatform: (row.target_platform as string | null) ?? null,
        eventCode: (row.event_code as string | null) ?? null,
        industryTemplate: (row.industry_template as string | null) ?? null,
        version: Number(row.version),
        updatedAt: row.updated_at,
      })),
    };
  }

  async saveView(context: OrganizationContext, body: Record<string, unknown>) {
    const name = textOpt(body.name, 120);
    if (!name) throw new BadRequestException('VALIDATION_ERROR');
    const days = parseDays(body.days);
    const groupBy = textOpt(body.groupBy ?? body.group_by, 32) ?? 'module_key';
    const allowedGroup = new Set([
      'surface',
      'module_key',
      'target_platform',
      'event_code',
      'day',
    ]);
    if (!allowedGroup.has(groupBy)) throw new BadRequestException('VALIDATION_ERROR');
    const surface = textOpt(body.surface, 48);
    const moduleKey = textOpt(body.moduleKey ?? body.module_key, 80);
    const targetPlatform = textOpt(body.targetPlatform ?? body.target_platform, 32);
    const eventCode = textOpt(body.eventCode ?? body.event_code, 48);
    const industryTemplate = textOpt(body.industryTemplate ?? body.industry_template, 32);
    if (surface && !SURFACES.has(surface)) throw new BadRequestException('VALIDATION_ERROR');
    if (targetPlatform && !PLATFORMS.has(targetPlatform))
      throw new BadRequestException('VALIDATION_ERROR');
    if (eventCode && !EVENT_CODES.has(eventCode)) throw new BadRequestException('VALIDATION_ERROR');

    const existing = (
      await this.pool.query(
        `select id from entry_funnel_saved_views
         where tenant_id=$1 and name=$2 and deleted_at is null`,
        [context.tenantId, name],
      )
    ).rows[0];

    if (existing) {
      const updated = await this.pool.query(
        `update entry_funnel_saved_views set
           days=$3, group_by=$4, surface=$5, module_key=$6, target_platform=$7, event_code=$8,
           industry_template=$9, updated_at=now(), updated_by=$10, version=version+1
         where id=$1 and tenant_id=$2 and deleted_at is null
         returning id, name, days, group_by, version`,
        [
          existing.id,
          context.tenantId,
          days,
          groupBy,
          surface,
          moduleKey,
          targetPlatform,
          eventCode,
          industryTemplate,
          context.userId,
        ],
      );
      return {
        id: updated.rows[0].id,
        name: updated.rows[0].name,
        days: Number(updated.rows[0].days),
        groupBy: updated.rows[0].group_by,
        version: Number(updated.rows[0].version),
        replaced: true,
      };
    }

    const id = randomUUID();
    await this.pool.query(
      `insert into entry_funnel_saved_views(
         id, tenant_id, name, days, group_by, surface, module_key, target_platform, event_code,
         industry_template, status, created_by, updated_by
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$11)`,
      [
        id,
        context.tenantId,
        name,
        days,
        groupBy,
        surface,
        moduleKey,
        targetPlatform,
        eventCode,
        industryTemplate,
        context.userId,
      ],
    );
    return { id, name, days, groupBy, version: 1, replaced: false };
  }

  async deleteView(context: OrganizationContext, viewId: string) {
    if (!UUID.test(viewId)) throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.pool.query(
      `update entry_funnel_saved_views
       set deleted_at=now(), status='deleted', updated_at=now(), updated_by=$3, version=version+1
       where id=$1 and tenant_id=$2 and deleted_at is null
       returning id`,
      [viewId, context.tenantId, context.userId],
    );
    if (!result.rows[0]) throw new NotFoundException('NOT_FOUND');
    return { id: viewId, deleted: true };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

const parseDays = (daysRaw: unknown) => {
  if (typeof daysRaw === 'number') return Math.max(1, Math.min(90, Math.floor(daysRaw)));
  if (typeof daysRaw === 'string' && /^\d{1,2}$/.test(daysRaw))
    return Math.max(1, Math.min(90, Number(daysRaw)));
  return 7;
};

const textOpt = (value: unknown, max: number) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new BadRequestException('VALIDATION_ERROR');
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

function buildInterpretInsights(input: {
  days: number;
  visits: number;
  priorVisits: number;
  jumps: number;
  priorJumps: number;
  shares: number;
  shareOpens: number;
  moduleImpressions: number;
  consultClicks: number;
  topModules: { key: string; count: number }[];
  topSurfaces: { key: string; count: number }[];
  jumpConfirms: number;
}) {
  const insights: string[] = [];
  if (input.priorVisits > 0) {
    const pct = Math.round(((input.visits - input.priorVisits) / input.priorVisits) * 100);
    if (Math.abs(pct) >= 20)
      insights.push(
        `访问较上一窗（同 ${input.days} 天）${pct > 0 ? '上升' : '下降'}约 ${Math.abs(pct)}%（${input.priorVisits}→${input.visits}）。`,
      );
  } else if (input.visits > 0) {
    insights.push(`近 ${input.days} 天开始出现访问痕迹（上一窗为 0）。`);
  }

  if (input.priorJumps > 0) {
    const pct = Math.round(((input.jumps - input.priorJumps) / input.priorJumps) * 100);
    if (Math.abs(pct) >= 20)
      insights.push(
        `出站跳转较上一窗${pct > 0 ? '上升' : '下降'}约 ${Math.abs(pct)}%（仅计至跳转，非成交）。`,
      );
  }

  if (input.visits > 0 && input.jumps === 0)
    insights.push('有访问无跳转：入口进得来，但第三方出站链路可能未点亮。');
  if (input.moduleImpressions === 0 && input.visits > 0)
    insights.push('有访问但无模块曝光：店页模块 L2 观察器可能未触发或模块未配置 data-module。');
  if (input.shares > 0 && input.shareOpens === 0)
    insights.push('有分享发出未见分享打开：分享落地是否上报 share_open。');
  if (input.consultClicks === 0 && input.visits > 5)
    insights.push('访问已积累但咨询点击为 0：检查快捷/悬浮咨询入口。');
  if (input.jumps > 0 && input.jumpConfirms === 0)
    insights.push('有跳转但无跳转确认：确认页完成率无法衡量，建议走确认链路。');

  const weak = input.topModules.filter((m) => m.count > 0).slice(-1)[0];
  const strong = input.topModules[0];
  if (strong)
    insights.push(`当前维度下最热模块/维度是「${strong.key}」（${strong.count}）；可对照装修位是否匹配目标引流。`);
  if (weak && strong && weak.key !== strong.key)
    insights.push(`相对偏弱的一项是「${weak.key}」（${weak.count}）；可检查是否曝光不足或入口弱。`);

  const topSurface = input.topSurfaces[0];
  if (topSurface)
    insights.push(`入口面主力在「${topSurface.key}」（${topSurface.count} 条痕迹）。`);

  if (!insights.length)
    insights.push('近窗痕迹不足以下结论；继续投放入口并保持 L0–L2 上报后可再解读。');
  insights.push('以上结论均未使用支付/成交数据，也不推断第三方是否成交。');
  return insights;
}

function buildRestaurantInsights(input: {
  visits: number;
  jumps: number;
  offerCompare: number;
  moduleImpressions: number;
  jumpConfirms: number;
  meituanJumps: number;
  douyinJumps: number;
}) {
  const insights: string[] = [];
  if (input.visits === 0)
    insights.push('近窗暂无访问痕迹；先确认店页/附近入口是否在投放。');
  if (input.offerCompare > 0 && input.jumps === 0)
    insights.push('「全平台团购比价」有模块曝光，但尚无出站跳转；检查外链是否可达。');
  if (input.moduleImpressions > 0 && input.jumpConfirms === 0 && input.jumps > 0)
    insights.push('已有跳转但缺少跳转确认页完成记录；确认动作页是否走确认链路。');
  if (input.meituanJumps + input.douyinJumps > 0)
    insights.push(
      `第三方跳转以美团 ${input.meituanJumps} / 抖音 ${input.douyinJumps} 计至出站（非成交）。`,
    );
  if (!insights.length)
    insights.push('餐饮模板：关注比价模块曝光 → 跳转确认 → 平台出站是否连贯。');
  return insights;
}

function buildBeautyInsights(input: {
  visits: number;
  consultClicks: number;
  memberEntry: number;
  moduleImpressions: number;
  avgDwellMs: number;
}) {
  const insights: string[] = [];
  if (input.visits > 0 && input.consultClicks === 0)
    insights.push('有访问但无咨询点击；快捷入口/悬浮咨询是否被遮挡或未配置。');
  if (input.memberEntry > 0 && input.consultClicks === 0)
    insights.push('会员入口有曝光，咨询转化痕迹为空；可检查咨询深链。');
  if (input.avgDwellMs > 0 && input.avgDwellMs < 3000)
    insights.push(`平均停留约 ${input.avgDwellMs}ms，偏短；可看头图/权益模块是否过早跳出。`);
  if (input.moduleImpressions === 0 && input.visits > 0)
    insights.push('有访问但尚无模块曝光；需客户端 IntersectionObserver 上报 L2。');
  if (!insights.length)
    insights.push('美业模板：优先看咨询点击与会员入口曝光是否匹配访问量。');
  return insights;
}

function buildRetailInsights(input: {
  visits: number;
  jumps: number;
  contentFeed: number;
  banner: number;
  shares: number;
  shareOpens: number;
  circleSurface: number;
}) {
  const insights: string[] = [];
  if (input.banner + input.contentFeed > 0 && input.jumps === 0)
    insights.push('内容/轮播有曝光痕迹，但无出站跳转；检查商品卡外链。');
  if (input.shares > 0 && input.shareOpens === 0)
    insights.push('有分享发出但未见分享打开；核对分享码落地页是否上报 share_open。');
  if (input.circleSurface > 0)
    insights.push(`商圈入口面有 ${input.circleSurface} 条痕迹，可对照圈内进店是否继续跳转。`);
  if (input.visits === 0)
    insights.push('零售模板：近窗无访问，先打通发现/搜索/分享入口。');
  if (!insights.length)
    insights.push('零售模板：对照轮播/内容曝光与分享打开、出站跳转是否同向。');
  return insights;
}
