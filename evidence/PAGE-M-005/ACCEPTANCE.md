# PAGE-M-005 Acceptance Evidence

- Delivered `/m/workflows` as the management workflow center for persisted workflow templates, running instances, current responsible employees, pending approval steps and timeout exceptions.
- `GET /api/v1/management/workflows` requires `tenant.manage`, validates an optional instance-status filter, and scopes every definition, instance, step, employee and approval lookup by server-derived tenant ID.
- HTTP: `node --test tests/page-m-005-api.test.mjs` uses the built production API/PostgreSQL and verifies unauthenticated and cross-tenant rejection, invalid filtering, and real template/instance/approval aggregation.
- Browser: `pnpm.cmd exec playwright test --config playwright.page-m-005.config.ts` passes authenticated 1440px workflow review/filtering and no-session recovery. Screenshots: `management-workflows-desktop.png`, `management-workflows-forbidden.png`; traces are retained under `playwright-output/`.
- Visual review: template lifecycle, active/timed-out workload, pending approvals, owners and status remain visually distinct so the manager can locate the operational exception rather than a generic workflow count.
