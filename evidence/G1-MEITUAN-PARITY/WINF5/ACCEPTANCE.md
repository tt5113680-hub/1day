# G1-W∞-5 Consumer circles densify (MH5-13)

- slice: `G1-R-CIRCLES-DENSIFY`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

1. `/c/circles` — industry chips, sort (距离/商户数/本店优先), dual sections 本店经营 vs 附近公开, honest no-deal disclaimer
2. `/c/circles/[id]` — dual-identity badges, merchant counts, disclaimer, `circleId` on funnel visit/dwell
3. Discovery circles section CTA + hint to standalone circle page
4. `FunnelPageBeacon` / `bindPageFunnel` accept `circleId`

## Verify

- `node --test tests/g1-winf5-circles-densify.test.mjs`
- `pnpm --filter @oneday/consumer-web typecheck` + `build`

## Boundaries

- No native checkout; circle mutual help = entry discovery only
