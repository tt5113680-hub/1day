# HARDENING-002 acceptance

- The fixed commercial demo data drives four end-to-end HTTP chains: consumer scene action to task, result evidence and management dashboard; lead assignment to employee follow-up, two confirmed orders and repurchase operations; fixed business-circle approval, merchant display and customer attribution; channel merchant onboarding to tenant-admin employee invitation and role permission configuration.
- Channel onboarding now grants the newly created tenant administrator both `tenant.manage` and `employee.manage`. This is the minimum capability required for a merchant to create staff immediately after onboarding while role changes remain confirmation-protected and auditable.
- `tests/hardening-002-e2e.test.mjs` runs all four chains through a built NestJS/Fastify API and PostgreSQL. It uses uniquely named fixed fixtures, validates persisted results, and does not claim third-party delivery.
- `playwright.hardening-002.config.ts` and `tests/e2e/hardening-002.spec.ts` run consumer, employee, management and channel terminals against one API session. Screenshots are stored in this directory and the Playwright trace is under `playwright-output/`.
- The Next.js development-server cross-origin resource warnings did not affect browser navigation, live API requests, screenshots or the retained trace; they remain a known non-production development observation.
