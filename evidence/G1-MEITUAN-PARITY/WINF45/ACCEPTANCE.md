# G1-W∞-45 Management 真实数据深页密度 densify (MPC-04/05/07)

- slice: `G1-R-MANAGEMENT-COMMERCE-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 订单·评价·营销 真实数据深页密度 toward Meituan merchant PC)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-42(订单·评价·营销 静态概况+行列表) 与 W∞-44(数据/经营分析)，本刀把三个真实数据档案面补上「深页密度」(美团商家端成熟场景的分布洞察)，全部由已抓取的真实档案行现场推导，禁止假 BI：

- **`/m/orders`(订单痕迹，MPC-04)**：新增白卡分布面板 `aria-label="订单痕迹分布"`——
  - 状态分布(有效/待支付/已退款/已取消)；
  - 门店分布(按 `store_name` 记录数)；
  - 来源分布(按 `source`)。宽度百分比由 `orders` 真实行 `b.value/orders.length` 推导；空数据展示「暂无记录」。
- **`/m/reviews`(评价档案，MPC-05)**：新增白卡分布面板「评价分布」——
  - 评分分布(5星~1星)；
  - 门店分布(按 `store_name`)。空数据展示「暂无评价/暂无记录」。
- **`/m/marketing`(营销活动，MPC-07)**：新增白卡分布面板「营销分布」——
  - 状态分布(投放中/草稿/已暂停/已结束)；
  - 类型分布(优惠券/套餐·Offer/内容投放)。空数据展示「暂无活动/暂无记录」。
- **共享样式 `_commerce.module.css`**：新增 `.panel / .panelBlock / .bars / .barRow / .barTrack / .barFill / .barValue / .barLabel / .barEmpty`，灰底白卡布局 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 单列堆叠。

诚实边界全保留：全部指标派生自既有 `ManagementCommerce` 真实档案行(`source=local`)，不接美团实时订单/评价/投放、不伪造第三方评分或成交、不包含本平台收款、非本平台下单；`data-testid` 与 loading/forbidden/error/empty 全状态、summaryStrip/honest 底注、工具身份眉标全继承 W∞-42/21. 无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/orders/page.tsx`(新增状态/门店/来源分布)
- `apps/management-web/app/m/reviews/page.tsx`(新增评分/门店分布)
- `apps/management-web/app/m/marketing/page.tsx`(新增状态/类型分布)
- `apps/management-web/app/m/_commerce.module.css`(共享 panel/bar 样式)
- `tests/g1-winf45-management-commerce-deep.test.mjs`(新,5/5) — 验证三页分布面板/真实数据公式/CSS/诚实边界与 e2e hooks

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf45*.test.mjs                    # 5/5
node --test --test-concurrency=1 tests/g1-winf*.test.mjs                     # 131/131
pnpm --filter @oneday/management-web typecheck                                # PASS
pnpm --filter @oneday/management-web build                                   # PASS (Compiled successfully; routes 含 /m/orders /m/reviews /m/marketing /m/analytics)
pnpm build                                                                    # 20/20
npx vitest run                                                                # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                                    # clean
npx prettier --check <changed files>                                          # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-45 无关(clean 基线复现一致)。

## Gates

- typecheck PASS；build PASS；`pnpm build` 20/20；
- `g1-winf45` 5/5；`g1-winf*.test.mjs` 131/131；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有档案行推导，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
