# PAGE-P-005 acceptance

- `/p/business-circles` manages platform-owned fixed business circles independently from tenant-local nearby discovery. Nearby merchants are never auto-enrolled: each membership is an explicit recommendation with persisted benefits and reason, then a version-checked platform approval.
- Creation and approval require `platform.manage`, use tenant-scoped transactions and idempotency, and emit correlated audit and Outbox events.
- `node --test tests/page-p-005-api.test.mjs` PASS: unauthenticated access, validation, explicit pending recommendation, idempotent creation/approval replay, and PostgreSQL audit/Outbox persistence verified over real HTTP.
- `pnpm.cmd exec playwright test --config playwright.page-p-005.config.ts` PASS (2 tests): platform creation, explicit membership approval and missing-session rejection verified. Screenshots and traces are retained in this directory.
