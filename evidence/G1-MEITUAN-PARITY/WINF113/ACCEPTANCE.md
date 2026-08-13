# G1-W∞-113 ACCEPTANCE — 订单痕迹详情抽屉 + 导出（MPC-04）

- recorded_at: 2026-08-13 Asia/Shanghai
- task: `G1-R-ORDER-DETAIL-EXPORT` / W∞-113
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` Phase2（§4 P1 MPC-04）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；§5 READY 未触碰

## Delivered

把 `/m/orders`（MPC-04 订单痕迹）从「静态分布条 + 行列表」推进到可作业闭环（列表→筛→详→导出→审计）：

1. **详情 API** `GET /api/v1/management/commerce/orders/:id`（`management-commerce.controller.ts` / `management-commerce.service.ts` `getOrderDetail`）：tenant/scope fail-closed，返回订单真实档案行 + 关联 `customer_sources`（来源链）+ 该客户的 `tasks`（Consult→Task→Done 任务链）+ 本地 `audit_logs` 审计链 + `evidence_count`/`connector_count`（证据文书/回执）。store-manager 同样走 `operatorContext` 的 store scope 过滤（`$2::uuid[]` + 动态 id 占位符）。
2. **导出 API** `GET /api/v1/management/commerce/orders/export`（`exportOrders`）：返回 `text/csv; charset=utf-8` attachment，CSV 表头 `order_number,customer_name,store_name,source,status,fulfillment_status,currency,amount_cents,items,occurred_at`，BOM 由前端写入，内容 = 与列表同源的真实订单痕迹行（无伪造聚合、无 GMV 口径）。
3. **Management `/m/orders`**：topBar 新增「导出」按钮（下载真实 CSV）+ 通知条；每条订单行可点开「订单痕迹详情」抽屉（`OrderTraceDrawer`）——订单档案（门店/客户/来源/金额参考/状态/时间/证据文书/回执）+ 来源链 + 客户任务链 + 本地审计链 + 诚实底注，`data-testid=order-detail-drawer` / `order-detail-open`，loading/forbidden/error 回读态。

## Evidence commands

- `node --test tests/g1-winf113-order-detail-export.test.mjs` → **5/5**（静态扫描：控制器 detail/export 路由与 scope、服务详情来源链/任务链/审计链 SQL、CSV 导出表头与转义、页面抽屉+导出、诚实边界无伪 BI）
- `node --test tests/management-order-detail-export.test.mjs` → **1/1**（真实 DB：建 org/user/membership/employee/merchant/store/customer/customer_sources/task/customer_order → 跨租户 403/404 deny → 详情回读 order/sources/tasks → 导出 CSV 表头 + 订单号 + 商品名 + 金额 → 未授权 401/403 deny）
- 全仓 `node --test tests/*.test.mjs` → **680 pass / 9 fail**（9 失败 = clean HEAD 既有基线：hardening-001/002、page-c-002、page-c-consumer-search、page-m-012、sys-11、sys-22、sys-5-storefront-renderer×2，均为既有集成/e2e 基线与本刀无涉）
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49
- 变更文件 eslint + prettier clean（全仓 29 条 eslint 为既有 test 文件基线，均非本刀文件）

## Honest boundaries

- 订单痕迹详情 = 仅本地档案（`source=local`），聚合来源/客户/任务/审计链
- 导出 = 仅本地订单痕迹 CSV，不含支付金额第三方回执、不宣称第三方成交/履约
- 详情与导出均不接美团/抖音实时订单，不含本平台收款，**非本平台下单**
- `/m/workflows` CUSTOM；§5 READY deferred；不复活 consumer_orders 支付闭环 / 本平台下单 / 收单

## Next

- **W∞-114** 评价待回复队列（MPC-05）
