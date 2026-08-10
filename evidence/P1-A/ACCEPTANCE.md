# P1-A acceptance — membership ledger in Batch-4 rehearsal

- Gate: Phase-1 P1-A local commercial closed-loop re-verification
- Test: `node --test tests/batch-4-clean-tenant-rehearsal.test.mjs`
- Claim boundary: not 全部商用; not Tencent Cloud; no product-owner UI sign-off

## Membership chain asserted

1. Consumer enroll (idempotent)
2. Management grant ×2
3. Employee redeem → balance 1
4. Management ledger lists grant + redeem
5. Management revoke → balance 0
6. Consumer wallet reflects 0

## Honest boundary

Batch-4 remainder (consult/task/content/channel/isolation) unchanged. Public HTTPS deploy templates live under `infra/deploy/` for P1-C prep only (G still blocks live deploy).
