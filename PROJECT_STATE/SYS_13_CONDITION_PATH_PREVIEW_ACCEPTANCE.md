# SYS-13 Condition path preview (+ @oneday/workflows)

## Result

`SYS_13_CONDITION_PATH_PREVIEW_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. **Not** a free-form drag graph editor.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `@oneday/workflows` | `collectConditionKeys` + `previewConditionPath` |
| `/m/workflows` version panel | Sample context toggles; nodes marked 将执行 / 将跳过 |
| Honesty | Linear order fixed; preview does not mutate published definitions |

## Evidence

- `tests/sys-13-condition-path-preview.test.mjs` 1/1
- `tests/e2e/sys-13-condition-path-preview.spec.ts` 1/1
- Screenshot: `evidence/SYS-13/condition-path-preview.png`
- `evidence/SYS-13/`

## Honest remainder

Full free-form drag graph editor remains multi-week. Product-owner UI sign-off remains human. Not claimed as full commercial.
