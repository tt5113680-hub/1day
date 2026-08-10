# SYS-23 Management attribution menu discoverability

## Result

`SYS_23_ATTRIBUTION_MENU_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `MANAGEMENT_MENU_CATALOG.attribution` | `/m/attribution` · label `来源归因` · `requireAny: ['tenant.manage']` (matches Management attribution API) |
| Management AdminShell | Fallback catalog + `GET /api/v1/me/menu?product=management` both surface the nav item for Tenant Manager/Owner |
| Honesty | Store Manager (`tenant.read`) and bare `customer.read` do **not** see attribution; no second API invented |

## Evidence

- `tests/menu-dto.vitest.ts` (includes attribution filter cases) 9/9
- `tests/sys-23-attribution-menu.test.mjs` 1/1
- Playwright `playwright.sys-23-attribution-menu.config.ts` 1/1
- Screenshots: `evidence/SYS-23/management-attribution-nav.png`, `evidence/SYS-23/management-attribution-from-nav.png`

## Honest remainder

Customer merge/transfer UX and generic external-actions CRUD remain open FE islands. Product-owner UI sign-off remains human. Free-form DAG deferred. Not claimed as full commercial.
