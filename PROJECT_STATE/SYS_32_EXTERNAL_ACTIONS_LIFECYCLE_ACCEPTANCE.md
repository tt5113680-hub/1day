# SYS-32 External-actions lifecycle (update + archive)

## Result

`SYS_32_EXTERNAL_ACTIONS_LIFECYCLE_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. Does **not** auto-sign product-owner UI acceptance.

## Delivered

| Surface | Change |
| ------- | ------ |
| API | `PUT /api/v1/external-actions/:id` updates name + type-specific fields with optimistic `version` |
| API | `DELETE /api/v1/external-actions/:id` soft-archives (`status=archived`, `deleted_at`, frees `code` for recreate) |
| Management `/m/external-actions` | Per-card 编辑 / 归档 against the same APIs; code + actionType stay immutable |

## Evidence

- `tests/sys-32-external-actions-lifecycle.test.mjs` 1/1
- Playwright `playwright.sys-32-external-actions-lifecycle.config.ts` 1/1
- Screenshot `evidence/SYS-32/external-actions-lifecycle.png`

## Honest remainder

- Product-owner UI sign-off still human
- Store binding enable/disable remains on `/m/stores`
- Full nine-role packages / free-form DAG remain deferred
- Not claimed as full commercial; Tencent Cloud out of scope (G)
