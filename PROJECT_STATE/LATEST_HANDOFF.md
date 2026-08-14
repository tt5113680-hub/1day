# LATEST_HANDOFF

## Executor

- **Local unattended (auth I / Plan B):** OpenCode + **DeepSeek** — sole writer when IDE idle.
- IDE must use `pnpm unattended:ide-lock -- -Action Acquire -Holder IDE-Agent-Wxxx -Minutes 90` then **Release** when done (TTL auto-clears forgotten locks).
- **Construction plan:** `PROJECT_STATE/MEITUAN_DEPTH_OPTIMIZATION_PLAN.md`

## Incident (2026-08-13) — monitoring failure, fixed

- **What:** IDE finished W111, re-locked for W112 with infinite keeper, then session ended **without Release** → DeepSeek SKIP ~3h → balance flat. Owner noticed first.
- **Why agents missed it:** health check looked at wrong path `construction.lock` (real file is `.construction.lock`); lock with live keeper never counted as stale; no auto-clear / loud `OWNER_ALERT_UNATTENDED.md`.
- **Fix shipped:** stale-lock auto-clear (IDE ≥90m / daemon ≥200m / `expires=`), hourly health + auto-fix, daemon/orchestrator alert on long SKIP-lock, IDE lock script with TTL.

## Current task

- branch: `hardening/COMMERCIAL-COMPLETION`
- last_verified: **2026-08-14** — **W∞-120 PASS** Outbox 重放 + 告警（§6 W∞-SAAS-OUTBOX，IDE 本地收口）。See evidence/G1-MEITUAN-PARITY/WINF120/ACCEPTANCE.md。
- in_flight: **W∞-121 (NEXT, Phase3)** 审计导出全覆盖
- deferred: §5 开通 READY（待主人「开始第五节」）
- blocker: **none (engineering)**
- note: W120 DeepSeek 3×TIMEOUT（073 缺 UNIQUE）；IDE 本地已 PASS。W121+ 可 `pnpm unattended:resume` 续全自动。

## Owner gates (parallel)

1. Hub http://127.0.0.1:3299/
2. Sign `PRODUCT_OWNER_UI_ACCEPTANCE.md` — agent must not sign

### New-window paste

```text
继续
```
