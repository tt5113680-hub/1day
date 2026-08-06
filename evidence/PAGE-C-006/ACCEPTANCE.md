# PAGE-C-006 验收证据

- 页面：`/c/processes/[id]` 以 390px 消费者视图展示订单、咨询、预约、核销、回执和异常反馈；加载、错误、无权恢复状态完整。
- 授权：公开读取不信任订单 UUID；必须同时匹配活动租户、未过期的一对一过程访问凭证哈希，且响应不含客户身份数据。
- API：`GET /api/v1/consumer/processes/:id` 完成输入、跨租户和错误凭证拒绝；订单、核销、回执均来自 CORE-007 的持久化模型。
- 测试：`tests/page-c-006-api.test.mjs` 验证真实 PostgreSQL/HTTP 正常、错误凭证、跨租户和输入边界。`playwright.page-c-006.config.ts` 通过正常和恢复 390px 场景，并保存截图和 trace。
