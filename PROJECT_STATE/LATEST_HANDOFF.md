# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-91 Management 客户跟进明细 `/m/customers/[id]`（MPC-06 顾客/CRM 明细）全标对概况条 + 真实数据分布 densify（toward PARITY，禁止假 BI）：承接 W∞-45~90 Management MPC 深页波 + W∞-88 `/m/customers` 列表全标对概况条，把 MPC-06 客户跟进明细页补上「白卡概况条 `summaryStrip` + 白卡分布面板 + honest 底注」，使该明细页从「topBar + heroCard + ops/grid/时间线」收束到与管理面 MPC 深页一致的 topBar+heroCard+概况条+分布+honest 三层级全标对视觉层级。`page.tsx` 新增 `barWidth(total,value)` 与 `countBy(rows,keyOf)`，全部由已抓取真实 `Detail` 档案行现场推导：概况条 `客户详情数据概况`（6 列 = 来源记录/归属记录/任务/订单结果/跟进异常/链路事件）+ 分布面板 `客户详情分布`（任务状态/来源状态/归属角色/归属审批状态/订单结果状态/跟进异常类型/来源角色与贡献/链路事件类型 + 仅当存在时的任务升级信号分布），宽度 `barWidth`，空数据各态。`page.module.css` 新增 `.summaryStrip`（黄边浅黄底 `linear-gradient(135deg,#fff9db,#fffef5)` + `rgb(255 209 0 / 35%)` + `repeat(6)` + `≤900px` 两列）+ `.distribution/.panelBlock/.bars/... /barEmpty`（灰底白卡 + 黄渐变色条 `linear-gradient(90deg,#ffd100,#f0a500)` + `≤900px` 单列）+ `.honest`。诚实边界全保留（source=local、分布全部由已抓取客户详情档案行现场推导、仅记录来源/归属/任务与入口痕迹、不包含本平台收款、非本平台下单、不代表第三方成交）；保留全部交互与 scope 文案（正在加载客户跟进全链路/无权查看客户详情/客户跟进记录未能完成加载/← 返回客户跟进/跟进异常）；无 `经营` 字样、无 `AdminPageHeader`/`Card`。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 `tests/g1-winf91-management-customer-detail-deep.test.mjs` 3/3，随动回归 g1-winf24/28/29/30/40/88/89/90；`g1-winf*.test.mjs` 327/327；`pnpm typecheck` 20/20、`pnpm build` 20/20（management-web 含 `/m/customers/[id]` 动态路由）、单测 47 passed（2 个 pre-existing token/storefront-renderer 失败照旧）；新文件/变更 TS/CSS eslint+prettier clean。诚实边界全保留（工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、不宣称已接美团实时）。See evidence/G1-MEITUAN-PARITY/WINF91/ACCEPTANCE.md.
- progress: 四端 W∞ 波已全部闭合（Management MPC W∞-45~91 全标对概况条/分布，含 `/m/customers/[id]` MPC-06 明细 + W∞-89/90 关断守卫 Codify 为可回归断言）。下一刀可推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE，均由主人签验），或按主人指示继续逐面密度 densify。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
