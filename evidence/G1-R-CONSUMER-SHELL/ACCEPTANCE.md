# G1-R-CONSUMER-SHELL Acceptance

- slice_id: `G1-R-CONSUMER-SHELL`
- recorded_at: 2026-08-10 23:20 Asia/Shanghai
- claim: Discovery uses the **same Consumer shell + storefront nav tokens** as store pages (no separate blue hex chrome).

## Delivered

- Wrap discovery in `MobileShell` + `ConsumerStorefrontNav` (same as store)
- Remove custom bottom nav
- Replace discovery CSS hex with `--od-*` tokens (Meituan yellow system)

## Verify

- `pnpm --filter @oneday/consumer-web typecheck` PASS
- `pnpm --filter @oneday/consumer-web build` PASS
