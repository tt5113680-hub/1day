# FOUNDATION-006 验收证据

- `TenantContextService` 从已验证 Bearer Token 派生租户、用户和会话，不相信客户端租户头。
- `GET /api/v1/auth/context`：认证租户读取通过；冲突 `x-tenant-context` 返回 403；无认证返回 401。
- 现有真实会话撤销写路径按 `tenant_id` 和 `user_id` 限定，已在 HTTP E2E 验证跨租户令牌撤销返回 401。
- `node --test tests/auth-e2e.test.mjs`（3 项）、全仓 typecheck、lint、format:check、test、build：PASS。
