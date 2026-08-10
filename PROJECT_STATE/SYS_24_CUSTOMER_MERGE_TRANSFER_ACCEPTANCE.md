# SYS-24 Customer merge / transfer UX

## Result

`SYS_24_CUSTOMER_MERGE_TRANSFER_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| Management `/m/customers/[id]` | Write UX for ownership transfer request, pending approve, and merge-into-target |
| Detail DTO | Exposes `customer.version` + `mergedIntoId`; merged archives are read-only with link to target |
| APIs used (no second API) | `POST /customers/:id/ownership-transfers`, `POST /ownership-transfers/:id/approve`, `POST /customers/:id/merge`, assignees list |

## Evidence

- `tests/sys-24-customer-merge-transfer.test.mjs` 1/1
- Playwright `playwright.sys-24-customer-merge-transfer.config.ts` 1/1
- Screenshots under `evidence/SYS-24/`

## Honest remainder

Generic external-actions CRUD remains an open FE island. Product-owner UI sign-off remains human. Free-form DAG deferred. Not claimed as full commercial.
