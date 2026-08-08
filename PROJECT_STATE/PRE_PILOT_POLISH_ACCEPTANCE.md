# PRE-PILOT-POLISH acceptance

Date: 2026-08-08 Asia/Shanghai
Business commit: `268464d fix(pilot): polish truthful public entry flows`

## Approved items

| ID  | Result | Verified fact                                                                                                                                                                                  |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-1 | PASS   | Discovery returns and renders `/c/stores/[id]?tenant=[slug]` only for an active, same-tenant merchant store. Merchants without such a store have no link.                                      |
| A-2 | PASS   | Consumer entry navigation uses real targets: discovery route, published-content anchor, existing local consultation confirmation action, and page top.                                         |
| A-3 | PASS   | Platform root redirects to the existing `/p/dashboard`; a real signed-in browser verified the route.                                                                                           |
| B-1 | PASS   | CMS `action_grid` is labelled `商家推荐`, is non-interactive when it has no action target, and makes no consumer AI claim.                                                                     |
| B-2 | PASS   | `executed/create_task` renders `已创建跟进任务` with a real task receipt when present; `manual_required` says it was not executed and requires manual use of an existing business entry.       |
| B-3 | PASS   | `docs/PILOT_LIMITATIONS.md` limits pilot AI to management-side controlled, whitelisted local commands and defers consumer/employee/channel AI surfaces to V3.1.                                |
| D-1 | PASS   | `active_tenants` now brackets the task/order activity alternatives under the active tenant predicate. The regression creates an inactive tenant with a recent order and proves it is excluded. |
| D-3 | PASS   | `docs/PILOT_DEPLOYMENT.md` no longer declares Redis or `REDIS_URL` as a current API/Worker pilot-production dependency.                                                                        |

## Regression evidence

- Focused real API processes: `node --test tests/page-p-001-api.test.mjs tests/page-c-002-api.test.mjs tests/page-m-006-api.test.mjs` — 3/3 PASS.
- Updated browser checks: consumer entry 2/2, Discovery 2/2, management AI 2/2, platform dashboard/root 3/3 PASS.
- H-002 real session Playwright: 6/6 PASS; consumer remains anonymous/public, employee/management/platform use formal login, refresh and logout.
- B2-B5 operating regression: 5/5 PASS; B6 and B7 real four-terminal Playwright: 1/1 and 1/1 PASS.
- Final quality gates: `format:check`, `lint`, 18-package `typecheck`, 18-package `build`, 184 repository tests, and 74 evidence-contract checks all PASS.

## Scope and red lines

- Explicitly deferred and untouched: A-4; C-1/C-2/C-3; D-2/D-4/D-5; consumer/employee/channel LLM work; design-system rebuild; workflow/object-storage/CRM/ERP/OA/payment/mall/automated messaging/ranking/data-model expansion.
- Consumer remains a public low-friction entry; no consumer login was added.
- No employee assignment is fabricated; no external connector without a receipt is described as sent; internal Outbox is not external delivery success.
- H-001/H-002 session boundaries and B2-B7 operating loop remain covered by the regressions above.
- `POST_HARDENING = PASS FOR HUMAN PILOT` remains valid. This batch is a pilot-experience and deterministic-defect close-out, not a renewed Hardening phase.

## Handoff

Status returns to `HUMAN-PILOT-HANDOFF`. The remaining work is human/operator-only: provision non-seed credentials and authorized external configurations, then complete and sign `docs/PILOT_ACCEPTANCE_CHECKLIST.md`.
