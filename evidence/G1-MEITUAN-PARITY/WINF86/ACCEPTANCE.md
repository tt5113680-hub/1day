# G1-W∞-86 Management 商品/套餐入口 全标对概况条 densify (MPC-03)

- slice: `G1-R-MANAGEMENT-OFFERS-SUMMARYSTRIP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; `/m/offers` 商品/套餐入口 toward Meituan merchant PC full parity — 补齐概况条)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-47（`/m/offers` 商品/套餐入口已加真实数据分布面板）与 W∞-45~85 Management MPC/平台/商圈/渠道深页波共享的视觉语言，本刀为 `/m/offers`（MPC-03 商品/套餐入口）补齐与 Management MPC 深页一致的白卡概况条 `summaryStrip`（商品套餐数据概况），使该页从「heroCard + 分布面板 + 表格」完整对标「heroCard + 概况条 + 分布面板 + 表格」的全标对层级；概况条指标全部由已抓取真实档案行现场推导，禁止假 BI：

- **`/m/offers`（商品/套餐入口，MPC-03）**：新增白卡概况条 `aria-label="商品套餐数据概况"`（黄边浅黄底，`summaryStrip`，≤900px 两列堆叠）——4 项全部真实数据实时推导：
  - 门店 `stores.length`；
  - 套餐/服务 `allServices.length`；
  - 平台 Offer `allOffers.length`；
  - 展示中 `allOffers.filter(offer => offer.status === 'active').length`。
- **`data-testid="management-offers"`** 新增，供 e2e/证据稳定定位。
- **`page.module.css`**：新增 `.summaryStrip/.summaryStrip span/.summaryStrip strong`（`grid-template-columns: repeat(4, minmax(0,1fr))`，`linear-gradient(135deg,#fff9db,#fffef5)` 浅黄底 + `rgb(255 209 0 / 35%)` 黄边），`@media (max-width:900px)` 下 `1fr 1fr` 两列堆叠（与 W∞-80~85 summaryStrip 视觉语言一致）。

承接并保留 W∞-47 的全部分布面板（`aria-label="商品套餐分布"`：套餐可见/门店/平台入口/Offer 状态/价格带，全部 `b.value/total` 真实数据推导）与既有交互（新建套餐/新增 Offer/停用启用）及全状态（loading/forbidden/error）。

诚实边界全保留（新增 honest 底注原文已存在）：「以上分布全部由商户登记的既有套餐/Offer 档案行实时推导（source=local）：不接美团/抖音实时价格、不伪造第三方评分或成交、不包含本平台收款、非本平台下单。」工具身份眉标 `推广员工具 · 商品/套餐入口` 不变。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/offers/page.tsx`（新增 `data-testid="management-offers"` + 白卡概况条 `商品套餐数据概况`，4 项真实数据推导）
- `apps/management-web/app/m/offers/page.module.css`（新增 `.summaryStrip` 样式 + ≤900px 两列堆叠）
- `tests/g1-winf86-management-offers-summarystrip.test.mjs`（新,4/4）— 验证概况条/真实数据公式/CSS 响应式/既有分布+诚实边界
- `tests/g1-winf47-management-offers-deep.test.mjs`（回归）— offers 分布面板断言不受影响

## Verify

```text
node --test tests/g1-winf86-management-offers-summarystrip.test.mjs   # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs              # 305/305
pnpm --filter @oneday/management-web typecheck                         # PASS
pnpm --filter @oneday/management-web build                            # PASS (routes 含 /m/offers)
pnpm typecheck                                                         # 20/20
pnpm build                                                             # 20/20
pnpm test:unit                                                         # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                             # clean
npx prettier --write <changed files>                                   # clean (unchanged)
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-86 无关（clean HEAD 复现一致，同 W∞-44~85 记录）。

## Gates

- typecheck PASS（management + `pnpm typecheck` 20/20）；build PASS（management + `pnpm build` 20/20）；
- `g1-winf86` 4/4；`g1-winf*.test.mjs` 305/305；
- vitest 47 passed（2 pre-existing token 失败照旧）；eslint + prettier clean；
- 概况条/分布指标全部由既有档案行真实推导，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
