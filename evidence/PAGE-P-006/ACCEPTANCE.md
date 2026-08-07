# PAGE-P-006 acceptance

- `/p/templates` manages platform-owned template drafts, fixed modules, validated industry/scenario configuration, preview and versioned publication.
- Platform templates are isolated in the system tenant and require `platform.read` / `platform.manage`; the only allowed module types remain the CORE-008 fixed set, with no arbitrary executable configuration.
- `node --test tests/page-p-006-api.test.mjs` PASS: unauthenticated and non-system tenant access are rejected; fixed-module creation, idempotent replay, industry configuration, preview, version conflict, audit and Outbox persistence are verified over real HTTP/PostgreSQL.
- `pnpm.cmd exec playwright test --config playwright.page-p-006.config.ts` PASS (2 tests): platform draft save, preview, publication and missing-session rejection verified. Screenshots and traces are retained in this directory.
