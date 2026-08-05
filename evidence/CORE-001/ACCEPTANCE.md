# CORE-001 验收证据

- 已执行迁移 `005_organization_model`：组织、组织关系、商户、门店和租户级创建幂等记录均具有 `tenant_id`、审计字段和版本字段。
- API：`/api/v1/organizations`、`/api/v1/merchants`、`/api/v1/stores` 通过服务端 TenantContext 与 `organization.read` / `organization.manage` 权限校验；创建支持 `Idempotency-Key`，组织更新执行乐观锁。
- 审计：组织、商户、门店创建和组织更新均写入 `audit_logs`，包含操作者、租户、关联 ID 与变更后值。
- 定向 HTTP E2E：`node --test tests/core-001-e2e.test.mjs`，1/1 通过；覆盖组织层级、商户/门店归属、幂等、版本冲突、审计、未登录、无权限与跨租户拒绝。
- 完整质量闸门：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（41/41）、`test:unit`（1/1）、`build`、`evidence:check` 均通过。
