# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-84 收束 Management 最后一组仍停留在旧 `AdminPageHeader`+`Card` chrome 的 MPC 零星面（`/m/permission-audit` 操作审计、`/m/connectors` 连接配置、`/m/external-actions` 外链服务、`/m/ai-suggestions` 作业建议）toward PARITY：四页统一改挂黄顶栏 `topBar`（`推广员工具 · 操作审计/连接配置/外链服务/作业建议` + 刷新）+ 灰底画布（#f5f5f5）+ 白卡 heroCard（h1 + 诚实描述）+ 白卡概况条 `summaryStrip` + 白卡分布面板 + honest 底注，全部由已抓取真实档案行现场推导（禁止假 BI）：`操作审计分布` 类型/资源类型/操作人（data.records[]）、`连接配置分布` 连接器平台/授权状态/运行日志状态（connectors[]+logs[]）、`外链服务分布` 动作类型/平台命名/状态（actions[]）、`作业建议分布` 处理状态/动作类型/建议来源模型/执行状态（items[]）；宽度百分比 `barWidth(total,item.value)`，空数据「暂无记录」，≤900px 单列堆叠。诚实边界全保留（source=local、连接器仅为意图/本地记录、渠道分发仅登记待授权不伪造发送、AI 仅解读 L0–L2 入口痕迹不编造成交、不接美团/抖音实时、不包含本平台收款、非本平台下单）；原交互全继承 + 新增 data-testid。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf84 5/5；g1-winf* 296/296；management typecheck+build PASS；`pnpm typecheck` 20/20、`pnpm build` 20/20；eslint+prettier clean。See WINF84.
- progress: Next: 收束 Management 全部旧 `AdminPageHeader`+`Card` chrome（已闭合）。下一刀可转 inventory `PARITY` 关断复核（`MEITUAN_PC_H5_PARITY_INVENTORY.md` 状态列逐面复审 toward PARITY、需接 API/DB 的假 BI 分布关断），或推进未闭合项（HUMAN-PILOT-HANDOFF / G1 OWNER GATE）。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
