# evidence/SYS-6

- result: SYS_6_MULTI_PRODUCT_PASS + SYS_6_DATA_SCOPES_PASS
- endpoint: `GET /api/v1/me/menu?product=*`; `GET /api/v1/employee/managed-stores`; access gate
- unit: `tests/menu-dto.vitest.ts` 5/5; `tests/data-scope.vitest.ts` 3/3
- contract: `tests/sys-6-menu-dto.test.mjs` 2/2; `tests/sys-6-data-scopes.test.mjs` 1/1
- surfaces: Platform/Employee shells + Store Manager `/e/store` + data_scopes sync on manager assign/onboarding
- acceptance: `PROJECT_STATE/SYS_6_ACCEPTANCE.md`
- usage_warn_threshold: ≥90% (owner 2026-08-10)
- note: Not full cross-controller scope E2E. Not 全部商用.
