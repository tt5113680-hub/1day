# PAGE-M-002 Acceptance Evidence

- Delivered `/m/funnels/[id]` for tenant-scoped source-to-repurchase analysis: source, visit, lead, follow-up, deal and repurchase stages are visible in a desktop management funnel.
- Confirmed versus inferred: source records, deduplicated leads, task-backed follow-ups, active-order deals and multi-order repurchases are confirmed PostgreSQL outcomes. Visit has no persisted customer-to-source association in the current MVP schema, so it is explicitly rendered as inferred/unconfirmed and excluded from conversion rates.
- Data scope: `GET /api/v1/management/funnels/:id` resolves `tenant.manage` server-side, validates the funnel/source ID, scopes every source, customer, task and order subquery by `tenant_id`, and requires an `x-request-id`.
- HTTP: `node --test tests/page-m-002-api.test.mjs` starts the built production API against PostgreSQL. It covers unauthenticated and cross-tenant rejection, invalid ID validation, persisted cohort aggregation, follow-up/repurchase outcomes and the explicit inferred visit stage.
- Browser: `pnpm.cmd exec playwright test --config playwright.page-m-002.config.ts` passes two 1440px flows: authenticated confirmed/inferred funnel rendering and no-session recovery. Screenshots: `management-funnel-desktop.png`, `management-funnel-forbidden.png`; traces are retained under `playwright-output/`.
- Visual review: six comparable desktop cards keep the result type, conversion treatment and definition visible, so a manager can distinguish measurable outcomes from unavailable attribution evidence at a glance.
