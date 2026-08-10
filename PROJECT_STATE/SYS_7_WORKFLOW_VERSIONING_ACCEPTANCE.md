# SYS-7 Workflow versioning (draft from published → condition edit → publish v2 → start)

## Result

`SYS_7_WORKFLOW_VERSIONING_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `GET /api/v1/workflows/:id/versions/:versionId` | Returns version metadata + steps with conditions |
| `POST /api/v1/workflows/:id/versions` | Optional `sourceVersionId` (default published) to clone; steps may override conditions |
| Closed loop | Publish v1 → read steps → clone/edit → publish v2 → start instance on v2 with condition skip |
| Denials | Stale `definitionVersion` 409; re-publish published version 404; invalid condition 400 |
| Management UI | `/m/workflows` 「克隆发布新版本」reads version steps, clones, publishes via existing APIs |

## Evidence

- `tests/sys-7-workflow-versioning.test.mjs` 1/1
- Regression: `core-010-e2e` 1/1, `sys-4-workflow-authoring` 1/1
- `evidence/SYS-7/`

## Honest remainder

Management version panel landed as SYS-9 (list/inspect/edit equals + clone-publish). Full graph/visual editor and `@oneday/workflows` package remain multi-week. Not claimed as full commercial.
