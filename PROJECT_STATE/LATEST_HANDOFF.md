# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-92 Employee 员工任务详情 `/e/tasks/[id]`（ME-02 详情）全标对概况条 + 真实数据分布 densify（toward PARITY，禁止假 BI）：承接 W∞-64 员工任务收件箱 `/e/tasks` 真实数据深页密度 + W∞-89 四端 PARITY 关断守卫，把 ME-02 的任务详情内页从旧「header + 渐变 hero + 一般 section」收束到员工面与美团商家端一致的 topBar+heroCard+概况条 `summaryStrip`+分布面板+honest 三层级全标对视觉层级（与 `/e/tasks` 收件箱白卡语言一致）。`task-detail.tsx` 新增 `barWidth(total,value)` 与 `countBy(items)`，全部由已抓取真实 `Detail` 档案行现场推导：概况条 `任务详情概况`（4 列 = 任务状态/已关联证据/待关联证据/升级次数）+ 分布面板 `任务详情分布`（证据类型 `data.evidence[].evidence_type` 经 businessLabel/证据媒介 `media_type` PNG·JPG·WebP/证据来源 已关联+待关联/升级状态 `escalationBucket` 未升级·轻度 1-2·多次 3+），宽度 `barWidth`，空数据「暂无记录」。`task-detail.module.css` 改灰底画布 `#f5f5f5` + `.topBar`（sticky 黄顶栏 `linear-gradient(180deg,#ffe14d,#ffd100)`）+ `.heroCard`（白卡 h1+诚实描述）+ `.summaryStrip`（黄边浅黄底 `linear-gradient(135deg,#fff9db,#fffef5)` + `rgb(255 209 0 / 35%)` + `repeat(4)` + `≤580px` 两列）+ `.distribution/.panelBlock/.bars/... /barEmpty`（灰底白卡 + 黄渐变色条 `linear-gradient(90deg,#ffd100,#f0a500)`）+ `.honest`；原 brand 渐变 `.hero` 改白卡灰底。诚实边界全保留（source=local、分布由已抓取任务详情档案行现场推导、不含第三方订单履约、不代履约美团/抖音订单、非本平台下单）；眉标 `推广员工具 · 我的任务` → `推广员工具 · 任务详情`（与 `/e/tasks` 收件箱命名一致）；保留全部交互（证据关联 evidence-links/任务完成 complete/结果上传 results/记录跟进 follow-up/详情客户深链）与 loading/forbidden/error 全状态；无 `经营` 字样、无页面级 `AdminPageHeader`/`Card`。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 `tests/g1-winf92-employee-task-detail-deep.test.mjs` 5/5，随动更新 g1-winf16（task-detail 眉标断言）；`g1-winf*.test.mjs` 332/332；`pnpm typecheck` 20/20、`pnpm build` 20/20（employee-web 含 `/e/tasks/[id]` 动态路由）、单测 47 passed（2 个 pre-existing token/storefront-renderer 失败照旧）；变更 TS/CSS/test eslint+prettier clean。诚实边界全保留（工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、不宣称已接美团实时）。See evidence/G1-MEITUAN-PARITY/WINF92/ACCEPTANCE.md.
- progress: 四端 W∞ 波已全部闭合（Management MPC W∞-45~91 + Employee ME-02 详情 W∞-92 全标对概况条/分布，含 `/m/customers/[id]` MPC-06 明细 + W∞-89/90 关断守卫 Codify 为可回归断言）。下一刀可推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE，均由主人签验），或按主人指示继续逐面密度 densify。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
