# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-63: Circle `/bc/merchants` 商圈成员治理 真实数据深页密度 densify（商圈面）：承接 Management MPC 深页序列 W∞-45~51 + 平台面 `/p/*` W∞-52~61 + 商圈面 `/bc/dashboard` W∞-60 + 渠道面 `/ch/dashboard` W∞-62，把 `/bc/merchants` 移除页面级 AdminPageHeader/Card/ONEDAY 眉标，新增 `PlatformProductHome mode="circle"` + 黄顶栏 `推广员工具 · 商圈成员治理` + 灰底白卡画布(#f5f5f5) + heroCard 白卡(h1 邀请、双重审批并展示已批准商户) + 白卡概况条 summaryStrip `aria-label="商圈成员概况"`(成员记录/已批准/待审核/覆盖商圈) + 白卡分布面板 `aria-label="商圈成员分布"`（平台审核分布(按真实 platformApprovalStatus 待审批/已批准/已退出)+商圈审核分布(按真实 circleApprovalStatus 待审批/已批准)+邀请状态分布(按真实 invitationStatus 已准备/已接受/已邀请)+展示状态分布(按真实 displayConfig.visible 在总览展示/从总览隐藏)+商户归属商圈分布(按真实 circleName 未归属统一「未归属商圈」频次降序)+联合权益覆盖分布(按真实 benefits.length 分桶 未配置权益0/基础权益1-4/丰富权益5+)，宽度 `barWidth(members.length, b.value)` 由真实成员档案行现场推导，禁止假 BI，空数据「暂无记录」）。诚实边界全保留（源 source=local、商圈是商家联盟整合网络、仅管理成员关系、不含本平台收款、非本平台下单、本地试点记录未接美团实时商户数据）。无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。新增 tests/g1-winf63-bc-merchants-deep.test.mjs 4/4，随动更新 tests/e2e/business-circle-merchants.spec.ts（页面 h1 断言）。typecheck PASS、platform build PASS(含 /bc/merchants)、`pnpm build` 20/20(含 /bc/merchants)、`g1-winf*.test.mjs` 204/204、单测 47 passed（2 个 pre-existing token 失败照旧）、eslint + prettier clean。See evidence/G1-MEITUAN-PARITY/WINF63/ACCEPTANCE.md.
- status: Owner 重申完整对标为商用前提（2026-08-11 21:47）。工程继续视觉+IA 完整对标 densify（非仅文案）。全权委托 agent 连续施工。
- blocker: **none** — `BLOCKED_REPORT` marked RESOLVED 2026-08-12.
- progress: Next: **W∞-64** 续 Management/平台/商圈/渠道/员工 深度 densify（真实数据深页已收 Management MPC 全序列 W∞-45~51 + 平台面 `/p/agents` W∞-52 + `/p/tenants` W∞-53 + `/p/channels` W∞-54 + `/p/business-circles` W∞-55 + `/p/outbox` W∞-56 + `/p/security-audit` W∞-57 + `/p/connectors` W∞-58 + `/p/templates` W∞-59 + 商圈面 `/bc/dashboard` W∞-60 + 平台面 `/p/dashboard` W∞-61 + 渠道面 `/ch/dashboard` W∞-62 + 商圈面 `/bc/merchants` W∞-63；续商圈 `/bc/*` 剩余 / 渠道 `/ch/*` 剩余 / 员工 `/e/*` 剩余真实数据面下一处缺口）。
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
