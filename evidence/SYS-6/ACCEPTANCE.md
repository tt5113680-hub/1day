# evidence/SYS-6

- result: SYS_6_MULTI_PRODUCT_PASS
- endpoint: `GET /api/v1/me/menu?product=management|platform|channel|circle|employee`
- unit: `tests/menu-dto.vitest.ts` 5/5
- contract: `tests/sys-6-menu-dto.test.mjs` 2/2
- surfaces: Platform/Employee shells + Store Manager `/e/store` + Platform/Employee role-home redirects
- acceptance: `PROJECT_STATE/SYS_6_ACCEPTANCE.md`
- note: Multi-product menus + role-home scaffold. Full role matrix E2E / data_scopes remain. Not 全部商用.
