# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-78 员工 ME-01 `/e/workbench` + 管理 MPC-01 `/m/dashboard` 真实数据深页 densify（summaryStrip + 分布面板 + honest 底注，toward PARITY）：员工工作台 `workbench.tsx` 新增 summaryStrip `工作台数据概况` + 分布面板 `工作台作业分布`（状态/升级/客户关联/到期窗口/来源/行动机会，由真实 tasks+customerReminders+opportunities 推导）；管理工作台 `page.tsx` 新增分布面板 `管理工作台分布`（待办指标/客户门店/异常类型/提醒队列，由 dashboard metrics+anomalies+suggestions 推导）。全部真实数据现场推导、禁止假 BI；honest 边界（source=local、不含第三方订单履约/支付金额、非本平台下单）全保留；无 schema/DB/API。tests/g1-winf78 5/5；`g1-winf*.test.mjs` 269/269；employee+management typecheck+build PASS。See WINF78.
- status: Owner 全权委托 agent 连续施工；主人说「等施工结束再测」，无需中途汇报。
- blocker: **none**
- progress: Next: **W∞-79** 剩余 PARTIAL 深页 densify（如 `/e/leads`、`/p/tenants`、管理 MPC 零星面）或 inventory PARITY 关断复核。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
