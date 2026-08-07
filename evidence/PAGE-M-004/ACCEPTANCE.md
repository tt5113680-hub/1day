# PAGE-M-004 Acceptance Evidence

- Delivered `/m/customers/[id]` as the management customer-chain view: minimized customer identity, source, contribution, ownership, ownership approvals, order/evidence receipts, employee tasks, anomalies and a persisted audit-derived timeline all come from tenant-scoped PostgreSQL records.
- The endpoint requires `tenant.manage`, validates the customer ID, scopes every source query by the server-derived tenant ID, and exposes only masked identity values. It does not mutate customer state.
- HTTP: `node --test tests/page-m-004-api.test.mjs` starts the built production API and verifies unauthenticated denial, cross-tenant denial, invalid-ID validation, customer chain aggregation and identity-hash non-disclosure.
- Browser: `pnpm.cmd exec playwright test --config playwright.page-m-004.config.ts` passes two 1440px flows: asset-list-to-detail navigation and no-session recovery. Screenshots: `management-customer-detail-desktop.png`, `management-customer-detail-forbidden.png`; trace output is retained under `playwright-output/`.
- Visual review: management users can distinguish ownership/approval exceptions, order evidence, active work and auditable history without treating a missing owner or a pending transfer as a completed state.
