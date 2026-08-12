# G1-W∞-92 ACCEPTANCE — Employee 员工任务详情 /e/tasks/[id] 全标对概况条 + 真实数据分布 densify（ME-02 详情，toward PARITY）

- slice: `G1-R-EMPLOYEE-TASK-DETAIL-DEEP`
- status: PASS
- date: 2026-08-12 Asia/Shanghai
- executor: Cursor Headless CLI (authorization I)
- branch: `hardening/COMMERCIAL-COMPLETION`
- honest: 工程对标断言；不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`；不宣称已接美团实时。

---

## 1. 范围（承接）

W∞-64 员工任务收件箱 `/e/tasks` 真实数据深页密度 + 四端 PARITY 关断守卫（W∞-89），本刀把 ME-02 的**员工任务详情 `/e/tasks/[id]`**（美团商家端任务内页成熟场景）从旧「header + hero 渐变卡 + 一般 section」收束到员工面与美团商家端一致的 **topBar + heroCard + 概况条 `summaryStrip` + 分布面板 + honest** 三层级全标对视觉层级，并保持与 `/e/tasks` 收件箱（W∞-64）一致的白卡语言。

## 2. 变更

### 2.1 `apps/employee-web/app/e/tasks/[id]/task-detail.tsx`

- 新增工具函数 `barWidth(total, value)`（宽度百分比）与 `countBy(items, ...)`（真实证据行计数 + 频次降序）。
- 全部由已抓取真实 `Detail` 档案行现场推导，禁止假 BI：
  - 白卡概况条 `aria-label="任务详情概况"`（4 列）：
    - 任务状态 `data.task.status`（`completed` → `已完成`，否则 `待执行`）
    - 已关联证据 `data.evidence.length`
    - 待关联证据 `data.availableEvidence.length`
    - 升级次数 `data.task.escalationLevel`
  - 白卡分布面板 `aria-label="任务详情分布"`：
    - 证据类型分布 `data.evidence[].evidence_type`（经 businessLabel：现场图片/页面截图）
    - 证据媒介分布 `data.evidence[].media_type`（PNG / JPG / WebP）
    - 证据来源分布 `data.evidence.length`（已关联）+ `data.availableEvidence.length`（待关联）
    - 升级状态分布 `data.task.escalationLevel`（分桶：未升级 / 轻度升级 1-2 / 多次升级 3+）
  - 宽度百分比 `barWidth(total, item.value)`，空数据「暂无记录」。
- honest 底注：分布全部由已抓取任务详情档案行现场推导（source=local）；不含第三方订单履约、不代履约美团/抖音订单、非本平台下单。
- 保留全部既有交互（证据关联 `evidence-links`、任务完成 `complete`、结果上传 `results`、`记录跟进` follow-up、详情/客户深链、loading/forbidden/error 全状态）与诚实边界（第三方结果单号留痕、非本平台下单）。**无 `经营` 字样、无页面级 `AdminPageHeader`/`Card`。**
- 眉标从 `推广员工具 · 我的任务` 收敛为 `推广员工具 · 任务详情`（与 `/e/tasks` 收件箱 `推广员工具 · 任务收件箱` 的「工具身份 · <页面>」命名一致）。

### 2.2 `apps/employee-web/app/e/tasks/[id]/task-detail.module.css`

- 页面 `.page` 改灰底画布 `background:#f5f5f5` + 纵向网格。
- 新增 `.topBar`（sticky 黄顶栏 `linear-gradient(180deg,#ffe14d,#ffd100)`，适配 `/e/tasks` 收件箱视觉）+ `.topBarTitle` + `.topBarRefresh`。
- 新增 `.heroCard`（白卡 h1 + 诚实描述）。
- 新增 `.summaryStrip`（黄边浅黄底 `linear-gradient(135deg,#fff9db,#fffef5)` + `rgb(255 209 0 / 35%)` + `repeat(4)` 列 + `<span>`(11px/600)/`<strong>`(18px/1.1)）+ `@media(max-width:580px)` 两列堆叠。
- 新增 `.distribution` + `.panelBlock` + `.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty` 灰底白卡 + 黄渐变色条 `linear-gradient(90deg,#ffd100,#f0a500)` + `@media(max-width:580px)` 条宽压缩。
- 新增 `.honest`、`.hero` 改白卡灰底（原 brand 渐变移除）。
- 保留既有 `.section/.customer/.evidence/.available/.resultForm/.footer/.centered` 白卡与表单样式。

## 3. 无 schema / 无 DB / 无 API

全部由既有 `/api/v1/employee/tasks/:id` 已加载的 `Detail` 真实字段现场推导。不复活 consumer_orders / 本平台下单/收单。

## 4. 验证证据

- 自测：`tests/g1-winf92-employee-task-detail-deep.test.mjs` 5/5（黄顶栏+灰画布 / summaryStrip+分布面板 `barWidth`+`countBy` / 真实数据推导严禁假 BI / 诚实边界 / 全交互保留）。
- 随动更新 `tests/g1-winf16-employee-surfaces.test.mjs`（task-detail 眉标 `我的任务` → `任务详情`）。
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → **332/332**（原 327 + 新增 5）。
- `pnpm typecheck` → **20/20**；`pnpm build` → **20/20**（employee-web 含 `/e/tasks/[id]` 动态路由）。
- `pnpm test:unit` → 47 passed；2 个 pre-existing token/storefront-renderer 失败照旧（clean HEAD 同样失败）。
- 变更 TS/CSS/test `eslint` + `prettier` 全 clean。

## 5. 诚实边界

- 分布全部由已抓取任务详情档案行现场推导（source=local），不伪造第三方评分/成交（禁止假 BI）。
- 不含第三方订单履约、不代履约美团/抖音订单、非本平台下单；员工任务为推广员工具工作流，非管店/销售竞品。
- 工程对标断言，不构成 owner 验收签字。
