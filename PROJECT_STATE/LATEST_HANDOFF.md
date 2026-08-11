# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: human test / review only; do not write in parallel with Headless.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **团购推广员工具** — 统一入口/整合/工作流；不碰钱·销售·管理。痕迹 **L0+L1+L2 同批**。自营=扫呗等第三方；附近=全平台可见引流；商圈=单独页双身份；微站=官网=C端同首页。见 `PRODUCT_DUAL_TRACK_STRATEGY.md`。
- last_verified: **2026-08-11** — TOOL-PHASE-0..3 PASS。**TOOL-PHASE-4 PASS** — DIY `entry-funnel/query` + interpret-only AI（只解读 L0–L2，禁止编造成交）。Traces suite (模块看板/行业模板/自助/AI) 工程闭环。已 push `e84ae7a`。
- status: Tool-identity construction active. Owner 不用管.
- blocker: none for engineering.
- progress: TOOL-PHASE-0..4 PASS. Next: owner G1 re-test when ready (not auto-signed); optional saved DIY views / real LLM behind same contract.
- note: Hub http://127.0.0.1:3299/ · 痕迹 `/m/entry-funnel`

### Owner — next actions

**无强制。** 痕迹分析套件工程已齐；需要时本地验收后签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### Headless turn prompt

`scripts/unattended-construction-prompt.md`

### New-window paste (IDE — manual/debug only)

```text
继续
```
