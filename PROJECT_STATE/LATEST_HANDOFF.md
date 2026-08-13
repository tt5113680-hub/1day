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
- last_verified: **2026-08-13** — **W∞-117 PASS** 通知已读/忽略/批量 + 设置变更审计（MPC-13 / MPC-12，Phase2 收尾）：migration `070_management_notifications`（`management_notifications` tenant_scoped `(tenant_id,category,source_type,source_id)` 唯一 + inbox idx，与 employee_notifications 同构）。`management-notification.service.ts` `list` 先 `materialize`（overdue tasks/pending ownership approvals/active workflows，`on conflict do nothing`）再回读持久行，新增 `state=all|unread|read|ignored` + 每行 `notificationId/readAt/status/version`（`id` 保留源聚合 id 向后兼容）；`markRead` `PATCH .../notifications/:id/read`（Idempotency-Key 幂等重放 + 乐观锁 version 409 + 已忽略 409 + 未知 404 + audit management.notification_read + outbox .v1）；`batch` `POST .../notifications/batch`（`@HttpCode(200)`，action ∈ read|unread|ignore|unignore、ids 1–200，忽略默认从 all 隐藏/state=ignored 可见，Idempotency-Key 幂等重放 + audit/outbox .notification_batch(.v1)）；`settingsAudit` `GET .../notifications/settings-audit`（MPC-12：仅读 `tenant.operating_settings_updated` 真实 audit，与 settings 写路径形成「变更→审计」闭环）。`/m/notifications`（page.tsx + notifications.module.css）批量工具条（勾选 checkbox + 批量标为已读/未读/忽略）、状态+类型筛选、每行状态徽标（未读/已读/已忽略）+「标为已读」按钮（乐观锁）、「工具设置变更审计」面板。诚实边界全保留（仅登记推广员工具内待推进痕迹与工具规则审计，不接美团/抖音实时、不含支付金额/销售成交/第三方订单履约、非本平台下单；忽略仅从默认视图隐藏该待推进项，不代第三方履约/不删源任务；全 tenant.manage fail-closed + Idempotency-Key + 乐观锁；`/m/workflows` CUSTOM；§5 READY deferred；不复活 consumer_orders/本平台下单/收单）。新增 tests/g1-winf117-management-notification-depth.test.mjs 1/1（真实 DB round-trip）+ 随动回归 tests/management-notifications.test.mjs 1/1；`g1-winf*.test.mjs` 428/428、真实 DB 串行复核 109/109、typecheck/build 20/20、unit 49/49、evidence-contract 74/74、变更文件 eslint +prettier clean。`pnpm db:migrate`（DATABASE_URL=oneday_v3_test）apply 070。See evidence/G1-MEITUAN-PARITY/WINF117/ACCEPTANCE.md.
- in_flight: **W∞-118 (NEXT, Phase3)** 配额触顶拦截（§6 W∞-SAAS-QUOTA）
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
