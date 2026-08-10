# SYS-18 Structured Timeline Authoring — condition card IA

## Result

`SYS_18_CONDITION_CARD_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. **Not** a free-form drag graph editor.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `@oneday/workflows` | `buildConditionCard` / `buildConditionCards` with when-true / when-false + `apiLimit: key_equals_only` |
| `/m/workflows` create + version panel | Condition cards bound to existing key/equals editors |
| Honesty | Copy states API equals-only +「不是自由拖拽图编辑器」 |

## Evidence

- `tests/sys-18-condition-card.test.mjs` 1/1
- `tests/e2e/sys-18-condition-card.spec.ts` 1/1
- Screenshot: `evidence/SYS-18/condition-card.png`
- `evidence/SYS-18/`

## Honest remainder

SYS-19 start-context presets remain. Free-form DAG canvas deferred. Product-owner UI sign-off remains human. Not claimed as full commercial.
