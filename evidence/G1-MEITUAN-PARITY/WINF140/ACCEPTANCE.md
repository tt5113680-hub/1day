# G1-W∞-140 ACCEPTANCE — Employee 客户详情 RFM / 复购 / 客户 360 互动轴 densify

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-EMPLOYEE-CUSTOMER-RFM360` / W∞-140（§2 其余 densify · 新老/复购/留存 · 客户 360 互动轴，toward PARITY）
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §2「新老/复购/留存 /m/customers — RFM 自动分层、复购周期、客户 360 互动轴」+ §9 `NEXT W∞-139+ §2 其余 densify`
- executor: DeepSeek / Plan B（本轮）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；无资金；**R/F/M 为互动口径，非金额成交**；不接美团/抖音实时；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单

## Delivered

把 **员工面客户详情** `/e/customers/[id]`（ME-03 详情）从「仅来源/归属/任务/时间线」推进到 **RFM 分层 + 复购/互动 + 客户 360 互动轴** 可作业闭环，把计划 §2「新老/复购/留存」深度在员工工具面补齐（此前仅 Management 面 W109/W132 有 RFM），全部由已抓取真实档案行现场推导，禁止假 BI。

### 1. API `employee-customer-detail.service.ts`
- `detail()` 新增两个只读查询（tenant + employee scope fail-closed，沿用既有 `customer(id)` 归属/任务/贡献门控）：
  - **RFM 单真源**：`customer_rfm_profiles`（W109/W132 现场计算落库）按 `tenant_id+customer_id` 取 1 行，返回 `recencyDays/frequencyCount/reachCount/layer/windowDays/computedAt`（R=最近互动、F=互动频次、M=触达覆盖，**非金额，reuse 既有 Management 同表，不重算、不假分层**）；无画像返回 `rfm: null`。
  - **跟进/复购互动**：`task_follow_ups` join 本员工名下该客户的 `tasks`，按 `created_at` 倒序取最近 20 条，返回 `followedAt/summary/hasNote`（互动轴与复购触达过程的原始档案）。
- 不新增 schema/表；不写库；只读真实档案。

### 2. UI `apps/employee-web/app/e/customers/[id]/customer-detail.tsx`
复用共享全标对视觉类（`task-detail.module.css` 的 `topBar/heroCard/summaryStrip/distribution/panelBlock/bars/honest`，与 `/e/tasks/[id]` 一致）：
- **概况条 `summaryStrip`** 由 4 列扩为 6 列：新增 `RFM 分层`（`layer` 直显：高价值-活跃 / 温和互动 / 需唤醒 / 沉睡 或 未计算）+ `跟进/复购互动`（`followUps.length`）。
- **分布面板** 新增「客户 360 互动轴」block：由真实 `rfm` 推导 `recencyBucket`（近 7 天/近 30 天/90 天/90 天无互动）、`frequencyBucket`（低频 1-2 / 中度 3-5 / 高频 6+）、`reachBucket`（基础/常规/丰富触达）、`layer` → `rfm360Dist` bars。
- **「客户跟进互动」section**：列出员工最近跟进（summary/日期）。
- 全部派生自真实 `data.rfm` / `data.followUps` 档案行，宽度 `barWidth`，空态「暂无记录/暂无你的跟进互动记录」。

### 3. 诚实边界（保留）
`source=local`、仅记录来源/归属/任务/跟进与入口痕迹及互动 RFM 分层、**不作复购成交**、不含第三方订单履约与支付金额、非本平台下单、不代表第三方成交；不接美团/抖音实时；`/m/workflows` CUSTOM；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单。

## Evidence commands

- `pnpm --filter @oneday/api typecheck` → clean；`pnpm --filter @oneday/employee-web typecheck` → clean；`pnpm typecheck` → 20/20
- `pnpm --filter @oneday/api build` → clean（dist 供真实 DB 测试）；`pnpm build` → 20/20
- `pnpm test:unit` → 49/49
- `node --test tests/g1-winf140-employee-customer-rfm360.test.mjs` → **4/4**（3 静态 + 1 真实 DB round-trip：401/404 跨租户 deny → 员工客户详情回读 `rfm`（layer=温和互动 / recencyDays / frequencyCount / windowDays）→ `followUps`（本员工名下跟进）→ foreign 客户 404 fail-closed）
- `node --test tests/g1-winf*.test.mjs` → 476/480；4 失败 = W116/W137 并行起服瞬断（隔离复跑 9/9 PASS）+ **W88/W89 memberships/Management summaryStrip CSS HEAD 既有基线**（`git stash` 于 clean HEAD `234bb2b` 复跑仍 2 失败，与本刀无涉）
- 变更文件 eslint/prettier 未引入违规

## Honest boundaries

RFM/复购/360 互动轴均为推广员工具员工侧本地互动档案：R/F/M 仅互动口径，**不含支付金额、非本平台下单、不代表三复购成交**；员工仅可查看与自己有归属/任务/贡献关系的客户（scope 门控 fail-closed）；不接美团/抖音实时；不复活 consumer_orders/本平台下单/收单；无 GMV。

Not owner sign-off（`PRODUCT_OWNER_UI_ACCEPTANCE.md` 由主人签署）。
