# Pre-pilot decision

## Scope and evidence

This is a decision-only record. It reads `DEEP_CHAIN_DIAGNOSIS_FOR_CODEX.md`, `POST_HARDENING_AUDIT_REPORT.md`, `AUDIT_REMEDIATION_CLOSEOUT.md`, `V3_1_DESIGN_DEBT.md`, the frozen product documents, and `docs/PILOT_LIMITATIONS.md`, with targeted source cross-checks. No business code, tests, refactor, feature implementation, or commit is part of this decision.

`POST_HARDENING_AUDIT_REPORT = PASS FOR HUMAN PILOT` remains the technical baseline. The proposed work below is a narrowly bounded trial-experience and truthfulness polish, not a reopening of the hardening verdict.

## I. Entry continuity

| ID                                                    | Decision              | Rationale and product-boundary decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-1 Discovery merchant opens an operating entry       | **MUST_BEFORE_PILOT** | `/c/discovery` currently renders merchants as non-interactive text. Discovery is explicitly part of the consumer's unified entrance, so an unclickable merchant is a broken in-scope journey, not a request for a marketplace. The implementation must expose only a real, tenant-scoped public deep link to an active published entry or store; it must not invent a store mapping, ranking, cart, or payment path.                                                                                                       |
| A-2 Consumer Entry bottom navigation is real          | **MUST_BEFORE_PILOT** | The visible bottom controls and recommendation cards currently only change local highlight state. A button that looks like navigation but does nothing breaks the promised unified entrance. Navigation may use existing routes and in-page anchors: discovery, published benefits/content, and the configured consultation action. It must not introduce consumer accounts or a fourth back-office shell.                                                                                                                 |
| A-3 Platform root opens dashboard                     | **MUST_BEFORE_PILOT** | `/` still presents a future-work placeholder although `/p/dashboard` is the real platform home. A direct redirect is a bounded shell correction and avoids operator confusion; it does not redesign platform information architecture.                                                                                                                                                                                                                                                                                     |
| A-4 Consumer action completion exposes process lookup | **DEFER_V3_1**        | The current public action confirmation creates an operating projection, not a consumer process/order with an access secret. Existing `/c/processes/[id]` correctly requires an already-issued process id and secret. Generating a fake process link or synthetic order merely to fill the UI would violate outcome honesty. The pilot must not promise a lookup link after every action; a future action-to-process contract can provide it only when a real result/process exists, without forcing consumer registration. |

The first three items strengthen the stated “unified digital operating entrance + AI operating system” positioning. A-4 is deferred precisely to avoid pretending that an external-action record is a completed consumer process.

## II. AI truthfulness

### B-1 Consumer recommendation label

**Recommendation: A — rename it to “商家推荐” or “场景推荐” now.**

The displayed cards are published CMS `action_grid.recommendations`, not model output. This is **MUST_BEFORE_PILOT** boundary calibration because retaining “AI 为你推荐” would be a false capability claim. Implementing consumer LLM recommendations in this window is rejected: it would require a recommendation contract, tenant data/rule boundaries, audit semantics, safety review, and evaluation; a thin LLM call would be fake AI in a different form. No consumer login or identity expansion is authorized.

### B-2 Management AI execution result

**MUST_BEFORE_PILOT.** For an accepted complete `create_task`, the service actually returns `execution_status=executed` and creates the tenant-local task. The UI currently says that the business action still requires manual confirmation. That is a material false negative: it can cause duplicate work and obscures the audited command result.

The bounded correction is:

- `executed` + `create_task`: show “已创建跟进任务” and the existing task receipt/link where available;
- `manual_required`: explain that no task was created and direct the user to the appropriate existing business entry;
- never imply customer contact, external delivery, or a third-party success receipt.

### B-3 Consumer, employee, and channel AI capability surface

The missing surfaces are **not a current pilot blocker**. The pilot's verified AI promise is the management-side reviewed, whitelisted local command. The capability gap is **DEFER_V3_1**, while the pilot limitation must explicitly state this scope before customer activation. It must not be addressed by an unreviewed LLM integration, fake ranking, consumer account system, automatic private message, social publishing, or external connector call.

## III. Frozen-rule debt

| ID                                                           | Decision       | Core-loop impact and disposition                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C-1 Approximate two-minute no-key-action reminder after scan | **DEFER_V3_1** | The verified loop begins when the consumer performs an action; no-action reminder is a conversion optimization and the freeze uses “可按租户规则提醒”, not an unconditional task-creation rule. It must be designed against actual open-event semantics and existing ownership rules so that it never fabricates assignment.                                                                                                         |
| C-2 Offboard ownership freeze and handoff task               | **DEFER_V3_1** | This is important lifecycle work, but not an immediate blocker for a controlled pilot with a small fixed team and no planned offboarding. Current pilot operations must prohibit silent offboarding and handle any emergency through the existing owner/approval process. A proper implementation needs transactionally frozen ownership, handoff policy, audit, and no silent customer deletion; it is not a quick “AI task” patch. |
| C-3 Tag confidence decay and manager confirmation            | **DEFER_V3_1** | Existing settings only constrain custom-tag count; they do not provide the frozen confidence state machine. This is customer-data governance/CDP evolution, not required for the confirmed consumer → task → evidence → management pilot loop.                                                                                                                                                                                       |

These are real next-stage rule debts. They are not rejected, but the frozen documents do not authorize unlimited MVP expansion merely because the rules are written down.

## IV. Security and runtime debt

