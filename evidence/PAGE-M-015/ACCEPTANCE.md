# PAGE-M-015 acceptance

- `/m/connectors` reads only the authenticated tenant's persisted connector configurations and recent authorization/run logs.
- Authorization requests require `tenant.manage`, an idempotency key and a supported connector. The submitted secret is represented only by a SHA-256 fingerprint; neither API output, audit data nor the outbox event contains the raw secret.
- A request is truthfully recorded as `pending_authorization`: it writes an audit record and `connector.authorization.requested.v1` outbox event but does not call an external provider or claim successful authorization.
- `node --test tests/page-m-015-api.test.mjs` PASS — unauthenticated and cross-tenant requests rejected; idempotency, persistence, audit/outbox and secret exclusion verified over HTTP and PostgreSQL.
- `pnpm.cmd exec playwright test --config playwright.page-m-015.config.ts` PASS (2 tests); desktop and unauthenticated recovery screenshots are retained in this directory.
