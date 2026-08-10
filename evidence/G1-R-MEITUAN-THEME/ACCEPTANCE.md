# G1-R-MEITUAN-THEME Acceptance

- slice_id: `G1-R-MEITUAN-THEME`
- recorded_at: 2026-08-10 23:05 Asia/Shanghai
- claim: Default brand tokens switched to **Meituan yellow**; theme is token-only and switchable. Not a full Meituan IA home rewrite (R2–R5).

## Owner decision applied

- Entire UI fidelity / IA / interaction / functional chains → 100% Meituan direction (`PRODUCT_DUAL_TRACK_STRATEGY.md`)
- Default color: Meituan yellow (not locked to WeCom blue)
- Prefer speed; later theme switch via tokens only

## Changes

| File | Change |
| ---- | ------ |
| `packages/design-tokens/foundation.css` | `:root` Meituan yellow palette + `--od-on-brand` |
| `packages/design-tokens/src/index.ts` | Mirror TS tokens |
| `packages/design-tokens/themes.css` | Optional `[data-theme=wecom-blue]` alternate |
| `packages/ui/foundation.css` | Import themes.css |
| `PROJECT_STATE/PRODUCT_DUAL_TRACK_STRATEGY.md` | Strategy update |

## Verify

- Primary buttons use `color: var(--od-on-brand)` on yellow (readable dark text)
- AdminShell / SessionLogin pick up tokens via `@oneday/ui/foundation.css`
- Future switch: `<html data-theme="wecom-blue">` without page hex edits

## Boundaries

- Does not complete boss/employee/consumer home Meituan IA (R2–R4)
- Does not complete channel geo agent tree (R5)
- Does not sign product-owner acceptance
