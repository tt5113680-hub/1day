# EXECUTOR HANDOFF — Cursor Agent 接替 Codex

- recorded_at: 2026-08-10 Asia/Shanghai
- prior_executor: Codex (stopped writing to `D:\ONEDAY_V3`)
- current_executor: Cursor Agent (sole write executor until further notice)
- autonomous_authorization: A–H full grant at 2026-08-10 (see `DECISION_REQUIRED.md`)

## Product authorization (owner confirmed)

1. Cursor Agent replaces Codex as the only code-writing executor.
2. Build in batch gates; no page-level patch TASKs.
3. Auto-commit after verified gates; push `hardening/COMMERCIAL-COMPLETION` to origin allowed (no force-push / no main rewrite).
4. Undocumented product freeze / public commercial claims → `BLOCKED_REPORT.md`.
5. Thousand-enterprise faces = industry template + module whitelist + brand config; no arbitrary low-code/HTML injection.
6. Design bar: information architecture, design system, config-driven UI, closed-loop traceability, honest capability boundaries.
7. Consumer bottom navigation: **fixed five tabs for transition**.
8. After Batch 4 PASS: automatically start Storefront module-renderer unification, then matrix gap close-out.
9. Local Docker/API/web/Worker/migrate/seed/deps and full test/evidence gates authorized; no Tencent Cloud this phase.

## Codex read-only handoff (verified)

| Item | Verified fact |
| ---- | ------------- |
| Branch | `hardening/COMMERCIAL-COMPLETION` |
| HEAD at handoff | `9dc4df5` — `fix(provisioning): seed published content placements` |
| Working tree at handoff | clean |
| Remote | `origin` → `https://github.com/tt5113680-hub/1day.git` |
| Batch 3 | `BATCH_3_PASS` at source `ead41e4`; see `BATCH_3_ACCEPTANCE.md` |
| Batch 4 | `IN_PROGRESS`; clean-tenant rehearsal not yet PASS |
| `.env*` in repo | none |
| Tencent Cloud docs in repo | none |
| External checkpoint | `D:\ONEDAY_V3_SAFE_CHECKPOINT\20260809-202946` |

## Current engineering focus

**Batch 4 — clean-tenant commercial rehearsal (G5):**

Provision a brand-new tenant from zero (not the shared H-002/commercial simulation fixture), then prove in one isolated run:

- Platform one-click READY + ONE-CODE
- Published Storefront on Consumer
- Consumer enrollment → Employee redemption/follow-up → Management outcome
- Approved content placement visible on Consumer
- Platform channel/circle discovery where approved
- Cross-tenant isolation and tenant suspend/resume recovery

## Post–Batch 4 (authorized by A)

Storefront module renderer unification: Consumer must render from `storefront.modules`; remove transitional hard-coded Banner/shortcut arrays; Management module order/visibility must affect Consumer.

## Secrets and cloud

- Do not store passwords or tokens in chat or Git.
- Batch 4 local rehearsal uses Docker PostgreSQL and localhost services.
- Tencent Cloud / public HTTPS out of scope (authorization G).
