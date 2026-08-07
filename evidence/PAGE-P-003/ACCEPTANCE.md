# PAGE-P-003 acceptance

- `/p/tenants/new` creates a tenant, organization, merchant, first store, administrator membership/role and starter consumer template in one PostgreSQL transaction.
- The platform-scoped endpoint requires `platform.manage`, validates the request, derives no credentials itself, and persists only a scrypt hash of the operator-supplied administrator password.
- The same idempotency key returns the original result; an unsuccessful transaction rolls back rather than leaving a partially provisioned tenant.
- `node --test tests/page-p-003-api.test.mjs` PASS: authenticated HTTP creation, validation, idempotency, administrator login, and persisted organization/store/template/RBAC/audit/Outbox/idempotency records were verified.
- `pnpm.cmd exec playwright test --config playwright.page-p-003.config.ts` PASS (2 tests): a platform administrator completed onboarding and a missing session was rejected. Screenshots and traces are retained in this directory.
