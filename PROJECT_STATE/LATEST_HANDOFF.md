# LATEST_HANDOFF

## CORE-009 已交接

- `CORE-009` 已 PASS：外部 HTTP(S) 链接、小程序 App ID/路径与平台入口均按租户配置；所有点击事件可追踪，并写入审计和带 correlation/trace 的 Outbox 事件。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（58/58）、`test:unit`、`build`、`db:migrate`、`db:seed`、`tests/core-009-e2e.test.mjs`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/CORE-009/ACCEPTANCE.md`。本任务不调用未经授权的第三方服务，外部服务失败和页面 E2E/截图不适用。
- 下一任务：`CORE-010` — 标准工作流引擎。

## CORE-008 已交接

- `CORE-008` 已 PASS：模板、模块、版本、草稿预览、发布与回滚均通过租户/RBAC 边界实现；关键变更含审计与可追踪 Outbox 事件。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（56/56）、`test:unit`、`build`、`db:migrate`、`db:seed`、`tests/core-008-e2e.test.mjs`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/CORE-008/ACCEPTANCE.md`。模板 API 将由后续各角色页面任务消费；本任务不依赖外部服务。
- 下一任务：`CORE-009` — 入口插件与外部动作。

## CORE-007 已交接

- `CORE-007` 已 PASS：客户订单、截图/照片的受限图片证据、哈希化核销码和连接器回执均已持久化；文件读取经租户/RBAC 校验并带下载安全响应头。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（54/54）、`test:unit`、`build`、`db:migrate`、`db:seed`、`tests/core-007-e2e.test.mjs`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/CORE-007/ACCEPTANCE.md`。本任务无页面交付；页面 E2E、截图和无障碍不适用。外部第三方调用属于后续 CORE-009，当前回执为受控持久化输入。
- 下一任务：`CORE-008` — 页面模板与模块。

## CORE-006 已交接

- `CORE-006` 已 PASS：任务创建与完成、客户/员工租户校验、提醒、到期升级、勿扰抑制与恢复、通知日志均已持久化；关键写操作在事务内记录审计和带 correlation/trace 的 Outbox 事件。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（52/52）、`test:unit`、`build`、`db:migrate`、`tests/core-006-e2e.test.mjs`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/CORE-006/ACCEPTANCE.md`。页面 E2E、截图、无障碍与外部服务失败场景不适用（本任务无页面且无外部依赖）。
- 下一任务：`CORE-007` — 证据与结果回收。

## CORE-005 已交接

- `CORE-005` 已 PASS：首要/当前/最终来源、贡献角色与证据、归属转移申请和审批均已实现；归属修改留有审计和可追踪 Outbox 事件。
- 验证：`pnpm.cmd install --frozen-lockfile`、typecheck、lint、format check、Vitest、50 项仓库测试、build、`tests/core-005-e2e.test.mjs` 和 evidence check 均通过。
- 证据：`evidence/CORE-005/ACCEPTANCE.md`；页面 E2E、截图、可访问性和外部服务失败不适用（本任务无页面或外部服务）。
- 下一任务：`CORE-006` — 任务提醒与升级。

## CORE-004 已交接

- `CORE-004` 已 PASS：客户主档、手机号/微信身份的哈希化持久化与脱敏展示、同租户身份去重、乐观锁、合并记录、审计和 Outbox 事件均已实现。
- 验证：`pnpm.cmd install --frozen-lockfile`、typecheck、lint、format check、Vitest、48 项仓库测试、build、`tests/core-004-e2e.test.mjs` 和 evidence check 均通过。
- 证据：`evidence/CORE-004/ACCEPTANCE.md`；页面 E2E、截图、可访问性和外部服务失败不适用（本任务无页面或外部服务）。
- 下一任务：`CORE-005` — 来源归属与贡献。

## CORE-003 已交接

- `CORE-003` 已 PASS：角色模板、创建幂等、敏感权限确认、乐观锁、确认记录与审计日志已实现。
- 验证：typecheck、lint、format check、46 项仓库测试、Vitest、build、CORE-003 HTTP E2E、evidence check 均通过。
- 下一任务：`CORE-004` — 客户主档与身份。

## CORE-002 已交接

- `CORE-002` 已 PASS：员工邀请、成员接受、员工与组织归属、离职状态、审计和 Outbox 事件已实现并通过真实 HTTP 验证。
- 验证：typecheck、lint、format check、44 项仓库测试、Vitest、build、`tests/core-002-e2e.test.mjs` 和 evidence check 均通过。
- 下一任务：`CORE-003` — 角色与权限管理服务。

## CORE-001 已交接

- `CORE-001` 已 PASS：组织、组织关系、商户、门店、创建幂等、乐观锁、TenantContext/RBAC 校验及 audit logs 已实现并真实 HTTP 验证。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（41/41）、`test:unit`（1/1）、`build`、`evidence:check` 均通过。
- 下一任务：`CORE-002` — 用户员工与成员关系。

## 已确认事实

- `FOUNDATION-001` 已 PASS，代码提交为 `1d94bb72ac8b89d2dab8948d7a1f8a7567c94f06`。
- `FOUNDATION-002` 已 PASS，代码提交为 `b32844de7d84e5a6a94a3305bfaf57b999417cf8`。
- `FOUNDATION-003` 已完成质量配置并通过验证，提交待本轮写入。
- pnpm/Turbo Monorepo 已建立，包含四个 Next.js 16 Web 应用、NestJS 11 + Fastify API、Worker 与 11 个共享包。
- 开发环境已核验：Node.js 24、pnpm 10、Git 和 Docker 可用。
- 旧项目 `D:\1DAY_V2` 未被访问或修改。

## 施工状态

- `FOUNDATION-004` 已 PASS：Kysely 迁移、种子、回滚/前向修复和测试数据库框架已实现并真实验证；代码提交为 `3685e9a07be6e98e4980d00afabeb33be8087106`。
- PostgreSQL 测试库 `oneday_v3_test` 保留在本地 Docker 环境，包含 `001_foundation_schema` 迁移、1 个系统租户和 2 条基础权限。
- 基础阶段 `FOUNDATION-001` 至 `FOUNDATION-010` 已获验收：MILESTONE PASS，完成度 `10/69`，最终状态提交为 `239114e`。
- Playwright 的 Next.js 开发服务器会输出跨源资源警告；截图与 E2E 均通过，列为已知观察项，不构成当前阻塞。

## 下一步

用户已正式授权进入 CORE。创建 `core/CORE-001` 分支，读取租户与组织模型任务及直接依赖规范后开始施工；CORE 阶段最后一个任务为 `CORE-010`。

## 禁止

不得修改旧工程 `D:\1DAY_V2`。
