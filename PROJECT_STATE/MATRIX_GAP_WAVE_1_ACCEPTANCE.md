# MATRIX GAP CLOSEOUT — Wave 1 ACCEPTANCE

## Result

`MATRIX_GAP_WAVE_1_PASS` (systemic close-out of SY/WO/RC/concurrency gaps; not full matrix green)

## Delivered

### MG-A Sync foundation (SY-01 / SY-02)

- Migration `053_sync_gateway`: `sync_notifications` + `tenants.auth_epoch`
- Worker projects outbox events into tenant-scoped sync topics via `createSyncNotificationHandler`
- API:
  - `GET /api/v1/sync/changes` (ETag / 304, 30s poll hint)
  - `GET /api/v1/sync/stream` (SSE)
  - `GET /api/v1/public/sync/storefront` (publishedVersion ETag)
- Tenant suspend bumps `auth_epoch` and emits `tenant.lifecycle.changed.v1`

### MG-B Concurrent harness

- TP-02 concurrent slug conflict → single tenant, no non-terminal orphan runs
- MB-02 concurrent redeem → one success, balance 0
- SF-01 concurrent publish/read → Consumer never sees draft/half modules

### MG-C Worker DLQ (WO-02)

- After `OUTBOX_MAX_ATTEMPTS` (8), status becomes `needs_attention`
- `replayOutboxEvent` + Platform `GET/POST .../platform/outbox/...`

### MG-D Recovery (RC-01)

- Recovery clone count verification now includes `tenant_provisioning_runs`, `storefront_bindings`, `member_benefit_ledger`, `outbox_events`

## Evidence commands

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
node --test --test-concurrency=1 tests/matrix-sync-gateway.test.mjs tests/matrix-concurrent-correctness.test.mjs tests/matrix-worker-dead-letter.test.mjs tests/audit-batch-3-worker.test.mjs tests/hardening-004-recovery-contract.test.mjs
pnpm test
pnpm evidence:check
```

## Honest remainder

Full P0/P1 matrix is not green. See `PROJECT_STATE/MATRIX_GAP_INVENTORY.md`. Next: MG-E isolation contracts and remaining PARTIAL P0 evidence packs. No page-level patches. Tencent Cloud out of scope.
