# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-81 管理经营分析 + 通知中心 真实数据深页 densify 收束 PASS（MPC-09 `/m/analytics` + MPC-13 `/m/notifications` toward PARITY）：`/m/analytics` 新增 `经营分析分布` 面板（今日漏斗分布/今日 L2 动作分布/逐日流量分布，全部由真实 daily 报表 L0–L2 痕迹行现场推导）；`/m/notifications` 移除 AdminPageHeader 改挂黄顶栏 topBar+灰底白卡 heroCard+概况条+`通知分布` 面板（通知类型/推进去向/待办负载，由真实租户待推进文件行推导）；共享/页内 css `.distributionPanel/.panelHead/.panelMeta/.distribution` 灰底白卡+黄渐变色条，≤900px 单列。honest 底注 source=local、分布由真实档案行现场推导、仅统计入口痕迹+租户待推进文件、不包含本平台收款·非本平台下单。无 schema/DB/API，不复活本平台下单/收单。tests/g1-winf81 5/5；g1-winf* 282/282；management typecheck+build PASS；`pnpm typecheck` 20/20、`pnpm build` 20/20。See WINF81.
- progress: Next: **W∞-80 收束已完成**（/m/analytics /m/notifications 已补分布洞察）。下一刀可转 inventory `PARITY` 关断复核，或 W∞ 收束其余 PARTIAL/零星 gap 面。
- note: Hub http://127.0.0.1:3299/ · 健康排查每 6h `pnpm unattended:health`

### Owner — next actions

**无强制。** 施工结束后本地验收并签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### New-window paste (IDE — manual/debug only)

```text
继续
```
