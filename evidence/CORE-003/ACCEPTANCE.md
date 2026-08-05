# CORE-003 验收证据

- 迁移 `007_permission_change_confirmations` 保存租户、操作者、原因与权限变更前后集合。
- `/api/v1/rbac/roles` 支持租户级角色模板与创建幂等；权限修改要求 `CONFIRM_PERMISSION_CHANGE`、原因和乐观锁版本。
- `node --test tests/core-003-e2e.test.mjs`：1/1 通过，覆盖敏感确认、权限变更、版本冲突、未登录与跨租户拒绝。
