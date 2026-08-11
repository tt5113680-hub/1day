# G1-W∞-14 Service detail + store profile densify (MH5-12/06)

- slice: `G1-R-SERVICE-PROFILE`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

1. `/c/services/[id]` — promoter-tool copy, quick links, no-checkout disclaimer; CTA「确认前往…」replaces「去购买」; 外链须知 replaces 购买须知
2. `/c/stores/[id]/profile` — header ·推广员工具 + tool subtitle + disclaimer + quick links; restore 非本平台下单 wording

## Explicit non-goals

- No native checkout / order fulfillment (MH5-07/08 remain external hand-off GAP)

## Verify

- `node --test tests/g1-winf14-service-profile.test.mjs`
- `pnpm --filter @oneday/consumer-web typecheck` + `build`
