# SYS-20 Structured Timeline Authoring — list DnD reorder

## Result

`SYS_20_LIST_DND_REORDER_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. **Not** a free-form drag graph editor.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `@oneday/workflows` | `reorderStepsByListDrop` + `listReorderEditor` marker |
| `/m/workflows` create + version panel | List-native drag handles on spine; same path as ↑↓ reorder |
| Honesty | `data-list-reorder=list_native_dnd_not_free_form_canvas`; copy states not free-form graph |

## Evidence

- `tests/sys-20-list-dnd-reorder.test.mjs` 1/1
- `tests/e2e/sys-20-list-dnd-reorder.spec.ts` 1/1 (list-drop path + clone-publish)
- Screenshot: `evidence/SYS-20/list-dnd-reorder.png`
- `evidence/SYS-20/`

## Honest remainder

Free-form DAG canvas deferred. Product-owner UI sign-off remains human. Not claimed as full commercial.
