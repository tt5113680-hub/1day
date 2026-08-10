# SYS-34 Management membership ledger + revoke

## Result

`SYS_34_MEMBERSHIP_LEDGER_PASS` (local engineering slice / Phase-1 P1-A). Not 全部商用. Not Tencent Cloud. Does **not** auto-sign product-owner UI acceptance.

## Delivered

| Surface | Change |
| ------- | ------ |
| API | `GET /api/v1/management/memberships/:id/ledger` balances + timeline |
| API | `POST /api/v1/management/memberships/:id/revokes` soft-deduct via ledger `entry_type=revoke` |
| Management `/m/memberships` | Timeline panel with balances, grant buttons, revoke CTA |

## Evidence

- `tests/sys-34-membership-ledger.test.mjs` 1/1
- Playwright `playwright.sys-34-membership-ledger.config.ts` 1/1
- Screenshot `evidence/SYS-34/membership-ledger-timeline.png`

## Honest remainder

- Product-owner UI sign-off still human
- P1-C public HTTPS blocked until owner lifts G + cloud inventory
- Full nine-role packages / free-form DAG deferred
- Not claimed as full commercial
