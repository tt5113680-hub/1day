# SYS-3 FE Sync Clients ACCEPTANCE

## Result

`SYS_3_PASS` (local engineering). Not 全部商用. Not Tencent Cloud.

## Delivered

| Surface              | Integration                                                                       |
| -------------------- | --------------------------------------------------------------------------------- |
| Shared package       | `@oneday/sync-client` — `TenantSyncClient` + `StorefrontSyncClient` + React hooks |
| Management dashboard | Quiet reload on `operating` / `lifecycle` sync changes                            |
| Employee workbench   | Quiet reload on `operating` sync changes                                          |
| Consumer store       | Public storefront ETag poll → `router.refresh()` on version/authEpoch change      |

## Evidence

- `tests/sync-client.vitest.ts` 3/3
- `tests/sys-3-sync-client.test.mjs` 1/1 (authenticated change + publish version move without hard refresh)
- `evidence/SYS-3/`

## Honest remainder

SSE browser auth still prefers ETag poll (EventSource cannot send Bearer). SYS-4 ops verticals and SYS-5/6 remain queued.
