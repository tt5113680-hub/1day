# G1-W∞-12 Group-buy + membership densify (MH5-04/10)

- slice: `G1-R-GROUP-BUY-MEMBERSHIP`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

1. `/c/stores/[id]/group-buy` — promoter-tool copy, platform legend, quick links, no-checkout disclaimer
2. `/c/stores/[id]/membership` — store-membership tool framing + quick links + no-deal wording
3. `/m/settings` — tool identity header + entry-funnel/attribution/external-actions cross-links

## Verify

- `node --test tests/g1-winf12-group-buy-membership.test.mjs`
- `pnpm --filter @oneday/consumer-web typecheck` + `build`
- `pnpm --filter @oneday/management-web typecheck` + `build`
