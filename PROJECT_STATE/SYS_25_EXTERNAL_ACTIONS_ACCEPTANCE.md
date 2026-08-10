# SYS-25 Generic external-actions catalog UX

## Result

`SYS_25_EXTERNAL_ACTIONS_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `MANAGEMENT_MENU_CATALOG.external-actions` | `/m/external-actions` · `外链动作目录` · `tenant.manage` / `action.read` / `action.manage` |
| Management `/m/external-actions` | List + create tenant `external-actions` via existing API (link / mini_program / platform_entry) |
| Honesty | Copy states no fake Meituan/Douyin delivery; store binding remains on `/m/stores` |

## Evidence

- `tests/menu-dto.vitest.ts` 10/10
- `tests/sys-25-external-actions.test.mjs` 1/1
- Playwright `playwright.sys-25-external-actions.config.ts` 1/1
- Screenshot: `evidence/SYS-25/external-actions-catalog.png`

## Honest remainder

Closed by SYS-32 (`PUT` update + `DELETE` soft-archive). Product-owner UI sign-off remains human. Free-form DAG deferred. Not claimed as full commercial.
