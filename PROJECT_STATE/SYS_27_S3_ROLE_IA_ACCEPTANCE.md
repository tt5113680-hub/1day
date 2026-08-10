# SYS-27 S3 Role×IA depth — Employee store-manager chrome + Platform product homes

## Result

`SYS_27_S3_ROLE_IA_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. Does **not** auto-sign product-owner UI acceptance.

## Delivered

| Surface | Change |
| ------- | ------ |
| Contracts | `STORE_MANAGER_PACKAGE_ACTIONS` + `PLATFORM_PRODUCT_HOMES` |
| Employee | Desktop side nav ≥700px from menu DTO; store-manager mode label |
| Employee `/e/store` | Store Manager capability package deep-links (tasks/leads/redeem/share) |
| Employee workbench | Discoverability link to `/e/memberships` (SYS-33 first-class redeem) |
| Platform shell | Product switcher chrome (platform/channel/circle) |
| Platform dashboards | Role product home strip with scopes + CTAs on `/p` `/ch` `/bc` |

No second API. No page-level cosmetic patches. Free-form DAG still deferred.

## Evidence

- `tests/sys-27-s3-role-ia.test.mjs` 2/2
- `tests/menu-dto.vitest.ts` 12/12
- Playwright `playwright.sys-27-s3-role-ia.config.ts` 1/1
- Screenshots under `evidence/SYS-27/`

## Honest remainder

- Full nine-role ROLE_PRODUCT_MATRIX packages remain multi-week
- Product-owner UI sign-off still human (do not auto-PASS)
- Not claimed as full commercial; Tencent Cloud out of scope (G)
