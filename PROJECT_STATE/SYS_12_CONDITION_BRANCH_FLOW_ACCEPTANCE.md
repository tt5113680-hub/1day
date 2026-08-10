# SYS-12 Condition branch flow (+ @oneday/workflows)

## Result

`SYS_12_CONDITION_BRANCH_FLOW_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. **Not** a free-form drag graph editor.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `@oneday/workflows` | `buildConditionBranchFlow` — take/skip edges on linear spine |
| `/m/workflows` version panel | Shows 满足则进入 / 否则跳过 labels; `data-flow-mode=linear_with_condition_branches` |
| Honesty | Fixed left-to-right order only; no arbitrary node/edge drawing |

## Evidence

- `tests/sys-12-condition-branch-flow.test.mjs` 1/1
- `tests/e2e/sys-12-condition-branch-flow.spec.ts` 1/1
- Screenshot: `evidence/SYS-12/condition-branch-flow.png`
- `evidence/SYS-12/`

## Honest remainder

Full free-form graph editor remains multi-week. Product-owner UI sign-off remains human. Not claimed as full commercial.
