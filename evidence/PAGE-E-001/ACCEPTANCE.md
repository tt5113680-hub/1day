# PAGE-E-001 验收证据

- 页面：`/e/workbench` 是员工移动执行入口，展示当前登录员工本人当天待办、客户提醒和由持久化任务时限生成的可解释行动建议；不使用静态业务数据。
- 权限与隔离：`GET /api/v1/employee/workbench` 要求 `task.read`，同时验证登录用户的活动员工归属；任务查询按 `tenant_id + assignee_employee_id` 限制。完成端点还要求 `task.manage`，并再次验证任务归属于当前员工。
- 操作：`POST /api/v1/employee/workbench/tasks/:id/complete` 使用任务版本乐观锁，取消待发提醒，并写入 `employee.workbench_task_completed` 审计与 `employee.workbench.task_completed.v1` Outbox；他人任务返回 404，版本冲突返回 409。
- HTTP：`node --test tests/page-e-001-api.test.mjs` 通过真实 PostgreSQL/API 验证本人数据范围、客户提醒、时限信号、未登录、跨租户、越权完成、乐观锁、审计与 Outbox。
- 浏览器：`pnpm.cmd exec playwright test --config playwright.page-e-001.config.ts` 通过 2 个 390px 场景；截图为 `employee-workbench-mobile.png` 和 `employee-workbench-forbidden.png`，trace 位于 `playwright-output/`。
