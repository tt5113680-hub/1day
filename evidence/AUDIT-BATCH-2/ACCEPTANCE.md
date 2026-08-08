# AUDIT-BATCH-2 acceptance — commercial operating orchestration

## Scope

The public consumer boundary remains anonymous. A consumer action never accepts an employee ID from the browser. A trusted, active employee share code is resolved by the server; otherwise the existing store-manager rule is used when a store is present, and the existing available lead-pool rule applies when there is no eligible assignee.

## Delivered system behavior

- Migration `042_consumer_operating_projections` persists one tenant-scoped projection for each consumer event.
- `ConsumerOperatingOrchestrator` runs inside the same PostgreSQL transaction as public action confirmation, store consultation and service consultation. It creates the anonymous operational customer record, first source, ownership/task/reminder when an employee is resolved, or one existing lead-pool entry when no employee is available.
- Transaction-scoped advisory locks protect both the public idempotency-key event boundary and the consumer-event projection boundary. Concurrent repeats and retries return the same event and projection instead of creating duplicate customer/source/task records.
- The same transaction retains audit and `consumer.operating.projected.v1` Outbox records. A failed projection rolls back the consumer event as well.
- Consumer action and store pages forward only the share link's `shareCode`; public consumer access has no staff-style login.

## Real HTTP acceptance

`node --test --test-concurrency=1 tests/audit-batch-2-e2e.test.mjs` — PASS (2/2)

1. A public share-code open followed by two concurrent public confirms creates exactly one customer, first source, employee ownership, task, pending reminder, audit record and Outbox event. A later retry is replayed with the same projection IDs.
2. The assigned employee authenticates through the normal session, sees the automatic task, records a follow-up, completes the task, and uploads an order evidence file. A management session reads the same customer's source, ownership, completed task and evidence count through `/management/customers/:id`.
3. A public action with no verified employee enters the existing `employee_lead_pool_entries` available pool and deliberately creates no fabricated assignee/task.
4. Cross-tenant action access returns `404`; unauthenticated management access returns `401`.

## Quality gates

- `pnpm.cmd db:migrate` against `oneday_v3_test` — PASS (`042_consumer_operating_projections:Up`).
- `pnpm.cmd typecheck` — PASS (18 packages).
- `pnpm.cmd lint` — PASS.
- `pnpm.cmd format:check` — PASS.
- `pnpm.cmd test` — PASS (175 repository tests; 18 package test tasks).
- `pnpm.cmd build` — PASS (18 packages).
- `pnpm.cmd evidence:check` — PASS (68 evidence contract tests before this batch's contract entry).
