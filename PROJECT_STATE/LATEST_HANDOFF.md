# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-85 收束全仓最后一批残留旧 `AdminPageHeader`+`Card` chrome（toward PARITY）：全仓四端页面级旧 chrome 扫描复核确认仅剩 5 个数据型页——Management MPC `/m/attribution` 来源归因、`/m/entry-funnel` 入口痕迹看板、`/m/circles` 商圈双身份、`/m/funnels/[id]` 来源归因漏斗 + Platform MP-02 `/p/tenants/new` 商户开通向导——五页一次性收束到统一对标：黄顶栏 `topBar`（`推广员工具 · 来源归因/入口痕迹/商圈双身份/来源归因漏斗/商户开通` + 刷新/看板跳转）+ 灰底画布（#f5f5f5）+ 白卡 heroCard（h1 + 诚实描述）+ 白卡概况条 summaryStrip + 白卡分布面板 + honest 底注，全部由已抓取真实档案行现场推导（禁止假 BI）：`归因摘要`+`来源归因分布`（归因阶段/来源类型/证据级别，data.records[]，+attribution-row）、`入口数据概况`+`入口痕迹分布`（事件/入口面/模块/跳转目标平台，真实 L0–L2 痕迹，renderBuckets）、`商圈概况`+`商圈分布`（自有可见/申请邀约来源/状态/附近行业，owned[]/nearby[]/applications[]）、`漏斗摘要`+`漏斗分布`（阶段结果类型/各阶段来源转化，stages[]）、`开通步骤分布`（run.steps[]，countBy(run.steps, stepLabel)）；宽度百分比 `barWidth(total, item.value)`，空数据「暂无记录」，≤900px 单列堆叠。诚实边界全保留（source=local、仅统计观看/访问/跳转/停留/分享入口痕迹、不表示第三方已下单或已支付、开通仅登记意图与本地验收结果不接美团/抖音实时商户数据、不包含本平台收款、非本平台下单）；原交互（attribution 筛选/客户链路、entry-funnel 窗口/行业/DY/查询/AI 解读/保存视图、circles 创建/公开/邀约/申请/审批、funnels 阶段卡/口径说明、tenants-new 一键开通/幂等/步骤轨迹/刷新/换标识重开）全继承 + 新增 data-testid。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf85-last-legacy-chrome-closeout 5/5；g1-winf* 301/301；随动更新 g1-winf25（funnels eyebrow→topBarTitle+h1、attribution 链路口径）+ g1-winf28（attribution 归因阶段口径），g1-winf4/27/30/12 回归通过；e2e management-attribution / platform-onboarding 页头 h1 文案对齐。management+platform typecheck+build PASS、`pnpm typecheck` 20/20、`pnpm build` 20/20、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint+prettier clean。至此全仓无页面级旧 `AdminPageHeader`+`Card` 数据型页残留。See WINF85.
- progress: Next: 全仓旧 chrome 已全部收束。下一刀可转 inventory `PARITY` 关断复核（`MEITUAN_PC_H5_PARITY_INVENTORY.md` 状态列逐面复审 toward PARITY），或推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE）。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
