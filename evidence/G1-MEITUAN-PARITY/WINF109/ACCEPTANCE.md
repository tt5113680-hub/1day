# G1-W∞-109 CRM 深操作：RFM 自动分层 + 批量打标/归属 + 客户 360 互动时间轴（Phase1 / 1.4）

- slice: `G1-R-CRM-DEEP-RFM-BATCH-360`
- recorded_at: 2026-08-13 Asia/Shanghai
- status: **PASS** (engineering closed-loop; RFM 自动分层 + 批量打标 + 客户 360 互动时间轴；真实 DB；禁止假分层/假 BI；无 GMV；不含 §5 READY)
- branch: `hardening/COMMERCIAL-COMPLETION`
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §7 Phase1/1.4（跳过 §5 READY）

## Delivered

承接 W∞-108（Storefront 发布链闭环）+ W∞-107（工作台队列一键处置）+ W∞-91/88/46（客户跟进明细视觉 + 概况条 + 分布），本刀把 MPC-06 顾客/CRMM（Phase1 1.4）从「壳/分布条」推进到可作业闭环：**RFM 自动分层 + 批量打标 + 客户 360 互动时间轴**，全部由真实客户关联互动档案现场计算/落库推导，禁止假分层。

- **RFM 互动画像表 `customer_rfm_profiles`（migration `064_customer_rfm_profiles`）**：tenant_scoped，`(tenant_id, customer_id)` 唯一，customer 维度单真源。字段 = `recency_days`(R 最近互动天数) / `frequency_count`(F 互动频次) / `reach_count`(M 触达覆盖) / `layer` / `window_days`(90) / `computed_at` / 生命周期字段 + `version`。加 `customer_rfm_profiles_tenant_layer_idx` 索引。
- **`POST /api/v1/management/customers/rfm/compute`（`ManagementCrmDepthController/Service`）**：`tenant.manage` fail-closed；对租户全部 active 客户现场计算 RFM 并 upsert 落库——
  - R = 距最近一次跟进(`task_follow_ups` 经任务关联)/触点(`employee_nurture_touchpoints`)/订单痕迹(`customer_orders`) 的天数；
  - F = 回看窗口 90 天内上述互动记录频次；
  - M = 去重触达覆盖（`customer_sources` + `customer_contributions` + `evidence_files` 对应订单痕迹，**非金额/非成交额**）。
  - 派生 `layer`（高价值-活跃 / 温和互动 / 需唤醒 / 沉睡），写 `audit_logs customer.rfm_computed` + `outbox_events customer.rfm.computed.v1`（correlation/trace），返回 `{windowDays, computed, total, layers, dormant}`。
- **`POST /api/v1/management/customers/tags/batch`**：`tenant.manage` fail-closed + Idempotency-Key；对选定客户批量 **新增/移除** 标签（action=add/remove、label、customerIds 1–200），`customer_tags` `(tenant_id,customer_id,label)` on-conflict upsert / 软删撤销，写 `audit_logs customer.tags_batch` + `outbox customer.tags.batch.v1`，返回 `{action,label,applied}`。
- **`list` 集成 RFM（`management-customer-assets.service.ts`）**：列表 join `customer_rfm_profiles` 返回每行 `rfm{layer,recencyDays,frequencyCount,reachCount}`；新增 **`?layer=` RFM 分层筛选**（exists 子查询）；`requestExport` CSV 新增 `rfm_layer` 列（导出与归属变更保留审批和审计）。
- **`detail` 客户 360 互动时间轴（`management-customer-assets.service.ts`）**：新增返回 `rfm`（profile 单行）+ `follow_ups`（关联任务跟进记录：员工 + action_type + summary + 时间），并并入 `timeline`（新增 kind=`follow_up`）供前端 360 轴展示。
- **Management `/m/customers` 列表页**（MPC-06）：顶栏新增「重算 RFM 分层」动作（POST → 回注 summary strip + `load()`）；新增 `aria-label="RFM 互动分层"` 黄边浅黄底概况行（客户数 / 高价值-活跃 / 温和互动 / 需唤醒 / 沉睡，由真实 summary 推导，未算时回退当前列表数）+ 诚实底注；筛选区新增 **RFM 分层** 下拉（全部 RFM / 四档）；批量操作区新增 **批量打标**（add/remove + 标签输入 + Button，对已选客户）；表格新增 **RFM 互动分层** 列（layer Badge + `R·F·M` 迷你值，未算显示「待重算」）；`topBarActions` / `.batch input` / `.rfmRow/.rfmSummary` 等 CSS。
- **Management `/m/customers/[id]` 明细页**：新增 `aria-label="客户 RFM 互动分层"` 白卡 `rfmPanel`（表头 layer 徽标「待重算」态 + R/F/M/回看窗口四格,由真实 profile 推导 + 诚实底注）；新增「跟进记录」白卡 `Panel`（员工 · action + summary）；时间线标题「可审计时间线」→「客户 360 互动时间线」，空态文案对齐。

