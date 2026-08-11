# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **团购推广员工具** — 统一入口/整合/工作流；不碰钱·销售·管理。痕迹 **L0+L1+L2 同批**。
- last_verified: **2026-08-11** — TOOL-PHASE-0..6 + G1-W∞-3..30 + W∞-31(MPC-13 通知中心) PASS.
- status: Tool-identity construction **plateau** (W∞-3..30 PASS) + **MPC-13 通知中心 closed** (W∞-31). **Owner 2026-08-11 全权委托 agent 施工，无需逐轮管理**；有问题 agent 主动提醒。
- blocker: none outbound.
- progress: Tool-identity construction **plateau** (W∞-3..30 PASS) + MPC-13 通知中心 (W∞-31) closed. Owner G1 re-test when ready.
- note: Hub http://127.0.0.1:3299/ · **W∞-31** 管理通知中心 `/m/notifications` + `GET /api/v1/management/notifications`（tenant.manage，只读聚合跟进异常/待审批/进行中工作流，deepLink → /m/customers /m/workflows）· MPC-13 消息/通知 GAP→PARTIAL · **W∞-29** 顾客→客户/客户跟进 nav+工作台对齐 · **W∞-30** 管理/员工 ONEDAY / 眉标去除（7 页）· Platform/Consumer ONEDAY / 按边界保留 · 无 schema/DB migration

### Owner — next actions

**无强制。** Owner 已声明不管理日常施工；agent 全权推进并在需人工门禁时提醒。

需要时本地验收后签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### Headless turn prompt

`scripts/unattended-construction-prompt.md`

### New-window paste (IDE — manual/debug only)

```text
继续
```
