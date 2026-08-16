# G1-W∞-136 ACCEPTANCE — 订单门店对比 + 时间序列（§2 densify）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-ORDER-STORE-COMPARE-TIME-SERIES` / W∞-136
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §2 有效订单/转化「门店对比、时间序列」
- executor: DeepSeek Plan B（无人值守）
- claim_boundary: 工程 PASS；非主人 UI 签验；无储值/支付/GMV、不含第三方成交或履约

## Delivered

1. `GET /api/v1/management/commerce/orders/insights?days=7|30|90`
   - `storeCompare`：按真实 `customer_orders` 门店归档聚合——记录数 / 有效数 / 有效占比 validRate / 金额参考 / 门店来源分布，`validRate` 由真实 fulfillment_status 推导。
   - `timeSeries`：按真实 occurred_at 日归档条数与有效条数逐日序列。
   - 租户隔离 + 门店 scope（store manager 仅其授权门店），`days` 白名单 7/30/90，非法 400。
2. `/m/orders`：门店对比 + 时间序列 白卡面板 + 7/30/90 天窗口切换，简介由服务端真实档案行现场推导。
3. honest disclaimer：本地 customer_orders 案例（source=local），金额为记录参考，不接美团实时订单，不含本平台收款，不代表第三方成交或履约，非本平台下单。

## Evidence

- `tests/g1-winf136-orders-store-compare-timeseries.test.mjs` → **2/2**
  - 静态：controller/service/page/css 暴露 `orders/insights` + storeCompare/timeSeries + honest 边界。
  - DB：双门店多订单（paid/refunded 混）→ storeCompare 总数/有效/validRate=0.5/金额参考 17800 & 8900/来源分布、timeSeries 长度、illegal days=400、跨租户 403。
- `pnpm typecheck` → 20/20
- `pnpm build` → 20/20（management-web 含 /m/orders）
- `pnpm test:unit` → 49/49
- eslint + prettier clean（CSS ignored 除外）
- 回归：page-m-commerce, management-order-detail-export, g1-winf42, g1-winf22, g1-winf89, g1-winf134 —— 除 **W89 memberships CSS `repeat(3)` 短缺为 HEAD 既有的预存偏差**（未改动 memberships,与本次无关）外全绿。

## Honest boundaries

门店对比与时间序列均由本地 customer_orders 档案聚合；金额为记录字段参考；不接美团实时订单，不含本平台收款，不代表第三方成交或履约，非本平台下单。未复活 consumer_orders / 本平台下单/收单。