**诚实边界全保留**：R/F/M 仅统计跟进、触达与订单痕迹等互动口径，**不含支付金额、非本平台下单、不代表第三方成交**；导出与归属变更保留审批和审计记录；不接美团/抖音实时；不复活 consumer_orders / 本平台下单/收单；`/m/workflows` 保持 CUSTOM；§5 READY 未触碰。

## Files

- `packages/database/src/migrations/064_customer_rfm_profiles.ts`（新）— `customer_rfm_profiles` 表 + 索引
- `packages/database/src/migrator.ts` / `packages/database/src/types.ts` — 注册 migration + `CustomerRfmProfilesTable` + `Database` 接口
- `apps/api/src/management-crm-depth.controller.ts` / `management-crm-depth.service.ts`（新）— `rfm/compute` + `tags/batch`（audit + outbox + 幂等）
- `apps/api/src/app.module.ts` — 注册 `ManagementCrmDepthController/Service`
- `apps/api/src/management-customer-assets.service.ts` — list 集成 `rfm` + `?layer=` 筛选 + 导出 `rfm_layer`；detail 新增 `rfm` + `follow_ups` + `follow_up` 时间轴
- `apps/management-web/app/m/customers/page.tsx` / `page.module.css` — 重算 RFM / 分层概况行 / 分层筛选 / 批量打标 / RFM 表格列
- `apps/management-web/app/m/customers/[id]/page.tsx` / `page.module.css` — RFM 分层白卡 + 跟进记录 + 360 互动时间线
- `tests/g1-winf109-crm-rfm-360.test.mjs`（新,7/7 静态契约）
- `tests/management-crm-rfm-360.test.mjs`（新,1/1 真实 DB 闭环）
- `tests/g1-winf40-management-customers-visual.test.mjs` — 随动更新 honest 边界断言（RFM 底注引入 `非本平台下单`）

## Verify

```text
pnpm --filter @oneday/database build/typecheck        # PASS（含 064 迁移）
pnpm --filter @oneday/api build/typecheck             # PASS
pnpm typecheck                                        # 20/20
pnpm build                                            # 20/20
pnpm db:migrate（DATABASE_URL=oneday_v3_test）         # apply 064（已应用验证）
node --test tests/management-crm-rfm-360.test.mjs     # 1/1（真实 DB 闭环）
node --test tests/g1-winf109-crm-rfm-360.test.mjs     # 7/7 静态契约
node --test --test-concurrency=1 tests/g1-winf*.test.mjs  # 385/385（原 372/378 基础 + 新增 8：g1-winf109 7 + g1-winf40 随动 1）
node --test tests/sys-24-customer-merge-transfer.test.mjs tests/sys-31-employee-customer-directory.test.mjs  # 回归 2/2
pnpm test:unit                                        # 49/49（12 files）
npx eslint <changed>.ts/.tsx                           # clean
npx prettier --check <changed>                         # clean
```

> 全部 `g1-winf*` 385/385 通过；无 pre-existing 基线失败残留。

## Gates

- migration 064 apply（`customer_rfm_profiles` 表 + 索引）PASS；
- 真实 DB 闭环（租户 owner login → 跨租户 403 → `rfm/compute` 现场计算落库 → list `rfm` 回读 + `?layer=` 筛选 → `tags/batch` add/幂等重放/remove → detail `rfm` + `follow_ups` → audit/outbox 落库断言）PASS；
- RFM 由真实 `task_follow_ups`（经任务关联）/`employee_nurture_touchpoints`/`customer_orders`/`customer_sources`/`customer_contributions`/`evidence_files` 现场推导（禁止假分层），`layer` 与其后门状态一致；
- 诚实边界全保留（不含支付金额、非本平台下单、不代表第三方成交）；导出与归属变更保留审批和审计记录；
- typecheck/build/unit/g1-winf 全绿；eslint + prettier clean；`/m/workflows` CUSTOM；§5 READY 未开工；无 GMV、不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
