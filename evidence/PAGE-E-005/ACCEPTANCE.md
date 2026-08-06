# PAGE-E-005 验收证据

- 页面：`/e/share` 为登录员工提供员工码、活动码与渠道码的创建、二维码、复制链接、打开次数和即时失效操作；覆盖加载、空、错误、无权限、禁用与成功反馈。二维码编码的是消费者分享页 `/c/share/{code}`，而非静态占位图。
- 数据与安全：迁移 `024_employee_share_codes` 持久化租户、员工、场景、内部目标路径、失效时间、状态和乐观锁版本；`employee_share_code_events` 保存每次打开。创建、列表和撤销均要求 active employee、租户上下文和 RBAC；创建有幂等键，撤销检查版本。所有写入在事务内留下 audit log 与带 correlation/trace 的 Outbox 记录。
- 消费者入口：`/c/share/{code}` 调用受限公开打开接口，服务端拒绝过期或撤销码，记录来源追踪后才带 tenant 和 shareCode 进入安全的内部 `/c/` 目标路径。
- HTTP：`node --test tests/page-e-005-api.test.mjs` 验证创建重放、公开打开、来源事件、审计/Outbox、撤销、过期输入、未登录与跨租户拒绝。
- 浏览器：`pnpm.cmd exec playwright test --config playwright.page-e-005.config.ts` 通过两个 390px 场景；截图为 `employee-share-mobile.png`、`employee-share-forbidden.png`，trace 位于 `playwright-output/`。
