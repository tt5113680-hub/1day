# PAGE-E-004 验收证据

- 页面：`/e/tasks/{id}/follow-up` 提供动作选择、原始文字、语音转写、可编辑总结、可选下一任务和历史回显，并覆盖加载、错误、无权限、禁用与成功反馈。
- 数据与安全：`023_task_follow_ups` 持久化原始记录、转写、总结和下一任务。读写均验证 active employee + tenant + assignee employee，其他员工任务为 404；创建要求 `task.manage`、幂等键、输入校验，并在事务内写审计、Outbox 与下一任务。
- HTTP：`node --test tests/page-e-004-api.test.mjs` 验证本人范围、未登录、跨租户、幂等重放、下一任务、审计与 Outbox。
- 浏览器：`pnpm.cmd exec playwright test --config playwright.page-e-004.config.ts` 通过两个 390px 场景，截图为 `employee-follow-up-mobile.png`、`employee-follow-up-forbidden.png`，trace 位于 `playwright-output/`。
