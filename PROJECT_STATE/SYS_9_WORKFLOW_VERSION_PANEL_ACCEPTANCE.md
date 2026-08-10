# SYS-9 Management workflow version panel

## Result

`SYS_9_WORKFLOW_VERSION_PANEL_PASS` (local engineering slice). Not 全部商用. Not Tencent Cloud. Not a graph/visual editor.

## Delivered

| Surface | Behavior |
| ------- | -------- |
| `/m/workflows` 「查看版本」 | Opens version panel from existing `GET /workflows/:id` |
| Version list | Sequences + status; select loads `GET .../versions/:versionId` steps |
| Condition fields | key + equals (true/false/none) editable in panel |
| 「按面板条件克隆发布」 | Clones + publishes via existing version/publish APIs with panel conditions |
| Honesty | No graph transitions / `@oneday/workflows` package; simple condition equals editor only |

## Evidence

- `tests/e2e/sys-9-workflow-version-panel.spec.ts` 1/1 (`playwright.sys-9-workflow-version-panel.config.ts`)
- Screenshots: `evidence/SYS-9/workflow-version-panel.png`, `evidence/SYS-9/workflow-version-panel-v2.png`
- Regression: Management typecheck PASS; SYS-7 API versioning remains the backend source of truth

## Honest remainder

Linear visual flow landed as SYS-10. Free-form graph editor and product-owner UI sign-off remain multi-week / human. Not claimed as full commercial.
