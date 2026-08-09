# LATEST_HANDOFF

## HARDENING-006 - Docker deployment build repair in progress

- Docker targets now compile Auth, Events, Database, Session Client and UI packages in a shared dependency stage before API, Worker or HUMAN-PILOT compilation. Fresh server image/migration verification is in progress; evidence is in `evidence/HARDENING-006/ACCEPTANCE.md`.
- The Consumer visual-acceptance task remains `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`. No demo or customer data has been seeded.

## CONSUMER-COMMERCIAL-HOME-V1 — 2026-08-09 store-information-card follow-up

- The storefront's former one-line store identity/business-hours row is now a compact information card using only persisted/known facts: store image, merchant/store name, open state, business hours, pickup method and TEST ONLY marker. It follows the supplied information hierarchy without copying unsupported score, sales or delivery data.
- Existing colors, the LBS/future-recommendation row, Banner and all lower sections remain unchanged. 390px visual evidence: `evidence/CONSUMER-COMMERCIAL-HOME-V1/storefront-store-info-390.png`; Consumer typecheck/build passed. Status remains `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`.

## CONSUMER-COMMERCIAL-HOME-V1 — 2026-08-09 storefront-header follow-up

- Only the storefront header was restyled: the upper row now has a tracked LBS-location action on the left and a non-interactive future “business circle / OEM recommendation” placeholder on the right. The existing colors, store identity/status/share row, Banner and all lower sections are unchanged.
- Verified at 390px in `evidence/CONSUMER-COMMERCIAL-HOME-V1/storefront-top-layout-390.png`, plus Consumer typecheck and production build. Final status remains `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE`.

## CONSUMER-COMMERCIAL-HOME-V1 — 2026-08-08 follow-up, still awaiting product-owner acceptance

- Migration `047_store_service_platform_offers` persists a package-to-active-platform-action offer price. The Guomao local TEST ONLY package currently displays Meituan `¥19.90`, Douyin `¥21.90`, and partner `¥20.90`, with a lowest-price marker; third-party pages remain the final authority for price, stock and promotions.
- Service detail and external action pages now share the Consumer storefront's warm commercial palette/cards/buttons. The local runtime was migrated, re-seeded and rebuilt for API/Consumer.
- Verified: database/API/Consumer typecheck; HUMAN-PILOT image build; repository tests `184/184`; Consumer Playwright `2/2`; evidence contract `74/74`; refreshed 375/390/430 screenshots. `format:check` remains blocked only by the same pre-existing untracked audit/test files; task-owned files are formatted.
- Tenant customization direction: use a tenant-scoped, validated design-token/module registry (approved color tokens, icon keys, action types and ordering), never arbitrary plugin scripts. Management editing is intentionally outside this Consumer-only acceptance scope.

## CONSUMER-COMMERCIAL-HOME-V1 — awaiting product-owner UI acceptance

- Consumer-only commercial storefront implementation is ready in the isolated local HUMAN-PILOT runtime. It uses persisted store/service/benefit/content/action data, local original coffee imagery, distinct Guomao/Wangjing/Zhongguancun test stores and a fixed five-item consumer navigation.
- Verified: 18-package typecheck/build, Vitest 2/2, repository tests 184/184, focused Consumer Playwright 2/2, plus screenshots at 375/390/430px. `format:check` remains blocked only by three unmodified pre-existing untracked audit/test files; task-owned files were formatted.
- Human entry: `http://127.0.0.1:3201/c/stores/30000000-0000-4000-8000-000000000021?tenant=luckin-oneday-human-pilot`. Final status must remain `AWAITING_PRODUCT_OWNER_UI_ACCEPTANCE` until the product owner visually confirms it.

## PRE-PILOT-POLISH PASS - HUMAN-PILOT-HANDOFF restored

- Approved business commit: `268464d fix(pilot): polish truthful public entry flows`.
- A-1/A-2/A-3, B-1/B-2/B-3 and D-1/D-3 are PASS. See `PROJECT_STATE/PRE_PILOT_POLISH_ACCEPTANCE.md` for the eight-item matrix, deferred scope and red-line confirmation.
- Verified after the change: focused HTTP 3/3; updated consumer/Discovery/management/platform browser checks 9/9; H-002 6/6; B2-B5 5/5; B6/B7 four-terminal journeys 1/1 each; format, lint, 18-package typecheck/build, 184 repository tests and 74 evidence checks.
- `POST_HARDENING = PASS FOR HUMAN PILOT` remains valid. No additional development starts automatically. Human/operator work remains: provision non-seed credentials and approved authorizations, then sign `docs/PILOT_ACCEPTANCE_CHECKLIST.md`.

## AUDIT remediation stage completed - acceptance required

- A-G remediation is technically complete: systemic protected-session close-out, transactional consumer operating projection, Worker/Outbox scheduling, production process safety, controlled AI commands/connector boundaries, real multi-role cross-tenant commercial acceptance, and pilot-blocking UI/UX correction.
- AUDIT-BATCH-7 adds the shared `@oneday/ui` commercial-language mapping. It removes generated source/status/task identifiers and anonymous consumer hashes from the verified employee/management journey; public platform-entry copy now accurately states that it records consultation and supplies a code rather than claiming third-party delivery.
- Real B7 four-terminal Playwright passed 1/1, including the 390px result-form/no-overlap geometry assertion, public consumer action, real employee result entry, owner management trail, platform login and second-tenant `404` denial. Full gates passed: formatting, lint, 18-package typecheck/build, 184 repository tests and 74 evidence-contract checks.
- PASS commit: `d175f64 fix(hardening): improve commercial journey usability`.
- This is a stage boundary. Remaining work is the existing human controlled-pilot handoff: provision non-seed credentials and approved authorizations, then sign `docs/PILOT_ACCEPTANCE_CHECKLIST.md`. Do not automatically begin another development phase.

## AUDIT-BATCH-6 completed

- The public consumer action now reaches the existing ownership rules without an administrator API shortcut. The assigned employee has a task-scoped result endpoint and UI: session/membership/own-task/customer checks, idempotency, result order, controlled image evidence, task link, audit and Outbox persist in one transaction.
- Real Playwright acceptance (1/1) starts the API and consumer/employee/management/platform terminals. It performs the public action, real employee follow-up/result upload/completion, real owner trail inspection, second-tenant owner denial, unassigned employee denial and platform login. The negative checks assert API-level `404` isolation responses.
- Final gates passed: formatting, lint, 18-package typecheck/build, 183 repository tests across 18 test tasks, and 73 evidence-contract checks. Screenshots and the acceptance record are in `evidence/AUDIT-BATCH-6/`.
- PASS commit: `62f102b feat(hardening): verify multi-role commercial journey`.
- Next scope: AUDIT-BATCH-7 UI/UX commercial-quality review and pilot-blocking remediation; non-blocking design-system debt goes to V3.1.

