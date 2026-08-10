# G1 Packaging Acceptance — LOCAL HUMAN PILOT Ready

- slice_id: `G1-PACKAGING`
- recorded_at: 2026-08-10 21:55 Asia/Shanghai
- branch: `hardening/COMMERCIAL-COMPLETION`
- commit: `6b2dad9` (HEAD, verified green)
- claim: **LOCAL ONLY**. Reporting Phase-1 G1 packaging (runbook + local HUMAN PILOT sandbox boot-ready). This is **not** a product-owner sign-off, not public HTTPS, not a commercial claim.

## Purpose

Close out the Phase-1 `p1-g1-packaging` milestone: confirm the local HUMAN PILOT package is complete and the sandbox boots at HEAD so the owner can run `pnpm human-pilot:start` and complete G1 (CHARTER §8 G1; CHARTER §5.4 `pnpm human-pilot:start`).

## What was verified this turn (fresh, at HEAD `6b2dad9`)

| Check | Result | Command / evidence |
| ----- | ------ | ------------------ |
| API health | `200 {"status":"ok","database":"ready"}` | `GET http://127.0.0.1:3200/api/v1/health` |
| Worker health | `200 {"status":"ok","service":"oneday-worker"}` | `GET http://127.0.0.1:3205/health` |
| Consumer web | `200` | `GET http://127.0.0.1:3201/` |
| Employee web | `200` | `GET http://127.0.0.1:3202/` |
| Management web | `200` | `GET http://127.0.0.1:3203/` |
| Platform web | `200` | `GET http://127.0.0.1:3204/` |
| Pilot DB | migrated (`kysely_migration`, 100 public tables) | `oneday_human_pilot` on `127.0.0.1:5434` |
| Typecheck | `20/20` | `pnpm typecheck` |
| Build | `20/20` | `pnpm build` |
| Unit tests | `12/12 files (49)` | `pnpm test:unit` |

Log: `evidence/G1-PACKAGING/boot-health.txt` (raw endpoint responses at HEAD).

## G1 packaging artifacts (present in repo)

- Runbook: `docs/HUMAN_PILOT_MANUAL_TEST.md`
- Deployment / controlled startup: `docs/PILOT_DEPLOYMENT.md`
- Acceptance checklist: `docs/PILOT_ACCEPTANCE_CHECKLIST.md`
- Admin guide / security escalation: `docs/PILOT_ADMIN_GUIDE.md`
- Limitations / honest boundaries: `docs/PILOT_LIMITATIONS.md`
- Recovery rehearsal: `docs/RELEASE_AND_RECOVERY.md`
- Start command: `pnpm human-pilot:start` (`scripts/local-human-pilot-start.ps1`)
- Sandbox seed: `pnpm human-pilot:seed` (`scripts/local-human-pilot-seed.mjs`)
- Walkthrough & preflight evidence: `evidence/HUMAN-PILOT-HANDOFF/`

## Repository quality at close

- `git status`: working tree has only prior unattended-infra changes (`scripts/local-unattended-construction.ps1`, `scripts/configure-unattended-power.ps1`) left outside this slice; no source files changed this turn.
- `pnpm typecheck` 20/20; `pnpm build` 20/20; `pnpm test:unit` 12/12 files (49 tests).
- G1 packaging milestone maps to CHARTER §8 G1 (local HUMAN PILOT fully testable) and the four-terminal readiness checks in `docs/PILOT_ACCEPTANCE_CHECKLIST.md` (equivalent to matrix C-02 / E-01 / M-01 / P-01 readiness posture + `RC-01` recovery-doc presence).

## Boundaries

- This acceptance does **not** edit or sign `PROJECT_STATE/PRODUCT_OWNER_UI_ACCEPTANCE.md`.
- Public HTTPS / Tencent Cloud remain out of scope (authorization G not lifted).
- G1 completion (owner local full test + human PASS decision) is the owner's gate per CHARTER §8.
