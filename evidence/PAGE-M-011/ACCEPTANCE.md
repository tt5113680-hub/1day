# PAGE-M-011 acceptance

- `/m/employee-process-performance` reads tenant-scoped employee task, follow-up, task-evidence and confirmed-contribution order signals through `tenant.manage` authorization.
- The page explicitly classifies contribution-linked orders as process context, not personal sales amount or a single performance conclusion; overdue and missing-follow-up signals generate reviewable coaching guidance.
- `node --test tests/page-m-011-api.test.mjs` PASS: unauthenticated, cross-tenant and multi-signal response checks.
- `pnpm.cmd exec playwright test --config playwright.page-m-011.config.ts` PASS (2 tests): 1440px process view and unauthenticated recovery, with screenshots and traces in this directory.
