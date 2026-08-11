# TOOL-PHASE-0 Entry funnel + platform visibility

- slice: `TOOL-PHASE-0-ENTRY-FUNNEL`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Identity

团购推广员工具：统一入口痕迹 L0+L1+L2；不碰钱/销售。废弃未提交的 consumer_orders WIP。

## Delivered

1. Migration `058_entry_funnel` — `tenants.platform_visible_traffic` + `entry_funnel_events`
2. `POST /api/v1/consumer/funnel/events` — batch ingest L0–L2
3. `PUT /api/v1/management/tenant/platform-visibility` — 全平台可见引流开关
4. Nearby query includes own tenant **or** `platform_visible_traffic=true` merchants
5. External link platform enum adds **saabei**

## Verify

- `node --test tests/tool-phase-0-entry-funnel.test.mjs`
- `pnpm --filter @oneday/database` migrate (when DB up)
- `pnpm --filter @oneday/api build`

## Next

- Consumer/Employee clients emit funnel events
- Management analytics boards (module-named)
- Circle standalone page + dual identity
