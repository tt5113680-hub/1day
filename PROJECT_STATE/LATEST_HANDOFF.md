# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-52（待施工下标）: Platform 省市区代理 真实数据深页密度 densify（平台面，禁止假 BI）：`/p/agents` 移除页面级 AdminPageHeader，新增黄顶栏 `推广员工具 · 省市区代理`+灰底白卡画布+heroCard+summaryStrip+白卡分布面板 `aria-label="代理运营分布"`（代理层级/代理状态/区域层级/结算状态/入驻审批状态，全部由已抓取的省市区代理档案行 source=local 推导，禁止假 BI，结算/配额是代理运营账不是消费者成交）。
- status: Owner 重申完整对标为商用前提（2026-08-11 21:47）。工程继续视觉+IA 完整对标 densify（非仅文案）。全权委托 agent 连续施工。
- blocker: **none** — `BLOCKED_REPORT` marked RESOLVED 2026-08-12.
- progress: Next: **W∞-53** 续 Management/平台/商圈 深度 densify（真实数据深页已收 Management MPC 全序列 W∞-45~51 + 平台面 `/p/agents` W∞-52；续平台 `/p/tenants` `/p/channels` `/p/outbox` `/p/security-audit` 真实数据深页密度 或 商圈 `/bc/*` / 员工 `/e/*` 剩余真实数据面下一处缺口）。
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
