# LATEST_HANDOFF

## Executor

- Cursor Agent is the sole write executor as of 2026-08-10.
- Codex stopped writing; read-only facts are in `PROJECT_STATE/EXECUTOR_HANDOFF.md`.
- Owner rule: monitor usage; **warn before context fills**; front-load all owner cooperation; new window cold-starts from state files only.

## Session alert for next window

If usage approaches the limit during Storefront module-renderer work, open a NEW Agent window and paste:

```text
读并执行：
1. PROJECT_STATE/EXECUTOR_HANDOFF.md
2. PROJECT_STATE/LATEST_HANDOFF.md
3. PROJECT_STATE/DECISION_REQUIRED.md
4. PROJECT_STATE/CURRENT_STATE.md
5. git status

唯一任务：ONEDAY-V3-COMMERCIAL-COMPLETION / Storefront 模块渲染器统一（Batch 4 已 PASS）。
已获 A–H 全自动授权：commit、push 分支、本地 Docker/测试；不做腾讯云。
禁止页级补丁；Consumer 必须从 storefront.modules 渲染；去掉硬编码 Banner/快捷入口；Management 模块顺序/可见性须影响 Consumer。
工作目录仅 D:\ONEDAY_V3。Usage 接近上限时提前通知换窗，并一次性前置需我配合的事项。
```

## Current task — Storefront module-renderer unification

- branch: `hardening/COMMERCIAL-COMPLETION`
- last_verified_batch: Batch 4 PASS at `04c863f` — see `BATCH_4_ACCEPTANCE.md` and `evidence/BATCH-4/`
- current_task: Storefront module-renderer unification (authorization A)
- status: `STOREFRONT_MODULE_RENDERER_IN_PROGRESS`
- blocker: null

### Product anchors (do not rely on chat memory)

- Weapon: unified entry + multi-platform jump/trace + employee tasks + owner attribution + channel/circle network.
- Forbidden: replace Meituan/Douyin UIs; page-level patches; dual storefront truth; PASS without matrix evidence.
- Consumer tabs: fixed five-tab shell remains for the transition.

### Storefront unification gate

1. Consumer store/home renders from `storefront.modules` (order + visibility).
2. Remove transitional hard-coded Banner/shortcut arrays in Consumer store UI.
3. Management page-builder module order/visibility changes must project to Consumer.
4. Keep industry template + module whitelist + brand config; no arbitrary low-code/HTML injection.
5. Re-run applicable API/browser gates and update PROJECT_STATE only after verified PASS.

### Completed — Batch 4

- Clean-tenant rehearsal: provisioning READY/ONE-CODE/Storefront → enrollment → redemption/follow-up → Management → content placement → channel/circle discovery → isolation → suspend/resume.
- Circle platform approval converges `invitation_status` + `circle_approval_status` for discovery projection.
- Gates: format/lint, 18-workspace typecheck/build, 189 repository tests, 74 evidence checks, Batch 4 API 1/1, Playwright 1/1.

## Completed batches (reference)

- Batch 1 PASS `1aecf81` — `COMMERCIAL_UI_FOUNDATION_ACCEPTANCE.md`
- Batch 2 PASS `c79812b` — `BATCH_2_ACCEPTANCE.md`
- Batch 3 PASS `ead41e4` — `BATCH_3_ACCEPTANCE.md`
- Batch 4 PASS — `BATCH_4_ACCEPTANCE.md`
