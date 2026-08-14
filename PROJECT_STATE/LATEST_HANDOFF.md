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
- last_verified: **2026-08-14** — **W∞-119 PASS** suspend 会话即时失效（§6 W∞-SAAS-LIFE，Phase3）：migration `072_auth_session_epoch`（`auth_sessions.auth_epoch int not null default 0` + `auth_sessions_tenant_auth_epoch_idx`）。三层保障（第 3 层新增）= ① 既有 `claims()` join `tenants.status='active'`；② 既有 suspend 事务批量 revoke active 会话；③ 每个会话记录签发时刻 `tenants.auth_epoch` 快照，`claims()`/`refresh()` 强制 `s.auth_epoch = t.auth_epoch` —— suspend bump `auth_epoch` 即令**所有已签发访问令牌即时永久失效**（fail-closed，无需等重新认证），reactivate 后旧令牌依旧不可复活。`auth.service.ts`：`createSession` 读 `tenants.auth_epoch` 落库并暴露 `authEpoch`；`claims` 校验增代数和；`refresh` SELECT 增两列并校验。新增 `GET /api/v1/management/session-security`（`tenant.manage` fail-closed）+ `/m/settings`「会话安全 · 即时失效」白卡（会话代数/在册会话/近 1 天已关断/存量会话代数分布），真实档案推导。诚实边界全保留（会话加固仅控制租户内工具访问授权即时关断/放开，不碰钱/销售、无 GMV、不含支付、非本平台下单；`/m/workflows` CUSTOM；§5 READY deferred；不复活本平台下单/收单）。新增 tests/g1-winf119-suspend-session-invalidation.test.mjs 1/1（真实 DB：开通独立租户 → owner 登录快照 auth_epoch → SUSPEND +1 → **已签发 accessToken 立即 401**（dashboard+session-security）→ refresh 401 → active=0 → ACTIVATE 再+1 → 旧令牌仍 401 → 重登录新代数 200）；`g1-winf*.test.mjs` **430/430**、typecheck 12/12、build 11/11、unit 49/49、evidence-contract 74/74、eslint+prettier clean（全仓 tests/*.test.mjs 集成/e2e 失败为 clean HEAD 既有基线，stash 对照一致，与本刀无涉）。`pnpm db:migrate`（oneday_v3_test）apply 072。See evidence/G1-MEITUAN-PARITY/WINF119/ACCEPTANCE.md.
- in_flight: **W∞-120 (NEXT, Phase3)** Outbox 重放 + 告警（§6 W∞-SAAS-OUTBOX）
- deferred: §5 开通 READY（待主人「开始第五节」）
- blocker: **none (engineering)**
- note: W119 由 DeepSeek 全自动收口（会话代数加固 + 观测）+ 已 Release 锁；W120+ 交回 DeepSeek 全自动。若余额长期不动，先看 `PROJECT_STATE/OWNER_ALERT_UNATTENDED.md` + `pnpm unattended:health`

## Owner gates (parallel)

1. Hub http://127.0.0.1:3299/
2. Sign `PRODUCT_OWNER_UI_ACCEPTANCE.md` — agent must not sign

### New-window paste

```text
继续
```
