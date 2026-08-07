# CIRCLE-002 acceptance

- `/bc/merchants` records fixed-circle merchant invitations as `prepared` only; no external delivery is claimed without an authorized connector.
- A prepared membership requires `circle.manage` circle approval and independent `platform.manage` final approval. All mutations use idempotency, optimistic versions, audit logs and correlated Outbox events.
- Display configuration controls whether an approved merchant projects to `/bc/dashboard`; exit removes the member from that projection while retaining its audit trail.
- HTTP coverage verifies validation, unauthenticated rejection, idempotent invitation, blocked out-of-order platform approval, approval sequence, display exclusion, exit, audit and Outbox records. Browser evidence covers desktop and missing-session states.
