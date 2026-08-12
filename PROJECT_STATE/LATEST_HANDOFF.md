# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-76 消费者剩余 PARTIAL 深页 densify（`/c/circles/[id]` 商圈详情 MH5-13 + `/c/search` 搜索 MH5-02 + `/c/actions/[id]` 外链确认）：`/c/circles/[id]` heroCard 商圈详情概况 + summaryStrip（入驻商户/可进店/商圈身份）+ 分布面板 商圈详情分布（商户可进店/商圈身份/入驻商户，由真实 merchants[]+circle 推导）；`/c/search` heroCard 搜索结果概况 + summaryStrip（匹配商家/可直接跳转/有评分）+ 分布面板 搜索结果分布（评分/距离带/入口可用性/人气带，由真实 items[] 推导）；`/c/actions/[id]` 全页改挂 od-sf-theme + sticky 黄顶栏 topBar（外链确认+推广员工具 mark）+ honest 底注，旧暖色 hex 白板（#392119/#fff9f5/#b54935）全部改挂 token，平台品牌徽标保留。全部真实数据现场推导、禁止假 BI；honest 边界（source=local、仅统计入口痕迹、不在此下单 · 非本平台下单）全保留；无 schema/DB/API，不复活 consumer_orders / 本平台下单/收单。tests/g1-winf76 5/5；`g1-winf*.test.mjs` 259/259；consumer typecheck+build PASS（含三深页）；`pnpm build` 20/20 + `pnpm typecheck` 20/20；单测 47 passed（2 个 pre-existing token 失败照旧）；eslint + prettier clean。See WINF76.
- status: Owner 重申完整对标为商用前提（2026-08-11 21:47）。工程继续视觉+IA 完整对标 densify（非仅文案）。全权委托 agent 连续施工。
- blocker: **none** — `BLOCKED_REPORT` marked RESOLVED 2026-08-12.
- progress: Next: **W∞-77** 消费者 `one-code/[code]` 一码落地、`share/[code]` 分享落地、`processes/[id]` 服务过程、`services/[id]`、store 子页（group-buy/menu/membership/profile）真实数据深页 densify，或平台/员工剩余 PARTIAL densify。
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
