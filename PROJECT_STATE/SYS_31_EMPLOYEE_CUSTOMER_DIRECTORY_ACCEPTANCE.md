# SYS-31 Employee customer directory

## Result

`SYS_31_EMPLOYEE_CUSTOMER_DIRECTORY_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. Does **not** auto-sign product-owner UI acceptance.

## Delivered

| Surface | Change |
| ------- | ------ |
| API | `GET /api/v1/employee/customers` scoped list (ownership / task / contribution) |
| Employee `/e/customers` | Customer directory UI with link to 获客池 |
| Contracts | Menu「客户」→ `/e/customers` (leads remain at `/e/leads`) |

Detail route `/e/customers/[id]` unchanged. Same server-side scope rules as detail.

## Evidence

- `tests/sys-31-employee-customer-directory.test.mjs` 2/2
- `tests/menu-dto.vitest.ts` 16/16
- Playwright `playwright.sys-31-employee-customer-directory.config.ts` 1/1
- Screenshot `evidence/SYS-31/employee-customer-directory.png`

## Honest remainder

- Product-owner UI sign-off still human
- Full nine-role packages / free-form DAG remain deferred
- Not claimed as full commercial; Tencent Cloud out of scope (G)
