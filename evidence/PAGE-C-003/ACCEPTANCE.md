# PAGE-C-003 验收证据

- 交付 `/c/stores/[id]?tenant=<slug>&source=<source>` 消费者门店详情。服务、权益、门店内容与咨询入口均来自 tenant-scoped PostgreSQL 数据，动态深链保留来源上下文。
- 公开 `GET /api/v1/consumer/stores/:id` 校验 slug 与 UUID，并以 active tenant ID、store ID 读取门店及其服务、权益、内容、动作；跨租户或不存在门店为 404，非法 ID 为 400。
- 公开 `POST /api/v1/consumer/stores/:storeId/actions/:actionId/open` 需要 Idempotency-Key，在一个事务内写入消费者动作事件、匿名审计及 `consumer.action.clicked.v1` Outbox；动作、门店与租户边界同时校验。
- `tests/page-c-003-api.test.mjs` 对构建 API 写入真实门店数据，验证详情内容、跨租户拒绝、非法输入、动作幂等、审计与 Outbox。
- `playwright.page-c-003.config.ts` 在 390px Chromium 验证真实门店详情、咨询点击成功反馈和持久化事件、不可用状态。截图：`consumer-store-mobile.png`、`consumer-store-forbidden.png`；追踪：`playwright-output/*/trace.zip`。
