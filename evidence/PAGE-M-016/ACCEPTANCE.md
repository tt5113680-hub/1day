# PAGE-M-016 acceptance

- `/m/settings` reads and updates tenant-scoped reminder, approval, default do-not-disturb, tag, ownership and brand rules through a real PostgreSQL-backed API.
- Writes require `tenant.manage`, a request ID, idempotency key and optimistic version; invalid payloads, stale versions, unauthenticated access and cross-tenant access are rejected.
- Each accepted update creates an audit record and correlated `tenant.operating_settings.updated.v1` outbox event. Tenant-wide default quiet hours explicitly do not overwrite employee-level preferences.
- `node --test tests/page-m-016-api.test.mjs` PASS — HTTP, validation, isolation, idempotency, version conflict, audit and outbox verified.
- `pnpm.cmd exec playwright test --config playwright.page-m-016.config.ts` PASS (2 tests); desktop and unauthenticated recovery screenshots are retained in this directory.
