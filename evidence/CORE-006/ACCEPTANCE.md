# CORE-006 验收证据

## 交付范围

- `tasks`、`task_reminders`、`notification_logs` 与员工通知偏好迁移均已落库；任务可关联同租户客户，并校验员工、客户、日期与提醒时间。
- 创建任务支持 `Idempotency-Key`；完成任务和通知偏好更新均使用版本号控制并发。完成任务会取消未发送提醒。
- 到期处理在同一事务内投递已到提醒、将逾期任务升级、写入通知日志、审计日志和携带 correlation/trace 的 Outbox 事件。
- 员工勿扰截止时间内不会投递提醒；解除勿扰后待发送提醒可再次被真实扫描投递。
- 所有 API 均经 TenantContext 和 `task.read` / `task.manage` 动作权限授权。

## 自动化验收

- `tests/core-006-e2e.test.mjs` 使用构建后的 NestJS/Fastify API 和 PostgreSQL 实际连接，验证：创建任务、到期升级、提醒投递、勿扰抑制与恢复、通知日志、审计、Outbox、未登录拒绝和跨租户拒绝。
- 最近一次 HTTP E2E 结果：`1 passed, 0 failed`（`overdue tasks escalate and create notification logs`）。
- 任务无页面交付，页面 E2E、截图和无障碍检查不适用；不依赖外部服务，外部服务失败场景不适用。

## 质量闸门

- `pnpm.cmd typecheck`：17/17 workspaces passed。
- `pnpm.cmd build`：17/17 workspaces passed。
- `pnpm.cmd lint`、`pnpm.cmd format:check`：passed。
- `pnpm.cmd test`：52 passed, 0 failed；`pnpm.cmd test:unit`：1 passed, 0 failed。
- `pnpm.cmd db:migrate`：`011_task_notification_preferences:Up`。
- `pnpm.cmd evidence:check`：13 passed, 0 failed；`git diff --check`：passed。
