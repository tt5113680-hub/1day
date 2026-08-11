# TOOL-PHASE-1 Client emit + management entry-funnel board

- slice: `TOOL-PHASE-1-CLIENT-EMIT-BOARD`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

1. Consumer client `entry-funnel-client.ts` — visit/dwell/scroll + batch POST `/api/v1/consumer/funnel/events`
2. Wired: discovery / store / search / entry / action confirm / share landing
3. Management `GET /api/v1/management/entry-funnel/summary` — module/surface/event/platform buckets (no payment metrics)
4. Management UI `/m/entry-funnel` + home shortcut「痕迹」
5. Settings「全平台可见引流」toggle via platform-visibility API

## Verify

- `node --test tests/tool-phase-1-entry-funnel-client.test.mjs`
- `pnpm --filter @oneday/api build`
- `pnpm --filter @oneday/consumer-web typecheck` (or build)
- `pnpm --filter @oneday/management-web typecheck` (or build)

## Next

- TOOL-PHASE-2: 商圈单独页 + 双身份
- Deeper L2 module_impression wiring on storefront modules
- Industry analysis templates / DIY / AI interpret-only
