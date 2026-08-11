# G1-W∞-23 Tool-path experience parity — Management entry/trace page headings aligned

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·入口/档案页标题与状态口径对齐）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

W∞-19 reframed the `/m/offers`（商品/套餐入口）and `/m/stores`（门店入口）**eyebrows** to the
推广员工具 identity, and W∞-21/22 aligned the `MANAGEMENT_MENU_CATALOG` nav labels + the `/m/orders`
page to the entry/trace framing. But the **page titles and loading/forbidden states** of four
Management commerce/entry surfaces still used native store-ops vocabulary — `商品管理`、`门店管理`、
`评价管理`、`营销中心` — conflicting with (a) their own honest eyebrows (`推广员工具 · 商品/套餐入口`,
`· 门店入口`, `· 评价档案`, `· 营销档案`) and (b) their nav labels (`商品/套餐入口`, `门店入口`,
`评价管理`, `营销活动`). This implied the promotion tool "owns/manages" goods, stores, evaluations and
a marketing center, which crosses the charter boundary 不碰销售 / 不碰管理.

## Boundaries

- No native checkout / no order fulfillment / no payments (MH5-07/08 stay external hand-off GAP).
- Text/copy + nav-label only; **no schema, no DB migration, no API change**.
- The Meituan parity inventory labels (评价管理 / 营销中心 as **learning-source** names) stay untouched;
  only ONEDAY's own page headings, states, and nav labels are reframed.

## Delivered

1. `/m/offers` — `title 商品管理 → 商品/套餐入口`（matches eyebrow + nav label `商品/套餐入口`）;
   loading `正在加载商品管理 → 正在加载商品/套餐入口`; forbidden `无权进入商品管理 → 无权访问商品/套餐入口`.

2. `/m/stores` — `title 门店管理 → 门店入口`（matches eyebrow + nav label `门店入口`）;
   loading `正在汇总门店经营数据 → 正在加载门店入口`; forbidden `无权查看门店管理 → 无权访问门店入口`.

3. `/m/reviews` — `title 评价管理 → 评价档案`（matches eyebrow `推广员工具 · 评价档案`）and
   `packages/contracts/src/menu.ts` nav label `评价管理 → 评价档案`（same trace/archive semantics as the
   `订单痕迹` precedent）; loading / forbidden 改 `评价档案`.

4. `/m/marketing` — `title 营销中心 → 营销活动`（matches nav label `营销活动`; eyebrow stays
   `推广员工具 · 营销档案`）; loading / forbidden 改 `营销活动`.

Honest no-native-checkout / no-native-fulfillment boundaries preserved on all four surfaces
(不在此售卖下单、不代替平台下单/支付、不接第三方评价流、不伪造第三方评分、不接美团/抖音实时投放、非本平台成交).
No schema/DB/API change.

## Verify

```text
node --test tests/g1-winf23-nav-heading-alignment.test.mjs    # 5/5 PASS
node --test tests/g1-winf*.test.mjs                           # 30/30 PASS (W∞-3..23)
node --test tests/sys-6-menu-dto sys-29 admin-nav-groups sys-26 orphan-ia sys-23 attribution  # 11/11 PASS
node --test tests/g1-winf21-tool-path-experience.test.mjs     # PASS (nav-label close-out intact)
pnpm typecheck                                                # 20/20 packages PASS
pnpm build                                                    # 20/20 packages PASS
pnpm test:unit                                                # 47 passed / 2 failed (pre-existing design-token)
npx eslint <changed files>                                    # clean
node --test tests/e2e/management-stores.spec.ts 结构更新       # forbidden heading 无权访问门店入口
```

`pnpm test:unit` 的 2 个失败仍是已记录的 **pre-existing** 设计令牌陈旧断言
（`tokens.vitest.ts`、`storefront-renderer.vitest.ts` 对照已退休的绿色品牌），与本切片无关。
本切片未触碰 design tokens。

## Dependent-test updates (consistent with new copy)

- `tests/e2e/management-stores.spec.ts` — forbidden heading `无权查看门店管理 → 无权访问门店入口`.

## Integrity note

本切片为纯文案/导航标签对齐，未改 schema/DB/API。全仓代码扫描确认
`apps/`、`packages/` 中不再残留 ONEDAY 自身的 `商品管理 / 门店管理 / 评价管理 / 营销中心`
导航/页头标题；剩余出现均为对照美团 learn-source 清单或历史证据记录，属预期保留。
