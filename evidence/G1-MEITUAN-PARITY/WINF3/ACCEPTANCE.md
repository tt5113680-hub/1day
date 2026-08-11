# G1-W∞-3 External hand-off confirm densify (MH5-12)

- slice: `G1-R-HANDOFF-CONFIRM`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Scope

Densify Consumer `/c/actions/[id]` confirmation for third-party hand-off:

- Platform badge + destination host preview
- Honest disclaimer: only traces to confirm/jump; **never** claims third-party checkout/payment
- Funnel `jump_confirm` / `jump` use scene-derived surface (entry/store/share/…)
- CTA copy 「确认前往{平台}」

## Explicit non-goals

- No native 下单 / 订单履约 (MH5-07/08 remain external hand-off GAP by product identity)
- No payment amounts or deal success fields

## Verify

- `node --test tests/g1-winf3-handoff-confirm.test.mjs`
- `pnpm --filter @oneday/consumer-web typecheck` + `build`

## Inventory

- MH5-12 → PARITY (首刀)
- MH5-07/08 → remain GAP (外链 hand-off only; WONT native)
