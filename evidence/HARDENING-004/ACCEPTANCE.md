# HARDENING-004 acceptance

- Implemented `pnpm db:recovery:clone`, a guarded PostgreSQL native-template recovery command. It accepts only a new `oneday_v3_test*` target, never replaces or deletes a database, and verifies counts for tenant records, operating configuration, connector configuration, and persisted evidence files.
- Real recovery drill executed from `oneday_v3_test` to `oneday_v3_test_recovery_1786139309`: tenants `614`, tenant operating settings `1`, connector configurations `2`, and evidence files `135` matched exactly. The command completed in approximately five seconds, establishing the observed controlled-environment RPO/RTO evidence.
- `docs/RELEASE_AND_RECOVERY.md` documents pre-release gates, health readiness, controlled migration rollback/forward repair, and the non-destructive recovery drill.
- Browser screenshot/accessibility gates are not applicable: this task delivers database/release operations only. The database readiness API remains covered by HARDENING-003.
