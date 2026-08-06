# CORE-009 验收证据

- 交付多租户外部动作配置：受控 HTTP(S) 链接、小程序 App ID/路径与必须声明平台的平台入口，均持久化于 PostgreSQL。
- 创建接口使用 `Idempotency-Key`；读取与点击均经 TenantContext 和 RBAC 保护。点击动作持久化事件，并在同一事务写入审计日志和带 correlation/trace 的 Outbox 事件。
- `tests/core-009-e2e.test.mjs` 以构建后的 NestJS/Fastify API 和 PostgreSQL 验证链接/小程序配置、幂等提交、点击追踪、审计/Outbox、输入校验、未登录、无权限与跨租户拒绝。
- 本任务只提供安全的入口配置与事件追踪；未执行任何未经授权的第三方自动化调用，因此没有外部服务失败场景或页面截图。
