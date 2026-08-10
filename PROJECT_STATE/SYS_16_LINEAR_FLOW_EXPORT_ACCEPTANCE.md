# SYS-16 Linear flow JSON export (+ @oneday/workflows)

## Result

`SYS_16_LINEAR_FLOW_EXPORT_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. **Not** a free-form drag graph editor.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `@oneday/workflows` | `serializeConditionBranchFlow` with `editor: not_free_form_drag` |
| `/m/workflows` version panel | 「复制线性流程 JSON」clipboard export |
| Honesty | Explicit non-canvas document; no positions/canvas fields |

## Evidence

- `tests/sys-16-linear-flow-export.test.mjs` 1/1
- `tests/e2e/sys-16-linear-flow-export.spec.ts` 1/1
- Screenshot: `evidence/SYS-16/linear-flow-export.png`
- `evidence/SYS-16/`

## Honest remainder

Full free-form drag graph editor remains multi-week. Product-owner UI sign-off remains human. Not claimed as full commercial.
