# LATEST_HANDOFF

## Executor

- **Local unattended (auth I):** Cursor Headless CLI — `pnpm unattended:install` once, then scheduled task runs every 30m. **No IDE windows required.**
- IDE Agent: human test / review only; do not write in parallel with Headless.
- Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`

## Current task — promoter-tool phases

- branch: `hardening/COMMERCIAL-COMPLETION`
- product_bar: **团购推广员工具** — 统一入口/整合/工作流；不碰钱·销售·管理。痕迹 **L0+L1+L2 同批**。
- last_verified: **2026-08-11** — TOOL-PHASE-0..6 + G1-W∞-3..14 PASS.
- status: Tool-identity construction active. Owner 不用管.
- blocker: none for engineering; **retry `git push origin HEAD`** if GitHub :443 flaps (local may be ahead).
- progress: Next engineering: **W∞-15**（体验对标细部；不做本平台下单）. Owner G1 re-test when ready (not auto-signed).
- note: Hub http://127.0.0.1:3299/ · 套餐详情确认前往 · 门店「我的」工具身份

### Owner — next actions

**无强制。** 需要时本地验收后签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`（不得由 agent 代签）。

### Headless turn prompt

`scripts/unattended-construction-prompt.md`

### New-window paste (IDE — manual/debug only)

```text
继续
```
