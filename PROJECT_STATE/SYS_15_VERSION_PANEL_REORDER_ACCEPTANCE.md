# SYS-15 Version panel linear reorder (+ clone-publish)

## Result

`SYS_15_VERSION_PANEL_REORDER_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. **Not** a free-form drag graph editor.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `/m/workflows` version panel | 上移/下移 reorder local steps |
| Clone-publish | Persists panel order + conditions via existing version APIs |
| Honesty | Linear index moves only; no canvas drag |

## Evidence

- `tests/sys-15-version-panel-reorder.test.mjs` 1/1
- `tests/e2e/sys-15-version-panel-reorder.spec.ts` 1/1
- Screenshot: `evidence/SYS-15/version-panel-reorder.png`
- `evidence/SYS-15/`

## Honest remainder

Full free-form drag graph editor remains multi-week. Product-owner UI sign-off remains human. Not claimed as full commercial.
