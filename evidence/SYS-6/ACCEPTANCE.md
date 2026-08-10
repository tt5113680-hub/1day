# SYS-6 evidence

- package: `@oneday/contracts` network scope helpers + Management menu offers for `tenant.read`
- endpoints: `/api/v1/channel/dashboard`; `/api/v1/circle/*`; `/api/v1/channel/merchant-onboardings*`; `/api/v1/management/content*`; `/api/v1/management/catalog*`; `/api/v1/me/menu`
- contract: `sys-6-menu-dto` 2/2; `sys-6-data-scopes` 1/1; `sys-6-write-path-scopes` 1/1; `sys-6-network-packs` 1/1; `sys-6-content-placements` 1/1; `sys-6-catalog-scopes` 1/1
- unit: `data-scope.vitest` 5/5; `menu-dto.vitest` 6/6
- regression: `circle-002-api` 1/1; `page-m-013-api` 1/1; `batch-2-offer-operations` 1/1
- api typecheck/build: PASS
- honest boundary: not full ROLE_PRODUCT_MATRIX E2E; not 全部商用; Tencent Cloud out of scope
