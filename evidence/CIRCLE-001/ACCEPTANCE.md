# CIRCLE-001 acceptance

- `/bc/dashboard` presents only platform-owned, fixed business circles and approved merchant memberships. It does not expose a tenant's customer or operational records directly.
- Merchant benefits are sourced from the persisted fixed-circle association; approved content, consumer action events and confirmed orders are aggregate projections from each approved merchant tenant.
- `node --test tests/circle-001-api.test.mjs` verifies unauthenticated rejection and that only an approved platform-circle merchant association appears over HTTP/PostgreSQL.
- Playwright screenshots and traces cover the authenticated desktop operational view and missing-session rejection.
