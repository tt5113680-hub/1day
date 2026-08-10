# SYS-6 Role Matrix E2E — Store Manager package (slice 1)

## Result

`SYS_6_ROLE_MATRIX_STORE_MANAGER_PASS` (local engineering slice). Not full nine-role ROLE_PRODUCT_MATRIX. Not 全部商用. Not Tencent Cloud.

## Delivered

| Criterion (ROLE_PRODUCT_MATRIX §6) | Store Manager evidence |
| ---------------------------------- | ---------------------- |
| Server menu entry                  | Management keys: overview/stores/offers/memberships/content; Employee injects 门店 + `homeHref=/e/store` |
| Permission + scope driven          | `tenant.read` + store scopes; Management CRM (`customers`) no longer opens on `customer.read` alone |
| Real scoped writes                 | Catalog service/offer, membership grant, content placement on scoped store only |
| Denials                            | Cross-store writes 403; content create/approve, org create, RBAC create, workflow create 403 |
| Managed stores API                 | `GET /api/v1/employee/managed-stores` returns scoped store only |

## Menu IA fix in this slice

- `MANAGEMENT_MENU_CATALOG.customers` now requires `tenant.manage` or `customer.manage` (not bare `customer.read`), so Employee-facing `customer.read` does not leak into Management 客户资产.

## Evidence

- `tests/sys-6-role-matrix-store-manager.test.mjs` 1/1
- `tests/menu-dto.vitest.ts` 6/6
- `tests/sys-6-menu-dto.test.mjs` 2/2
- `evidence/SYS-6/`

## Honest remainder

- Tenant Manager vs Owner chrome, Channel/Circle/Platform role packages, Member Consumer journey, and full nine-role E2E remain multi-week.
