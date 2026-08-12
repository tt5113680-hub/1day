# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-80 Management `/m/stores` 门店入口真实数据深页 densify（MPC-02）PASS：新增 `门店入口分布` 面板（营业状态/负责人指派/启用平台入口/服务覆盖/近30日入口打开/待跟进负载，由真实 stores[].推导，禁止假 BI）+ honest 底注；无 schema/DB/API，不复活本平台下单/收单。tests/g1-winf80 4/4；g1-winf* 277/277；typecheck/build 20/20。See WINF80.
- progress: Next: **W∞-80 收束** 剩余 PARTIAL 深页密度复核（`/m/analytics`、`/m/notifications` 等 MPC 零星面）或 inventory `PARITY` 关断复核。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
