# EXECUTOR HANDOFF — Cursor Agent 接替 Codex

- recorded_at: 2026-08-10 Asia/Shanghai
- prior_executor: Codex (stopped writing to `D:\ONEDAY_V3`)
- current_executor: Cursor Agent (sole write executor until further notice)

## Product authorization (owner confirmed)

1. Cursor Agent replaces Codex as the only code-writing executor.
2. Build in batch gates Batch 3 → Batch 4; no page-level patch TASKs.
3. TASK-scoped commits allowed; no push unless explicitly requested.
4. Undocumented product decisions → `BLOCKED_REPORT.md`, no guessing.
5. Thousand-enterprise faces = industry template + module whitelist + brand config; no arbitrary low-code/HTML injection.
6. Design bar: information architecture, design system, config-driven UI, closed-loop traceability, honest capability boundaries (Alipay/Meituan/WeChat Work/Feishu class professionalism).
7. Consumer bottom navigation: **fixed five tabs for transition**; data-driven “home + up to three industry channels + profile” remains Batch 4+ follow-up, not a blocker for the current rehearsal.

## Codex read-only handoff (verified)

| Item | Verified fact |
| ---- | ------------- |
| Branch | `hardening/COMMERCIAL-COMPLETION` |
| HEAD | `9dc4df5` — `fix(provisioning): seed published content placements` |
| Working tree | clean |
| Remote | `origin` → `https://github.com/tt5113680-hub/1day.git` |
| Upstream | not configured; local commits through `9dc4df5` not confirmed pushed |
| Batch 3 | `BATCH_3_PASS` at source `ead41e4`; see `BATCH_3_ACCEPTANCE.md` |
| Batch 4 | `IN_PROGRESS`; provisioning content-placement fix at `9dc4df5`; full clean-tenant rehearsal not yet PASS |
| `.env*` in repo | none |
| Tencent Cloud docs in repo | none |
| External checkpoint | `D:\ONEDAY_V3_SAFE_CHECKPOINT\20260809-202946` |

## Current engineering focus

**Batch 4 — clean-tenant commercial rehearsal (G5 / COMMERCIAL_ACCEPTANCE_MATRIX):**

Provision a brand-new tenant from zero (not the shared H-002/commercial simulation fixture), then prove in one isolated run:

- Platform one-click READY + ONE-CODE
- Published Storefront on Consumer
- Consumer enrollment → Employee redemption/follow-up → Management outcome
- Approved content placement visible on Consumer
- Platform channel/circle discovery where approved
- Cross-tenant isolation and tenant suspend/resume recovery

## Known follow-ups (not Batch 3 regressions)

- Consumer storefront still contains transitional hard-coded banner/shortcut blocks in `store.tsx`; module-driven DIY depth is tracked separately and must not be patched page-by-page during Batch 4.
- `LATEST_HANDOFF.md` historical sections below the current Batch 4 block are archived snapshots only.

## Secrets and cloud

- Do not store passwords or tokens in chat or Git.
- Batch 4 local rehearsal uses Docker PostgreSQL and localhost services per `LOCAL_HUMAN_PILOT_RUNBOOK.md`.
- GitHub push and Tencent Cloud deployment are out of scope until explicitly authorized.
