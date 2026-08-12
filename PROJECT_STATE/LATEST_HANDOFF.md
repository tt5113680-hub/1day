# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-62: Channel `/ch/dashboard` 渠道代理仪表盘 真实数据深页密度 densify（渠道面）：保留黄顶栏 `推广员工具 · 渠道代理`+省市区代理/开通商户/刷新、灰底白卡画布+heroCard（h1 商户开通队列与跟进信号）+常用功能格+渠道指标+商户经营队列；新增 summaryStrip `aria-label="渠道概况"`（渠道商户/已开通/近 30 天活跃/跟进信号）+白卡分布面板 `aria-label="渠道运营分布"`（开通状态(按真实 onboarding_status 待接受/开通中/已开通/已暂停)/套餐(按真实 plan)/风险等级(按真实 risk_level)/归属区域(按真实 region_name 未归属统一「未归属省市区代理」)/近 30 天活跃(按真实 active_in_30_days)/跟进信号(按真实 renewalSignal)，宽度 `barWidth(merchants.length, b.value)` 由真实渠道商户档案行现场推导，禁止假 BI，空数据「暂无记录」）。随刀数据修正：onboarding_status 真实值为 invited/onboarding/active/paused（非 onboarded），`onboardingLabel`+筛选下拉改映射真实值(active→已开通、paused→已暂停)、行内开通徽标改由专用 onboardingLabel(不再复用共享 statusLabel 的 active→正常)，分布/徽标/筛选三处口径一致。诚实边界全保留（源 source=local、近 30 天活跃仅反映既有作业/跟进与档案类证据不作入口成交归因、跟进信号仅来自不活跃或既有高风险证据非套餐到期非成交漏斗、不含本平台收款、非本平台下单、未接美团实时商户数据）。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf62-channel-dashboard-deep.test.mjs 4/4。typecheck PASS、platform build PASS(含 /ch/dashboard)、`pnpm build` 20/20(含 /ch/dashboard)、`g1-winf*.test.mjs` 200/200、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。See evidence/G1-MEITUAN-PARITY/WINF62/ACCEPTANCE.md.
- status: Owner 重申完整对标为商用前提（2026-08-11 21:47）。工程继续视觉+IA 完整对标 densify（非仅文案）。全权委托 agent 连续施工。
- blocker: **none** — `BLOCKED_REPORT` marked RESOLVED 2026-08-12.
- progress: Next: **W∞-63** 续 Management/平台/商圈/渠道/员工 深度 densify（真实数据深页已收 Management MPC 全序列 W∞-45~51 + 平台面 `/p/agents` W∞-52 + `/p/tenants` W∞-53 + `/p/channels` W∞-54 + `/p/business-circles` W∞-55 + `/p/outbox` W∞-56 + `/p/security-audit` W∞-57 + `/p/connectors` W∞-58 + `/p/templates` W∞-59 + 商圈面 `/bc/dashboard` W∞-60 + 平台面 `/p/dashboard` W∞-61 + 渠道面 `/ch/dashboard` W∞-62；续商圈 `/bc/merchants` / 渠道 `/ch/*` 剩余 / 员工 `/e/*` 剩余真实数据面下一处缺口）。
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
