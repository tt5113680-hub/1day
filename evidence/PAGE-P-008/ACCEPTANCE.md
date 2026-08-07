# PAGE-P-008 acceptance

- `/p/security-audit` exposes platform-authorized, persisted risk signals for degraded connector health, privilege-change audit events and connector authorization anomalies. Signals are reviewable evidence, not an unverified security incident conclusion.
- Risk disposition is idempotent and versioned; it persists a platform security review together with an audit log and correlated Outbox event.
- `node --test tests/page-p-008-api.test.mjs` PASS: unauthenticated rejection, real connector-risk discovery, disposition replay, review persistence, audit and Outbox records verified over HTTP/PostgreSQL.
- `pnpm.cmd exec playwright test --config playwright.page-p-008.config.ts` PASS (2 tests): an authorized platform operator dispositions a visible risk and a missing session receives the forbidden state. Desktop screenshots and Playwright traces are retained in this directory.
