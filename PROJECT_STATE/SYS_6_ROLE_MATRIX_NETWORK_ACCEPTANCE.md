# SYS-6 Role Matrix E2E — Channel / Circle / Platform packages (slice 3)

## Result

`SYS_6_ROLE_MATRIX_NETWORK_PASS` (local engineering slice). Not full nine-role matrix. Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| Permissions | Migration `054_channel_permissions` adds `channel.read` / `channel.manage`; system role seeded |
| Menu | Channel catalog accepts channel.* or platform.*; `resolveAvailableProducts` isolates channel-only / circle-only from Platform chrome |
| Channel APIs | Dashboard/list accept channel.read/manage; writes require channel.manage or platform.manage + data_scopes |
| Circle | Existing circle.manage + scopes; platform-approve remains platform.manage-only |
| Platform | platform.read/manage keeps tenants + unrestricted network lists |
| Denials | Channel-only: no platform tenants / suspend / circle dashboard. Circle-only: no platform tenants / channel dashboard / cross-circle invite |
| Provisioning | Tenant Owner / Store Manager permission grants exclude `channel.*` |

## Evidence

- `tests/sys-6-role-matrix-network.test.mjs` 1/1
- `tests/sys-6-network-packs.test.mjs` 1/1
- `tests/sys-6-menu-dto.test.mjs` 2/2
- `tests/menu-dto.vitest.ts` 8/8
- `tests/sys-6-role-matrix-store-manager.test.mjs` 1/1
- `tests/sys-6-role-matrix-tenant-owner.test.mjs` 1/1
- `evidence/SYS-6/`

## Honest remainder

Member Consumer journey, dedicated `circle.read`/`circle.display`/`provision.request` codes, and full nine-role E2E remain multi-week. Not claimed as full commercial.
