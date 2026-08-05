# FOUNDATION-005 验收证据

- API：`POST /api/v1/auth/login`、`refresh`、`logout`、`DELETE /sessions/:id`。
- 会话：PostgreSQL `auth_sessions`；刷新令牌仅存 HMAC 摘要，刷新会轮换并撤销旧会话。
- 测试：真实 HTTP E2E 2 项通过（登录/刷新/登出/撤销，篡改与跨租户拒绝）；`pnpm.cmd typecheck`、`lint`、`format:check`、`test`、`build` 均通过。
- 数据库：`002_auth_sessions` 已在 `oneday_v3_test` 真实迁移和种子验证。
