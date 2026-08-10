# DECISION_REQUIRED

## Resolved (2026-08-10 — owner authorized Cursor Agent takeover)

| Decision                   | Resolution                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Code executor              | Cursor Agent replaces Codex                                                                        |
| Batch gates                | Batch 3 PASS; proceed Batch 4 clean-tenant rehearsal only                                          |
| Thousand-enterprise faces  | Template + module whitelist + brand config; no arbitrary low-code                                  |
| Design bar                 | Five enterprise-class standards (IA, design system, config-driven, closed-loop, honest boundaries) |
| Consumer bottom navigation | **Fixed five tabs during transition**; data-driven channels deferred post–Batch 4 PASS             |

## Full autonomous authorization A–H (2026-08-10 — owner: 以上问题全部授权)

| Id  | Authorization                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | After Batch 4 PASS, automatically continue into Storefront module-renderer unification (remove hard-coded Banner/shortcuts; modules-driven), then matrix gap close-out. Still no page-level patches or arbitrary low-code.                  |
| B   | Auto-commit after each verified sub-gate (code, evidence, PROJECT_STATE, CHANGELOG).                                                                                                                                                        |
| C   | Push branch `hardening/COMMERCIAL-COMPLETION` to `origin` allowed (`-u` on first push). No force-push; do not rewrite `main`.                                                                                                               |
| D   | May start/restart Docker Postgres, local API/four webs/Worker, migrate/seed only on isolated test/rehearsal DBs, install project deps. Must not touch `D:\1DAY_V2` or delete Docker volumes/databases.                                      |
| E   | May run full format/lint/typecheck/build/test/Playwright/evidence and write `evidence/BATCH-4/` etc.                                                                                                                                        |
| F   | On undocumented product details: follow `COMMERCIAL_PRODUCT_BLUEPRINT`, `HIGH_FIDELITY_TEMPLATE_SYSTEM`, `COMMERCIAL_ACCEPTANCE_MATRIX`. BLOCKED only for external commercial claims, public production go-live, or product-freeze changes. |
| G   | Tencent Cloud / public HTTPS / production secrets: **out of scope this phase**.                                                                                                                                                             |
| H   | Operator keeps machine awake and Cursor open with Agent auto-run where possible; agent does not wait for interactive approval between authorized gates.                                                                                     |
| I   | **Local unattended construction (2026-08-10 — owner: 本地跑，不要人工):** Cursor Headless CLI via `scripts/local-unattended-construction.ps1` + scheduled task or daemon is the sole write executor during unattended windows. IDE Agent must not write in parallel. Setup: `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`. |

## Resolved (2026-08-10 — local unattended)

| Decision              | Resolution                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| Local unattended mode | Headless CLI + Windows Task Scheduler / daemon; no IDE window chaining     |
| Human gates           | G1 local full test + G2 cloud inventory only; not per construction turn    |

## Open (will BLOCKED)

| Decision                                      | Default if blocked                                                 |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Product-owner Consumer UI visual sign-off     | Does not block Batch 4 technical PASS; blocks external pilot claim |
| Public HTTPS pilot on Tencent Cloud           | STOP until owner **explicitly lifts G** and supplies cloud inventory (see `PHASE1_COMMERCIAL_CLOSED_LOOP_PLAN.md`) |
| Change PRODUCT_FREEZE / claim SaaS commercial | STOP — need explicit owner decision                                |

## Owner intent (2026-08-10, not yet formal G lift)

Owner directed Phase-1 goal = **usable commercial closed loop for real customer trial**, including public HTTPS and promotion-grade visual baseline; non-essential deferred to v2.  
Cloud account/domain/cert may have been shared in prior chats — **nothing is in this repo** (correct). Agent must collect checklist in `PHASE1_COMMERCIAL_CLOSED_LOOP_PLAN.md` §2 and must **not** start public deploy until owner replies with explicit **「授权公网 HTTPS / 腾讯云试点」** plus missing inventory.

## Owner cooperation protocol (2026-08-10)

- Agent must warn at **≥90%** chat usage/context pressure and provide a new-window paste prompt. Do not stop early around ~40%.
- Agent must front-load all owner cooperation questions at session start / before long runs.
- Owner keeps machine awake, Cursor open, and Agent Auto-run enabled during autonomous work (authorization H).

## Current blockers

None.
