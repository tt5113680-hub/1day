# LATEST_HANDOFF

## Executor

- Cursor Agent is the sole write executor as of 2026-08-10.
- Codex stopped writing; read-only facts are in `PROJECT_STATE/EXECUTOR_HANDOFF.md`.
- Owner rule: monitor usage; **warn before context fills**; front-load all owner cooperation; new window cold-starts from state files only.

## Session alert for next window

**This chat usage is near full. Open a NEW Agent window before continuing Batch 4 implementation.**

Paste into the new window:

```text
读并执行：
1. PROJECT_STATE/EXECUTOR_HANDOFF.md
2. PROJECT_STATE/LATEST_HANDOFF.md
3. PROJECT_STATE/DECISION_REQUIRED.md
4. PROJECT_STATE/CURRENT_STATE.md
5. git status

唯一任务：ONEDAY-V3-COMMERCIAL-COMPLETION / BATCH 4（clean-tenant 全链演练）。
已获 A–H 全自动授权：commit、push 分支、本地 Docker/测试；不做腾讯云。
禁止页级补丁；Batch 4 PASS 后自动进入 Storefront 模块渲染器统一。
工作目录仅 D:\ONEDAY_V3。Usage 接近上限时提前通知换窗，并一次性前置需我配合的事项。
```

## Current task — Batch 4

- branch: `hardening/COMMERCIAL-COMPLETION`
- HEAD after auth commits: see `git log -3` (includes `74d96c3` A–H authorization docs)
- Batch 4 WIP code: `9dc4df5` (provisioning content placement seed; **not** a verified Batch 4 PASS)
- last_verified_batch: Batch 3 PASS at source `ead41e4` (`BATCH_3_ACCEPTANCE.md`)
- current_task: `ONEDAY-V3-COMMERCIAL-COMPLETION / BATCH 4`
- status: `BATCH_4_IN_PROGRESS`
- blocker: null
- next_window_action: implement `tests/batch-4-clean-tenant-rehearsal.test.mjs` + Playwright evidence under `evidence/BATCH-4/`

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
