# G1-W∞-19 Tool-path gap normalization

- slice: `G1-R-TOOL-PATH-GAPS`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)

## Delivered

Normalized the last two Management commerce pages that still carried the retired
「美团商家端 PC」 eyebrow (W∞-18 explicitly removed that marketing eyebrow from the
dashboard on 2026-08-11) onto the consistent **推广员工具** identity:

1. `/m/offers` — eyebrow `美团商家端 PC · 商品` → `推广员工具 · 商品/套餐入口`;
   description now「维护服务/套餐真源与受控平台价格入口…不宣称第三方实时同步，也不在此售卖下单」.
2. `/m/stores` — eyebrow `美团商家端 PC · 店铺` → `推广员工具 · 门店入口`;
   description now「维护门店营业状态、资料、统一入口与负责人；第三方入口仅记录跳转，
   不代替平台下单/支付，也不含第三方订单履约」.

A repo-wide scan confirms no `美团商家端 PC` / `美团商家 App` / `对标美团商家` eyebrow
remains in any of the four web apps.

## Boundaries

- No native checkout / order fulfillment (MH5-07/08 remain external hand-off GAP).
- Text-only densify; no API/data changes.

## Verify

```text
node --test tests/g1-winf19-tool-path-gaps.test.mjs          # 1/1 PASS
node --test tests/g1-winf18-admin-dashboards.test.mjs        # 1/1 regression PASS
node --test tests/g1-winf17-workbench-commerce.test.mjs       # 1/1 regression PASS
pnpm --filter @oneday/management-web typecheck                # PASS
pnpm --filter @oneday/management-web build                    # PASS (27 routes)
node --test tests/g1-winf*.test.mjs                           # 17/17 PASS
```

## Pre-existing unrelated failures (not caused by this slice, documented honestly)

`node --test tests/*.test.mjs` and `pnpm test:unit` report pre-existing failures that are
unrelated to this text-only slice:

- Stale design-token tests (`tests/tokens.vitest.ts`, `tests/sys-5-storefront-renderer.test.mjs`)
  still assert the retired green brand `--od-brand-50: #f3f8f4`, while `foundation.css` now
  uses the Meituan-yellow theme (`--od-brand-50: #fffbea`, `--od-theme-name: meituan-yellow`)
  introduced in the G1 parity work. This slice does not touch design tokens.
- Live-stack integration tests (`sys-22`, `hardening-001`, `hardening-002`) require a running
  API + database at localhost, which is not started in this unattended turn.

These are recorded as known gaps, not silently claimed green.
