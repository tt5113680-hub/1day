# evidence/SYS-6

- result: SYS_6_MULTI_PRODUCT_PASS + SYS_6_DATA_SCOPES_PASS + SYS_6_WRITE_PATH_SCOPES_PASS
- endpoints: `/api/v1/me/menu`; `/api/v1/employee/managed-stores`; scoped redeem; scoped management store commercial/list
- unit: `menu-dto.vitest` 5/5; `data-scope.vitest` 4/4
- contract: `sys-6-menu-dto` 2/2; `sys-6-data-scopes` 1/1; `sys-6-write-path-scopes` 1/1
- acceptance: `PROJECT_STATE/SYS_6_ACCEPTANCE.md`
- usage_warn_threshold: ≥90%
- note: Not full cross-controller scope E2E. Not 全部商用.
