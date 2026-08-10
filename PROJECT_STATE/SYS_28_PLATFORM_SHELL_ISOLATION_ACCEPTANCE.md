# SYS-28 Platform shell product isolation

## Result

`SYS_28_PLATFORM_SHELL_ISOLATION_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. Does **not** auto-sign product-owner UI acceptance.

## Delivered

| Surface | Change |
| ------- | ------ |
| Contracts | `resolvePlatformShellAccess` + `shellModeAllows` |
| Platform shell | Channel/circle-only operators redirected off `/p/*` to preferred home |
| Platform role home | Preferred shell home from permission set |
| Product home | Honest boundary copy when platform governance is unavailable |

No second API. No page-level patches. Free-form DAG still deferred.

## Evidence

- `tests/sys-28-platform-shell-isolation.test.mjs` 3/3
- `tests/menu-dto.vitest.ts` 13/13
- Playwright `playwright.sys-28-platform-shell-isolation.config.ts` 1/1
- Screenshot `evidence/SYS-28/channel-only-redirect.png`

## Honest remainder

- Full nine-role ROLE_PRODUCT_MATRIX packages remain multi-week
- Product-owner UI sign-off still human
- Not claimed as full commercial; Tencent Cloud out of scope (G)
