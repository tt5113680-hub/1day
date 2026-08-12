# G1-W∞-87 Management 工作台 全标对概况条 densify (MPC-01)

- slice: `G1-R-MANAGEMENT-DASHBOARD-SUMMARYSTRIP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; `/m/dashboard` 工作台 toward Meituan merchant PC full parity — 补齐概况条)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-80~86 Management MPC 深页序列共享的视觉语言（topBar + heroCard + 白卡概况条 summaryStrip + 白卡分布面板 + honest），本刀把管理面主工作台 `/m/dashboard`（MPC-01 工作台/首页概览）的「今日概况」面板收束到与管理面 MPC 深页一致的独立白卡概况条 `summaryStrip`，使该页完整对标「topBar + heroCard + 概况条 + 分布面板 + 常用功能格 + 指标/待办」的层级；概况条指标全部由已抓取真实 dashboard metrics 字段现场推导，禁止假 BI：

- **`/m/dashboard`（工作台，MPC-01）**：新增白卡概况条 `aria-label="工作台数据概况"`（黄边浅黄底，`summaryStrip`，`summaryStripTitle` 承载「今日概况」标题，≤900px 两列堆叠）——6 项今日指标全部由已抓取真实 dashboard metrics 字段实时推导：
  - 今日客户 `m.customersToday`；
  - 今日待办 `m.openTasksToday`；
  - 今日完成 `m.completedTasksToday`；
  - 逾期 `m.overdueTasks`（逾期>0 标红）；
  - 门店 `m.stores`；
  - 在岗跟进 `m.activeAssignees`。
- **`data-testid="management-dashboard"`** 新增，供 e2e/证据稳定定位。
- **分布面板加 `aria-label="管理工作台分布"`**（`管理工作台分布`，panelHead + panelMeta，复用 W∞-78 既有真实分布）。
- **`page.module.css`**：原 `.todayStrip` 改挂 `.summaryStrip`（`grid-template-columns: repeat(6, minmax(0,1fr))`，`linear-gradient(135deg,#fff9db,#fffef5)` 浅黄底 + `rgb(255 209 0 / 35%)` 黄边），新增 `.summaryStripTitle`（网格整行标签），`@media (max-width:1100px)` 四列、`@media (max-width:900px)` 两列堆叠（与 W∞-80~86 summaryStrip 视觉语言一致）。

承接并保留 W∞-78 的全部分布面板（`管理工作台分布`：待办指标分布/客户门店分布/异常类型分布/提醒队列分布，全部由真实 dashboard `metrics` + `anomalies[]` + `suggestions[]` 行推导）与既有交互/区块（常用功能格、作业数据指标卡、待办与异常列表、作业提醒、`useTenantSync` 实时收敛、刷新）及全状态（loading/forbidden/error）。

诚实边界全保留（honest 底注原文已存在）：「以上分布全部由已抓取管理工作台档案行现场推导（source=local）：待办/客户/门店指标来自 dashboard metrics 真实字段；异常类型由 anomalies 行 type 映射；提醒队列由 anomalies 与 suggestions 行计数。不含支付金额与第三方订单履约；近30日服务档案为本地试点记录，非本平台下单。」工具身份眉标 `推广员工具 · 管理工作台` 不变。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/page.tsx`（`/m/dashboard`；新增 `data-testid="management-dashboard"` + 白卡概况条 `工作台数据概况`，6 项真实数据实时推导；分布面板加 `aria-label="管理工作台分布"`）
- `apps/management-web/app/page.module.css`（原 `.todayStrip` 改挂 `.summaryStrip` + 新增 `.summaryStripTitle` + ≤1100px 四列/≤900px 两列堆叠）
- `tests/g1-winf87-management-dashboard-summarystrip.test.mjs`（新,4/4）— 验证概况条/data-testid/真实数据公式/CSS 响应式/既有分布+诚实边界
- `tests/g1-winf35-management-workbench-visual.test.mjs`（回归）— 工作台黄色 topBar/功能格/白卡面板断言不受影响
- `tests/g1-winf78-employee-management-workbench-deep.test.mjs`（回归）— 工作台分布断言不受影响

## Verify

```text
node --test tests/g1-winf87-management-dashboard-summarystrip.test.mjs  # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs                # 309/309
pnpm --filter @oneday/management-web typecheck                           # PASS
pnpm --filter @oneday/management-web build                              # PASS (routes 含 /m/dashboard)
pnpm typecheck                                                           # 20/20
pnpm build                                                               # 20/20
pnpm test:unit                                                           # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                               # clean
npx prettier --write <changed files>                                     # clean (unchanged)
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-87 无关（clean HEAD 复现一致，同 W∞-44~86 记录）。

## Gates

- typecheck PASS（management + `pnpm typecheck` 20/20）；build PASS（management + `pnpm build` 20/20）；
- `g1-winf87` 4/4；`g1-winf*.test.mjs` 309/309；
- vitest 47 passed（2 pre-existing token 失败照旧）；eslint + prettier clean；
- 概况条/分布指标全部由既有 dashboard 档案行真实推导，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
