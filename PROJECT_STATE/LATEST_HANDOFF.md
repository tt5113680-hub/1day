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
- last_verified: **2026-08-13** — **W∞-116 PASS** 员工邀请→激活→角色包 + 门店 scope（MPC-10 / Phase2）：migration `069_employee_role_package`（`membership_invitations` 新增 `role_id`/`store_id`）；`employee.service.ts` `invite` 接受可选 `roleCode`（store_manager/employee）+ `storeId` 落库（幂等 + audit/outbox）、`accept` 激活后据 role_id 绑 `membership_roles`、据 store_id 绑 `store_managers`+`data_scopes('store')`；`management-organization-employee.service.ts` overview 返回员工 `roles`+`store_scope`、邀请 `role_code/store_name`、新增 `roles[]`/`stores[]`；`/m/organization-employees` 邀请表单新增角色包/门店范围 + 员工/邀请行展示 + summaryStrip「店长员工」（repeat(5)）+ 分布「角色包分布」。诚实边界全保留（仅登记租户内访问授权，无 GMV、无储值/支付、非本平台下单、不接第三方实时人事绩效；`/m/workflows` CUSTOM；§5 READY deferred）。新增 tests/g1-winf116 7/7（真实 DB round-trip：邀请→激活→membership_roles/store_managers/data_scopes 绑定 → 跨租户 deny → overview roles/store_scope）+ 随动回归 g1-winf43/48；`g1-winf*.test.mjs` 427/427、真实 DB 串行复核 429/429、typecheck/build 20/20、unit 49/49、`pnpm db:migrate` apply 069。见 evidence/G1-MEITUAN-PARITY/WINF116/ACCEPTANCE.md.
- in_flight: **W∞-117 (NEXT)** 通知已读/忽略/批量（MPC-13）+ 设置变更审计（MPC-12）
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
