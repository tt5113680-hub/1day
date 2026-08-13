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
- last_verified: **2026-08-13** — **W∞-114 PASS** 评价待回复队列（MPC-05 / Phase2）：migration `068_reviews_reply`（`store_reviews` 新增 `reply_text/replied_by/replied_at` + 索引）；`GET .../commerce/reviews?reply=&rating=`（`listReviews` rating 参数绑定修正）+ `GET .../reviews/queue`（`reviewQueue` 真实 pending/replied/replyRate/byRating/pendingQueue）+ `POST .../reviews/:id/reply`（幂等 + audit `reviews.replied` + outbox `reviews.replied.v1`，store scope fail-closed）；`/m/reviews` 新增待回复队列/待回复评分分布/状态筛选 chips/回复编辑器 + 概况条（评价数/平均分/待回复/已回复/回复率）。诚实边界 source=local、不接美团评价、不代第三方回写、非本平台下单。新增 tests/g1-winf114 5/5 + management-reviews-reply-queue 1/1（真实 DB：跨租户 deny → 队列 → 筛选 → 幂等重放 → replied 移出 → audit/outbox → 400/401/403）；随动回归 g1-winf45/42/23/17/100 + page-m-commerce 全绿；全仓 686 pass/9 fail（9 为 clean HEAD 既有集成/e2e 基线，与本刀无涉）；typecheck/build 20/20、unit 49/49、evidence-contract 74/74、变更文件 eslint+prettier clean（修复验证期发现 `listReviews` rating `$param` 未绑定导致 `?rating=` 500）。`pnpm db:migrate`（oneday_v3_test）apply 068。见 evidence/G1-MEITUAN-PARITY/WINF114/ACCEPTANCE.md.
- in_flight: **W∞-115 (NEXT)** 经营分析行业模板 + 模块热力 + 工具漏斗（MPC-09）
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