## AUDIT-BATCH-5 completed

- Migration `045_ai_suggestion_execution` records whether an accepted AI suggestion executed a controlled command, requires manual action, and what local receipt was created. Only complete whitelisted local task commands execute; unsupported or incomplete payloads remain `manual_required` and cannot infer customer contact or external action.
- A successful AI follow-up preserves the tenant-scoped source task ownership, writes `task.created_from_ai_suggestion` audit evidence and one `employee.task.created.v1` Outbox event in the same transaction.
- Management and platform connector APIs/UI now explicitly state intent-only authorization and no external delivery. Management authorization retains only a secret fingerprint; the submitted secret never returns in the API response. Pilot documentation carries the identical communication boundary.
- Real API acceptance passed (1/1), including local command/audit/Outbox evidence, manual fallback, secret non-disclosure and both connector surfaces. Full gates passed: 182 repository tests, 18-package typecheck/build, lint, format and 72 evidence checks.
- PASS commit: `aa50e0e feat(hardening): constrain AI command execution`.
- Next scope: AUDIT-BATCH-6 multi-role commercial journey and cross-tenant security acceptance.

## AUDIT-BATCH-4 completed

- API service-local PostgreSQL pools are consolidated behind one bounded, application-owned pool. Migration 044 atomically enforces separate authentication and public-write limits with hashed subjects and deployment namespaces.
- CORS validates exact origins and includes DELETE session revocation. API replies with a correlation ID. Production startup fails closed unless HTTPS public transport, TLS proxy declaration, trusted proxy handling, exact CORS, a stable limit namespace and shared edge rate-limit declaration are all configured.
- The audit-batch-4 security test passed against real API processes, covering CORS DELETE preflight, request-ID correlation, persistent 429 limits, unsafe-production startup refusal and safe-production readiness. Final gates passed: 180 repository tests, 18-package typecheck/build, lint, format and 71 evidence checks.
- PASS commit: 207740e feat(hardening): secure pool and http boundary.
- Next scope: AUDIT-BATCH-5 AI delivery and connector capability-boundary calibration.

## AUDIT-BATCH-3 completed

- Worker is no longer a health-only process. It uses the shared task dispatch state machine and an internal Outbox consumer that locks due records, persists consumption de-duplication, records bounded retry diagnostics, and publishes only internal delivery completion (never an unperformed third-party delivery).
- `043_worker_dispatch_state` adds Outbox `last_error`. API `process-due` uses the same scheduler as the Worker through a dynamic ESM import compatible with the CommonJS API runtime.
- `tests/audit-batch-3-worker.test.mjs` passed against a real isolated tenant/Worker process: internal event publish, reminder, overdue, notification, audit, Outbox, health signal, failure retry and recovery. Full quality gates passed: 177 repository tests, 18-package typecheck/build, lint, format and evidence contract.
- PASS commit: `3998a7d feat(worker): dispatch outbox and due tasks`.
- Current scope: AUDIT-BATCH-4 connection pool / rate limit / TLS-CORS production safety.

## AUDIT-BATCH-2 completed

- `042_consumer_operating_projections` and `ConsumerOperatingOrchestrator` close the P0-3 operating break without adding consumer login or browser-supplied employee identity. Public action, store and service writes retain event, audit, Outbox and operating projection in one transaction.
- Assignment precedence is server-resolved active employee share code, then existing store manager for a store event, then the existing available lead pool. There is no invented round-robin or fabricated assignee.
- `tests/audit-batch-2-e2e.test.mjs` passed 2/2 against PostgreSQL: concurrent/replayed consumer action creates one chain; an employee follows up/completes/uploads evidence; management reads the source/ownership/task/result chain; no-assignee enters the pool; cross-tenant and unauthenticated paths are rejected. Full repository verification passed (175 tests, 18-package typecheck/build, lint, format, evidence check).
- PASS commit: `5c0ea50 fix(hardening): close consumer operating loop`.
- Current scope: AUDIT-BATCH-3 Worker / Outbox consumption / reminder / overdue scheduling.

## H-002 systemic close-out completed

- H-002 is now a verified PASS on `hardening/HARDENING-H-002`: `SessionApiClient` centrally attaches Bearer/request-id, serializes refresh, retries one protected-request 401 with a rotated token, and clears local credentials on refresh failure. All 36 E/M/P app business pages (54 former direct reads) use it; static contract coverage prevents regressions.
- Public consumer routes retain low-friction anonymous access and no employee-like login. A public tenant must be carried explicitly by its URL; no consumer route defaults to `system`.
- Final evidence: 18-package typecheck, lint, format, build, 173 repository tests, SessionApiClient Vitest, session-boundary static tests, and 6 real H-002 Playwright/API journeys all PASS. See `evidence/H-002/ACCEPTANCE.md`.
- Next scope: `AUDIT-BATCH-2` commercial operating orchestration. Implement the consumer behaviour -> customer/source/ownership -> employee task -> follow-up/result evidence -> management chain without manual administrator API stitching.

## H-002 completed

- `H-002` is PASS: employee, tenant-owner/management and platform browser sessions now use real tenant-slug login, automatic refresh rotation and server-side logout revocation. Consumer routes remain public and anonymous by the frozen product decision.
- `tests/fixtures/commercial-simulation.mjs` supplies a repeatable, auto-cleaned, test-database-only fictional commercial environment: the Luckin-style test tenant, a second restaurant tenant, role accounts, three stores, customers, tasks/reminders, evidence, sharing code, AI, audit/Outbox, channel and fixed-circle relations.
- Verification passed: 6-case Playwright + HTTP + PostgreSQL H-002 acceptance, lint, format, 18-package typecheck, Vitest, serialized repository suite, full build, migration/seed, evidence and diff checks. Evidence: `evidence/H-002/ACCEPTANCE.md`.

## H-001 completed

- Removed the token-signing default fallback. API startup now rejects a missing or retired-default `AUTH_TOKEN_SECRET`, and requires 32+ characters in production.
- Compose requires an explicitly supplied secret; deployment guidance and process-level startup tests cover the fail-closed contract. Evidence: `evidence/H-001/ACCEPTANCE.md`.
- Next task: H-002 real four-terminal login, refresh, and logout journey.

## FINAL COMMERCIAL MVP automated acceptance completed

