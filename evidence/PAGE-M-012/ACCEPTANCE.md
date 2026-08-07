# PAGE-M-012 acceptance

- `/m/attribution` projects tenant-scoped first, current and final customer-source records with source metadata, contribution counts and evidence levels.
- Records provide a customer-chain deep link. Evidence levels distinguish source-only records, recorded contributions and confirmed contributions with evidence references.
- `node --test tests/page-m-012-api.test.mjs` PASS: unauthenticated, cross-tenant, role and evidence-level checks.
- `pnpm.cmd exec playwright test --config playwright.page-m-012.config.ts` PASS (2 tests): 1440px source-stage filter and unauthenticated recovery, with screenshots and traces in this directory.
