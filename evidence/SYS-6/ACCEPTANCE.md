# evidence/SYS-6

- result: SYS_6_ROLE_MATRIX_STORE_MANAGER_PASS (after workflow/org write + membership/catalog/content scopes)
- http: `tests/sys-6-role-matrix-store-manager.test.mjs` 1/1
- menu: `tests/menu-dto.vitest.ts` 6/6; `tests/sys-6-menu-dto.test.mjs` 2/2
- acceptance: `PROJECT_STATE/SYS_6_ROLE_MATRIX_STORE_MANAGER_ACCEPTANCE.md`, `PROJECT_STATE/SYS_6_ACCEPTANCE.md`
- note: Slice 1 only (Store Manager). Not full Role matrix. Not claimed as full commercial.
