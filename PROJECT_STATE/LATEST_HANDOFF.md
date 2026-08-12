# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-95 Employee 客户跟进队列 `/e/nurture` full-parity densify（toward PARITY，禁止假 BI）：本刀发现并修复全仓最后一块仍残留旧 `.header` + `.Card` chrome 的员工面（W89 关断守卫未把 `/e/nurture` 纳入员工主面断言）。`nurture-workbench.tsx` 移除旧 `.header` 与 `@oneday/ui` 的 `Card`/`StatusBadge` 页面级 chrome，改挂与现代员工面 full-parity 完全一致的 **topBar + heroCard + summaryStrip + distribution + honest** 三层级（与 `/e/workbench`、`/e/tasks`、`/e/memberships` 一致）——`<header className={styles.topBar}>` + `<span className={styles.topBarTitle}>推广员工具 · 客户跟进</span>`（sticky 黄顶栏 `linear-gradient(180deg,#ffe14d,#ffd100)`）+ 右上 `刷新` + `data-testid="employee-nurture"` + 灰底画布 `#f5f5f5` + 白卡 heroCard（h1 `把下一次触达变成今天的行动` + 诚实描述 `不碰销售成交`）+ 白卡概况条 `summaryStrip` `客户跟进队列概况`（队列客户/持续跟进/回访机会/沉睡唤醒，4 列黄边浅黄底）+ 白卡分布面板 `客户跟进队列分布`（分层/待办负载/触达安排/触达窗口/多待办负载，`barWidth(total,value)`+`countBy`）——全部由真实 `profiles[]` 档案行现场推导，禁止假 BI；分段 chip 改 `segmentBadge[data-segment]` od-token、行为色相不变。`nurture-workbench.module.css` 重建 `.topBar/.topBarRefresh/.heroCard/.panel/.panelHead/.panelMeta/.summaryStrip/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest`（灰底白卡 + 黄渐变 `linear-gradient(90deg,#ffd100,#f0a500)`，≤580px summaryStrip 两列），与员工 full-parity 序列共享视觉语言。保留全部既有交互（客户分层筛选、调整分层/记录触达/安排跟进幂等发送、loading/forbidden/error+重新加载、empty 空态）；诚实边界 source=local、只做跟进作业编排、不代履约美团/抖音订单、非本平台下单、不含第三方订单履约与支付金额。无 `经营`、无 `复购机会/把下一次复购`、无 `ONEDAY /` 眉标、不复活 consumer_orders / 本平台下单/收单。新增 `tests/g1-winf95-employee-nurture-parity.test.mjs` 4/4，随动回归 g1-winf17/28 通过；`g1-winf*.test.mjs` 345/345；`pnpm typecheck` 20/20、`pnpm build` 20/20（employee-web 含 `/e/nurture`）、单测 47 passed（2 个 pre-existing token/storefront-renderer 失败照旧）；变更 TS/test/CSS eslint+prettier clean。诚实边界全保留（工程对标断言，不等于 owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、不宣称已接美团实时）。证据 `evidence/G1-MEITUAN-PARITY/WINF95/ACCEPTANCE.md`。
- progress: 员工面最后一块旧 `.header`+`Card` chrome（`/e/nurture`）已收束到 full-parity 三层级，员工四端主面/深页全部对齐美团商家端；Management MPC W∞-45~91 + Employee ME-02/03 详情 W∞-92/93/94/95 + 消费者 MH5 + 平台渠道商圈 + W∞-89/90 关断守卫 Codify 为可回归断言。下一刀可推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE，均由主人签验），或按主人指示继续逐面密度 densify。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
