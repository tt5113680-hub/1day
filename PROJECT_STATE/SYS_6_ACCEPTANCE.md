# SYS-6 Role IA / multi-product + data_scopes + write-path + network packs

## Result

`SYS_6_MULTI_PRODUCT_PASS` + `SYS_6_DATA_SCOPES_PASS` + `SYS_6_WRITE_PATH_SCOPES_PASS` + `SYS_6_NETWORK_PACKS_PASS` (local engineering). Not full Role matrix E2E across every controller. Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface            | Integration                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Contract           | Menu catalogs + data-scope helpers including `storeWriteAllows` / `networkWriteAllows` / `networkListFilter` |
| API menu           | `GET /api/v1/me/menu?product=*` + Store Manager 门店 + channel/circle scope context labels           |
| Data scopes        | Resolver merges `data_scopes` ∪ `store_managers`; channel/circle labels from platform tables; assign/onboarding sync |
| Employee scope API | `managed-stores` + access gate                                                                       |
| Write-path scopes  | Redeem restricted by enrollment store scope; store managers can list/update assigned store commercial/links; assign-manager remains owner-only |
| Network packs      | Channel/circle list + write APIs filter/deny by `data_scopes`; `platform.manage` unrestricted; unscoped legacy admins unchanged; circle dashboard accepts `circle.manage` |
| Shells             | Platform/Employee DTO nav + role homes                                                               |

## Evidence

- `tests/menu-dto.vitest.ts` 6/6
- `tests/data-scope.vitest.ts` 5/5
- `tests/sys-6-menu-dto.test.mjs` 2/2
- `tests/sys-6-data-scopes.test.mjs` 1/1
- `tests/sys-6-write-path-scopes.test.mjs` 1/1
- `tests/sys-6-network-packs.test.mjs` 1/1
- `tests/circle-002-api.test.mjs` 1/1
- `evidence/SYS-6/`

## Honest remainder

- Dedicated `channel.read/manage` permission codes still deferred (packs reuse platform/circle.manage + scopes).
- Not every Management/Employee write controller is scope-gated yet.
- Store Manager content/scheduling write surfaces remain multi-week.
