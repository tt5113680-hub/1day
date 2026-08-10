# P1-A Local commercial closed-loop re-rehearsal

## Result

`P1_A_COMMERCIAL_CLOSED_LOOP_PASS` (Phase-1 local slice). Not 全部商用. Not Tencent Cloud. Does **not** auto-sign product-owner UI acceptance.

## Delivered

Extended Batch-4 clean-tenant rehearsal to prove the full membership ledger chain after SYS-34:

| Step   | Surface    | Assertion                                     |
| ------ | ---------- | --------------------------------------------- |
| Enroll | Consumer   | `POST .../memberships/enroll` idempotent      |
| Grant  | Management | `POST .../grants` quantity 2                  |
| Redeem | Employee   | `POST .../redeem` balance → 1                 |
| Ledger | Management | `GET .../ledger` shows grant + redeem entries |
| Revoke | Management | `POST .../revokes` balance → 0                |
| Wallet | Consumer   | wallet read reflects revoke                   |

Existing Batch-4 chain (ONE-CODE → consult → task → follow-up → content placement → channel/circle discovery → isolation/suspend) unchanged.

## Evidence

- `tests/batch-4-clean-tenant-rehearsal.test.mjs` (extended membership ledger section)
- `evidence/P1-A/ACCEPTANCE.md`

## Honest remainder

- Product-owner UI sign-off still human (P1-D)
- P1-C public HTTPS blocked until owner lifts G + cloud inventory
- Not claimed as full commercial
