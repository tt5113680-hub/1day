# SYS-6 Role IA / multi-product menus + role homes (wave)

## Result

`SYS_6_MULTI_PRODUCT_PASS` (local engineering). Extends SYS-6 scaffold. Not full Role matrix E2E / data_scopes queries. Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface          | Integration                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Contract         | Platform/Channel/Circle/Employee catalogs; `homeHref` / `scopes` / `availableProducts` on `MenuDto` |
| API              | `GET /api/v1/me/menu?product=*` filters all products; Store Manager injects 门店 + store scopes      |
| Platform shell   | DTO-driven `/p` `/ch` `/bc` nav + mode switcher when multi-product available; role home at `/`       |
| Employee shell   | Bottom nav from DTO; Store Manager home `/e/store`; root redirects via `homeHref`                    |
| Management shell | Unchanged consumer (still DTO); richer MenuDto fields remain compatible                              |

## Evidence

- `tests/menu-dto.vitest.ts` 5/5
- `tests/sys-6-menu-dto.test.mjs` 2/2
- Workspace typecheck/build: contracts, api, platform-web, employee-web, management-web
- `evidence/SYS-6/`

## Honest remainder

- Channel/Circle still share platform permission codes (no dedicated channel.* pack / scoped membership).
- Store Manager home is read-only scope proof — scheduling/redeem/content write remain multi-week.
- Full ROLE_PRODUCT_MATRIX E2E and data_scopes-driven queries remain multi-week.
