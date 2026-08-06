# PAGE-C-007 验收证据

- 页面：`/c/profile` 在 390px 消费者视图中展示已绑定的脱敏身份、可用权益、服务历史和隐私授权；无效或已撤回的凭证进入可恢复的无权访问状态。
- 数据最小化：消费者资料 API 只返回显示名、`masked_value`、权益和本人的订单摘要；不返回身份原值或身份哈希。访问必须同时匹配活动租户、资料 UUID 与未过期的资料访问令牌哈希。
- 隐私授权：`POST /api/v1/consumer/profile/:id/consent/revoke` 使用乐观锁和幂等键撤回授权、立即失效资料链接，并写入一条 `consumer.profile_consent_revoked` 审计日志及一条 `consumer.profile.consent.revoked.v1` Outbox 事件；同一幂等键会回放原响应。
- HTTP：`node --test tests/page-c-007-api.test.mjs` 通过真实 PostgreSQL/API 验证正常读取、租户隔离、原值不泄露、授权撤回、幂等回放、审计和 Outbox。
- 浏览器：`pnpm.cmd exec playwright test --config playwright.page-c-007.config.ts` 通过 2 个 390px 场景；截图为 `consumer-profile-mobile.png` 与 `consumer-profile-forbidden.png`，Playwright trace 保存在 `playwright-output/`。
