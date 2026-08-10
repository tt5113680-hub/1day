# ONEDAY V3 — local unattended construction turn

You are the **sole write executor** for this repository turn (Headless CLI, authorization I).

## Read first (in order)

1. `PROJECT_STATE/EXECUTOR_HANDOFF.md`
2. `PROJECT_STATE/LATEST_HANDOFF.md`
3. `PROJECT_STATE/PHASE1_COMMERCIAL_CLOSED_LOOP_PLAN.md`
4. `PROJECT_STATE/DECISION_REQUIRED.md`
5. `PROJECT_STATE/CURRENT_STATE.md`
6. `PROJECT_STATE/TASK_QUEUE.md`
7. `PROJECT_STATE/SYSTEMIC_CONSTRUCTION_PLAN.md`
8. `git status`

## Scope (this turn only)

- Branch: `hardening/COMMERCIAL-COMPLETION`
- Work: **one** Phase-1 slice — P1-A (commercial closed-loop gap) or P1-B (promotion visual floor)
- Writable root: `D:\ONEDAY_V3` only
- Do **not** claim 全部商用; do **not** auto-sign `PRODUCT_OWNER_UI_ACCEPTANCE.md`
- Do **not** public HTTPS / Tencent Cloud (authorization G not lifted)
- No page-level patches; no parallel tasks; skip tasks already PASS in TASK_QUEUE

## Done criteria (all required before commit)

1. Code
2. Self-test
3. `pnpm typecheck` and `pnpm build` (or scoped package builds if sufficient)
4. Applicable tests for the slice
5. Update `CURRENT_STATE.md`, `TASK_QUEUE.md`, `CHANGELOG.md`, `LATEST_HANDOFF.md`, **`PROJECT_STATE/PHASE1_PROGRESS.json`** (mark milestone in_progress→pass), acceptance doc if new slice
6. Evidence under `evidence/<SLICE-ID>/`
7. Git commit with conventional message; `git push origin HEAD` (authorization C)

## Stop rules

- If product/permission blocker: write `PROJECT_STATE/BLOCKED_REPORT.md` and **stop without empty commits**
- If no remaining P1-A/B work: update `LATEST_HANDOFF.md` with **G1 READY** (local human pilot test) and stop
- Max 3 fix attempts on same failure; then BLOCKED

Execute now. Do not ask the owner questions already resolved in DECISION_REQUIRED.
