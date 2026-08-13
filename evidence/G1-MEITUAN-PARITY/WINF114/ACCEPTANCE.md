# G1-W∞-114 ACCEPTANCE — 评价待回复队列（MPC-05）

- recorded_at: 2026-08-13 Asia/Shanghai
- task: `G1-R-REVIEWS-REPLY-QUEUE` / W∞-114
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` Phase2（§4 P1 MPC-05）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；§5 READY 未触碰

## Delivered

把 `/m/reviews`（MPC-05 评价档案）从「静态分布条 + 行列表」推进到可作业闭环（列表→筛→队→回复→审计）：

1. **migration `068_reviews_reply`**（`packages/database/src/migrations/068_reviews_reply.ts`）：`store_reviews` 新增回复痕迹字段 `reply_text`(varchar(1000))/`replied_by`(uuid)/`replied_at`(timestamptz) + 索引 `store_reviews_reply_status_idx(tenant_id, replied_at, created_at)`，作为评价待回复队列（未回复/已回复）与回复工作流的单真源；migrator 注册。
2. **详情/队列/回复 API**（`management-commerce.controller.ts` / `management-commerce.service.ts`）：
   - `GET /api/v1/management/commerce/reviews?reply=all|pending|replied&rating=1..5`（`listReviews` + storeFilter 参数修正：rating 使用占位符 `$2`（无门店）/`$3`（有门店）+ 真实绑定值）
   - `GET /api/v1/management/commerce/reviews/queue`（`reviewQueue`）：真实 `store_reviews` 行现场聚合 `total/pending/replied/replyRate/avgRating/byRating[]/pendingQueue[]`（待回复队列，无伪 BI）
   - `POST /api/v1/management/commerce/reviews/:id/reply`（`replyToReview`）：写 `reply_text/replied_by/replied_at`，`Idempotency-Key` 幂等重放（advisory lock + idempotency_keys），写 `audit_logs reviews.replied` + `outbox reviews.replied.v1`；回复写入由 `requireReviewStoreWrite`（租户 + store scope，store-manager fail-closed）把关
3. **Management `/m/reviews`**（`page.tsx` + `_commerce.module.css`）：并行拉取列表 + 队列；新增「评价待回复队列」面板（待回复真实行 + 回复编辑器 textarea + 保存/取消）、「待回复评分分布」面板（真实 byRating）、「回复状态筛选」chips（全部/待回复/已回复）+ 行内已回复卡片/写回复 + 概况条读数（评价数/平均分/待回复/已回复/回复率）。`data-testid=management-reviews`，loading/forbidden/error/empty 全状态保留。

## Evidence commands

- `node --test tests/g1-winf114-reviews-reply-queue.test.mjs` → **5/5**（静态扫描：migration 回复列、控制器 reviews/queue/reply 路由 + scope、服务 reply 状态过滤/待回复队列/幂等回复审计 outbox、页面待回复队列/filter chips/回复编辑器、诚实边界无伪 BI）
- `node --test tests/management-reviews-reply-queue.test.mjs` → **1/1**（真实 DB：建 org/user/membership/employee/merchant/store/review → 队列 pending 真实行 → 列表 pending+rating 筛选 → 跨租户 403/404 deny → 幂等回复重放 → replied 移出待回复 → audit/outbox 落库 → 空回复 400 → 未授权 401/403 deny）
- 随动回归：`g1-winf45` 5/5、`g1-winf42` 4/4、`g1-winf23` 5/5、`g1-winf17`+`g1-winf100` 5/5、`page-m-commerce` 1/1（reviews 页既有评价分布/头/诚实边界断言全部保持）
- 全仓 `node --test tests/*.test.mjs` → **686 pass / 9 fail**（9 失败 = clean HEAD 既有基线：hardening-001/002、page-c-002、page-c-consumer-search、page-m-012、sys-11、sys-22、sys-5-storefront-renderer×2，均为既有集成/e2e 基线与本刀无涉）
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49（12 文件）
- `node tests/evidence-contract.test.mjs` → 74/74；变更文件 eslint + prettier clean

## Honest boundaries

- 评价与回复均为本地试点档案（`source=local`），推广员工具只做档案与回复痕迹
- 不接美团/抖音实时评价流，**不代第三方回写**，不伪造第三方评价分
- 回复仅登记在本地 `store_reviews` 档案的回复痕迹，不代表第三方已回复/已成交
- 不含本平台收款，**非本平台下单**；`/m/workflows` CUSTOM；§5 READY deferred；不复活 consumer_orders / 本平台下单 / 收单

## Fixes during verification

- 修正 `listReviews` 评分筛选参数绑定：rating 按是否有门店 store filter 使用 `$2`/`$3` 占位符并真实绑定值（原实现 `$2+params.length` 未绑定导致 `reviews?rating=` 500）；保留既有 reviews 页 `<h1>评价档案</h1>` 与 `不伪造第三方评价分` 诚实边界（承接 g1-winf23/42/45/100 断言）。
- `replyToReview` 回复写入加数据门槛：移除硬编码乐观锁 `version=$5`，改为 `rowCount` 非空才写 audit/outbox（避免版本不匹配时静默"claimed replied 但行未更新"），无匹配行抛 409（`ConflictException`）。

## Next

- **W∞-115** 经营分析行业模板 + 模块热力 + 工具漏斗（MPC-09）