- All 69 indexed tasks are PASS. `FINAL_ACCEPTANCE_REPORT.md` records the successful fresh-database release rehearsal, live readiness/connector recovery, browser terminal acceptance, full repository quality gates, and the final seed-order remediation.
- The repository is ready for controlled pilot handoff. Remaining work is human/operator-only: create unique pilot credentials, configure real approved secrets and external authorization, and sign `docs/PILOT_ACCEPTANCE_CHECKLIST.md` before enabling a customer.

## HARDENING-005 completed

- `HARDENING-005` is PASS at `412600f`: the repository now contains a controlled pilot deployment guide, administrator guide, explicit MVP limitations, and an evidence-led customer handoff checklist.
- The package expressly isolates the deterministic local seed account from customer environments, requires database-backed API readiness, records tenant/RBAC negative controls, and prohibits unverified external delivery claims.
- Verification passed: dedicated pilot documentation contract tests, evidence contract, lint, format, 17-package typecheck, Vitest, serialized repository HTTP suite, full build, migration/seed and diff check. Evidence: `evidence/HARDENING-005/ACCEPTANCE.md`.
- All 69 indexed tasks are PASS. Final automated commercial acceptance is now in progress before the human pilot handoff decision.

## HARDENING-004 completed

- `HARDENING-004` is PASS at `f3da8ac`: `pnpm db:recovery:clone` creates a guarded, non-destructive PostgreSQL clone and verifies tenant, configuration, connector and evidence-file record counts. A real clone completed in approximately five seconds.
- Verification passed: recovery clone drill, release/recovery contract test, lint, format, 17-package typecheck, Vitest, serialized repository HTTP suite, full build, migration/seed, evidence check and diff check. Evidence: `evidence/HARDENING-004/ACCEPTANCE.md`.
- Next task: `HARDENING-005` pilot delivery package and final commercial acceptance.

## HARDENING-003 completed

- `HARDENING-003` is PASS at `8928843`: API readiness now confirms PostgreSQL availability with bounded connection/query timeouts and fails closed with `503` when unavailable; connector recovery is verified end-to-end.
- Verification passed: targeted reliability HTTP suite, lint, format, 17-package typecheck, Vitest, serialized repository HTTP suite, full build, migration/seed, evidence check and diff check. Evidence: `evidence/HARDENING-003/ACCEPTANCE.md`.
- Next task: `HARDENING-004` backup recovery and release rehearsal.

## HARDENING-002 completed

- `HARDENING-002` is PASS at `cdbcbae`: four commercial MVP chains are verified through the built API and PostgreSQL, with consumer, employee, management and channel browser screenshots plus a retained trace in `evidence/HARDENING-002/`.
- Channel merchant onboarding now grants the tenant administrator `tenant.manage` and `employee.manage`, allowing immediate staff invitation while role changes remain confirmation-protected.
- Verification passed: targeted HTTP chain suite (4 tests), terminal Playwright suite, lint, format, 17-package typecheck, Vitest, serialized repository HTTP suite, full build, migration/seed, evidence check and diff check.
- Next task: `HARDENING-003` performance and reliability.

## HARDENING-001 completed

- `HARDENING-001` is PASS at `d2e924f`: every protected authorization path now reconciles JWT claims with an active persistent `auth_sessions` row. Revoked, expired, deleted, inactive or mismatched sessions receive `401`; a valid session without the required RBAC permission remains `403`.
- Verification passed: lint, format, 17-package typecheck, Vitest, serialized repository HTTP suite (151 tests), full build, migration/seed, evidence contract and diff checks. Evidence: `evidence/HARDENING-001/ACCEPTANCE.md`.
- Next task: `HARDENING-002` commercial MVP end-to-end acceptance.

## Channel / business-circle phase accepted

- `evidence/CHANNEL-PHASE/ACCEPTANCE.md` records automatic acceptance for CHANNEL-001, CHANNEL-002, CIRCLE-001 and CIRCLE-002. All applicable repository gates, persistence checks and browser evidence passed.
- Next task: `HARDENING-001` end-to-end permissions and tenant-isolation hardening.

## CIRCLE-002 completed / channel phase acceptance required

- `CIRCLE-002` is PASS at `7cc5dbb`: `/bc/merchants` records invitation preparation, circle approval (`circle.manage`), separate platform approval (`platform.manage`), display configuration and exit. External delivery is deliberately not claimed.
- Verification passed: `tests/circle-002-api.test.mjs` (validation, unauthenticated rejection, idempotency, ordered approvals, display exclusion, exit, audit/Outbox); `playwright.circle-002.config.ts` (desktop and missing-session flows); lint, format, typecheck, unit test, serialized repository suite, build, migration/seed and evidence checks. Evidence: `evidence/CIRCLE-002/ACCEPTANCE.md`.
- CHANNEL phase is now complete (CHANNEL-001, CHANNEL-002, CIRCLE-001, CIRCLE-002). Pause for stage acceptance before starting `HARDENING-001`.

## CIRCLE-001 completed

- `CIRCLE-001` is PASS at `d8a7246`: `/bc/dashboard` displays platform-owned fixed business circles, approved merchant benefits and aggregate content, traffic and conversion counts. It neither exposes tenant-private operational records nor admits pending memberships.
- Verification passed: `tests/circle-001-api.test.mjs` (including unapproved-membership exclusion); `playwright.circle-001.config.ts` (desktop and missing-session flows); lint, format, typecheck, unit test, serialized repository test suite (142 tests), build, migration/seed and evidence checks. Evidence: `evidence/CIRCLE-001/ACCEPTANCE.md`. Next task: `CIRCLE-002` business-circle merchant management.

## CHANNEL-002 completed

- `CHANNEL-002` is PASS at `b601089`: `/ch/merchants/new` creates tenant, organization, first store, administrator, template, plan, channel membership and invitation-prepared delivery state atomically. Delivery failure and recovery are versioned, idempotent and auditable.
- Verification passed: `tests/channel-002-api.test.mjs`; `playwright.channel-002.config.ts` (two browser flows); lint, format, typecheck, unit test, serialized repository test suite (141 tests), build, migration/seed and evidence checks. Evidence: `evidence/CHANNEL-002/ACCEPTANCE.md`. Next task: `CIRCLE-001` fixed business-circle operations console.

## CHANNEL-001 completed

- `CHANNEL-001` is PASS at `bf19dee`: `/ch/dashboard` projects system-tenant first-level channel merchant assignments, persisted onboarding/service state, actual 30-day task/order activity and carefully labelled follow-up signals.
- Verification passed: `tests/channel-001-api.test.mjs`; `playwright.channel-001.config.ts` (two browser flows); lint, format, typecheck, unit test, serialized repository test suite (140 tests), build, migration/seed and evidence checks. Evidence: `evidence/CHANNEL-001/ACCEPTANCE.md`. Next task: `CHANNEL-002` channel merchant onboarding.

