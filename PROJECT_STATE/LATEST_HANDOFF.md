# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-77 消费者剩余 PARTIAL 真实数据深页 densify（`/c/services/[id]` 套餐详情 + `/c/processes/[id]` 服务过程 + `/c/stores/[id]/profile` 我的服务频道，toward PARITY）：`/c/services/[id]` `service.tsx` 全页改挂 `od-sf-theme` + sticky 黄顶栏 `topBar`（套餐详情+推广员工具 mark）+ 灰底画布 + 白卡 heroCard `套餐概况` + summaryStrip `套餐数据概况`（平台入口/覆盖平台/服务权益）+ 分布面板 `套餐比价分布`（平台入口/价格带/时长类型/服务权益/内容类型，由真实 platformOffers[]+service+benefits[]+content[] 推导）+ honest 底注；`service.module.css` 旧暖色 hex（#392119/#fff9f5/#b54935/#826c64/#fff0e4）白板全改挂 `--od-sf-*`/`--od-brand-*`。`/c/processes/[id]` `process.tsx` 同改挂 `od-sf-theme` + `topBar`（服务过程）+ heroCard `服务过程概况` + summaryStrip `服务过程数据概况`（服务编号/当前状态/结果回执）+ 分布面板 `服务过程分布`（进度状态/咨询与预约/核销与异常/结果回执状态，由真实 process+order+verification+connectorResults[] 推导）+ honest；`process.module.css` 旧蓝色 hex（#312e81/#2563eb/#f5f7fb/#0f172a）白板全改挂 token。`/c/stores/[id]/profile` profile 频道新增白卡分布面板 `我的服务分布`（入口类型/菜单服务类型/门店服务覆盖，由真实 externalLinks[]+services[]+stores[] 推导）。全部真实数据现场推导、禁止假 BI；honest 边界（source=local、成交/履约以美团/抖音/扫呗等第三方实际为准、仅统计入口痕迹、不在此下单 · 非本平台下单）全保留；`one-code`/`share` 为瞬时重定向页无驻留数据不补假 BI 分布面板；无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。tests/g1-winf77 5/5；`g1-winf*.test.mjs` 264/264；consumer typecheck+build PASS（含三面）；`pnpm build` 20/20；`pnpm typecheck` 20/20；单测 47 passed（2 个 pre-existing token 失败照旧）；eslint+prettier clean。See WINF77.
- status: Owner 重申完整对标为商用前提（2026-08-11 21:47）。工程继续视觉+IA 完整对标 densify（非仅文案）。全权委托 agent 连续施工。
- blocker: **none** — `BLOCKED_REPORT` marked RESOLVED 2026-08-12.
- progress: Next: **W∞-78** 消费者/员工/管理/平台面剩余 PARTIAL 深页 densify（如消费者 remaining PARTIAL、员工管理面剩余、或平台/渠道面剩余），或 inventory `PARITY` 关断复核。
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
