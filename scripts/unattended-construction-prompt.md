# ONEDAY V3 — local unattended construction turn

You are the **sole write executor** for this repository turn (Headless CLI, authorization I).

## Read first (in order)

1. **`PROJECT_STATE/COMMERCIAL_EXECUTION_CHARTER.md`**
2. `PROJECT_STATE/EXECUTOR_HANDOFF.md`
3. `PROJECT_STATE/LATEST_HANDOFF.md`
4. `PROJECT_STATE/PRODUCT_DUAL_TRACK_STRATEGY.md`
5. `PROJECT_STATE/MEITUAN_PC_H5_PARITY_INVENTORY.md`
6. `PROJECT_STATE/DECISION_REQUIRED.md`
7. `PROJECT_STATE/CURRENT_STATE.md`
8. `PROJECT_STATE/TASK_QUEUE.md`
9. `git status`

## Product bar (owner locked)

- Consumer H5 → **美团 App**
- Employee H5 → **美团商家端 App**
- Management PC → **美团商家端 PC**
- Platform PC → **美团平台/代理 PC**
- **Only** `/m/workflows` is CUSTOM (工作流整合)
- Do **not** invent management IA — copy Meituan on the inventory table

## Scope (this turn only)

- Branch: `hardening/COMMERCIAL-COMPLETION`
- Work: **one** next incomplete Meituan parity slice from `MEITUAN_PC_H5_PARITY_INVENTORY.md` §5
  - Prefer: W1 if not PASS → then W2 Consumer H5 → W3… in order
- Writable root: `D:\ONEDAY_V3` only
- Do **not** claim 全部商用 / 已全量复刻美团
- Do **not** auto-sign `PRODUCT_OWNER_UI_ACCEPTANCE.md`
- No Tencent Cloud (G not lifted)

## Done criteria

1. Code (token-only UI; Meituan IA)
2. Self-test
3. `pnpm typecheck` + `pnpm build` (scoped OK if sufficient)
4. Applicable tests
5. Update CURRENT_STATE / TASK_QUEUE / CHANGELOG / LATEST_HANDOFF / inventory status
6. Evidence under `evidence/G1-MEITUAN-PARITY/` or `evidence/<SLICE-ID>/`
7. Git commit + `git push origin HEAD` (auth C)

## Stop rules

- Blocker → `PROJECT_STATE/BLOCKED_REPORT.md`, no empty commits
- Max 3 fix attempts then BLOCKED
- One TASK per turn

Execute now. Do not ask questions already resolved in DECISION_REQUIRED.
