# G1-W∞-112 ACCEPTANCE — 商品分类树 + 批量上下架 + 跳转排行（MPC-03）

- recorded_at: 2026-08-13 Asia/Shanghai
- task: `G1-R-OFFERS-CATEGORY-RANK` / W∞-112
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` Phase2（§4 P0 MPC-03）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；§5 READY 未触碰

## Delivered

1. **migration `067_service_category_rank`** — `store_services` 新增 `category`(varchar(80), 可为空=未分类) + `store_services_tenant_category_idx`
2. **catalog depth API**（`management-catalog.controller.ts` / `management-catalog.service.ts`）：
   - `GET /api/v1/management/catalog/categories` — 商品分类树（按 category 分组 `storeCount`/`serviceCount`/services，未分类兜底 `(未分类)`，真实档案行，跨租户/scope fail-closed）
   - `POST /api/v1/management/catalog/stores/:storeId/services/batch-status` — 批量上下架（`serviceIds` 1–200，Idempotency-Key 幂等重放，audit `catalog.service_batch_<status>` + outbox `catalog.service.batch_<status>.v1`，仅登记套餐可见状态）
   - `GET /api/v1/management/catalog/jump-rank?days=N` — 跳转排行（真实 `entry_funnel_events` 中 `jump`/`jump_confirm` 按 `target_url = external_actions.target_url` 或 `module_key = external_actions.name` 关联套餐，聚合 `jumps`/`jumpConfirms`/`distinctModules` + `totalJumps` + `sharePct`）
   - `createService`/`updateService` 接受 `category`；`list` 返回 `category`
3. **Management `/m/offers`** — 新增「套餐跳转排行」「商品分类树」「批量上下架」三面板（黄条 `barWidth`、分类树分组、门店选择 + 勾选套餐 + 批量上/下架真实 `affected` 回读）+ 新建套餐「分类」输入 + 服务卡勾选框与分类展示

## Evidence commands

- `node --test tests/g1-winf112-offers-category-rank.test.mjs` → **7/7**
- `node --test tests/management-offer-depth.test.mjs` → **1/1**（真实 DB：跨租户 403/404 deny → 分类树分组成对 → 批量上下架幂等重放 → 跳转排行关联真实 jump/confirm → audit/outbox `catalog.service.batch_inactive(.v1)` 落库断言）
- `node --test tests/g1-winf*.test.mjs` → **404/404**
- 回归 `batch-2-offer-operations` + `sys-6-catalog-scopes` + `matrix-mg-g-depth` → **5/5**
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49
- eslint + prettier clean
- `DATABASE_URL=postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test pnpm db:migrate` → `067_service_category_rank:Up`

## Honest boundaries

- 分类 = 商品/套餐入口的组织维度
- 批量上下架 = 仅登记套餐可见状态
- 跳转排行 = 仅聚合入口出站跳转痕迹（`source=local`），**不含支付、不含成交、不代第三方成交、不接美团/抖音实时**
- `/m/workflows` CUSTOM；§5 READY deferred；不复活 consumer_orders / 本平台下单 / 收单

## Next

- **W∞-113** 订单痕迹详情抽屉 + 导出（MPC-04）
