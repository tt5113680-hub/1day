# ONEDAY V3 — local unattended construction turn

You are the **sole write executor** for this repository turn (Headless CLI, authorization I).

## Read first (in order)

1. **`PROJECT_STATE/COMMERCIAL_EXECUTION_CHARTER.md`** — non-negotiable PRD, big-tech practical bar, anthropomorphic test, metrics, plugins, multi-role openness
2. `PROJECT_STATE/EXECUTOR_HANDOFF.md`
3. `PROJECT_STATE/LATEST_HANDOFF.md`
4. `PROJECT_STATE/PHASE1_COMMERCIAL_CLOSED_LOOP_PLAN.md`
5. `PROJECT_STATE/PHASE1_PROGRESS.json`
6. `PROJECT_STATE/DECISION_REQUIRED.md`
7. `PROJECT_STATE/CURRENT_STATE.md`
8. `PROJECT_STATE/TASK_QUEUE.md`
9. `PROJECT_STATE/COMMERCIAL_PRODUCT_BLUEPRINT.md` (if slice touches product boundary)
10. `PROJECT_STATE/COMMERCIAL_ACCEPTANCE_MATRIX.md` (map slice to matrix IDs)
11. `git status`

## Scope (this turn only)

- Branch: `hardening/COMMERCIAL-COMPLETION`
- Work: **one** Phase-1 slice — P1-A gap or P1-B visual/metrics/IA per CHARTER §2–§7
- Writable root: `D:\ONEDAY_V3` only
- Do **not** claim 全部商用; do **not** auto-sign `PRODUCT_OWNER_UI_ACCEPTANCE.md`
- Do **not** public HTTPS / Tencent Cloud (authorization G not lifted)
- No page-level patches; no arbitrary low-code; no fake third-party delivery
- Align merchant-facing data with CHARTER §3–§4 (habits + observable metrics)

## Done criteria (all required before commit)

1. Code (config-driven / shared kit — CHARTER §6–§7)
2. Self-test + anthropomorphic path per CHARTER §5 (L1–L4 applicable)
3. `pnpm typecheck` and `pnpm build` (or scoped package builds if sufficient)
4. Applicable tests; map to `COMMERCIAL_ACCEPTANCE_MATRIX` IDs in acceptance note
5. Update `CURRENT_STATE.md`, `TASK_QUEUE.md`, `CHANGELOG.md`, `LATEST_HANDOFF.md`, **`PROJECT_STATE/PHASE1_PROGRESS.json`**, acceptance doc if new slice
6. Evidence under `evidence/<SLICE-ID>/`
7. Git commit with conventional message; `git push origin HEAD` (authorization C)

## Stop rules

- If product/permission blocker: write `PROJECT_STATE/BLOCKED_REPORT.md` and **stop without empty commits**
- If no remaining P1-A/B work: update `LATEST_HANDOFF.md` with **G1 READY** and stop
- Max 3 fix attempts on same failure; then BLOCKED
- Any conflict with CHARTER or BLUEPRINT: **BLUEPRINT wins** — do not invent scope

Execute now. Do not ask the owner questions already resolved in DECISION_REQUIRED or CHARTER.
