# SYS-4 Ops Vertical ACCEPTANCE — Platform Outbox DLQ/Replay + Content distributions UI

## Result

`SYS_4_PASS` (Platform DLQ/replay vertical) + `SYS_4_CONTENT_DISTRIBUTIONS_PASS`. Not 全部商用. Not Tencent Cloud.

## Delivered

| Item        | Detail                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Platform UI | `/p/outbox` lists `needs_attention` dead letters and replays via existing APIs                                       |
| Navigation  | Platform shell includes「Outbox 死信」                                                                               |
| API reuse   | `GET /api/v1/platform/outbox/dead-letters`, `POST /api/v1/platform/outbox/:tenantId/:eventId/replay` — no second API |
| Content UI  | `/m/content` registers channel distributions (`pending_authorization`) via existing `POST .../distributions`         |

## Evidence

- `tests/sys-4-platform-outbox.test.mjs` 1/1
- `tests/page-m-013-api.test.mjs` 1/1
- `evidence/SYS-4/`
- platform-web build includes `/p/outbox`
- management-web content page includes「登记待授权分发」

## Honest remainder

Workflow definition authoring UI (create template/steps) remains deeper work; Management already wires start instance + approve/reject. SYS-5/6 remainders still multi-week for full Role matrix.
