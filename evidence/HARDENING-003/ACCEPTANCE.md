# HARDENING-003 acceptance

- `/api/v1/health` is now a bounded PostgreSQL readiness probe, not a static liveness response. A responsive database returns `200` with `database: ready`; a refused database returns `503` with `database: unavailable` and never reports the API ready.
- The probe uses a 1.5-second connection and query bound, so an unavailable dependency cannot indefinitely consume the deployment health-check path.
- `tests/hardening-003-reliability.test.mjs` starts a normal API process and a separate API process with a refused database connection. It verifies both readiness outcomes through real HTTP.
- The same suite verifies a connector transitions from `unavailable` to `healthy` through versioned, idempotent observations, preserving ordered health logs and the existing audited Outbox write path.
- No end-user UI is introduced by this infrastructure hardening task; browser screenshot/accessibility gates are not applicable. Existing platform connector UI continues to render persisted recovery state.
