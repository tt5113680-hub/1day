# PAGE-M-010 acceptance

- `/m/permission-audit` reads only the current tenant's persisted `audit_logs` through a `tenant.manage`-protected API.
- Records can be filtered as permission changes, exports or risk signals. Risk signals distinguish high-privilege expansion from unattributed privileged activity; they are presented for review rather than claimed as confirmed violations.
- Every displayed record retains its action, actor label, resource, creation time, correlation ID and trace ID. Permission-related evidence JSON is exposed only inside the tenant-scoped management view.
- `node --test tests/page-m-010-api.test.mjs` PASS: unauthenticated, invalid-filter, cross-tenant, tenant-scoped change/export/risk and evidence checks.
- `pnpm.cmd exec playwright test --config playwright.page-m-010.config.ts` PASS (2 tests): 1440px filter/evidence workflow and unauthenticated recovery, with screenshots and trace output in this directory.
