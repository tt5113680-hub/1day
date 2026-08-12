# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-73 消费者发现/附近 `/c/discovery`（MH5-01 附近，一级入口）真实数据深页 densify（白卡 heroCard+summaryStrip 附近数据概况+附近商家分布面板：评分/距离带/人气带/入口可用性/发现面五组，全部由真实 Discovery 行推导，禁止假 BI）PASS。员工 ME-02~07 + 渠道开通 + 消费者频道深页（W∞-71）+ 消费者统一入口（W∞-72）+ 消费者发现/附近（W∞-73）已收。See WINF73.
- status: Owner 重申完整对标为商用前提（2026-08-11 21:47）。工程继续视觉+IA 完整对标 densify（非仅文案）。全权委托 agent 连续施工。
- blocker: **none** — `BLOCKED_REPORT` marked RESOLVED 2026-08-12.
- progress: Next: **W∞-74** 消费者深页真实数据密度续（`/c/stores/[id]` 门店页 MH5-03、`/c/search` 搜索 MH5-02 等剩余 PARTIAL）或平台剩余 PARTIAL densify。
- note: Hub http://127.0.0.1:3299/ · **健康排查：每 6 小时** `pnpm unattended:health`（计划任务 `ONEDAY-V3-Unattended-Health-6h`）；BLOCKED/停摆会写 `logs/unattended/health-latest.json`。daemon 与 IDE 勿并行写同分支。

### Owner — next actions

**无强制。** Owner 已声明不管理日常施工；agent 全权推进并在需人工门禁时提醒。

需要时本地验收后签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### Ops — 6h health

```powershell
pnpm unattended:health
pnpm unattended:health:install   # once: register 6h scheduled task
```

告警口径：`BLOCKED_REPORT` 未 RESOLVED、>6h 无成功施工、daemon.log 静默、lock 卡住 ≥3h。
### Headless turn prompt

`scripts/unattended-construction-prompt.md`

### New-window paste (IDE — manual/debug only)

```text
继续
```
