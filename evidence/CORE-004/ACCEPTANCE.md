# CORE-004 验收证据

## 交付范围

- 客户主档、手机号和微信身份已持久化；原始身份值不落库，API 仅返回脱敏值。
- 同租户身份哈希唯一约束用于重复客户识别；重复身份创建返回 `409 CONFLICT`。
- 客户合并会迁移身份、标记源客户为 `merged`、写入合并记录、审计日志和 Outbox 事件。
- 读取和写入分别要求 `customer.read` 与 `customer.manage`，所有查询按服务端 TenantContext 限定。

## 自动化验收

- `tests/core-004-e2e.test.mjs`：真实 HTTP、PostgreSQL 与构建产物验证正常路径、输入校验、未登录、跨租户拒绝、幂等、身份去重、版本冲突、合并、审计和事件追踪。
- 页面 E2E、截图与可访问性：不适用。本任务无页面交付，后续客户页面任务负责 UI 验收。
- 外部服务失败：不适用。本任务无外部服务依赖。

## 质量闸门

- `pnpm.cmd install --frozen-lockfile`、`lint`、`format:check`、`test:unit`、`test`（48/48）、`typecheck`、`build` 与 `evidence:check`（11/11）均已通过。
