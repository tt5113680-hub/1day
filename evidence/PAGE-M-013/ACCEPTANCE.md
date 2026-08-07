# PAGE-M-013 acceptance

- `/m/content` reads and creates tenant-scoped content drafts through the management API.
- API approval is versioned; channel distribution creates a `pending_authorization` record and correlated Outbox event rather than fabricating third-party delivery.
- `node --test tests/page-m-013-api.test.mjs` PASS: unauthenticated, cross-tenant, creation, approval and pending-authorization distribution checks.
- `pnpm.cmd exec playwright test --config playwright.page-m-013.config.ts` PASS (2 tests): 1440px draft creation and unauthenticated recovery, with screenshots and traces in this directory.
