# PAGE-P-004 acceptance

- `/p/channels` manages persisted first-level platform channels, active tenant merchant-pool entries, onboarding progress and service health; it does not introduce multilevel commission or fabricated external delivery.
- Channel creation requires `platform.manage`, validates code/status/merchant eligibility, runs in one transaction, is idempotent, and writes correlated audit and Outbox records.
- `node --test tests/page-p-004-api.test.mjs` PASS: unauthenticated access, validation, platform-scoped creation, replay, merchant-pool projection, audit and Outbox persistence verified over HTTP/PostgreSQL.
- `pnpm.cmd exec playwright test --config playwright.page-p-004.config.ts` PASS (2 tests): platform channel creation and missing-session rejection verified. Screenshots and traces are retained in this directory.
