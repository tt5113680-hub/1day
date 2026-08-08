# AUDIT-BATCH-3 acceptance — Worker, Outbox, reminders and overdue scheduling

## Delivered behavior

- `OutboxDispatcher` leases due pending events with PostgreSQL row locks, records each internal consumer exactly once in `event_consumptions`, and marks internal delivery published. Published means internal consumption only; it makes no external connector-delivery claim.
- A failed internal handler rolls back its consumption marker, increments attempts, records `last_error`, and uses bounded 15-second incremental availability backoff. A later dispatch can recover the same event.
- `TaskDispatchScheduler` is the single reminder/overdue state machine for both the Worker and the API's guarded manual fallback. It preserves DND, `SKIP LOCKED`, notification log, audit and Outbox behavior.
- Worker startup now requires `DATABASE_URL`, runs an immediate and periodic dispatch loop, reports last dispatch/degraded error state at `/health`, and shuts down database pools gracefully. Optional `WORKER_TENANT_ID` scopes local acceptance only; production runs all tenants when unset.
- Migration `043_worker_dispatch_state` adds durable Outbox failure diagnostics.

## Real process acceptance

`node --test --test-concurrency=1 tests/audit-batch-3-worker.test.mjs` — PASS (1/1)

The test creates an isolated tenant, starts `apps/worker/dist/index.js` with a tenant scope, and verifies:

1. A pending Outbox event is internally consumed once and marked `published`.
2. A due reminder becomes `sent`, an overdue task becomes `overdue`, and two employee notification logs plus audit/Outbox records are persisted.
3. The Worker health response contains a successful dispatch summary.
4. A deliberately failing internal handler leaves the event pending with `attempts=1` and `last_error`; after availability is restored, the same event is successfully consumed exactly once.

## Quality gates

- `pnpm.cmd db:migrate` against `oneday_v3_test` — PASS (`043_worker_dispatch_state:Up`).
- `pnpm.cmd typecheck` — PASS (18 packages).
- `pnpm.cmd lint` — PASS.
- `pnpm.cmd format:check` — PASS.
- `pnpm.cmd test` — PASS (177 repository tests; 18 package test tasks).
