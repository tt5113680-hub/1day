# G1-W∞-64 Employee 任务收件箱 真实数据深页密度 densify（ME-02）

- slice: `G1-R-EMPLOYEE-TASKS-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 员工面 `/e/tasks` 真实数据深页分布 toward 美团商家 App 待办密度)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 Management MPC 全序列（W∞-45~51）、平台面 `/p/*`（W∞-52~61）、商圈面 `/bc/dashboard`+`/bc/merchants`（W∞-60/63）、渠道面 `/ch/dashboard`（W∞-62）真实数据深页序列后，本刀把员工面任务收件箱 `/e/tasks` 补上「分布洞察」并视觉/IA densify toward 美团商家 App 待办密度。全部分布由既有 `GET /api/v1/employee/workbench` 返回的**真实 tasks + customerReminders 行**现场推导，禁止假 BI，无 schema/DB/API 变更：

- **`/e/tasks`（任务收件箱 ME-02）**：黄顶栏 sticky `topBar`（`推广员工具 · 任务收件箱` + 刷新）+ 灰底白卡画布(背景 #f5f5f5) + heroCard 白卡(h1 `任务收件箱` + 诚实描述「不含第三方订单履约」) + 白卡概况条 summaryStrip（全部待办/今日待办/客户提醒/已逾期）+ 白卡分布面板 `aria-label="任务待办分布"`，宽度百分比 `barWidth(allRows.length, value)` 由真实收件箱行推导，空数据「暂无记录」——
  - 状态分布(按真实 `status` 已逾期/待推进/已完成/已取消)；
  - 升级分布(按真实 `escalationLevel` 未升级/轻度升级 1-2/多次升级 3+)；
  - 客户关联分布(关联客户/内部执行)；
  - 到期窗口分布(已逾期/24 小时内/1-3 天内/3 天以上/时间待定)；
  - 来源分布(今日待办/客户提醒)。
- **`task-inbox.module.css`**：新增 `.topBar/.topBarTitle/.topBarRefresh/.heroCard/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 等，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 分布单列堆叠(与 Management/平台/商圈/渠道深页共享视觉语言)。

诚实边界全保留：全部指标派生自既有真实 tasks/customerReminders 行（`source=local`），honest 底注明确「不含第三方订单履约，不代履约美团/抖音订单，非本平台下单」；工具身份眉标 + loading/forbidden/error/empty 全状态 + 完成任务/详情深链全继承。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/employee-web/app/e/tasks/task-inbox.tsx`（黄顶栏/heroCard/summaryStrip/任务待办分布 + 真实行推导）
- `apps/employee-web/app/e/tasks/task-inbox.module.css`（topBar/heroCard/summaryStrip/分布/bar 可视化）
- `tests/g1-winf64-employee-tasks-deep.test.mjs`（新,4/4）

## Verify

```text
node --test tests/g1-winf64-employee-tasks-deep.test.mjs         # 4/4
node --test tests/g1-winf15-process-task-path.test.mjs           # 1/1
node --test tests/g1-winf*.test.mjs                              # 208/208
pnpm --filter @oneday/employee-web typecheck                     # PASS
pnpm --filter @oneday/employee-web build                         # PASS (含 /e/tasks)
```

## Gates

- typecheck PASS(employee-web)；employee-web build PASS（含 `/e/tasks`）；
- `g1-winf64` 4/4；`g1-winf15` 1/1；`g1-winf*.test.mjs` 208/208；
- 真实数据深页密度全部由既有 tasks/customerReminders 行推导，禁止假 BI；不碰消费者成交/钱/销；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
