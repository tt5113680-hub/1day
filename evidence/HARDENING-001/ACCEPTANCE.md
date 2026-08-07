# HARDENING-001 acceptance

- Every protected request now validates the JWT claims against its persisted `auth_sessions` record. The session must belong to the claimed user and tenant, remain active, unrevoked, unexpired, and undeleted; otherwise the API returns `401 AUTH_REQUIRED`.
- Tenant context still rejects a token/header tenant mismatch before authorization. A valid active session without the required permission remains a `403` authorization denial, preserving the distinction between authentication and RBAC failures.
- Contract coverage confirms that customer exports require `tenant.manage`, retain tenant and approved-status filters, emit an audit record, and set `X-Content-Type-Options: nosniff`.
- Contract coverage confirms that result evidence requires `evidence.read`, resolves content by evidence ID plus tenant, forces attachment download, and sets `X-Content-Type-Options: nosniff`. All private controller families are checked for server-side authorization guards.
- Runtime coverage: `tests/auth-e2e.test.mjs` verifies that logging out invalidates the replacement access token for `/api/v1/auth/context`; `tests/core-001-e2e.test.mjs` verifies an active session without RBAC rights receives `403`; `tests/hardening-001-security-contract.test.mjs` verifies controller/service protection contracts.
- Final quality gates passed: lint, format, 17-package typecheck, Vitest, serialized repository HTTP suite (151 tests), full build, database migration/seed, evidence contract check, and `git diff --check`.
