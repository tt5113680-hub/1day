# FOUNDATION-007 验收证据

- 新增 `membership_roles` 迁移与系统管理员角色、权限映射种子。
- `AuthorizationService` 统一从 TenantContext 解析调用方，并在同租户成员、角色、权限映射中验证动作授权。
- `GET /api/v1/auth/permissions/:code` 权限矩阵：`tenant.read` 通过，未知权限 403，伪造租户头 403。
- 真实 HTTP E2E 4 项及全仓 typecheck、lint、format:check、test、build：PASS。
