# evidence/SYS-6

- result: SYS_6_ROLE_MATRIX_STORE_MANAGER_PASS + SYS_6_ROLE_MATRIX_TENANT_OWNER_PASS + SYS_6_ROLE_MATRIX_NETWORK_PASS + SYS_6_ROLE_MATRIX_MEMBER_PASS
- http: `sys-6-role-matrix-store-manager` 1/1; `sys-6-role-matrix-tenant-owner` 1/1; `sys-6-role-matrix-network` 1/1; `sys-6-role-matrix-member-consumer` 1/1; `sys-6-network-packs` 1/1
- browser: Playwright `sys-6-role-matrix-member-consumer` 1/1; screenshots `member-profile-anonymous.png` / `member-profile-ready.png`
- menu: `menu-dto.vitest` 8/8; `sys-6-menu-dto` 2/2
- acceptance: Store Manager / Tenant Owner / Network / Member docs under `PROJECT_STATE/`
- migration: `054_channel_permissions` (`channel.read` / `channel.manage`)
- note: Not full nine-role matrix. Not claimed as full commercial.
