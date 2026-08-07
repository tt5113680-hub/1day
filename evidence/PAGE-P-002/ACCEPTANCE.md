# PAGE-P-002 acceptance

- `/p/tenants` reads the persisted tenant lifecycle, plan, quotas, risk level and overdue-task signal through a platform-scoped API.
- Lifecycle and commercial-boundary updates require `platform.manage`, optimistic tenant version, an idempotency key and exact `ACTIVATE:<slug>` or `SUSPEND:<slug>` second confirmation.
- Accepted updates persist plan/quotas/risk, audit `platform.tenant_updated` and emit `platform.tenant.updated.v1`; malformed confirmation and stale writes are rejected.
- `node --test tests/page-p-002-api.test.mjs` PASS — platform authority, confirmation, validation, idempotency and conflict behavior verified over HTTP.
- `pnpm.cmd exec playwright test --config playwright.page-p-002.config.ts` PASS (2 tests); screenshots and traces are retained here.
