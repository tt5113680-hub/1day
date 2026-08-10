# SYS-6 Role IA / multi-product + data_scopes + write-path + network packs + content placements + catalog + membership + workflow/org write + Store Manager matrix slice

## Result

`SYS_6_MULTI_PRODUCT_PASS` + `SYS_6_DATA_SCOPES_PASS` + `SYS_6_WRITE_PATH_SCOPES_PASS` + `SYS_6_NETWORK_PACKS_PASS` + `SYS_6_CONTENT_PLACEMENTS_PASS` + `SYS_6_CATALOG_SCOPES_PASS` + `SYS_6_MEMBERSHIP_SCOPES_PASS` + `SYS_6_WORKFLOW_ORG_WRITE_PASS` + `SYS_6_ROLE_MATRIX_STORE_MANAGER_PASS` (local engineering). Not full nine-role Role matrix E2E. Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface            | Integration                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Contract           | Menu catalogs + data-scope helpers including `storeWriteAllows` / `networkWriteAllows` / `networkListFilter` |
| API menu           | `GET /api/v1/me/menu?product=*` + Store Manager 门店/套餐/会员/内容 + channel/circle scope context labels |
| Data scopes        | Resolver merges `data_scopes` ∪ `store_managers`; channel/circle labels from platform tables; assign/onboarding sync |
| Employee scope API | `managed-stores` + access gate                                                                       |
| Write-path scopes  | Redeem restricted by enrollment store scope; store managers can list/update assigned store commercial/links; assign-manager remains owner-only |
| Network packs      | Channel/circle list + write APIs filter/deny by `data_scopes`; `platform.manage` unrestricted; unscoped legacy admins unchanged; circle dashboard accepts `circle.manage` |
| Content placements | Store managers list approved content + place on scoped stores; create/approve/distribute owner-only |
| Catalog scopes     | Store managers list/create/update services + offers only on scoped stores |
| Membership scopes  | Store managers list enrollments/benefits and grant only on scoped stores |
| Workflow/org write | Management overview accepts `workflow.read` / `organization.read` (not only `tenant.manage`); UI starts instances + decides approvals; org/merchant/store create; `workflow.manage`/`tenant.manage` may decide without being assignee |
| Store Manager matrix | Closed-loop menu+scope+writes+denials; Management customers requires `customer.manage`/`tenant.manage` |
| Shells             | Platform/Employee DTO nav + role homes                                                               |

## Evidence

- `tests/menu-dto.vitest.ts` 6/6
- `tests/data-scope.vitest.ts` 5/5
- `tests/sys-6-menu-dto.test.mjs` 2/2
- `tests/sys-6-data-scopes.test.mjs` 1/1
- `tests/sys-6-write-path-scopes.test.mjs` 1/1
- `tests/sys-6-network-packs.test.mjs` 1/1
- `tests/sys-6-content-placements.test.mjs` 1/1
- `tests/sys-6-catalog-scopes.test.mjs` 1/1
- `tests/sys-6-membership-scopes.test.mjs` 1/1
- `tests/sys-6-workflow-org-write.test.mjs` 1/1
- `tests/sys-6-role-matrix-store-manager.test.mjs` 1/1
- `tests/batch-2-offer-operations.test.mjs` 1/1
- `tests/circle-002-api.test.mjs` 1/1
- `tests/page-m-013-api.test.mjs` 1/1
- `tests/page-m-005-api.test.mjs` 1/1
- `evidence/SYS-6/`
- Store Manager slice: `PROJECT_STATE/SYS_6_ROLE_MATRIX_STORE_MANAGER_ACCEPTANCE.md`

## Honest remainder

- Full ROLE_PRODUCT_MATRIX E2E Member Consumer journey remains multi-week.
- Dedicated `circle.read` / `circle.display` / `provision.request` permission codes remain deferred (Circle uses `circle.manage`; Channel uses `channel.read`/`channel.manage`).
- Advanced workflow versioning (new draft versions / condition editors) remains deeper multi-week work; create+publish + start/decide + org create are wired.
