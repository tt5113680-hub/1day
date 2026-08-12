# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-83 员工表现真实数据深页 densify 收束 PASS（MPC-10 员工/人力区 toward PARITY）：`/m/employee-process-performance` 从旧 `AdminPageHeader`+`Card` chrome 改挂黄顶栏 `推广员工具 · 员工表现` + 灰底画布（#f5f5f5）+ 白卡 heroCard（`用任务、跟进、证据与贡献过程支持辅导`）+ 白卡概况条 `员工概况`（在职员工/有逾期信号/已有跟进/有贡献关联）+ 白卡分布面板 `员工表现分布`（任务负载/逾期信号/跟进完整度/证据链覆盖/贡献关联，由真实 `employees[]` 档案行现场推导）+ honest 底注（source=local、不代表个人成交额或唯一绩效结论、不接第三方实时人事/绩效、不包含本平台收款、非本平台下单）。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。tests/g1-winf83 5/5；g1-winf* 291/291；management typecheck+build PASS；`pnpm typecheck` 20/20、`pnpm build` 20/20。See WINF83.
- progress: Next: **Management MPC 真实数据深页分布已全部闭合**。下一刀可转 W∞ 收束其余仍停留在旧 `AdminPageHeader`+`Card` chrome 的 MPC 零星面（`/m/permission-audit`、`/m/connectors`、`/m/external-actions`、`/m/ai-suggestions` 等），或 inventory `PARITY` 关断复核。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
