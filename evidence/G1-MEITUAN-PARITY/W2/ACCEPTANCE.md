# G1-W2 Consumer H5 → 美团 App (nearby + merchant)

- slice: `G1-R-MEITUAN-H5-NEARBY-STORE`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner G1 sign-off)

## What changed

1. Discovery (`/c/discovery`): Meituan App-like header (定位 + 搜索入口壳), tabs 附近/推荐/商圈, nearby-first, sort chips, merchant thumb cards.
2. Store (`/c/stores/[id]`): Meituan App merchant bar (店名/地址/营业 + 导航/电话/分享) above storefront modules.

## Verification

- `pnpm --filter @oneday/consumer-web build` PASS

## Honest boundary

- Search input is disabled shell (no search API yet).
- Ratings remain `local_pilot`, not live Meituan reviews.
- Not full App pixel parity; W2 = H5 discovery + merchant header densify.
- Next: W3 Management 门店/商品深页, or W4 Employee 商家 App.
