# G1-W∞-42 Management 订单痕迹 / 评价档案 / 营销活动 视觉/IA densify toward Meituan merchant PC (MPC-04/05/07)

- slice: `G1-R-MANAGEMENT-COMMERCE-VISUAL` densify
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; MPC-04/05/07 PARTIAL→toward PARITY)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

`/m/orders`（订单痕迹，MPC-04）+ `/m/reviews`（评价档案，MPC-05）+ `/m/marketing`（营销活动，MPC-07）由旧 `AdminPageHeader` + 品牌渐变概况条改为美团商家端 PC 视觉/IA：

- **黄顶栏** `topBar`：顶栏承载既有 eyebrow（`推广员工具 · 订单痕迹` / `· 评价档案` / `· 营销档案`）+ 右上「刷新」。
- **灰底白卡** 画布（`background:#f5f5f5`）+ **heroCard** 白卡（`h1` 标题 = 订单痕迹/评价档案/营销活动 + 诚实描述）。
- **概况条** `summaryStrip` 改为白卡（档案记录数 / 状态为有效的记录 / 记录金额参考 / 涉及门店…）。
- **白卡面板** `row`/grid 列表。
- 移除三个页面级 `AdminPageHeader` / `eyebrow=` 依赖（视觉 densify，与 W∞-35/38/39/40/41 盘统一）。
- 保留全部工具身份与诚实边界：不接美团实时订单/评价/投放、不包含本平台收款、非本平台下单/成交、source=local。
- 新增 `data-testid`（management-orders / management-reviews / management-marketing）供后续 e2e。

无 schema/DB/API 变更；纯前端视觉/IA densify，全部既成语裁定档（W∞-22 订单痕迹、W∞-23 档案标题/状态口径）保留。

## Files

- `apps/management-web/app/m/orders/page.tsx`
- `apps/management-web/app/m/reviews/page.tsx`
- `apps/management-web/app/m/marketing/page.tsx`
- `apps/management-web/app/m/_commerce.module.css`
- `tests/g1-winf42-management-commerce-visual.test.mjs`（新增 4/4）
- `tests/g1-winf22-order-trace.test.mjs`（随动：订单 `title=`/`eyebrow=` prop → 顶栏 + `<h1>` 断言）
- `tests/g1-winf23-nav-heading-alignment.test.mjs`（随动：reviews/marketing `eyebrow=`/`title=` prop → 顶栏 + `<h1>` 断言）

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf42*.test.mjs tests/g1-winf22*.test.mjs tests/g1-winf23*.test.mjs tests/g1-winf17*.test.mjs tests/g1-winf41*.test.mjs   # 14/14
node --test --test-concurrency=1 tests/g1-winf*.test.mjs                                                                                                          # 115/115
pnpm --filter @oneday/management-web typecheck && build                                                                                                           # PASS (28 routes)
pnpm build                                                                                                                                                        # 20/20
npx vitest run                                                                                                                                                    # 47 passed（2 个 pre-existing token 失败照旧）
npx eslint <changed files>                                                                                                                                        # clean
npx prettier --check <changed files>                                                                                                                              # clean
```

## Gates

- typecheck PASS；build PASS（management-web 28 routes，含 `/m/orders`/`/m/reviews`/`/m/marketing`）；`pnpm build` 20/20。
- `g1-winf42` 4/4；`g1-winf*.test.mjs` 115/115。
- 单测 47 passed（2 个 pre-existing token 失败照旧）；eslint + prettier clean。
- 不碰钱/销售/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
