# P1-B sync-converge — content approve→place→Consumer chain event + Management convergence

- slice: `p1-b-sync-converge`
- bundle: also closes the adjacent `p1-b-content-chain` gap (approve emission)
- branch: `hardening/COMMERCIAL-COMPLETION`
- date: 2026-08-10 Asia/Shanghai
- goal: Make the **content approve → place → Consumer** chain fully observable and convergent across terminals per CHARTER §3.1 (老板早会看内容投放/发布是否生效) and §3.4 (消费者内容透明), MULTI_TERMINAL_SYNC_SPEC §4 (`content.published.v1`), and matrix SY-01/SY-02/M-05/CT-02/M-03/SF-02. Single content entity stays the single source of truth (CHARTER §1.1); no second CMS, no arbitrary low-code, no page-level hex patches.

## Scope (no PRD deviation; config-driven shared kit + event chain)

1. `apps/api/src/management-content.service.ts` — `approve()` now emits `content.published.v1` in the **same transaction** (was previously silent), so the approve→place→Consumer chain becomes a proper event chain. The event maps to the `content` sync topic via `mapEventToSyncTopics` (`packages/events`), identically to the existing `content.distribution.requested.v1` / `content.store.placed.v1` events. Hides nothing; the event is an internal publication intent, never an external delivery claim.
2. `apps/management-web/app/m/content/page.tsx` — the Management 内容中心 now subscribes to the `content` sync topic via `useTenantSync` (same quiet-reload pattern as the Management 经营总览), so approve/place/distribute changes converge into a live refresh instead of relying only on the manual 「刷新内容」 button. This closes the server-generated-but-unconsumed `content` topic gap flagged in the storefront/content chain (SY-01 convergence).
3. `apps/management-web/app/m/content/page.tsx` — each content card now renders an honest convergence line: 「已生效：消费者门店已读取该条内容」/「已审批但尚未投放：消费者尚不可见」/「尚未发布：消费者不可见」, aligning with matrix M-05 (approval/placement distinct, untriggered content not presented to Consumer) and CT-02 (status surfaces correctly to Management).
4. `apps/management-web/app/m/page-builder/page.tsx` — the 数字门店装修 template card now surfaces `published_at` as convergence evidence: 「消费者上次读取已发布版本：{time}」 (the value was already returned by `GET /api/v1/page-templates`). Gives the merchant a real "发布生效" timestamp, per CHARTER §3.1 and matrix M-03/SF-02 publish-effectiveness visibility.

## Matrix mapping

| ID | Pri | Assertion | Evidence |
| -- | --- | --------- | -------- |
| SY-01 | P0 | Consumer action / Employee / Management online convergence: publish changes converge within SLO; content topic becomes a live Management subscription | `tests/p1-b-content-sync.test.mjs` + Management content page `useTenantSync(['content'])` |
| SY-02 | P0 | Storefront/content publish event→cache→UI chain converges; propagation failure visible/retryable | `content.published.v1` outbox in the same txn as approve; existing worker `createSyncNotificationHandler` projects it; `/sync/changes?topics=content` + ETag verified |
| C-05 / M-05 | P1 | Content approve→place → Consumer published read model; not-yet-placed approved content not presented to Consumer; Management shows honest status | Consumer `content.some()` assertion true only after place; Management convergence line |
| CT-02 | P1 | 审核/下架/空内容状态对 Consumer/Management 正确 | approve→content topic; content card draft/approved/placed statuses |
| M-03 / SF-02 | P1 | Publish atomic switch readable; merchant sees publish effectiveness + a retryable manual refresh | page-builder published_at convergence line + refresh template button |

## L1–L4 selves / gates

| Gate | Result |
| ---- | ------ |
| L1 typecheck | `pnpm typecheck` 20/20 PASS |
| L1 build | `pnpm build` 20/20 PASS (four webs + packages; API + management-web rebuilt from source) |
| L1 unit | `pnpm test:unit` 12 files / 49 PASS |
| L1/L2 API+DB (new) | `node --test --test-concurrency=1 tests/p1-b-content-sync.test.mjs` 1/1 PASS — provisions a fresh tenant, `approve` emits `content.published.v1` in `outbox_events`, worker dispatch projects it to the `content` sync topic, `/api/v1/sync/changes?topics=content` returns it with ETag, and the placed content is readable by the Consumer published read model |
| Regression | `batch-2-content-placement` 1/1, `sys-6-content-placements` 1/1, `matrix-sync-gateway` 1/1 PASS (no regression) |
| Lint | `eslint` on changed files clean |
| Prettier | `prettier --write` applied to the new/edited files |
| Anamorphic | Real owner login on a fresh tenant → create content (draft) → approve → Management content page converges via `content` topic → place → Consumer store reads it. CHARTER §5.2 #3 (老板) + #4 content-chain path. No product-owner UI auto-sign. |
| Honest boundary | `content.published.v1` is an internal publication intent; the Worker `published` ledger is never presented as third-party delivery (CHARTER §1.4, sync spec §0). Single content entity true-source preserved (no second CMS). |

## Test evidence

`tests/p1-b-content-sync.test.mjs` asserts, on a freshly-provisioned tenant:
- `outbox_events` contains a `content.published.v1` row for the content id.
- dispatching the outbox (`OutboxDispatcher` + `createSyncNotificationHandler`) writes a `sync_notifications` row whose topic ends `:content`.
- `GET /api/v1/sync/changes?topics=content` returns that event (content-topic convergence).
- only after `place` does the Consumer `GET /api/v1/consumer/stores/{storeId}?tenant=...` `.content` include the title (approval/placement honesty, C-05/M-05/CT-02).

## Commit scope

`apps/api/src/management-content.service.ts`, `apps/management-web/app/m/content/page.tsx`, `apps/management-web/app/m/content/page.module.css`, `apps/management-web/app/m/page-builder/page.tsx`, `apps/management-web/app/m/page-builder/page.module.css`, `tests/p1-b-content-sync.test.mjs`, `evidence/P1-B-SYNC-CONVERGE/`, state files.

Note: marks the `p1-b-sync-converge` and `p1-b-content-chain` milestones PASS in `PHASE1_PROGRESS.json`. Not 全部商用; no product-owner UI auto-sign.
