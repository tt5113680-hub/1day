# PAGE-P-001 acceptance

- `/p/dashboard` exposes global tenant, channel, active-tenant, pending-event, risk and database availability signals from PostgreSQL records.
- The endpoint requires `platform.read` on an active membership in the system tenant; it does not accept tenant-manager permission as a substitute for platform authority.
- `node --test tests/page-p-001-api.test.mjs` PASS — unauthenticated access is rejected and platform-scoped global data is returned to the seeded platform administrator.
- `pnpm.cmd exec playwright test --config playwright.page-p-001.config.ts` PASS (2 tests); desktop and unauthenticated screenshots are retained in this directory.