## PAGE-P-008 completed

- `PAGE-P-008` is PASS at `eac941b`: `/p/security-audit` locates persisted platform risk signals for degraded connectors, privileged changes and authorization anomalies. It supports idempotent, versioned dispositions while retaining audit and correlated Outbox evidence.
- Verification passed: `tests/page-p-008-api.test.mjs`; `playwright.page-p-008.config.ts` (two browser flows); lint, format, typecheck, unit test, serialized repository test suite (139 tests), build, migration/seed and evidence checks. Evidence: `evidence/PAGE-P-008/ACCEPTANCE.md`. Next task: `CHANNEL-001` channel operations console.

## PAGE-P-007 completed

- `PAGE-P-007` is PASS at `1e32a24`: `/p/connectors` provides platform-scoped connector definitions, authorization-state aggregation, rate-limit policy, auditable health observations and logs without exposing tenant secrets or fabricating external calls.
- Verification passed: `tests/page-p-007-api.test.mjs`; `playwright.page-p-007.config.ts` (two browser flows); lint, format, typecheck, unit test, serialized repository test suite, build, migration/seed and evidence checks. Evidence: `evidence/PAGE-P-007/ACCEPTANCE.md`. Next task: `PAGE-P-008` platform security audit.

## PAGE-P-006 completed

- `PAGE-P-006` is PASS at `b4bd3da`: `/p/templates` persists platform-owned fixed-module templates with industry/scenario configuration, preview and versioned publication. The platform path requires system-tenant `platform.read` / `platform.manage` authority.
- Verification passed: `tests/page-p-006-api.test.mjs`; `playwright.page-p-006.config.ts` (two browser flows); lint, format, typecheck, unit test, serialized repository test suite (134 tests), build, migration/seed and evidence checks. Evidence: `evidence/PAGE-P-006/ACCEPTANCE.md`. Next task: `PAGE-P-007` platform connectors.

## PAGE-P-005 completed

- `PAGE-P-005` is PASS at `80d0805`: `/p/business-circles` manages platform-owned fixed business circles with explicit merchant recommendations, stored benefits/reasons and versioned approval. Nearby discovery is deliberately separate and cannot auto-enroll a merchant.
- Verification passed: `tests/page-p-005-api.test.mjs`; `playwright.page-p-005.config.ts` (two browser flows); lint, format, typecheck, unit test, serialized repository test suite (132 tests), build, migration/seed and evidence checks. Evidence: `evidence/PAGE-P-005/ACCEPTANCE.md`. Next task: `PAGE-P-006` platform template components.

## PAGE-P-004 completed

- `PAGE-P-004` is PASS at `1a4365b`: `/p/channels` manages first-level channels and tenant merchant-pool onboarding/service state with `platform.manage` authority.
- Verification passed: `tests/page-p-004-api.test.mjs`; `playwright.page-p-004.config.ts` (two browser flows); lint, format, typecheck, unit test, serialized repository test suite (131 tests), build, migration/seed and evidence checks. Evidence: `evidence/PAGE-P-004/ACCEPTANCE.md`. Next task: `PAGE-P-005` business-circle management.

## PAGE-P-003 completed

- `PAGE-P-003` is PASS at `652efe1`: `/p/tenants/new` atomically provisions the tenant subject, organization, merchant, first store, administrator access and initial consumer template through `platform.manage` authority.
- Verification passed: `tests/page-p-003-api.test.mjs`; `playwright.page-p-003.config.ts` (two browser flows); full lint, format, typecheck, serialized repository test suite (129 tests), build, migration/seed and evidence checks. Evidence: `evidence/PAGE-P-003/ACCEPTANCE.md`. Next task: `PAGE-P-004` channel management.

## PAGE-P-002 completed

- `PAGE-P-002` is PASS at `522a8f6`: `/p/tenants` manages persisted tenant lifecycle, commercial plan, quotas and risk using platform RBAC, confirmation, version and idempotency safeguards.
- Verification passed: `tests/page-p-002-api.test.mjs`; `playwright.page-p-002.config.ts` (two desktop flows); full quality gates, migration/seed and evidence checks. Evidence: `evidence/PAGE-P-002/ACCEPTANCE.md`. Next task: `PAGE-P-003` tenant onboarding wizard.

## PAGE-P-001 completed

- `PAGE-P-001` is PASS at `98c029e`: `/p/dashboard` exposes auditable global operational signals only to the system-tenant platform permission scope.
- Verification passed: `tests/page-p-001-api.test.mjs`; `playwright.page-p-001.config.ts` (two desktop flows); full quality gates, migration/seed and evidence checks. Evidence: `evidence/PAGE-P-001/ACCEPTANCE.md`. Next task: `PAGE-P-002` tenant management.

## PAGE-M-016 completed

- `PAGE-M-016` is PASS at `8b8898e`: `/m/settings` persists and audits tenant operating rules using RBAC, idempotency, optimistic versioning and correlated outbox events.
- Verification passed: `tests/page-m-016-api.test.mjs`; `playwright.page-m-016.config.ts` (two desktop flows); full quality gates, migration/seed and evidence checks. Evidence: `evidence/PAGE-M-016/ACCEPTANCE.md`. Next task: `PAGE-P-001` platform overview.

## PAGE-M-015 completed

- `PAGE-M-015` is PASS at `fb32e47`: `/m/connectors` records tenant-scoped connector authorization intents and shows persisted status/logs without ever exposing submitted secrets or claiming an unperformed external call.
- Verification passed: `tests/page-m-015-api.test.mjs`; `playwright.page-m-015.config.ts` (two 1440px flows); full quality gates, migration/seed and evidence checks. Evidence: `evidence/PAGE-M-015/ACCEPTANCE.md`. Next task: `PAGE-M-016` tenant operating settings.

## PAGE-M-014 completed

- `PAGE-M-014` is PASS at `a92b743`: `/m/page-builder` exposes fixed-module templates, persisted preview and server-side version publishing without arbitrary low-code execution.
- Verification passed: CORE-008 HTTP state-machine coverage; `playwright.page-m-014.config.ts` (two 1440px flows); full quality gates, migration/seed and evidence checks. Evidence: `evidence/PAGE-M-014/ACCEPTANCE.md`. Next task: `PAGE-M-015` connector management.

## PAGE-M-013 completed

