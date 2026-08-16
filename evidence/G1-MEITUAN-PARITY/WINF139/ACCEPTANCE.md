# G1-W∞-139 ACCEPTANCE — 套餐/入口排行 densify（§2 补强 · MPC-03）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-OFFERS-RANK-ORDER` / W∞-139（§2 剩余 densify：套餐入口排行 = 按模块点击排行 + 排序）
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §2「套餐/入口排行：分类树、批量上下架、排序、按模块点击/跳转排行」
- executor: DeepSeek Plan B（无人值守）
- claim_boundary: 工程 PASS；非主人 UI 签验；不碰钱/销售/管店/GMV、不含第三方成交或履约、不复活 consumer_orders / 本平台下单/收单。

## Delivered

1. `GET /api/v1/management/catalog/module-click-rank?days=N`
   - **按模块点击排行**（MPC-03 §2「按模块点击/跳转排行」在既有 jumpRank 之上补齐「点击族」信号）：
     对租户内套餐（store_services × store_service_platform_offers × external_actions）经受控外链 `target_url` / `module_key = action name`
     归集近 N 天（1–90，默认 30）入口痕迹中的**点击族**信号：
     - `jump`（出站跳转）→ `jumps`，`jump_confirm`（跳转确认）→ `jumpConfirms`
     - `consult_click` / `favorite_click`（站内 L2 点击）→ `stationClicks`
     - `module_impression` 按 `session_id+module_key` 去重 → `impressions`（**仅作曝光参考，不计为点击**，诚实不混点击）
     - `total` = jump + jump_firm + station click（**不含曝光**），`sharePct` = total 占比
   - 返回 `{ days, impressions, jumps, confirms, stationClicks, total, items[], disclaimer }`；空无点击不造数，`<> 0` 才返回行。
   - **fail-closed**：`tenant.manage` / scoped store-manager 走 `data_scopes` 限定（与 catalog.list 同 operatorContext）。
   - 诚实边界：仅聚合点击族痕迹 source=local；曝光不计为点击；不接美团/抖音实时；不代表第三方成交/支付；不含本平台收款、非本平台下单。
2. `POST /api/v1/management/catalog/stores/:storeId/services/reorder`
   - **套餐排序**：对租户内单个门店的多个套餐（≤200）按 orderedIds 一次性落序（rank 高者优先）。
   - **单事务**：逐条 `update store_services set rank=$n, version=version+1`；写 1 条 batch 级 `audit_logs`（`catalog.service_reordered`，resource_id = storeId）；
     1 条 batch 级 `outbox_events`（`catalog.service.reordered.v1`）；写 `idempotency_keys`（`catalog_service_reorder` 资源类型，按 storeId）——整批幂等，重放返回原响应（含 `count`/`effected`）。
   - **fail-closed**：`tenant.manage` + `requireScopedStoreWrite`（store-manager 仅改 scope 内门店）；orderedIds 空/超 200/非 uuid → 400；idempotency-key 缺失/超长 → 400。
   - 诚实边界：仅登记套餐展示顺序（rank），不改价格/成交/第三方；不含本平台收款、非本平台下单。
3. `/m/offers` UI（MPC-03）：
   - 新增「套餐模块点击排行」白卡面板（`aria-label=模块点击排行`）：每套餐 bar 条 + 细分行 `跳转 N · 确认 N · 站内 N · 曝光 N` + honest 底注（曝光不计为点击）。
   - 新增「套餐排序」白卡面板（`aria-label=套餐排序`）：门店下拉 + 排序值编辑列表（rank 高者优先） + `保存顺序`（幂等 key），成功后清空草稿刷新。
   - `page.module.css` 新增 `.clickMeta/.reorderToolbar/.reorderList/.reorderRow`（灰底白卡视觉语言一致，≤900px 换行堆叠）。
   - 承接既有 summaryStrip/分布面板/跳转排行/分类树/批量上下架交互与 loading/forbidden/error 全状态；工具身份眉标 `推广员工具 · 商品/套餐入口` 不变。
   - 无 schema/migration/DB 变更（复用 `store_services.rank` 与真实 `entry_funnel_events`）。

## Evidence

- `tests/g1-winf139-offers-rank-order.test.mjs` — **2/2**
  - 静态：controller `module-click-rank`/`services/reorder`、service `async moduleClickRank`/`catalog_service_reorder`/`async reorderServices`/`catalog.service.reordered`、page `套餐模块点击排行`/`模块点击排行`/`套餐排序`/`reorder`、无 Math.random。
  - DB：真实库种子组织/用户/成员/员工/商户/门店/2 套餐/受控外链双向绑定/2 Offer → 写 3 条入口痕迹（jump+jump_firm+module_impression 归到 Offer A）→ `GET module-click-rank` 200 命中 serviceA：jumps==1、jumpConfirms==1、stationClicks==0、impressions==1、disclaimer 含 click+source=local → `POST reorder [B,A]` 201 effected=2 → 幂等重放回 same effected=2 → DB 中 serviceB.rank > serviceA.rank → audit `catalog.service_reordered` 相对 storeId 基线 +1 + outbox `catalog.service.reordered.v1` +1 → 空 orderedIds 400。
  - **测试隔离**：audit/outbox 按本刀 storeId 过滤做相对基线；entry/action/offer/service 为 fresh uuid 或带 stamp 唯一名，可在持久 `oneday_v3_test` 复跑确定。
- `pnpm --filter @oneday/api build` PASS、`pnpm --filter @oneday/management-web build` PASS（含 `/m/offers`）。
- `pnpm typecheck` **20/20**、`pnpm build` **20/20**。
- `pnpm test:unit` **49/49**。
- 回归：`tests/g1-winf139`（2/2）+ offers 面 `g1-winf39`（offers visual 3/3）+ `g1-winf47`（offers 深页 4/4）+ `g1-winf86`（offers summaryStrip 4/4）+ `g1-winf112`（分类/跳转/批量 6/6）共 **19/19** 通过；
  全 `g1-winf*.test.mjs` glob **474/476**（2 失败均为既有基线 `g1-winf88`/`g1-winf89` memberships `.summaryStrip` 列数断言 —— memberships `page.module.css` 本轮未触碰，独立于 W139 只改 offers 面）。
- eslint：变更 TS 文件 0 errors；prettier clean。

## Honest boundaries

模块点击排行仅聚合入口痕迹中的点击族信号并独立展示曝光（source=local）；不把曝光当点击；排序仅登记套餐展示顺序的本地 rank；两者均不接美团/抖音/扫呗等第三方实时，不代表第三方成交、履约或支付；不含本平台收款；非本平台下单；不复活 consumer_orders / 本平台下单/收单；不代签主人 UI 验收。

## Pre-existing note（与本次无关）

`g1-winf88` / `g1-winf89` 的 memberships `.summaryStrip` 列数断言失败为 HEAD 既有基线（memberships `page.module.css` 未改动，W136/W137/W138 acceptance 已记录同类）；与 W139（仅触及 `/m/offers` 面）无关。
