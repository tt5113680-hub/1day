# Pilot deployment guide

## Scope

This guide is for a controlled first-pilot environment. It is not an instruction to expose a development database or the repository's demonstration credentials to the public internet. Keep PostgreSQL, Redis, application secrets, and audit exports in the pilot operator's controlled network.

## Prerequisites

- Node.js 24 LTS and pnpm 10.
- Docker Compose for PostgreSQL 18 and Redis 8, or equivalent managed services controlled by the pilot operator.
- A fresh PostgreSQL database and a least-privilege application database user.
- Values for `DATABASE_URL`, `REDIS_URL`, `PORT`, `CORS_ORIGINS`, and a unique `AUTH_TOKEN_SECRET`; do not commit real values into this repository. In production the token secret must be at least 32 characters and may not be the retired development default.

## Controlled startup

1. Install the locked workspace dependencies with `pnpm.cmd install --frozen-lockfile`.
2. For local infrastructure, run `docker compose -f infra/docker/compose.yaml up -d postgres redis`.
3. Set `DATABASE_URL` to the controlled target and run `pnpm.cmd db:migrate`. Run `pnpm.cmd db:seed` only when demonstration data is intentionally required.
4. Supply `AUTH_TOKEN_SECRET` through the environment/secret store before starting the API. Missing, retired-default, or short production secrets make API startup fail closed. Start the API with `pnpm.cmd --filter @oneday/api dev` (or the containerized `api` service). The API listens on `PORT`, default `3001`; its ready endpoint is `GET /api/v1/health`.
5. Start only the web terminals and worker that the pilot needs. Configure `CORS_ORIGINS` to the exact pilot web origins; never use a permissive production CORS policy.

## Release go/no-go

Before handing over the environment, all of the following must be true:

- `GET /api/v1/health` returns HTTP 200 with `status: "ok"` and `database: "ready"`.
- Migrations have completed against the selected controlled database and no migration command reports a pending error.
- The pilot administrator has an individually issued credential; the local seed credential below is not enabled or shared.
- Tenant creation, staff permission assignment, audit review, and the four commercial MVP demonstration chains pass on the selected environment.
- Backup/recovery rehearsal is recorded using the guarded clone procedure in [RELEASE_AND_RECOVERY.md](RELEASE_AND_RECOVERY.md).

If readiness returns HTTP 503, the database is unavailable: do not open the pilot to users. Restore database connectivity, verify the same endpoint reports ready, and record the incident in the security-audit workflow.

## Configuration and secret handling

- Store real connection strings, signing material, external connector authorization, and operator credentials in the pilot secret store, not in source files, screenshots, tickets, or evidence committed to Git.
- Restrict PostgreSQL and Redis to the application network. Rotate any credential that has been copied into a terminal or shared channel.
- Use a unique database name per rehearsal. `pnpm.cmd db:rollback` is only for an isolated, non-shared rehearsal database; shared pilot databases use forward-only migration repair.
- The Docker Compose password `oneday_local_only` is local-development-only and must not be reused outside the controlled local setup.

## Support handoff

Record the deployed revision, database migration revision, environment owner, API readiness result, recovery-drill target, and the responsible pilot administrator. Retain audit records and outcome evidence according to the pilot agreement; do not export another tenant's data for troubleshooting.
