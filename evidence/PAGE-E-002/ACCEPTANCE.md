# PAGE-E-002 验收证据

- 页面：`/e/tasks/{id}` 是员工移动任务详情入口，读取已持久化任务原因、截止时间、关联客户、任务状态和任务证据；包含 loading、错误、无权限、空证据和成功反馈状态。
- 数据模型：迁移 `021_task_detail_context` 为 `tasks` 增加可空 `reason`，并创建 `task_evidence_links`。证据关联仅允许指向当前任务同一客户的已持久化 active evidence file；详情响应只返回安全元数据，不返回证据二进制内容。
- 权限与隔离：`GET /api/v1/employee/tasks/:id` 要求 `task.read`；完成和证据关联要求 `task.manage`。服务端按 `tenant_id + 当前 active employee + assignee_employee_id` 取任务，其他员工任务返回 404，跨租户上下文返回 403。
- 写操作：`POST /api/v1/employee/tasks/:id/evidence-links` 要求 `Idempotency-Key`，重放同一键返回原响应，重复关联返回 409；成功写入 `employee.task_evidence_linked` 审计和 `employee.task.evidence_linked.v1` Outbox（均带 correlation/trace）。`POST /complete` 复用既有员工自有任务状态机和 version 乐观锁。
- HTTP：`node --test tests/page-e-002-api.test.mjs` 已通过真实 PostgreSQL/API 验证任务原因/客户/证据元数据、未登录、跨租户、他人任务、幂等重放、重复关联冲突、完成动作及审计/Outbox/幂等记录。
- 浏览器：`pnpm.cmd exec playwright test --config playwright.page-e-002.config.ts` 已通过 2 个 390px 场景：真实登录后查看任务、关联客户证据并完成任务；无 session 时显示安全恢复状态。截图为 `employee-task-detail-mobile.png` 和 `employee-task-detail-forbidden.png`，trace 位于 `playwright-output/`。
