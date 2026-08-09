# LATEST_HANDOFF

## Executor

- Cursor Agent is the sole write executor as of 2026-08-10.
- Codex stopped writing; read-only facts are in `PROJECT_STATE/EXECUTOR_HANDOFF.md`.

## Current task — Batch 4

- branch: `hardening/COMMERCIAL-COMPLETION`
- HEAD: `9dc4df5` (Batch 4 WIP — provisioning content placement seed; **not** a verified Batch 4 PASS)
- last_verified_batch: Batch 3 PASS at source `ead41e4` (`BATCH_3_ACCEPTANCE.md`)
- current_task: `ONEDAY-V3-COMMERCIAL-COMPLETION / BATCH 4`
- status: `BATCH_4_IN_PROGRESS`
- blocker: null

### Product anchors (do not rely on chat memory)

- Weapon: unified entry + multi-platform jump/trace + employee tasks + owner attribution + channel/circle network.
- Forbidden: replace Meituan/Douyin UIs; page-level patches; dual storefront truth; PASS without matrix evidence.
- Consumer tabs: fixed five-tab shell for transition during Batch 4.

### Batch 4 gate (from `BATCH_3_ACCEPTANCE.md`)

Run a **clean-tenant** commercial rehearsal without the shared H-002/commercial simulation fixture or historical seed repair. Prove:

1. Fresh provisioning → READY + ONE-CODE + published Storefront
2. Consumer public read + enrollment / action chain
3. Employee redemption or follow-up + Management visibility
4. Management content placement → Consumer
5. Approved Platform channel/circle → Consumer discovery
6. Second-tenant isolation + tenant suspend/resume session/public convergence

### Next action for Cursor Agent

1. Finish/verify provisioning content placement at `9dc4df5` inside the clean-tenant path.
2. Add Batch 4 acceptance test + evidence under `evidence/BATCH-4/`.
3. Run full gates (format, lint, 18-workspace typecheck/build, repository tests, evidence check).
4. Update `CURRENT_STATE.md`, `TASK_QUEUE.md`, `CHANGELOG.md` only after verified PASS.

## Completed batches (reference)

- Batch 1 PASS `1aecf81` — `COMMERCIAL_UI_FOUNDATION_ACCEPTANCE.md`
- Batch 2 PASS `c79812b` — `BATCH_2_ACCEPTANCE.md`
- Batch 3 PASS `ead41e4` — `BATCH_3_ACCEPTANCE.md`
