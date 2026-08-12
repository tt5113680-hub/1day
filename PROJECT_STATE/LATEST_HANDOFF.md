# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-94 Employee 记录跟进 `/e/tasks/[id]/follow-up`（ME-02 子作业）全标对 topBar+heroCard 收束（toward PARITY，禁止假 BI）：四端 W∞ 波本已闭合（Management MPC W∞-45~91 + ME-02 详情 W∞-92 + ME-03 详情 W∞-93 + 关断守卫 W∞-89/90），本刀发现并修复员工记录跟进子页仍引用 W∞-92 命名重构后已删除的 `.header` 样式类导致顶栏为无样式残留。`follow-up.tsx` 移除旧 `styles.header`/`styles.back`（共享 `task-detail.module.css` 中该样式已不存在）与旧 `StatusBadge 可编辑总结` 顶栏右位 + `styles.hero` 灰底 intro，改挂与 `/e/tasks/[id]`、`/e/customers/[id]` 一致的 **topBar + heroCard + 白卡 section 表单 + honest** 全标对视觉层级——`<header className={styles.topBar}>` + `<span className={styles.topBarTitle}>推广员工具 · 任务跟进</span>`（sticky 黄顶栏 `linear-gradient(180deg,#ffe14d,#ffd100)`）+ `<button className={styles.topBarRefresh}>返回</button>`（`history.back()`），新增 `<section className={styles.heroCard} aria-label="记录本次进展">`（`<h1>记录本任务进展</h1>` + 诚实描述），复用共享 `task-detail.module.css` 全标对视觉类（灰底画布 `#f5f5f5`）零 CSS 新增；移除无用 `StatusBadge` 导入。保留全部既有交互（动作选型、原始文字/语音转写、可编辑总结、创建下一任务、历史跟进 `items.map`、保存跟进幂等 POST、loading/forbidden/error 三态 + 重新加载）与成功/失败反馈；新增 honest 底注（`跟进记录与原始档案保存于推广员工具的任务痕迹(source=local)。动作、文字与语音转写用于整理跟进过程，不代履约美团/抖音订单，非本平台下单，不含第三方订单履约与支付金额。`）；新增 `data-testid="employee-follow-up"`。无 `经营` 字样、无页面级 `AdminPageHeader`/`Card`、不复活 consumer_orders / 本平台下单/收单。新增 `tests/g1-winf94-employee-follow-up-parity.test.mjs` 4/4，相关回归 g1-winf30（empFollowUp `推广员工具 ·` 且无 `ONEDAY /`）通过；`g1-winf*.test.mjs` 341/341；`pnpm typecheck` 20/20、`pnpm build` 20/20（employee-web 含 `/e/tasks/[id]/follow-up` 动态路由）、单测 47 passed（2 个 pre-existing token/storefront-renderer 失败照旧）；变更 TS/test eslint+prettier clean。诚实边界全保留（工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、不宣称已接美团实时）。证据 `evidence/G1-MEITUAN-PARITY/WINF94/ACCEPTANCE.md`。
- progress: 四端 W∞ 波已全部闭合（Management MPC W∞-45~91 + Employee ME-02 详情 W∞-92 任务详情 + ME-03 详情 W∞-93 客户详情 + ME-02 子作业 W∞-94 记录跟进，全标对概况条/分布，含 `/m/customers/[id]` MPC-06 明细 + `/e/tasks/[id]`/`/e/customers/[id]`/`/e/tasks/[id]/follow-up` 员工深页 + W∞-89/90 关断守卫 Codify 为可回归断言）。下一刀可推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE，均由主人签验），或按主人指示继续逐面密度 densify。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
