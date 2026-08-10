# SYS-6 Role IA / menu DTO SCAFFOLD ACCEPTANCE

## Result

`SYS_6_SCAFFOLD_PASS` (local engineering). Not full Role IA / role homes. Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface          | Integration                                                                           |
| ---------------- | ------------------------------------------------------------------------------------- |
| Contract         | `@oneday/contracts` `MenuDto` + `MANAGEMENT_MENU_CATALOG` + `filterMenuCatalog`       |
| API              | `GET /api/v1/me/menu?product=management` — role/permission resolved, catalog filtered |
| Management shell | Loads DTO into `AdminShell`; static catalog fail-open fallback                        |

## Evidence

- `tests/menu-dto.vitest.ts` 3/3
- `tests/sys-6-menu-dto.test.mjs` 1/1 (`tenant.manage` full vs `customer.read` subset)
- Workspace: format/lint/typecheck/build
- `evidence/SYS-6/`

## Honest remainder

- Platform / Channel / Circle / Employee shells still hardcoded.
- Store Manager / Channel / Circle homes and scope switcher not built.
- Role matrix E2E and data_scopes-driven queries remain multi-week.
