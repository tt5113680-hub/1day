# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-49 PASS (Management 角色权限 真实数据深页密度 MPC-10：`/m/roles-permissions` 新增白卡分布面板 成员负载/权限规模/权限项/高风险权限持有分布，全部由既有 source=local 角色档案行推导，禁止假 BI.)
- status: Owner 重申完整对标为商用前提（2026-08-11 21:47）。工程继续视觉+IA 完整对标 densify（非仅文案）。全权委托 agent 连续施工。
- blocker: **none** — `BLOCKED_REPORT` marked RESOLVED 2026-08-12.
- progress: Next: **W∞-50** 续 Management/平台/商圈 MPC 深度 densify（W∞-44 经营分析、W∞-45 订单·评价·营销深页、W∞-46 顾客·会员深页、W∞-47 商品·套餐入口深页、W∞-48 员工管理深页、W∞-49 角色权限深页已收；续平台/商圈/员工或管理剩余真实数据面下一处缺口，如 MPC-11 营销内容 或 平台/商圈真实数据深页密度）。
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
