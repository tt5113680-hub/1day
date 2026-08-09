# BATCH-4 acceptance — clean-tenant commercial rehearsal

## Result

`BATCH_4_PASS` (technical rehearsal). See `PROJECT_STATE/BATCH_4_ACCEPTANCE.md`.

## Scope

Fresh tenant provisioned from zero on the isolated `oneday_v3_test` database. No shared H-002/commercial-simulation fixture repair.

## Verified commands

1. `pnpm --filter @oneday/api build`
2. `DATABASE_URL=postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test ONEDAY_ALLOW_TEST_DATABASE=1 pnpm db:test:prepare`
3. `DATABASE_URL=postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test pnpm --filter @oneday/database seed`
4. `node --test --test-concurrency=1 tests/batch-4-clean-tenant-rehearsal.test.mjs` — PASS (1/1)
5. `node --test --test-concurrency=1 tests/circle-002-api.test.mjs` — PASS (1/1)
6. `npx playwright test --config=playwright.batch-4-clean-tenant.config.ts` — PASS (1/1)

## Browser evidence

- `consumer-storefront.png` — published Storefront entry after clean provisioning
- `consumer-enrollment.png` — consented Consumer membership enrollment
- `employee-redemption.png` — Employee benefit redemption on workbench
- `management-outcome.png` — Management dashboard after enrollment/redemption
- `consumer-discovery.png` — approved Platform channel/circle projected to Consumer discovery

## Covered chain

1. Platform one-click READY + ONE-CODE + published Storefront + seeded content placement
2. Consumer public read, enrollment, share-code action → Employee follow-up/complete → Management customer trail
3. Management content approve/place → Consumer store
4. Platform channel/circle approve → Consumer discovery; second tenant isolated
5. Tenant suspend/resume → session denial + public hide, then recovery login
