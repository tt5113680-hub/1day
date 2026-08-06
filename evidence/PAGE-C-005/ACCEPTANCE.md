# PAGE-C-005 验收证据

- 页面：`/c/actions/[id]` 在 390px 视口提供外部动作确认、真实浏览器跳转、失败恢复、复制口令和保留上下文的返回链接。
- API：`GET /api/v1/consumer/actions/:id` 与 `POST /api/v1/consumer/actions/:id/confirm` 使用公开租户 slug 和 UUID 校验；确认写入 `consumer_action_redirect_events`、审计日志和 `consumer.action.redirect.confirmed.v1` Outbox 事件。
- 隔离与幂等：`tests/page-c-005-api.test.mjs` 验证租户边界、非法回跳拒绝、同一幂等键只生成一条事件、审计和 Outbox。
- 浏览器：`playwright.page-c-005.config.ts` 通过两条 Chromium 390px 场景，保存正常动作和不可用状态截图与 trace。
