# SYS-6 Role Matrix E2E — Tenant Manager vs Owner chrome (slice 2)

## Result

`SYS_6_ROLE_MATRIX_TENANT_OWNER_PASS` (local engineering slice). Not full nine-role matrix. Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| Menu | `roles` / `settings` require `tenant.manage` **and** `organization.manage` (Owner chrome) |
| APIs | Management roles-permissions + settings + RBAC create/change require the same Owner pair |
| Tenant Manager | Keeps operating menus (customers/workflows/org/page-builder/…) without roles/settings; write denials 403 |
| Auth helper | `AuthorizationService.requireAll` |

## Evidence

- `tests/sys-6-role-matrix-tenant-owner.test.mjs` 1/1
- `tests/menu-dto.vitest.ts` 7/7
- `tests/sys-6-menu-dto.test.mjs` 2/2
- `tests/sys-4-rbac-role-create.test.mjs` 1/1
- `evidence/SYS-6/`

## Honest remainder

Channel / Circle / Platform / Member packages and dedicated `role.manage` permission code remain multi-week. Owner proxy today is `organization.manage` per frozen matrix Owner package.