- `PAGE-M-013` is PASS at `087b22f`: `/m/content` persists knowledge/article/media records, versioned approval and channel distribution intents. It never claims third-party delivery without authorization.
- Verification passed: `tests/page-m-013-api.test.mjs`; `playwright.page-m-013.config.ts` (two 1440px flows); full quality gates, migration/seed and evidence checks. Evidence: `evidence/PAGE-M-013/ACCEPTANCE.md`. Next task: `PAGE-M-014` page decoration.

## PAGE-M-012 completed

- `PAGE-M-012` is PASS at `aecee91`: `/m/attribution` explains tenant-scoped first/current/final sources using persisted source, contribution and evidence-reference records, with customer-chain links.
- Verification passed: `tests/page-m-012-api.test.mjs`; `playwright.page-m-012.config.ts` (two 1440px flows); full quality gates, migration/seed and evidence checks. Evidence: `evidence/PAGE-M-012/ACCEPTANCE.md`. Next task: `PAGE-M-013` content center.

## PAGE-M-011 completed

- `PAGE-M-011` is PASS at `3c46dfd`: `/m/employee-process-performance` is a tenant-scoped, multi-signal coaching view. Confirmed contribution-linked orders are context, not a personal sales amount or single performance conclusion.
- Verification passed: `tests/page-m-011-api.test.mjs`; `playwright.page-m-011.config.ts` (two 1440px flows); lint, format, 17-package typecheck/build, Vitest, repository test, migration/seed and evidence checks. Evidence: `evidence/PAGE-M-011/ACCEPTANCE.md`. Next task: `PAGE-M-012` source attribution.

## PAGE-M-010 completed

- `PAGE-M-010` is PASS at `d7642ff`: `/m/permission-audit` reads current-tenant audit records through a `tenant.manage`-protected API. It filters permission changes, exports and reviewable risk signals while retaining action, actor, resource, correlation and trace evidence.
- Verification passed: `tests/page-m-010-api.test.mjs`; `playwright.page-m-010.config.ts` (two 1440px flows); lint, format, 17-package typecheck/build, Vitest, repository test (112), migration/seed and evidence checks. Evidence: `evidence/PAGE-M-010/ACCEPTANCE.md`. Next task: `PAGE-M-011` employee process performance.

## PAGE-M-009 completed

- `PAGE-M-009` is PASS at `aea0630`: `/m/roles-permissions` exposes tenant-scoped roles, effective permissions and membership impact. Its update UI supplies a reason and high-risk confirmation while CORE-003 enforces final confirmation, optimistic versioning and audit records.
- Verification passed: `tests/page-m-009-api.test.mjs`; `playwright.page-m-009.config.ts` (two 1440px flows); lint, format, 17-package typecheck/build, Vitest, repository test, migration/seed and evidence checks. Evidence: `evidence/PAGE-M-009/ACCEPTANCE.md`. Next task: `PAGE-M-010` permission audit.

## PAGE-M-008 completed

- `PAGE-M-008` is PASS at `f432578`: `/m/organization-employees` combines tenant-scoped organizations, employee status, pending invitations and visible task/customer handoff risk. Existing CORE-002 invitation and offboarding writes remain audited and evented.
- Verification passed: `tests/page-m-008-api.test.mjs`; `playwright.page-m-008.config.ts` (two 1440px flows); lint, format, 17-package typecheck/build, Vitest, repository test, migration/seed and evidence checks. Evidence: `evidence/PAGE-M-008/ACCEPTANCE.md`. Next task: `PAGE-M-009` roles and permissions.

## PAGE-M-007 completed

- `PAGE-M-007` is PASS at `ea6ec93`: `/m/stores` presents tenant-scoped store status, manager assignments, configured entry actions, active services, 30-day consumer entry opens and organization-scoped open tasks. Manager changes use version control and write audit/Outbox records.
- Verification passed: `tests/page-m-007-api.test.mjs`; `playwright.page-m-007.config.ts` (two 1440px flows); lint, format, 17-package typecheck/build, Vitest, repository test, migration/seed and evidence checks. Evidence: `evidence/PAGE-M-007/ACCEPTANCE.md`. Next task: `PAGE-M-008` organization and employees.

## PAGE-M-006 completed

- `PAGE-M-006` is PASS at `80505fb`: `/m/ai-suggestions` reads tenant-scoped persisted AI recommendations with model name/version metadata and a clear no-auto-execution boundary. `tenant.manage` managers can version-confirm pending suggestions and submit validated feedback; both writes are audited and publish correlated Outbox events.
- Verification passed: `tests/page-m-006-api.test.mjs`; `playwright.page-m-006.config.ts` (two 1440px flows); lint, format, 17-package typecheck/build, Vitest, repository test (104), migration/seed and evidence checks. Evidence: `evidence/PAGE-M-006/ACCEPTANCE.md`. Next task: `PAGE-M-007` store management.

## PAGE-M-005 completed

- `PAGE-M-005` is PASS at `b823034`: `/m/workflows` reads persisted CORE-010 templates, instances, active owners, approval steps and timeout exceptions through a `tenant.manage`-protected, tenant-scoped management projection.
- Verification passed: `tests/page-m-005-api.test.mjs`; `playwright.page-m-005.config.ts` (two 1440px flows); lint, format, typecheck, Vitest, repository test/build, migration/seed and evidence checks. Evidence: `evidence/PAGE-M-005/ACCEPTANCE.md`. Next task: `PAGE-M-006` AI suggestion center.

## PAGE-M-004 completed

- `PAGE-M-004` is PASS at `7356225`: `/m/customers/[id]` gives a `tenant.manage` user a tenant-scoped, masked customer full-chain view. It combines persisted sources, contributions, ownerships/transfers, orders/evidence receipts, tasks, actionable anomalies and audit-derived history without disclosing identity hashes.
- Verification passed: `tests/page-m-004-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-m-004.config.ts` (two 1440px browser flows, screenshots and traces); lint, format, 17-package typecheck/build, Vitest, `test` (100), migration/seed and evidence checks. Evidence: `evidence/PAGE-M-004/ACCEPTANCE.md`. Next task: `PAGE-M-005` workflow center.

## PAGE-M-003 completed

- `PAGE-M-003` is PASS at `1b3015a`: `/m/customers` presents tenant-scoped customer assets with persisted search, tags, segment, source and ownership data. Management can select up to fifty versioned customers and create auditable ownership-transfer approval requests without direct owner overwrite.
- Export requests persist the active filters; only approved requests produce the minimized customer CSV. Requests, approval, and download are audited and publish correlated Outbox events. Verification passed: `tests/page-m-003-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-m-003.config.ts` (two 1440px browser flows, screenshots and trace); lint, format, 17-package typecheck/build, Vitest, `test` (98), migration/seed and evidence checks. Evidence: `evidence/PAGE-M-003/ACCEPTANCE.md`. Next task: `PAGE-M-004` management customer detail.

