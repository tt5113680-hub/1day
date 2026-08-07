# CHANNEL-002 acceptance

- `/ch/merchants/new` creates a first-level channel merchant onboarding in one transaction: merchant tenant, organization, first store, administrator access, initial consumer template, commercial plan, channel association and an invitation-prepared delivery record.
- No external email is fabricated. Invitation remains `prepared` until an external delivery integration is authorized; delivery progress is explicitly recorded as pending, failed or delivered and can be retried with optimistic versioning.
- `node --test tests/channel-002-api.test.mjs` verifies unauthenticated rejection, validation, idempotent provisioning, persisted plan/channel relationship, audit/Outbox and failed-to-delivered recovery over HTTP/PostgreSQL.
- Playwright screenshots and traces cover authenticated browser provisioning/delivery and missing-session rejection.
