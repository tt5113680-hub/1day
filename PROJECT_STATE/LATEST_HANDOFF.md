# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-82 管理工具设置真实数据深页 densify 收束 PASS（MPC-12 `/m/settings` toward PARITY）：`/m/settings` 补上 Management MPC 面唯一仍缺的真实数据深页分布缺口——新增白卡概况条 `工具规则概况`（审批开关/默认时限/归属分配/全平台可见）+ 白卡分布面板 `工具规则分布`（审批开关/提醒时限/免打扰/标签规则/归属分配/全平台可见引流，全部由当前已加载真实工具规则档字段现场推导：`settings.approvals.*`, `settings.reminders.*`, `settings.doNotDisturb.enabled`, `settings.tags.*`, `settings.ownership.allocation`, `platformVisible`）；页内 css `.panel/.summaryStrip/.panelHead/.panelMeta/.distribution/.panelBlock/.bars/.barRow/.barTrack/.barFill/.barValue/.barLabel/.barEmpty/.honest` 灰底白卡+黄渐变色条，≤900px 单列。honest 底注 source=local、全平台可见只影响入口曝光、不含支付金额与第三方订单成功、不包含本平台收款·非本平台下单。无 schema/DB/API，不复活本平台下单/收单。tests/g1-winf82 4/4；g1-winf* 286/286；management typecheck+build PASS；`pnpm typecheck` 20/20、`pnpm build` 20/20。See WINF82.
- progress: Next: **Management MPC 面真实数据深页分布已全部闭合**。下一刀可转 inventory `PARITY` 关断复核，或继续 W∞ 收束其余 PARTIAL/零星 gap 面（员工/消费者/平台面已大片覆盖）。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
