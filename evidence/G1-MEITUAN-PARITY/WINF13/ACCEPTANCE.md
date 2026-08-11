# G1-W∞-13 Menu + store home densify (MH5-05/03)

- slice: `G1-R-MENU-STORE-HOME`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

1. `/c/stores/[id]/menu` — promoter-tool copy, quick links, no-checkout disclaimer
2. `/c/stores/[id]` merchant bar — tool identity + no-checkout note (replaces misleading 美团 App eyebrow)

## Verify

- `node --test tests/g1-winf13-menu-store-home.test.mjs`
- `pnpm --filter @oneday/consumer-web typecheck` + `build`
