# G1-W∞-138 ACCEPTANCE — 门店营业状态批量（§2 densify · MPC-02）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-STORE-BATCH-STATUS` / W∞-138（§2 剩余 densify 首刀：门店营业状态批量）
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §2「门店：完整资料 CRUD + 营业状态批量 + 三类二维码」
- executor: DeepSeek Plan B（无人值守）
- claim_boundary: 工程 PASS；非主人 UI 签验；仅登记营业状态，不含收款/支付/销售/GMV、不含第三方成交或履约，未复活 consumer_orders / 本平台下单/收单。

## Delivered

1. `POST /api/v1/management/stores/depth/batch-status`
   - 门店营业状态批量：对租户内多个门店（≤200）一次置 `active`（营业中）/ `inactive`（已停用）。
   - **单事务**：`update stores set status=..., version=version+1`（仅租户内且未删除，`id = any($uuid[])`）；
     写 1 条 batch 级 `audit_logs`（`store.batch_status_active|inactive`，`resource_id` 用首个受影响门店 uuid 保证 `uuid NOT NULL` 约束）+ 每条受影响门店 1 条 `outbox_events`（`store.batch_status_<status>.v1`）；
     写 `idempotency_keys`（`store_batch_status` 资源类型）——整批幂等，重放返回原响应（含 `effected`/`stores`，与首次一致）。
   - **fail-closed**：`tenant.manage` 校验；`storeIds` 空/超 200/非 uuid → 400；`status` 非 active/inactive → 400；idempotency-key 缺失/超长 → 400。
   - 诚实边界：仅登记营业状态，不保证第三方平台同步；不接美团/抖音实时；不含本平台收款、非本平台下单。
2. `/m/stores` UI（MPC-02）：
   - 新增「门店营业状态批量」白卡面板：全选本轮门店 + 逐门店勾选（每张门店卡顶部 `批量选择` checkbox）+ 目标状态下拉（营业中/已停用）+ `批量应用营业状态（已选 N）` 按钮；
     已停用批量操作二次确认；成功后清空选中并刷新；幂等 `idempotency-key`（`batch-status-<门店id排序>-<status>`）。
   - `page.module.css` 新增 `.batchRow/.batchRow label/.batchRow select/.batchCheck`（灰底白卡画布视觉语言一致，≤900px 换行堆叠）。
   - 承接既有 `门店入口分布` 营业状态分布面板，仍由真实门店档案行现场推导（source=local）。
   - 工具身份眉标 `推广员工具 · 门店入口` + loading/forbidden/error 打印全状态 + 门店 CRUD/二维码/资料维护交互全继承。

## Evidence

- `tests/g1-winf138-stores-batch-status.test.mjs` — **2/2**
  - 静态：controller `batch-status`、service `async batchStatus`/`store_batch_status`/`store.batch_status_`、page `门店营业状态批量`/`批量应用营业状态`/`selectedStores`、无 Math.random。
  - DB：真实库种子组织/用户/成员/员工/商户/2 门店 → `batch-status` inactive 201 `status=inactive`/`effected=2` → 重放幂等返回相同 `effected=2` → DB 两门店 `status=inactive` → audit `store.batch_status_inactive` 相对 store-id 基线 +1 → outbox `store.batch_status_inactive.v1` 每条受影响门店 1 条（共 2）→ 非法 `status='bogus'` → 400 → 恢复 active 201 `effected=2`。
  - **测试隔离**：audit/outbox 断言按本刀 `storeId`（本刀 fresh uuid）过滤做相对基线，可在持久 `oneday_v3_test` 上复跑确定。
- `pnpm --filter @oneday/api build` PASS、`pnpm --filter @oneday/management-web build` PASS（含 `/m/stores`）。
- `pnpm typecheck` **20/20**、`pnpm build` **20/20**。
- `pnpm test:unit` **49/49**。
- 回归：`tests/g1-winf138`（2/2）+ `g1-winf111`（门店 CRUD+QR 5/5）+ `g1-winf38`（门店 visual 4/4）+ `g1-winf112`（套餐分类/跳转/批量 6/6）通过；
  全 `g1-winf*.test.mjs` glob **470/474**（4 失败均为既有基线，与本次无关，见下）。
- eslint：api 文件 clean；page.tsx 仅既有 `@next/next/no-img-element`（QR `img`，本次未触碰）基线告警。prettier clean。

## Honest boundaries

批量营业状态仅作用于本地 `stores.status` 档案并登记审计/投递事件；不保证美团/抖音/扫呗等第三方同步营业状态；不含收款/支付/GMV、不代表第三方成交或履约；不接第三方实时数据；未复活 consumer_orders / 本平台下单/收单；不代签主人 UI 验收。

## Pre-existing note（与本次无关）

- 全 glob 中 `g1-winf88`（memberships `.summaryStrip` 列数断言）与 `g1-winf89`（memberships css columns）为 HEAD 既有偏差（memberships `page.module.css` 未改动，W136/W137 acceptance 已记录同类）；`g1-winf137` real-DB 用例在多文件并行执行时的共享租户时序抖动（隔离运行 2/2 通过）。三者均在 HEAD 上独立存在，与本次 W138（仅触及 stores 面）无关。
