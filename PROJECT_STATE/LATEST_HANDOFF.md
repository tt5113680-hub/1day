# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: human test / review only; do not write in parallel with Headless.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **团购推广员工具** — 统一入口/整合/工作流；不碰钱·销售·管理。痕迹 **L0+L1+L2 同批**。自营=扫呗等第三方；附近=全平台可见引流；商圈=单独页双身份；微站=官网=C端同首页。见 `PRODUCT_DUAL_TRACK_STRATEGY.md`。
- last_verified: **2026-08-11** — **TOOL-PHASE-0 PASS**（entry_funnel_events + platform_visible_traffic + saabei）。**TOOL-PHASE-1 PASS** — Consumer 前端上报 + Management `/m/entry-funnel` 模块命名看板 + 设置「全平台可见引流」。Prior Meituan W0–W∞-2 still on branch. Next **TOOL-PHASE-2** 商圈单独页双身份.
- status: Tool-identity construction active. Owner 不用管.
- blocker: none for engineering.
- progress: TOOL-PHASE-0+1 PASS; TOOL-PHASE-2 next.
- note: Hub http://127.0.0.1:3299/ · 痕迹看板 `/m/entry-funnel`

### Owner — next actions

**无。** 按推广员工具方案施工中（Phase 0–1 完成）。

### Headless turn prompt

`scripts/unattended-construction-prompt.md`

### New-window paste (IDE — manual/debug only)

```text
继续
```
