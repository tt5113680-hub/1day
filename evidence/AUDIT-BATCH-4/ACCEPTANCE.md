# AUDIT-BATCH-4 acceptance - pool, rate limiting and transport safety

## Delivered behavior

- All API services use `createApiPool()`: one bounded PostgreSQL pool per API process, with application-root ownership and graceful close at shutdown. No service-level `new Pool` remains.
- Migration `044_rate_limit_windows` persists atomic, per-window request counters. Login/refresh and public consumer writes are separately limited; the stored subject is a SHA-256 hash, never a raw client address.
- CORS accepts only validated explicit HTTP(S) origins and now includes the required `DELETE` session-revocation method. Correlation IDs are returned in `x-request-id`.
- Production fails closed without explicit CORS, an HTTPS public URL, declared TLS termination, trusted proxy handling, and a configured shared edge limiter. The database limiter remains defense in depth for every replica.

## Real process acceptance

`node --test tests/audit-batch-4-security.test.mjs` - PASS (1/1)

The test builds and launches actual API processes against `oneday_v3_test`, then verifies:

1. health response request-ID correlation and exact-origin CORS DELETE preflight;
2. database-backed authentication and public-write 429 limits;
3. missing production CORS and non-HTTPS public address each fail startup;
4. a complete production transport/edge configuration reaches readiness.

## Quality gates

- Database migration `044_rate_limit_windows:Up` applied to the isolated test database.
- `node --test tests/audit-batch-4-security.test.mjs` - PASS (1/1).
- `pnpm.cmd test` - PASS (180 repository tests; 18 package test tasks).
- `pnpm.cmd format:check` - PASS.
- `pnpm.cmd lint` - PASS.
- `pnpm.cmd typecheck` - PASS (18 packages).
- `pnpm.cmd build` - PASS (18 packages).
- `pnpm.cmd evidence:check` - PASS (71 checks).