| ID                                            | Decision                | Classification and reason                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1 `active_tenants` SQL precedence           | **MUST_BEFORE_PILOT**   | **Confirmed code defect.** `active AND … AND exists(tasks) OR exists(orders)` can count an inactive tenant with a recent order. Add the missing grouping and a regression test. This is not an architecture enhancement and should not be waived because it is labelled S2.                                                                                                        |
| D-2 Refresh-token pepper environment variable | **DEFER_V3_1**          | **Security hardening enhancement, not a demonstrated functional defect.** The token is high entropy and the current pilot gate already protects signing secrets/session validation. A safe pepper migration needs explicit rotation/invalidation semantics, production configuration, failure behavior, and deployment coverage; it should not be slipped into a pre-pilot polish. |
| D-3 Redis documentation/runtime consistency   | **SHOULD_BEFORE_PILOT** | **Operating-contract correction, not runtime feature work.** Compose and deployment guidance currently require Redis/`REDIS_URL`, while the running API/Worker do not consume it. Correct the pilot documents to state the present dependency truth and do not add Redis just to justify a document. This avoids false operator prerequisites without changing business behavior.  |
| D-4 PostgreSQL RLS                            | **DEFER_V3_1**          | **Defence-in-depth architecture enhancement.** Application tenant/RBAC isolation was independently verified. RLS needs a full policy inventory, migration/recovery plan, least-privilege database roles, and proof that it complements rather than replaces application authorization. It is too large and risky for this window.                                                  |
| D-5 Empty Outbox handler / ledger semantics   | **DEFER_V3_1**          | **Semantic calibration already adequate for the pilot.** The Worker ledger consumes internal events; the reports and `PILOT_LIMITATIONS` already state that this is not external delivery. There is no evidence that current UI says “sent successfully”. Keep that red line and revisit delivery adapters/observability only with an authorized external integration.             |

## V. Red lines

| Question                                                                                                    | Decision |
| ----------------------------------------------------------------------------------------------------------- | -------- |
| 1. Connector may not masquerade as actual external delivery                                                 | **YES**  |
| 2. Outbox without an external receipt may not display “sent successfully”                                   | **YES**  |
| 3. Consumer remains a public low-friction entrance                                                          | **YES**  |
| 4. Fabricated employee assignment is prohibited                                                             | **YES**  |
| 5. Payment, marketplace, ERP, OA, automatic private messages, and equivalent scope expansion are prohibited | **YES**  |
| 6. HUMAN PILOT must not reopen a large V3.1 design rewrite                                                  | **YES**  |

## VI. Final construction decision

### **Option 2 — one and only one PRE-PILOT-POLISH batch**

This is not a new hardening phase and must complete before immediately returning to `HUMAN-PILOT-HANDOFF`.

### Included original IDs

1. **A-1** — Discovery merchant-to-real-public-entry link.
2. **A-2** — Existing Consumer Entry controls navigate or anchor for real.
3. **A-3** — Platform root redirects to `/p/dashboard`.
4. **B-1** — Rename CMS cards from “AI 为你推荐” to merchant/scenario recommendation.
5. **B-2** — Reflect `executed` versus `manual_required` management AI command truthfully.
6. **B-3 (documentation only)** — State the pilot AI scope and defer consumer/employee/channel AI surfaces.
7. **D-1** — Correct `active_tenants` SQL grouping with a narrow regression test.
8. **D-3 (documentation only)** — Align Redis prerequisites with the current runtime.

### Why now

These are bounded, observable defects in a real pilot operator or consumer journey, a false AI claim/result, one deterministic platform metric bug, and an operator-facing deployment contract mismatch. They do not change the commercial operating transaction, ownership precedence, session model, external-delivery boundary, or tenant isolation model.

### Expected modules

- `apps/consumer-web/app/c/discovery/*` and `apps/api/src/consumer-discovery.service.ts` only as needed to supply a real existing public deep link.
- `apps/consumer-web/app/c/entry/*`.
- `apps/platform-web/app/page.tsx` and the existing platform dashboard route.
- `apps/management-web/app/m/ai-suggestions/*` using existing `execution_status`/receipt data.
- `apps/api/src/platform-dashboard.service.ts` and one focused regression test.
- `docs/PILOT_LIMITATIONS.md` and `docs/PILOT_DEPLOYMENT.md` for AI/Redis truthfulness only.

### Acceptance standard

- Discovery merchant click opens only a tenant-scoped, published, real entry/store destination; unresolved merchants have no deceptive link.
- Consumer bottom controls perform the stated route/anchor action; no consumer authentication is introduced.
- `/` reaches the actual platform dashboard.
- Consumer CMS recommendation UI contains no AI claim; management `executed/create_task` displays “已创建跟进任务”, while `manual_required` displays no execution claim.
- The active-tenant metric excludes inactive tenants even when orders exist.
- Pilot documents state the present Redis and AI boundaries accurately.
- Existing H-002, B2–B7 real browser/security regressions and all applicable quality gates remain green; new focused tests prove the changed behavior.

### Explicit exclusions

- A-4 action-to-process recovery contract; C-1/C-2/C-3; D-2/D-4/D-5; employee customer-detail wording cleanup; workflow UI expansion; bytea/object-storage work; broad design-system rewrite; historical test cleanup.
- Any payment, marketplace, ERP/OA/CRM replacement, consumer login, external connector delivery, automatic private message/social publishing, fabricated assignment, new consumer/channel LLM, ranking engine, or data-model rewrite.

## VII. Post-hardening verdict

### `POST_HARDENING: PASS FOR HUMAN PILOT` — **YES**

It still stands. The selected items are trial-experience and truthfulness polish plus one deterministic metric correction; they do not invalidate the passed session, tenant-isolation, operating-loop, Worker/Outbox, production-boundary, or multi-role evidence. After this one small batch passes, the process returns directly to human controlled-pilot handoff and remains subject to the existing non-seed credential, authorization, and checklist-signature gate.
