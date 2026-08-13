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
- last_verified: **2026-08-13** — **W∞-113 PASS** 订单痕迹详情抽屉 + 导出（MPC-04）：`GET /api/v1/management/commerce/orders/:id` 详情抽屉（订单档案 + `customer_sources` 来源链 + 客户 `tasks` 任务链 + 本地 `audit_logs` 审计链 + evidence/connector 计数，tenant/scope fail-closed）+ `GET /api/v1/management/commerce/orders/export` 真实订单痕迹 CSV；`/m/orders` 导出按钮 + 订单行点击详情抽屉；真实 DB 跨租户/未授权 deny 断言，禁止假 BI，无 GMV；诚实边界 source=local、不接美团实时、非本平台下单。新增 tests/g1-winf113 5/5 + management-order-detail-export 1/1；全仓 680 pass/9 fail（9 为 clean HEAD 既有集成/e2e 基线）；typecheck/build 20/20、unit 49/49、变更文件 eslint+prettier clean。
- in_flight: **W∞-114 (NEXT)** 评价待回复队列（MPC-05）
- deferred: §5 开通 READY（待主人「开始第五节」）
- blocker: **none (engineering)**
- note: 僵死锁应自愈；若再出现余额长期不动，先看 `PROJECT_STATE/OWNER_ALERT_UNATTENDED.md` + `pnpm unattended:health`

## Owner gates (parallel)

1. Hub http://127.0.0.1:3299/
2. Sign `PRODUCT_OWNER_UI_ACCEPTANCE.md` — agent must not sign

### New-window paste

```text
继续
```
