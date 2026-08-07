# PAGE-M-007 acceptance

- `/m/stores` reads tenant-scoped persisted store status, managers, configured entry actions, active services, 30-day consumer entry opens and organization-scoped open tasks.
- Manager assignment is version-protected and writes audit and correlated Outbox records.
- `node --test tests/page-m-007-api.test.mjs` PASS.
- `pnpm.cmd exec playwright test --config playwright.page-m-007.config.ts` PASS (2 tests).
- Screenshots and Playwright traces are retained in this directory.
