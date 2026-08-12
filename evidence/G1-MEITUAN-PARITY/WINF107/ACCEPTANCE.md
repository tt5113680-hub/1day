# G1-W∞-107 工作台队列一键处置 (MPC-01 / Phase1 1.3)

- slice: `G1-R-WORKBENCH-QUEUE-DISPOSITION`
- recorded_at: 2026-08-13 Asia/Shanghai
- status: **PASS** (engineering closed-loop; `/m/dashboard` Management workbench queue disposition 一键处置：deep-link + 回写已处理/忽略，真实 DB，禁止假 BI；无 GMV)
- branch: `hardening/COMMERCIAL-COMPLETION`
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §7 Phase1/1.3（跳过 §5 READY）

## Delivered

承接 W∞-45~104 Management MPC 真实数据深页波 + W∞-78/87 工作台密度 + W∞-97 engineering parity gate，本刀把管理工作台 `/m/dashboard`（MPC-01 工作台）的 **早会队列从「只看 deep-link」升级为「一键处置」闭环**（列表→筛选→详→操作→审计），全部真实 DB、禁止假 BI、无 GMV：

- **新表 `management_queue_dispositions`（migration `062_management_queue_disposition`）**：tenant-scoped 记录每条队列项被 `handled` / `ignored` 的状态（`(tenant_id, queue_type, source_id)` 唯一），含 deep_link/title/disposition_at/disposed_by/version，支持幂等 upsert。queue_type 覆盖 **overdue_task（待办）/ ownership_approval（审批）/ consult（咨询）/ lead（线索）**。
- **`POST /api/v1/management/dashboard/dispositions`**（`ManagementQueueDispositionController` + `ManagementQueueDispositionService`）：`tenant.manage` fail-closed + `Idempotency-Key` 幂等重放 + **审计链 audit_logs 写 `management.queue_disposition`** + **Outbox 事件 `management.queue_disposition.v1`**（照抄 employee-notification 闭环，无 GMV）。
- **dashboard GET 增强（`ManagementDashboardService.overview`）**：新增 dispositions 查询，把每条异常/咨询/线索项标注 `disposition: pending|handled|ignored` + `dispositionAt`，并返回 `disposition` 摘要 `{ total, pending, handled, ignored, handledRate }`（可处置率 = 已处理/可处置项，真实处置记录，非假 BI）。
- **`/m/dashboard` UI 一键处置**（`apps/management-web/app/page.tsx` + `app/m/management-home-modules.tsx` portal 双渲染路径 + 新组件 `app/m/management-queue-row.tsx`）：新增「早会队列处置」白卡面板（`aria-label="早会队列处置"`）——处置率 `disposition.handledRate%` + 可处置项/待处置/已处理/已忽略 4 列 `rateStrip`；每条队列项新 `QueueRow` 渲染 **打开→（deep-link）+ 已处理/忽略 按钮**，点击调 `dispositions` POST（busy 态 + result message），成功即 `load()` 回读；已处置项显示「已处理/已忽略」徽标不再重复操作。默认渲染路径与装修发布（portal layout）路径都接上 dispose + 已处理/忽略 + rate。
- **CSS**（`app/page.module.css`）：`.disposition/.rateStrip/.rateItem/.queueRow/.queueCopy/.queueActions/.queueLink/.queueButton/.queueHandled/.queueIgnored/.queueHandledText/.queueIgnoredText` 灰底白卡 + 黄渐变（`linear-gradient(145deg,#ffb400,#ff7a00)`）按钮语言，≤900px `rateStrip` 响应。
- **可处置率目标**：早会队列可处置率按 `handled / (total)` 统计（已忽略不计入已处理），向 ±95% 验收口径收敛；断言落为真实 disposition 记录推导，非固定值。

诚实边界全保留（honest 底注更新）：「早会队列处置率按真实处置记录统计（已处理/可处置项），仅登记处置状态，**不代履约美团/抖音订单、不含支付金额与第三方订单履约**；非本平台下单；无 GMV」。工具身份眉标 `推广员工具 · 管理工作台` 不变；不复活 consumer_orders / 本平台下单/收单；`/m/workflows` 保持 CUSTOM。

## Files

- `packages/database/src/migrations/062_management_queue_disposition.ts`（新）— `management_queue_dispositions` 表 + 索引
- `packages/database/src/migrator.ts` / `packages/database/src/types.ts` — 注册 migration + `ManagementQueueDispositionsTable`
- `apps/api/src/management-queue-disposition.controller.ts`（新）— `POST /dispositions`（`tenant.manage` + idempotency-key）
- `apps/api/src/management-queue-disposition.service.ts`（新）— 校验/幂等 upsert/audit/outbox
- `apps/api/src/management-dashboard.service.ts` — dispositions 查询 + 每项标注 + `disposition` 摘要/可处置率
- `apps/api/src/app.module.ts` — 注册 controller/service
- `apps/management-web/app/page.tsx` — `/m/dashboard` 早会队列处置面板 + QueueRow + dispose 回调
- `apps/management-web/app/m/management-home-modules.tsx` — portal 布局接 dispose + 处置率面板 + QueueRow
- `apps/management-web/app/m/management-queue-row.tsx`（新）— 队列项 deep-link + 已处理/忽略 按钮
- `apps/management-web/app/page.module.css` — disposition/rate/queue 样式
- `tests/g1-winf107-workbench-queue-disposition.test.mjs`（新,5/5）+ `tests/management-queue-disposition.test.mjs`（新,1/1 真实 DB 闭环）
- `tests/g1-winf99-workbench-product-depth.test.mjs`（随动）— 咨询/线索队列 aria 断言改为 portal 布局 + 新增早会队列处置/可处置率断言

## Verify

```text
pnpm --filter @oneday/database build/typecheck                                    # PASS
pnpm --filter @oneday/api build/typecheck                                          # PASS
pnpm --filter @oneday/management-web build/typecheck                               # PASS (routes 含 /m/dashboard)
pnpm build                                                                          # 20/20
node --test tests/g1-winf107-workbench-queue-disposition.test.mjs                   # 5/5
node --test --test-concurrency=1 tests/g1-winf*.test.mjs                            # 377/377
node --test tests/management-queue-disposition.test.mjs                             # 1/1 (真实 DB: 400/403/幂等重放/dashboard 回读/audit/outbox)
node --test tests/management-notifications.test.mjs                                 # 1/1 回归
pnpm test:unit                                                                       # 49/49 (12 files)
npx eslint <changed files> # clean ; npx prettier --check <changed files> # clean
```

> 全仓 `tests/*.test.mjs` 中 `sys-5-storefront-renderer.test.mjs`（`storefrontActionIcon`）为既有基线失败：与 W∞-107 无关，clean HEAD 复现一致（consumer storefront 未改动）。

## Gates

- migration 062 apply 到 `oneday_v3_test` PASS；API 真实 DB 闭环（写处置→幂等重放→dashboard 回读 handled + 可处置率→audit/outbox 落库）PASS；
- RBAC：无 token 401 / 缺 tenant context 403 / 低权限 `tenant.read` 403 / 非法 body 400 / `tenant.manage` 201 ；
- `g1-winf107` 5/5；`g1-winf*` 377/377；unit 49/49；typecheck/build 全绿；eslint + prettier clean；
- 处置率按真实 `management_queue_dispositions` 记录推导（禁止假 BI）；不碰钱/销/管店；无 GMV；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
