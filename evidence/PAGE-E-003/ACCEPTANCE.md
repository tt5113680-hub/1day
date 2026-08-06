# PAGE-E-003 验收证据

- 页面：`/e/customers/{id}` 为员工移动客户详情，显示持久化客户摘要、脱敏身份、来源、本人归属、标签、本人关联任务与客户/任务时间线，并实现加载、错误、无权限和空数据状态。
- 数据与权限：迁移 `022_customer_tags` 提供租户绑定的客户标签。`GET /api/v1/employee/customers/:id` 要求 `customer.read`、有效员工身份以及客户与本人归属、本人任务或本人贡献中的至少一种关系；不相关客户返回 404，跨租户返回 403。
- 脱敏与范围：详情仅返回身份的 `type` 与 `maskedValue`，不返回 identity hash、原始身份、来源 ID 或其他员工姓名；任务列表仅含当前员工分配的任务，时间线仅含客户动作名称与本人任务的安全摘要。
- HTTP：`node --test tests/page-e-003-api.test.mjs` 通过真实 PostgreSQL/API 验证关系范围、脱敏字段、来源/归属/标签/任务/时间线、未登录、无关联客户和跨租户拒绝。
- 浏览器：`pnpm.cmd exec playwright test --config playwright.page-e-003.config.ts` 通过两个 390px 场景：关联客户详情与任务跳转；无 session 安全恢复。截图为 `employee-customer-detail-mobile.png`、`employee-customer-detail-forbidden.png`，trace 位于 `playwright-output/`。
