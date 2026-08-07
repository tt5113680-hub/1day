# CHANNEL-001 acceptance

- `/ch/dashboard` renders persisted first-level channel merchant assignments, onboarding and service states, and 30-day activity from existing task or order records.
- Renewal opportunities are explicitly shown as evidence-based follow-up signals: inactive for 30 days or an existing high-risk tenant setting. The dashboard does not invent a contract date or claim a subscription expiry.
- `node --test tests/channel-001-api.test.mjs` verifies a persisted channel merchant assignment, unauthenticated rejection and the actual dashboard projection over HTTP/PostgreSQL.
- Playwright screenshots and traces cover authenticated desktop dashboard rendering and missing-session rejection.
