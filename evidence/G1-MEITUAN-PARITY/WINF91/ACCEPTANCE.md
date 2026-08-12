# G1-W∞-91 ACCEPTANCE — Management 客户跟进明细 /m/customers/[id] 全标对概况条 + 真实数据分布 densify（MPC-06 顾客/CRM 明细，toward PARITY）

- slice: `G1-R-MANAGEMENT-CUSTOMER-DETAIL-DEEP`
- status: PASS
- date: 2026-08-12 Asia/Shanghai
- executor: Cursor Headless CLI (authorization I)
- branch: `hardening/COMMERCIAL-COMPLETION`
- honest: 工程对标断言；不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；不宣称已接美团实时。

---

## 1. 范围（承接）

W∞-45~90 Management MPC 真实数据深页波 + W∞-88 `/m/customers` 列表全标对概况条，本刀把 MPC-06 顾客/CRM 的**客户跟进明细 `/m/customers/[id]`**（美团商家端 PC 客户详情成熟场景）补上「白卡概况条 `summaryStrip` + 真实数据分布面板 + honest 底注」，使该明细页从「topBar + heroCard + 白卡 ops/grid/时间线」收束到与管理面 MPC 深页一致的 **topBar + heroCard + 概况条 + 分布 + honest** 三层级全标对视觉层级。

## 2. 变更

### 2.1 `apps/management-web/app/m/customers/[id]/page.tsx`

- 新增工具函数 `barWidth(total, value)`（宽度百分比，四舍五入两位）与 `countBy(rows, keyOf)`（真实行计数 + 频次降序）。
- 全部由已抓取真实 `Detail` 档案行现场推导，禁止假 BI：
  - 白卡概况条 `aria-label="客户详情数据概况"`（6 列）：
    - 来源记录 `sources.length`
    - 归属记录 `ownerships.length`
    - 任务 `tasks.length`
    - 订单结果 `orders.length`
    - 跟进异常 `anomalies.length`
    - 链路事件 `timeline.length`
  - 白卡分布面板 `aria-label="客户详情分布"`：
    - 任务状态分布 `tasks[].status`（经 businessLabel）
    - 来源状态分布 `sources[].status`
    - 归属角色分布 `ownerships[].ownership_role`
    - 归属审批状态分布 `transfers[].status`
    - 订单结果状态分布 `orders[].status`
    - 跟进异常类型分布 `anomalies[].type`
    - 来源角色与贡献 `sources[].source_role` + `contributions[].contribution_role`
    - 链路事件类型分布 `timeline[].kind`
    - 任务升级信号分布（仅当存在 `escalation_level > 0` 才渲染，`escalation_level >= 3` → `已升级 ≥3 次`）真实升级信号，非伪造
  - 宽度百分比 `barWidth(total, item.value)`，空数据「暂无任务 / 暂无来源记录 / 暂无归属记录 / 暂无归属审批 / 暂无订单结果 / 暂无跟进异常 / 暂无来源或贡献记录 / 暂无链路事件」。
- honest 底注：分布全部由已抓取客户详情档案行现场推导，仅记录来源、归属、任务与入口痕迹；不包含本平台收款、非本平台下单。
- 保留全部既有交互（归属转移审批 / 合并 / 时间线 / merged 态 / 跟进异常 alerts）与全部 scope 文案（`正在加载客户跟进全链路`、`请使用具备客户跟进范围的账号`、`客户跟进记录未能完成加载`、`← 返回客户跟进`、`aria-label="跟进异常"`）。**无 `经营` 字样、无 `AdminPageHeader`/`Card`。**

### 2.2 `apps/management-web/app/m/customers/[id]/page.module.css`

- 新增 `.summaryStrip`（黄边浅黄底 `linear-gradient(135deg,#fff9db,#fffef5)` + `rgb(255 209 0 / 35%)` 黄边 + `repeat(6)` 列 + `.summaryStrip span`(#666/12/600) `.summaryStrip strong`(700 22px/1.1)）+ `@media(max-width:900px)` 两列堆叠（与 W∞-88/90 全标对系列一致）。
- 新增 `.distribution`（`repeat(4)` 列）+ `.panelBlock` + `.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty` 灰底白卡 + 黄渐变色条 `linear-gradient(90deg,#ffd100,#f0a500)` + `@media(max-width:900px)` 单列堆叠。
- 新增 `.honest`（浅黄底文字边框）。

## 3. 无 schema / 无 DB / 无 API

全部由既有 `/api/v1/management/customers/:id` 已加载的 `Detail` 真实字段现场推导。不复活 consumer_orders / 本平台下单/收单。

## 4. 验证证据

- 自测：`tests/g1-winf91-management-customer-detail-deep.test.mjs` 3/3（概况条 CSS 全标对 / 真实数据分布面板 `barWidth`+`countBy`+空态 / 诚实边界 + 无 `经营` 回归）。
- 回归：`g1-winf24 / g1-winf28 / g1-winf29 / g1-winf30 / g1-winf40 / g1-winf88 / g1-winf89 / g1-winf90` 全部 PASS。
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → **327/327**（原 324 + 新增 3）。
- `pnpm --filter management-web typecheck` PASS、`pnpm --filter management-web build` PASS（含 `/m/customers/[id]` 动态路由）。
- `pnpm typecheck` → **20/20**；`pnpm build` → **20/20**。
- `pnpm test:unit` → 47 passed；2 个 pre-existing token/storefront-renderer 失败照旧（clean HEAD 同样失败）。
- 新 test 文件 + 变更 TS/CSS `eslint`（TS）/`prettier` 全 clean。

## 5. 诚实边界

- 分布全部由已抓取客户详情档案行现场推导（source=local），不伪造第三方评分/成交。
- 不包含本平台收款、非本平台下单；客户跟进为推广员工具工作流，非管店/销售竞品。
- 工程对标断言，不构成 owner 验收签字。
