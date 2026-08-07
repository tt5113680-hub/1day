# PAGE-P-007 acceptance

- `/p/connectors` persists platform connector definitions, fixed authorization modes and per-minute limits; it aggregates only existing tenant authorization status and never exposes tenant secrets.
- Health is an audited platform observation with persisted logs, not a fabricated external call.
- `node --test tests/page-p-007-api.test.mjs` PASS: unauthenticated rejection, validation, idempotent definition creation, health observation and persisted logs verified over real HTTP/PostgreSQL.
- `pnpm.cmd exec playwright test --config playwright.page-p-007.config.ts` PASS (2 tests): definition, health observation and missing-session rejection verified. Screenshots and traces are retained in this directory.
