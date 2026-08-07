# PAGE-M-014 acceptance

- `/m/page-builder` reads tenant-scoped persisted templates, previews their fixed modules in real time and sends versioned publish requests to CORE-008.
- The browser flow creates a template with only valid fixed modules, opens the persisted preview and captures desktop and unauthenticated recovery screenshots.
- `tests/core-008-e2e.test.mjs` remains the HTTP verification for draft, preview, publish, rollback, tenant isolation, audit and Outbox semantics.
- `pnpm.cmd exec playwright test --config playwright.page-m-014.config.ts` PASS (2 tests).
