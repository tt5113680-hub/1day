# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: continuous auto-run authorized by owner (2026-08-11); still no parallel Headless writers.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **商用前提 = 四端完整对标美团成熟场景**（消费者/员工/管理/平台）；**唯一例外** `/m/workflows`。团购推广员工具身份 + L0+L1+L2；不碰钱·销售·本平台下单。
- last_verified: **2026-08-12** — W∞-75 消费者 `/c/profile` 我的会员资料（MH5-09）+ `/c/circles` 商圈联盟首页（MH5-13）真实数据深页 densify（profile.tsx sticky 黄顶栏 topBar + 灰底白卡 + heroCard + summaryStrip + 分布面板 我的会员分布：绑定身份/权益/服务历史状态/服务历史时间四组全部由真实 ProfileData 行推导；circles-home.tsx heroCard + summaryStrip + 分布面板 商圈分布：行业/商户规模/覆盖距离/商圈身份四组全部由真实 CirclesData items 推导，禁止假 BI；profile.module.css 旧暖色白板全改挂 token 零 raw hex，两处共享黄渐变色条视觉语言；honest 底注 + 工具身份 + 原交互全继承）。tests/g1-winf75 5/5，随动更新 g1-winf5-circles-densify；`g1-winf*.test.mjs` 254/254；`pnpm build` 20/20 + `pnpm typecheck` 20/20（含 /c/profile /c/circles）；单测 47 passed（2 个 pre-existing token 失败照旧）；eslint + prettier clean。See WINF75.
- status: Owner 重申完整对标为商用前提（2026-08-11 21:47）。工程继续视觉+IA 完整对标 densify（非仅文案）。全权委托 agent 连续施工。
- blocker: **none** — `BLOCKED_REPORT` marked RESOLVED 2026-08-12.
- progress: Next: **W∞-76** 消费者剩余 PARTIAL densify（`/c/circles/[id]` 商圈详情、`/c/search` 搜索、`/c/actions/[id]` 外链确认等）或平台/员工剩余 PARTIAL densify。
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
