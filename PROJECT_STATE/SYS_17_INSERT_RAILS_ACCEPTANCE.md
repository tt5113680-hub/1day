# SYS-17 Structured Timeline Authoring — insert rails

## Result

`SYS_17_INSERT_RAILS_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. **Not** a free-form drag graph editor.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `@oneday/workflows` | `insertStepAt` + `duplicateStepAt` on ordered list |
| `/m/workflows` create form | Between-step「在此插入」rails +「复制」 |
| `/m/workflows` version panel | Same rails + duplicate; clone-publish persists via existing APIs |
| Honesty | Copy states「不是自由拖拽图编辑器」; `data-authoring-mode=structured_timeline` |

## Evidence

- `tests/sys-17-insert-rails.test.mjs` 1/1
- `tests/e2e/sys-17-insert-rails.spec.ts` 1/1
- Screenshot: `evidence/SYS-17/insert-rails.png`
- `evidence/SYS-17/`

## Honest remainder

SYS-18 condition card IA and SYS-19 start-context presets remain. Free-form DAG canvas deferred. Product-owner UI sign-off remains human. Not claimed as full commercial.
