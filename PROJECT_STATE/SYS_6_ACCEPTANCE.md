# SYS-6 Role IA / multi-product + data_scopes + write-path scopes

## Result

`SYS_6_MULTI_PRODUCT_PASS` + `SYS_6_DATA_SCOPES_PASS` + `SYS_6_WRITE_PATH_SCOPES_PASS` (local engineering). Not full Role matrix E2E across every controller. Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface            | Integration                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Contract           | Menu catalogs + data-scope helpers including `storeWriteAllows`                                      |
| API menu           | `GET /api/v1/me/menu?product=*` + Store Manager 门店                                                 |
| Data scopes        | Resolver merges `data_scopes` ∪ `store_managers`; assign/onboarding sync                             |
| Employee scope API | `managed-stores` + access gate                                                                       |
| Write-path scopes  | Redeem restricted by enrollment store scope; store managers can list/update assigned store commercial/links; assign-manager remains owner-only |
| Shells             | Platform/Employee DTO nav + role homes                                                               |

## Evidence

- `tests/menu-dto.vitest.ts` 5/5
- `tests/data-scope.vitest.ts` 4/4
- `tests/sys-6-menu-dto.test.mjs` 2/2
- `tests/sys-6-data-scopes.test.mjs` 1/1
- `tests/sys-6-write-path-scopes.test.mjs` 1/1
- `evidence/SYS-6/`

## Honest remainder

- Dedicated channel/circle permission packs still missing.
- Not every Management/Employee write controller is scope-gated yet.
- Store Manager content/scheduling write surfaces remain multi-week.
