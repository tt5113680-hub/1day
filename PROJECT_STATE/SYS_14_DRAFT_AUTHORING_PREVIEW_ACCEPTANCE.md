# SYS-14 Draft authoring preview (+ @oneday/workflows)

## Result

`SYS_14_DRAFT_AUTHORING_PREVIEW_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. **Not** a free-form drag graph editor.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `@oneday/workflows` | `reorderSteps` — linear index reorder only |
| `/m/workflows` create form | 上移/下移 + live branch/path preview before publish |
| Honesty | Fixed ordered list; no canvas drag / arbitrary edges |

## Evidence

- `tests/sys-14-draft-authoring-preview.test.mjs` 1/1
- `tests/e2e/sys-14-draft-authoring-preview.spec.ts` 1/1
- Screenshot: `evidence/SYS-14/draft-authoring-preview.png`
- `evidence/SYS-14/`

## Honest remainder

Full free-form drag graph editor remains multi-week. Product-owner UI sign-off remains human. Not claimed as full commercial.
