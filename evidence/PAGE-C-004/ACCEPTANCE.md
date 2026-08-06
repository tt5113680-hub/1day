# PAGE-C-004 验收证据

- 交付 `/c/services/[id]?tenant=<slug>&source=<source>` 消费者服务详情，真实呈现服务说明、时长/价格、适用门店、关联权益和可执行咨询动作。
- `GET /api/v1/consumer/services/:id` 以 active tenant ID 和服务 ID 查询；服务所属门店、商户、权益与动作均使用同一租户范围。非法 ID 为 400，跨租户与不存在资源为 404。
- `POST /api/v1/consumer/services/:serviceId/actions/:actionId/open` 在调用前重新解析服务所属门店，再复用已验证的幂等消费者事件、审计与 `consumer.action.clicked.v1` Outbox 事务。
- `tests/page-c-004-api.test.mjs` 以构建后的 API 和 PostgreSQL 验证详情、权益、适用门店、幂等动作、跨租户和输入拒绝。
- `playwright.page-c-004.config.ts` 验证 390px 正常详情、咨询成功反馈、不可用状态、截图与 trace。截图：`consumer-service-mobile.png`、`consumer-service-forbidden.png`。