## PAGE-M-002 completed

- `PAGE-M-002` is PASS at `d6689ca`: `/m/funnels/[id]` presents tenant-scoped source, lead, follow-up, deal and repurchase cohort outcomes. The current schema cannot verify source-to-visit links, so visit is visibly classified as inferred and excluded from conversion rates rather than fabricated.
- Verification passed: `tests/page-m-002-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-m-002.config.ts` (two 1440px browser flows, screenshots and traces); lint, format, 17-package typecheck/build, Vitest, `test` (93), migration/seed and evidence checks. Evidence: `evidence/PAGE-M-002/ACCEPTANCE.md`. Next task: `PAGE-M-003` customer assets.

## PAGE-M-001 completed

- `PAGE-M-001` is PASS at `0264231`: `/m/dashboard` presents tenant-scoped customer, order and task results, current overdue/pending-ownership exceptions and rule-based explainable suggestions with action links. The read endpoint requires `tenant.manage`, and all displayed signals trace to persisted records.
- Verification passed: `tests/page-m-001-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-m-001.config.ts` (two 1440px browser flows, screenshots and traces); lint, format, 17-package typecheck/build, Vitest, `test` (92), migration/seed and evidence checks. Evidence: `evidence/PAGE-M-001/ACCEPTANCE.md`. Next task: `PAGE-M-002` management funnel.

## PAGE-E-009 completed

- `PAGE-E-009` is PASS at `8335f65`: `/e/profile` provides each active employee's persisted identity, organization, same-organization stores, effective permissions, safe internal tools and notification preference. The profile-specific preference write resolves the employee on the server from the active membership, preventing a caller from changing a peer's setting while retaining CORE-006 version, audit and Outbox semantics.
- Verification passed: `tests/page-e-009-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-e-009.config.ts` (two 390px browser flows, screenshots and traces); lint, format, 17-package typecheck/build, Vitest, `test` (91), migration/seed and evidence checks. Evidence: `evidence/PAGE-E-009/ACCEPTANCE.md`. Next task: `PAGE-M-001` management overview.

## PAGE-E-008 completed

- `PAGE-E-008` is PASS at `20f92f8`: `/e/notifications` presents each active employee's persisted task reminder, overdue anomaly, pending customer-ownership approval and system notifications, with category/read filters and safe internal deep links. CORE-006 notification logs and pending approvals materialize idempotently into an employee-private inbox; read writes enforce task permission, employee ownership, optimistic version and idempotency, and record audit/Outbox data.
- Verification passed: `tests/page-e-008-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-e-008.config.ts` (two 390px browser flows, screenshots and traces); lint, format, 17-package typecheck/build, Vitest, `test` (90), migration/seed and evidence checks. Evidence: `evidence/PAGE-E-008/ACCEPTANCE.md`. Next task: `PAGE-E-009` employee profile and tools.

## PAGE-E-007 completed

- `PAGE-E-007` is PASS at `a0aa0b7`: `/e/nurture` shows employee-owned persisted active, repurchase and dormant customers with order/task signals. Employees can adjust a profile, record a non-sending touchpoint or create a real follow-up task; writes enforce active-employee/RBAC/tenant/version/idempotency and record audit/Outbox. E006 nurture conversions create the profile automatically.
- Verification passed: `tests/page-e-007-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-e-007.config.ts` (two 390px browser flows, screenshots and traces); lint, format, 17-package typecheck/build, Vitest, `test` (88), migration/seed and evidence checks. Evidence: `evidence/PAGE-E-007/ACCEPTANCE.md`. Next task: `PAGE-E-008` employee notifications.

## PAGE-E-006 completed

- `PAGE-E-006` is PASS at `1a04177` (feature base `11a5b09`): `/e/leads` presents persisted tenant-scoped leads with filter, claim, employee allocation, conversion to follow-up task or nurture queue, clear mobile feedback and recovery states. Writes use active-employee/RBAC validation, optimistic versions, idempotency, audit and correlated Outbox events.
- Verification passed: `tests/page-e-006-api.test.mjs` against a spawned production API and PostgreSQL; `playwright.page-e-006.config.ts` with two 390px browser flows/screenshots/traces; lint, format, 17-package typecheck/build, Vitest, `test` (86), migration/seed and evidence checks. Evidence: `evidence/PAGE-E-006/ACCEPTANCE.md`. Next task: `PAGE-E-007` employee nurture workbench.

## PAGE-E-005 completed

- `PAGE-E-005` is PASS at `403e687`: `/e/share` creates employee/campaign/channel codes with a genuine QR code, expiry and explicit revocation. The consumer share landing records a persistent source event before routing to the tenant's safe internal consumer path; inactive or expired codes are rejected.
- Verification passed: `tests/page-e-005-api.test.mjs`, `playwright.page-e-005.config.ts` (390px generated-QR and recovery screenshots/traces), lint, format, typecheck, test:unit, test (84), build, migration/seed and evidence checks. Evidence: `evidence/PAGE-E-005/ACCEPTANCE.md`. Next task: `PAGE-E-006` employee acquisition pool.

## PAGE-E-004 completed

- `PAGE-E-004` is PASS at `edbdf25`: task follow-ups preserve raw records, voice transcription, editable summary and a transactionally created next task, all restricted to the active employee's own tasks.
- Verification passed: `tests/page-e-004-api.test.mjs`, `playwright.page-e-004.config.ts`, lint, format, typecheck, test, build, migration/seed and evidence checks. Evidence: `evidence/PAGE-E-004/ACCEPTANCE.md`. Next task: `PAGE-E-005` sharing codes and scenarios.

## PAGE-E-003 completed

- `PAGE-E-003` is PASS at `5c16e9c`: employee customer detail exposes only employee-related customer records, with masked identities, persisted sources/ownership/tags, own task links and safe timeline data.
- Verification passed: `tests/page-e-003-api.test.mjs`, `playwright.page-e-003.config.ts`, lint, format, typecheck, test:unit, test (79), build, migration/seed and evidence checks. Evidence: `evidence/PAGE-E-003/ACCEPTANCE.md`. Next task: `PAGE-E-004` employee follow-up records.

## PAGE-E-002 completed

