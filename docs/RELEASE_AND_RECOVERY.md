# Release and recovery runbook

## Scope and safety

This runbook is restricted to local or explicitly controlled PostgreSQL environments. It never overwrites a database and the recovery clone command only accepts database names matching `oneday_v3_test*`.

## Release rehearsal

1. Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test`, and `pnpm build`.
2. Set `DATABASE_URL` to the controlled target, then run `pnpm db:migrate` and `pnpm db:seed` where seed data is appropriate.
3. Probe `GET /api/v1/health`; release readiness requires `status: ok` and `database: ready`.
4. If a release needs a controlled schema reversal, use `pnpm db:rollback` only on a non-shared local/recovery database, then use `pnpm db:repair` to rehearse forward repair. Shared environments use forward-only migrations.

## Recovery rehearsal

1. Point `DATABASE_URL` at a controlled test source database such as `oneday_v3_test`.
2. Set a new, unused `ONEDAY_RECOVERY_TARGET` matching `oneday_v3_test_recovery_<suffix>`.
3. Run `pnpm db:recovery:clone`.
4. Confirm the emitted JSON reports matching counts for tenants, tenant operating settings, connector configurations, and evidence files.
5. Probe the recovered database with the normal migration CLI and API readiness before using it for any further controlled rehearsal.

The recovery clone is intentionally retained for manual inspection; the command never drops, replaces, or cleans a database. The observed RPO is the snapshot start time and the observed RTO is the measured clone-and-verify duration recorded in task evidence.
