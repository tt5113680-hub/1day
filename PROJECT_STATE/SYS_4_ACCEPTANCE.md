# SYS-4 Ops Vertical ACCEPTANCE — Platform Outbox DLQ/Replay

## Result

`SYS_4_PASS` (Platform DLQ/replay vertical). Not 全部商用. Not Tencent Cloud.

## Delivered

| Item        | Detail                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Platform UI | `/p/outbox` lists `needs_attention` dead letters and replays via existing APIs                                       |
| Navigation  | Platform shell includes「Outbox 死信」                                                                               |
| API reuse   | `GET /api/v1/platform/outbox/dead-letters`, `POST /api/v1/platform/outbox/:tenantId/:eventId/replay` — no second API |

## Evidence

- `tests/sys-4-platform-outbox.test.mjs` 1/1
- `evidence/SYS-4/`
- platform-web build includes `/p/outbox`

## Honest remainder

Content distributions UI and Workflow write remain available as future SYS-4-class verticals. SYS-5/6 still multi-week.
