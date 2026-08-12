# G1-W∞-108 Storefront 发布链闭环加固 (Phase1 / 1.2)

- slice: `G1-R-STOREFRONT-PUBLISH-LOOP`
- recorded_at: 2026-08-13 Asia/Shanghai
- status: **PASS** (engineering closed-loop; portal 装修 Draft→同渲染器 Preview→Publish→Consumer/Portal 可读；binding/version/证据 全目标对齐；真实 DB；禁止假 BI；无 GMV；不碰 §5 READY)
- branch: `hardening/COMMERCIAL-COMPLETION`
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §7 Phase1/1.2（跳过 §5 READY）

## Delivered

承接 W∞-107（工作台队列一键处置）+ W∞-104（portal_bindings 全链路）+ W∞-97 engineering parity gate，本刀把 Storefront **发布链 (装修 Draft→同渲染器 Preview→Publish→Consumer/Portal 可读)** 闭环加固到 **consumer / employee / management 三目标 binding/version/证据 全对齐**。此前只有消费端 `storefront_bindings` 侧有 `storefront_publications` 可审计发布台账，portal（employee/management）侧发布/回滚**没有**版本化发布台账、且 portal 读取路径不返回 `bindingVersion`/`publishedAt` 版本证据。本刀闭合这三处证据缺口，使每个目标（store/portal）的发布闭环都在写入端落台账、在读取端暴露版本证据：

- **新表 `portal_publications`（migration `063_portal_publications`）**：portal 端发布台账，与 `storefront_publications` 完全对齐——`(tenant_id, binding_id→portal_bindings.id, template_version_id, publication_type, sequence, correlation_id)`，`(binding_id, sequence)` 唯一，`tenant_id` fail-closed；portal 每次 publish/rollback 记录 `publication_type`（publish/rollback）+ 按 binding 的连续 `sequence` + `correlation_id`，供死信重放 / Outbox / audit 关联。加 `portal_publications_tenant_lookup_idx` 索引。
- **`page-template.service.ts` `switch()` portal 分支写台账**：此前 portal publish/rollback 只发 outbox + audit，不写版本化发布台账；现照抄 storefront 分支逻辑——`coalesce(max(sequence),0)+1` 计算 `publicationSequence` 并 `insert into portal_publications`，并把 `publicationType` + `publicationSequence` 一并暴露在 publish/rollback 响应 `data`（与 storefront 响应同构，前端/测试可读）。
- **`portal-layout.service.ts` 读取路径版本证据**：`PortalLayout` 新增 `bindingVersion`（`portal_bindings.version`）与 `publishedAt`（`portal_bindings.published_at`），published 与 preview（`portal_preview_tokens` count）两条分支都拉取并返回——使 employee/management 读取路径与 consumer storefront 读取（`consumer-store.service.ts` 已返回 `bindingVersion`+`publishedAt`）证据同构，员工/管理端「装修→发布→可读」闭环的 binding/version 可被前端与 e2e 读取验证。
- **DB 类型/工程加固**：`packages/database/src/types.ts` 新增并注册 `PortalBindingsTable` / `PortalPreviewTokensTable` / `PortalPublicationsTable`（此前 `portal_bindings`/`portal_preview_tokens` 未注册进 `Database` 接口，仅 VIA raw SQL 可用，是工程缺口）；`migrator.ts` 注册 `063_portal_publications`；`recovery.ts` SNAPSHOT_TABLES 加入 `portal_bindings`/`storefront_publications`/`portal_publications`（发布证据随 recovery snapshot 保留，与 `storefront_bindings` 对齐）。
- **诚实边界全保留**：发布台账仅记录发布意图/版本/序号（binding/version/证据），不改`发布是否生效`之外任何数据；不碰钱/销/管店；无 GMV；非本平台下单；不复活 consumer_orders / 本平台下单/收单；`/m/workflows` 保持 CUSTOM；§5 READY 编排未触碰（仅 portal/story 已有 binding 与 preview token 壳保留，未扩成 READY 产品）。

## Files

- `packages/database/src/migrations/063_portal_publications.ts`（新）— `portal_publications` 表 + 索引
- `packages/database/src/migrator.ts` / `packages/database/src/types.ts` — 注册 migration + `PortalBindingsTable`/`PortalPreviewTokensTable`/`PortalPublicationsTable` + `Database` 接口
- `packages/database/src/recovery.ts` — SNAPSHOT_TABLES 加入 portal/story publications 证据
- `apps/api/src/page-template.service.ts` — portal publish/rollback 写 `portal_publications` + 暴露 `publicationSequence`/`publicationType`
- `apps/api/src/portal-layout.service.ts` — `PortalLayout.bindingVersion`+`publishedAt` 读取证据（published+preview 两分支）
- `tests/g1-winf108-storefront-publish-loop-harden.test.mjs`（新,1/1 真实 DB 闭环）

## Verify

```text
pnpm --filter @oneday/database build/typecheck           # PASS（含 063 迁移）
pnpm --filter @oneday/api build/typecheck                # PASS
pnpm typecheck                                            # 20/20
pnpm build                                                # 20/20
pnpm db:migrate（DATABASE_URL=oneday_v3_test）            # apply 063
node --test tests/g1-winf108-storefront-publish-loop-harden.test.mjs   # 1/1（真实 DB 闭环）
node --test tests/batch-2-storefront-lifecycle.test.mjs  # 1/1 消费端回归
node --test --test-concurrency=1 tests/g1-winf*.test.mjs # 378/378（原 377 + 新增 1）
node --test tests/management-queue-disposition.test.mjs  # 1/1 回归
node --test tests/management-notifications.test.mjs      # 1/1 回归
pnpm test:unit                                            # 49/49（12 files）
npx eslint <changed files> # clean ; npx prettier --check <changed files> # clean
```

> 全仓 `tests/*.test.mjs` 中 `sys-5-storefront-renderer.test.mjs`（`storefrontActionIcon`）为既有基线失败：与 W∞-108 无关，clean HEAD 复现一致（consumer storefront 未改动）。

## Gates

- migration 063 apply 到 `oneday_v3_test` PASS；真实 DB 闭环（建 management 模板→publish→`portal_publications` sequence 1→management dashboard 读取 `bindingVersion`/`publishedAt`/`mode=published`/`templateVersionId`→draft→rollback→sequence 2；`outbox portal.published.v1/rolled_back.v1` + `audit page.template_published/rolled_back` 落库）PASS；
- portal publish/rollback 与 storefront 实证一致（atomic binding live_version 翻转 + 版本化台账 + outbox + audit）；读取路径（consumer `bindingVersion`/`publishedAt` 回读 + portal `bindingVersion`/`publishedAt` 回读）证据同构；
- `g1-winf108` 1/1（真实 DB：create→publish→ledger→read→draft→rollback→ledger 2→outbox/audit 断言）；
- `g1-winf*` 378/378；unit 49/49；typecheck/build 全绿；eslint + prettier clean；
- 台账按真实 `portal_publications` 记录推导（禁止假 BI）；不碰钱/销/管店；无 GMV；不复活 consumer_orders / 本平台下单/收单；§5 READY 未开工。

Not an owner product-owner UI sign-off.
