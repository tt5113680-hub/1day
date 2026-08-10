# SYS-29 AdminShell role-package nav groups

## Result

`SYS_29_ADMIN_NAV_GROUPS_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. Does **not** auto-sign product-owner UI acceptance.

## Delivered

| Surface | Change |
| ------- | ------ |
| Contracts | `MENU_GROUP_LABELS` + `groupMenuItems`; Management/Platform catalogs tagged with contiguous groups |
| `@oneday/ui` AdminShell | Renders nav section labels from `item.group` |
| Design tokens | `.od-admin-shell__nav-group*` styles |

Groups: operate / commerce / people / intents (Management); govern / network / intents (Platform). Store-manager chrome keeps operate+commerce only.

## Evidence

- `tests/sys-29-admin-nav-groups.test.mjs` 3/3
- `tests/menu-dto.vitest.ts` 14/14
- Playwright `playwright.sys-29-admin-nav-groups.config.ts` 1/1
- Screenshot `evidence/SYS-29/management-nav-groups.png`

## Honest remainder

- Full nine-role ROLE_PRODUCT_MATRIX packages remain multi-week
- Product-owner UI sign-off still human
- Not claimed as full commercial; Tencent Cloud out of scope (G)
