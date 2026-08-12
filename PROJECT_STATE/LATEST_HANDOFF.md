# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-93 Employee 员工客户详情 `/e/customers/[id]`（ME-03 详情）全标对概况条 + 真实数据分布 densify（toward PARITY，禁止假 BI）：承接 W∞-65 员工客户目录 `/e/customers` 真实数据深页密度 + W∞-91 管理面客户跟进明细 `/m/customers/[id]` + W∞-92 员工任务详情 `/e/tasks/[id]`，把 ME-03 的客户详情内页从旧「header（W∞-92 命名重构后该样式已无，旧页实为无样式残留）+ 渐变 hero + 一般 section」收束到员工面与美团商家端一致的 topBar+heroCard+概况条 `summaryStrip`+分布面板+honest 三层级全标对视觉层级（与 `/e/tasks` 任务详情 W∞-92、`/e/customers` 收件箱 W∞-65 一致的白卡语言）。`customer-detail.tsx` 移除旧 `.header`、复用共享 `task-detail.module.css` 全标对视觉类（`.topBar` sticky 黄顶栏 `#ffe14d→#ffd100`、`.page` 灰底画布 `#f5f5f5`、`.summaryStrip` 黄边浅黄底 `linear-gradient(135deg,#fff9db,#fffef5)`+`rgb(255 209 0 / 35%)`+`repeat(4)`+`≤580px` 两列、`.bars/.barFill` 灰底白卡 + 黄渐变色条 `#ffd100→#f0a500`、`.honest`），新增 `barWidth(total,value)` + `countBy(items)`，全部由已抓取真实 `Detail` 档案行现场推导：概况条 `客户详情概况`（4 列 = 来源记录 `data.sources.length`/归属记录 `data.ownerships.length`/客户标签 `data.tags.length`/相关任务 `data.tasks.length`）+ 分布面板 `客户详情分布`（来源类型 `data.sources[].source_role` 经 businessLabel/归属角色 `data.ownerships[].ownershipRole` 当前员工标记 `我 · <角色>`/相关任务状态 `data.tasks[].status` 经 businessLabel/时间线动态 `data.timeline[].kind` 任务动态·客户动态），宽度 `barWidth`，空数据「暂无记录」。诚实边界全保留（source=local、分布由已抓取客户详情档案行现场推导、仅记录来源/归属/任务与入口痕迹、不含第三方订单履约与支付金额、非本平台下单、不代表第三方成交）；眉标从旧无样式 `推广员工具 · 我的客户` 收敛为 `推广员工具 · 客户详情`（与 `/e/customers` 收件箱 `推广员工具 · 客户目录` 命名一致）；保留全部状态（loading `正在加载客户详情`/forbidden `无法查看此客户`/error `客户详情暂不可用`+重新加载）与全部交互（客户摘要身份、来源与归属、客户标签 `# <label>`、我的相关任务→`/e/tasks/[id]` 查看、时间线、客户目录/返回工作台深链）；无 `经营` 字样、无页面级 `AdminPageHeader`/`Card`，新增 `data-testid="employee-customer-detail"`。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 `tests/g1-winf93-employee-customer-detail-deep.test.mjs` 5/5，相关回归 g1-winf30（employee customer-detail 眉标断言）通过；`g1-winf*.test.mjs` 337/337；`pnpm typecheck` 20/20、`pnpm build` 20/20（employee-web 含 `/e/customers/[id]` 动态路由）、单测 47 passed（2 个 pre-existing token/storefront-renderer 失败照旧）；变更 TS/test eslint+prettier clean。诚实边界全保留（工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、不宣称已接美团实时）。See evidence/G1-MEITUAN-PARITY/WINF93/ACCEPTANCE.md.
- progress: 四端 W∞ 波已全部闭合（Management MPC W∞-45~91 + Employee ME-02 详情 W∞-92 任务详情 + ME-03 详情 W∞-93 客户详情全标对概况条/分布，含 `/m/customers/[id]` MPC-06 明细 + W∞-89/90 关断守卫 Codify 为可回归断言）。下一刀可推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE，均由主人签验），或按主人指示继续逐面密度 densify。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
