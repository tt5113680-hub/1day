# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-56: Platform 平台投递队列 真实数据深页密度 densify（平台面 SYS-4，禁止假 BI）：`/p/outbox` 移除页面级 AdminPageHeader/Card/ONEDAY 眉标，新增黄顶栏 `推广员工具 · 平台投递队列`+灰底白卡画布+heroCard+summaryStrip（死信记录/涉及租户/聚合对象/已达上限）+白卡分布面板 `aria-label="平台投递分布"`（事件类型/聚合对象/重试次数/租户，全部由已抓取真实平台投递死信档案行 eventType/aggregateType/attempts/tenantId 推导，禁止假 BI，Outbox 是平台投递与同步队列不是消费者成交）。
- status: Owner 重申完整对标为商用前提（2026-08-11 21:47）。工程继续视觉+IA 完整对标 densify（非仅文案）。全权委托 agent 连续施工。
- blocker: **none** — `BLOCKED_REPORT` marked RESOLVED 2026-08-12.
- progress: Next: **W∞-57** 续 Management/平台/商圈/员工 深度 densify（真实数据深页已收 Management MPC 全序列 W∞-45~51 + 平台面 `/p/agents` W∞-52 + `/p/tenants` W∞-53 + `/p/channels` W∞-54 + `/p/business-circles` W∞-55 + `/p/outbox` W∞-56；续平台 `/p/security-audit` `/p/connectors` `/p/templates` `/p/dashboard` 真实数据深页密度 或 商圈 `/bc/*` / 员工 `/e/*` 剩余真实数据面下一处缺口）。
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
