# PAGE-M-009 acceptance

- `/m/roles-permissions` reads tenant-scoped role templates, effective permission codes and membership impact counts.
- Role updates remain server-controlled by CORE-003: reason, optimistic version, confirmation, audit and permission change confirmation are required.
- `node --test tests/page-m-009-api.test.mjs` PASS.
- `pnpm.cmd exec playwright test --config playwright.page-m-009.config.ts` PASS (2 tests).
