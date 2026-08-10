# SYS-6 Role IA / multi-product menus + data_scopes (wave)

## Result

`SYS_6_MULTI_PRODUCT_PASS` + `SYS_6_DATA_SCOPES_PASS` (local engineering). Not full Role matrix E2E across every controller. Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface            | Integration                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Contract           | Platform/Channel/Circle/Employee catalogs; `homeHref` / `scopes` / `availableProducts`; data-scope helpers |
| API menu           | `GET /api/v1/me/menu?product=*` filters all products; Store Manager injects 门店 + store scopes      |
| Data scopes        | `DataScopeService` resolves `data_scopes` ∪ `store_managers`; assign/onboarding sync store scopes    |
| Employee scope API | `GET /api/v1/employee/managed-stores` + `.../:storeId/access` gate                                   |
| Platform shell     | DTO-driven `/p` `/ch` `/bc` nav + mode switcher; role home at `/`                                    |
| Employee shell     | Bottom nav from DTO; Store Manager home `/e/store` uses managed-stores API                           |

## Evidence

- `tests/menu-dto.vitest.ts` 5/5
- `tests/data-scope.vitest.ts` 3/3
- `tests/sys-6-menu-dto.test.mjs` 2/2
- `tests/sys-6-data-scopes.test.mjs` 1/1
- Workspace typecheck/build: contracts, api, employee-web
- `evidence/SYS-6/`

## Honest remainder

- Channel/Circle still mostly share platform permission codes (no dedicated channel.* pack membership).
- Store Manager home is read/scope-proof — scheduling/redeem/content write remain multi-week.
- Full ROLE_PRODUCT_MATRIX E2E and data_scopes on every Management/Employee write controller remain multi-week.
