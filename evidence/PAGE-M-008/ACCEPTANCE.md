# PAGE-M-008 acceptance

- `/m/organization-employees` reads tenant-scoped organizations, active/offboarded employees, invitations, pending task and customer handoff signals.
- Employee invitation and offboarding reuse CORE-002's idempotent and audited write models; offboarding risks remain visible after the status change.
- `node --test tests/page-m-008-api.test.mjs` PASS.
- `pnpm.cmd exec playwright test --config playwright.page-m-008.config.ts` PASS (2 tests).
