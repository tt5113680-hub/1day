# CORE-005 验收证据

## 交付范围

- 来源记录支持首要、当前和最终来源；当前/最终来源变更会保留历史并标为 `superseded`。
- 推荐、接待、成交、核销贡献要求租户内有效员工与证据引用，并保存确认状态。
- 客户归属转移先创建待审批申请；只有 `ownership.approve` 动作权限可确认，确认后才替换有效归属。
- 关键写操作均在同一事务内完成客户版本控制、审计日志和包含 correlation/trace 的 Outbox 事件。

## 自动化验收

- `tests/core-005-e2e.test.mjs` 基于构建后的 NestJS API 与 PostgreSQL，验证来源、贡献、幂等重放、归属审批、审计、事件、校验失败、乐观锁冲突、未登录、无权限和跨租户拒绝。
- 页面 E2E、截图、可访问性：不适用。本任务没有页面交付。
- 外部服务失败：不适用。本任务不依赖外部服务。

## 质量闸门

- `pnpm.cmd install --frozen-lockfile`、`lint`、`format:check`、`test:unit`、`test`（50/50）、`typecheck`、`build` 和 `evidence:check`（12/12）均已通过。
