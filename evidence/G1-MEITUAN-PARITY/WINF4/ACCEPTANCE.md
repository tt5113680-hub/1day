# G1-W∞-4 Management attribution deep page (MPC attribution)

- slice: `G1-R-ATTRIBUTION-DEEP`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

1. `/m/attribution` densify: promoter-tool copy, honest no-deal disclaimer, sourceType filter, scene/shareCode from metadata
2. Cross-links: attribution ↔ `/m/entry-funnel`
3. Metric hint clarifies「最终来源」is not checkout success

## Verify

- `node --test tests/g1-winf4-attribution-deep.test.mjs`
- `pnpm --filter @oneday/management-web typecheck` + `build`

## Boundaries

- No payment/deal fabrication
- Attribution stages describe entry/ops continuity, not sales funnel conversion