- `PAGE-E-002` is PASS at `1f0b19c`: `/e/tasks/[id]` reads only the active employee's own persisted task, including reason, deadline, customer and safe evidence metadata. Employees can link only that customer's active evidence with idempotency, audit and Outbox records, and complete their own task through the existing versioned state machine.
- Verification passed: `tests/page-e-002-api.test.mjs`, `playwright.page-e-002.config.ts` (390px normal/login-recovery screenshots and traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test` (78), `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-E-002/ACCEPTANCE.md`. Next task: `PAGE-E-003` employee customer detail.

## PAGE-E-001 completed

- `PAGE-E-001` is PASS at `f2bc111`: `/e/workbench` reads only the current active employee's persisted tasks, customer reminders and explainable time-limit opportunities. It supports completing only the employee's own task with a version check, audit and Outbox event.
- Verification passed: `tests/page-e-001-api.test.mjs`, `playwright.page-e-001.config.ts` (390px normal/login-recovery screenshots and traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test`, `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-E-001/ACCEPTANCE.md`. Next task: `PAGE-E-002` employee task detail.

## PAGE-C-006 completed

- `PAGE-C-006` is PASS at `b7c5a59`: `/c/processes/[id]` reads persisted CORE-007 order results through an expiring tenant-bound secret. It shows order, consultation, appointment, verification, result receipts and exception feedback without returning customer identity fields.
- Verification passed: `tests/page-c-006-api.test.mjs`, `playwright.page-c-006.config.ts` (390px normal and recovery screenshots plus traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test` 72/72, `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-C-006/ACCEPTANCE.md`. Next task: `PAGE-C-007` consumer identity and membership.

## PAGE-C-005 completed

- `PAGE-C-005` is PASS at `37d5d61`: consumer entry actions open `/c/actions/[id]`, which confirms the action before a trusted browser redirect and keeps a safe local return path. Non-link actions expose a copyable code and recovery UI.
- Verification passed: `tests/page-c-005-api.test.mjs`, `playwright.page-c-005.config.ts` (390px redirect and unavailable screenshots plus traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test` 70/70, `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-C-005/ACCEPTANCE.md`. Next task: `PAGE-C-006` consumer process and result query.

## PAGE-C-004 completed

- `PAGE-C-004` is PASS at `b49f21b`: `/c/services/[id]` shows the persisted service, applicable store and benefit records in a tenant-scoped public read model. Its consultation action is server-resolved and idempotently records the existing consumer event, audit log and Outbox message.
- Verification passed: `tests/page-c-004-api.test.mjs`, `playwright.page-c-004.config.ts` (390px normal and unavailable screenshots plus traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test` 68/68, `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-C-004/ACCEPTANCE.md`. Next task: `PAGE-C-005` consumer external-action redirect and recovery.

## PAGE-C-003 completed

- `PAGE-C-003` is PASS at `97bdd48`: `/c/stores/[id]` renders tenant-scoped stores, services, benefits and content from PostgreSQL. Deep links preserve source context; public consultation is idempotent and writes a consumer action event, audit log and Outbox event.
- Verification passed: `tests/page-c-003-api.test.mjs`, `playwright.page-c-003.config.ts` (390px normal and unavailable screenshots plus traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test` 66/66, `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-C-003/ACCEPTANCE.md`. Next task: `PAGE-C-004` consumer service and benefit detail.

## PAGE-C-002 completed

- `PAGE-C-002` is PASS at `04a39cc`: `/c/discovery` reads the public consumer discovery API. Channel recommendations, fixed business circles and LBS results have separate persisted models and queries; every read is scoped by active tenant ID. Coordinates are pair-validated and range-validated.
- Verification passed: `node --test tests/page-c-002-api.test.mjs`, `pnpm.cmd exec playwright test --config playwright.page-c-002.config.ts`, and the full repository gates (`lint`, `format:check`, `typecheck`, `test:unit`, `test` 64/64, `build`, `db:migrate`, `db:seed`, `evidence:check`, `git diff --check`). Evidence: `evidence/PAGE-C-002/ACCEPTANCE.md`, three 390px state screenshots and Playwright traces.
- The full suite exposed shared-fixture interference in PAGE-C-001; its public read fixture now uses a separate persisted tenant while retaining its protected template publishing validation. The concurrent full suite passed after the repair.
- Next task: `PAGE-C-003` consumer merchant detail page.

## PAGE-C-001 已交接

- `PAGE-C-001` 已 PASS：`/c/entry` 使用租户已发布的消费者模板和外部动作渲染品牌、场景、推荐、权益、咨询及固定底部导航；公共 API 对 slug 输入和租户范围严格校验。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（62/62）、`test:unit`、`build`、`db:migrate`、`db:seed`、`tests/page-c-001-api.test.mjs`、`playwright.page-c-001.config.ts`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/PAGE-C-001/ACCEPTANCE.md`，含移动端正常、空、不可用截图与 Playwright trace。下一任务：`PAGE-C-002` — 消费者发现页。

## CORE-010 已交接 / CORE 阶段验收 PASS

- `CORE-010` 已 PASS：工作流定义、版本发布、实例、上下文条件、员工任务、审批和超时处理均已持久化；实例以发布版本为准，关键动作有审计和带 correlation/trace 的 Outbox 事件。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（60/60）、`test:unit`、`build`、`db:migrate`、`db:seed`、`tests/core-010-e2e.test.mjs`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/CORE-010/ACCEPTANCE.md`。无页面或第三方服务调用，页面 E2E/截图、无障碍和外部服务失败不适用。
- 阶段：CORE-001 至 CORE-010 已完成并通过自动阶段验收，报告为 `evidence/CORE-PHASE/ACCEPTANCE.md`；下一任务为 `PAGE-C-001` — 消费者统一入口。

## CORE-009 已交接

- `CORE-009` 已 PASS：外部 HTTP(S) 链接、小程序 App ID/路径与平台入口均按租户配置；所有点击事件可追踪，并写入审计和带 correlation/trace 的 Outbox 事件。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（58/58）、`test:unit`、`build`、`db:migrate`、`db:seed`、`tests/core-009-e2e.test.mjs`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/CORE-009/ACCEPTANCE.md`。本任务不调用未经授权的第三方服务，外部服务失败和页面 E2E/截图不适用。
- 下一任务：`CORE-010` — 标准工作流引擎。

## CORE-008 已交接

- `CORE-008` 已 PASS：模板、模块、版本、草稿预览、发布与回滚均通过租户/RBAC 边界实现；关键变更含审计与可追踪 Outbox 事件。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（56/56）、`test:unit`、`build`、`db:migrate`、`db:seed`、`tests/core-008-e2e.test.mjs`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/CORE-008/ACCEPTANCE.md`。模板 API 将由后续各角色页面任务消费；本任务不依赖外部服务。
- 下一任务：`CORE-009` — 入口插件与外部动作。

## CORE-007 已交接

- `CORE-007` 已 PASS：客户订单、截图/照片的受限图片证据、哈希化核销码和连接器回执均已持久化；文件读取经租户/RBAC 校验并带下载安全响应头。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（54/54）、`test:unit`、`build`、`db:migrate`、`db:seed`、`tests/core-007-e2e.test.mjs`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/CORE-007/ACCEPTANCE.md`。本任务无页面交付；页面 E2E、截图和无障碍不适用。外部第三方调用属于后续 CORE-009，当前回执为受控持久化输入。
- 下一任务：`CORE-008` — 页面模板与模块。

## CORE-006 已交接

- `CORE-006` 已 PASS：任务创建与完成、客户/员工租户校验、提醒、到期升级、勿扰抑制与恢复、通知日志均已持久化；关键写操作在事务内记录审计和带 correlation/trace 的 Outbox 事件。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（52/52）、`test:unit`、`build`、`db:migrate`、`tests/core-006-e2e.test.mjs`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/CORE-006/ACCEPTANCE.md`。页面 E2E、截图、无障碍与外部服务失败场景不适用（本任务无页面且无外部依赖）。
- 下一任务：`CORE-007` — 证据与结果回收。

## CORE-005 已交接

- `CORE-005` 已 PASS：首要/当前/最终来源、贡献角色与证据、归属转移申请和审批均已实现；归属修改留有审计和可追踪 Outbox 事件。
- 验证：`pnpm.cmd install --frozen-lockfile`、typecheck、lint、format check、Vitest、50 项仓库测试、build、`tests/core-005-e2e.test.mjs` 和 evidence check 均通过。
- 证据：`evidence/CORE-005/ACCEPTANCE.md`；页面 E2E、截图、可访问性和外部服务失败不适用（本任务无页面或外部服务）。
- 下一任务：`CORE-006` — 任务提醒与升级。

## CORE-004 已交接

- `CORE-004` 已 PASS：客户主档、手机号/微信身份的哈希化持久化与脱敏展示、同租户身份去重、乐观锁、合并记录、审计和 Outbox 事件均已实现。
- 验证：`pnpm.cmd install --frozen-lockfile`、typecheck、lint、format check、Vitest、48 项仓库测试、build、`tests/core-004-e2e.test.mjs` 和 evidence check 均通过。
- 证据：`evidence/CORE-004/ACCEPTANCE.md`；页面 E2E、截图、可访问性和外部服务失败不适用（本任务无页面或外部服务）。
- 下一任务：`CORE-005` — 来源归属与贡献。

## CORE-003 已交接

- `CORE-003` 已 PASS：角色模板、创建幂等、敏感权限确认、乐观锁、确认记录与审计日志已实现。
- 验证：typecheck、lint、format check、46 项仓库测试、Vitest、build、CORE-003 HTTP E2E、evidence check 均通过。
- 下一任务：`CORE-004` — 客户主档与身份。

## CORE-002 已交接

- `CORE-002` 已 PASS：员工邀请、成员接受、员工与组织归属、离职状态、审计和 Outbox 事件已实现并通过真实 HTTP 验证。
- 验证：typecheck、lint、format check、44 项仓库测试、Vitest、build、`tests/core-002-e2e.test.mjs` 和 evidence check 均通过。
- 下一任务：`CORE-003` — 角色与权限管理服务。

## CORE-001 已交接

- `CORE-001` 已 PASS：组织、组织关系、商户、门店、创建幂等、乐观锁、TenantContext/RBAC 校验及 audit logs 已实现并真实 HTTP 验证。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（41/41）、`test:unit`（1/1）、`build`、`evidence:check` 均通过。
- 下一任务：`CORE-002` — 用户员工与成员关系。

## 已确认事实

- `FOUNDATION-001` 已 PASS，代码提交为 `1d94bb72ac8b89d2dab8948d7a1f8a7567c94f06`。
- `FOUNDATION-002` 已 PASS，代码提交为 `b32844de7d84e5a6a94a3305bfaf57b999417cf8`。
- `FOUNDATION-003` 已完成质量配置并通过验证，提交待本轮写入。
- pnpm/Turbo Monorepo 已建立，包含四个 Next.js 16 Web 应用、NestJS 11 + Fastify API、Worker 与 11 个共享包。
- 开发环境已核验：Node.js 24、pnpm 10、Git 和 Docker 可用。
- 旧项目 `D:\1DAY_V2` 未被访问或修改。

## 施工状态

- `FOUNDATION-004` 已 PASS：Kysely 迁移、种子、回滚/前向修复和测试数据库框架已实现并真实验证；代码提交为 `3685e9a07be6e98e4980d00afabeb33be8087106`。
- PostgreSQL 测试库 `oneday_v3_test` 保留在本地 Docker 环境，包含 `001_foundation_schema` 迁移、1 个系统租户和 2 条基础权限。
- 基础阶段 `FOUNDATION-001` 至 `FOUNDATION-010` 已获验收：MILESTONE PASS，完成度 `10/69`，最终状态提交为 `239114e`。
- Playwright 的 Next.js 开发服务器会输出跨源资源警告；截图与 E2E 均通过，列为已知观察项，不构成当前阻塞。

## 下一步

用户已正式授权进入 CORE。创建 `core/CORE-001` 分支，读取租户与组织模型任务及直接依赖规范后开始施工；CORE 阶段最后一个任务为 `CORE-010`。

## 禁止

不得修改旧工程 `D:\1DAY_V2`。

## LOCAL HUMAN-PILOT-SANDBOX ready (2026-08-08)

- Scope is local browser trial only: no business logic change, no public deployment, no real customer credential, no connector authorization and no production acceptance claim.
- Database: `oneday_human_pilot`, independently migrated from 001 through 045 and provisioned via `scripts/local-human-pilot-seed.mjs`; it refuses any other database name and is separate from `oneday_v3_test`.
- Running localhost terminals: Consumer `3171`, Employee `3172`, Management `3173`, Platform `3174`; API `3001`; Worker `3002`.
- Operator files: `PROJECT_STATE/LOCAL_HUMAN_PILOT_ACCOUNTS.md`, `PROJECT_STATE/LOCAL_HUMAN_PILOT_RUNBOOK.md`; evidence: `evidence/HUMAN-PILOT-HANDOFF/LOCAL_MACHINE_PREFLIGHT.md`.
- Verification: 18-package typecheck/build; actual API/Worker/terminal HTTP checks; local login, refresh, logout, scheduler, anonymous consumer, customer/task/Outbox, employee follow-up, management visibility, RBAC and cross-tenant isolation all passed.
