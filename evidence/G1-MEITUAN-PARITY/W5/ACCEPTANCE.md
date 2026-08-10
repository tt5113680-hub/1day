# G1-W5 Management PC 订单 · 评价 · 营销（MPC-04/05/07 骨架）

- slice: `G1-R-MEITUAN-PC-COMMERCE-SKELETON`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS**（engineering；非 owner G1 签收）

## What changed

Management PC 补齐美团商家端 订单 / 评价 / 营销 三块骨架（本地数据）：
对标 `MEITUAN_PC_H5_PARITY_INVENTORY.md` §1 的 MPC-04/05/07。

1. **数据层**：迁移 `055_merchant_commerce.ts`（注册进 migrator 055）
   - 扩展 `customer_orders`：`store_id`、`source`、`amount_cents`、`currency`、`fulfillment_status`、`items`、`merchant_note`
   - 新建 `store_reviews`（评价：门店/评分/内容/来源/状态）
   - 新建 `marketing_campaigns`（营销：门店/券类型/时间窗/投放渠道/状态）
2. **API 层**：`ManagementCommerceService` + `ManagementCommerceController`
   - `GET /api/v1/management/commerce/orders` / `reviews` / `marketing`
   - 全部 tenant 隔离 + store-scope 过滤；owner 看全租户，店长只看被授权门店（复用 operatorContext + DataScopeService）
3. **UI 层**：三张 Management PC 页
   - `/m/orders` 订单中心、`/m/reviews` 评价管理、`/m/marketing` 营销活动
   - 各自概况条 + 真实行数据 + 诚实空态；全部 `--od-*` token，无 raw hex
   - 菜单目录新增：`orders`（订单）/`reviews`（顾客·评价管理）/`marketing`（营销·营销活动），新增 `orders` 菜单分组
4. **本地试点数据**：`generate-commercial-fixtures.mjs` 为每个试点租户 seed 本地订单/评价/营销行（全部 `source=local` / TEST ONLY）

## Verification

- `pnpm typecheck` **20/20 PASS**
- `pnpm build` **20/20 PASS**（management-web 25 路由含 `/m/orders` `/m/reviews` `/m/marketing`）
- `tests/page-m-commerce.test.mjs`（node API+DB，L2）**PASS**：owner 读到订单/评价/营销真实行；无角色浏览者 403；错误 `x-tenant-context` 403（无跨租户泄漏）
- `tests/menu-dto.vitest.ts` **17/17 PASS**；`sys-29` / `sys-6`（catalog/membership/write-path/role-matrix-store-manager）菜单断言更新后 **8/8 PASS**
- DB：`oneday_v3_test` 迁移至 `055_merchant_commerce:Up`

## Honest boundary

- 订单/评价/营销 = **本地试点骨架**（`source=local`），未接美团实时订单/评价/投放，未伪造第三方数据。
- 这 3 块是 Management PC 的 first-cut 骨架；深页筛/详情/回复/创建能力续接 W∞ 逐页。
- Not full 美团商家端 pixel parity；W5 = 补齐商家端骨架本地数据可验证。
- Do not auto-sign `PRODUCT_OWNER_UI_ACCEPTANCE.md`。
- Next: W6 R5 省市区代理（MP-01~03）per inventory。

## Pre-existing failures not caused by this slice

- `tests/tokens.vitest.ts`、SYS-5（storefront-renderer CSS 扫描）、hardening-001/002、sys-22（`fetch failed`）在本次改动前即失败（引用本切片未触碰的 consumer/ui/onboarding 文件或依赖外部网络），与本 W5 无关。
