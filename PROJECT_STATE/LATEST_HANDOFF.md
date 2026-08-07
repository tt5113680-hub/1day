# LATEST_HANDOFF

## PAGE-M-001 completed

- `PAGE-M-001` is PASS at `0264231`: `/m/dashboard` presents tenant-scoped customer, order and task results, current overdue/pending-ownership exceptions and rule-based explainable suggestions with action links. The read endpoint requires `tenant.manage`, and all displayed signals trace to persisted records.
- Verification passed: `tests/page-m-001-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-m-001.config.ts` (two 1440px browser flows, screenshots and traces); lint, format, 17-package typecheck/build, Vitest, `test` (92), migration/seed and evidence checks. Evidence: `evidence/PAGE-M-001/ACCEPTANCE.md`. Next task: `PAGE-M-002` management funnel.

## PAGE-E-009 completed

- `PAGE-E-009` is PASS at `8335f65`: `/e/profile` provides each active employee's persisted identity, organization, same-organization stores, effective permissions, safe internal tools and notification preference. The profile-specific preference write resolves the employee on the server from the active membership, preventing a caller from changing a peer's setting while retaining CORE-006 version, audit and Outbox semantics.
- Verification passed: `tests/page-e-009-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-e-009.config.ts` (two 390px browser flows, screenshots and traces); lint, format, 17-package typecheck/build, Vitest, `test` (91), migration/seed and evidence checks. Evidence: `evidence/PAGE-E-009/ACCEPTANCE.md`. Next task: `PAGE-M-001` management overview.

## PAGE-E-008 completed

- `PAGE-E-008` is PASS at `20f92f8`: `/e/notifications` presents each active employee's persisted task reminder, overdue anomaly, pending customer-ownership approval and system notifications, with category/read filters and safe internal deep links. CORE-006 notification logs and pending approvals materialize idempotently into an employee-private inbox; read writes enforce task permission, employee ownership, optimistic version and idempotency, and record audit/Outbox data.
- Verification passed: `tests/page-e-008-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-e-008.config.ts` (two 390px browser flows, screenshots and traces); lint, format, 17-package typecheck/build, Vitest, `test` (90), migration/seed and evidence checks. Evidence: `evidence/PAGE-E-008/ACCEPTANCE.md`. Next task: `PAGE-E-009` employee profile and tools.

## PAGE-E-007 completed

- `PAGE-E-007` is PASS at `a0aa0b7`: `/e/nurture` shows employee-owned persisted active, repurchase and dormant customers with order/task signals. Employees can adjust a profile, record a non-sending touchpoint or create a real follow-up task; writes enforce active-employee/RBAC/tenant/version/idempotency and record audit/Outbox. E006 nurture conversions create the profile automatically.
- Verification passed: `tests/page-e-007-api.test.mjs` against a spawned production API/PostgreSQL; `playwright.page-e-007.config.ts` (two 390px browser flows, screenshots and traces); lint, format, 17-package typecheck/build, Vitest, `test` (88), migration/seed and evidence checks. Evidence: `evidence/PAGE-E-007/ACCEPTANCE.md`. Next task: `PAGE-E-008` employee notifications.

## PAGE-E-006 completed

- `PAGE-E-006` is PASS at `1a04177` (feature base `11a5b09`): `/e/leads` presents persisted tenant-scoped leads with filter, claim, employee allocation, conversion to follow-up task or nurture queue, clear mobile feedback and recovery states. Writes use active-employee/RBAC validation, optimistic versions, idempotency, audit and correlated Outbox events.
- Verification passed: `tests/page-e-006-api.test.mjs` against a spawned production API and PostgreSQL; `playwright.page-e-006.config.ts` with two 390px browser flows/screenshots/traces; lint, format, 17-package typecheck/build, Vitest, `test` (86), migration/seed and evidence checks. Evidence: `evidence/PAGE-E-006/ACCEPTANCE.md`. Next task: `PAGE-E-007` employee nurture workbench.

## PAGE-E-005 completed

- `PAGE-E-005` is PASS at `403e687`: `/e/share` creates employee/campaign/channel codes with a genuine QR code, expiry and explicit revocation. The consumer share landing records a persistent source event before routing to the tenant's safe internal consumer path; inactive or expired codes are rejected.
- Verification passed: `tests/page-e-005-api.test.mjs`, `playwright.page-e-005.config.ts` (390px generated-QR and recovery screenshots/traces), lint, format, typecheck, test:unit, test (84), build, migration/seed and evidence checks. Evidence: `evidence/PAGE-E-005/ACCEPTANCE.md`. Next task: `PAGE-E-006` employee acquisition pool.

## PAGE-E-004 completed

- `PAGE-E-004` is PASS at `edbdf25`: task follow-ups preserve raw records, voice transcription, editable summary and a transactionally created next task, all restricted to the active employee's own tasks.
- Verification passed: `tests/page-e-004-api.test.mjs`, `playwright.page-e-004.config.ts`, lint, format, typecheck, test, build, migration/seed and evidence checks. Evidence: `evidence/PAGE-E-004/ACCEPTANCE.md`. Next task: `PAGE-E-005` sharing codes and scenarios.

## PAGE-E-003 completed

- `PAGE-E-003` is PASS at `5c16e9c`: employee customer detail exposes only employee-related customer records, with masked identities, persisted sources/ownership/tags, own task links and safe timeline data.
- Verification passed: `tests/page-e-003-api.test.mjs`, `playwright.page-e-003.config.ts`, lint, format, typecheck, test:unit, test (79), build, migration/seed and evidence checks. Evidence: `evidence/PAGE-E-003/ACCEPTANCE.md`. Next task: `PAGE-E-004` employee follow-up records.

## PAGE-E-002 completed

- `PAGE-E-002` is PASS at `1f0b19c`: `/e/tasks/[id]` reads only the active employee's own persisted task, including reason, deadline, customer and safe evidence metadata. Employees can link only that customer's active evidence with idempotency, audit and Outbox records, and complete their own task through the existing versioned state machine.
- Verification passed: `tests/page-e-002-api.test.mjs`, `playwright.page-e-002.config.ts` (390px normal/login-recovery screenshots and traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test` (78), `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-E-002/ACCEPTANCE.md`. Next task: `PAGE-E-003` employee customer detail.

## PAGE-E-001 completed

- `PAGE-E-001` is PASS at `f2bc111`: `/e/workbench` reads only the current active employee's persisted tasks, customer reminders and explainable time-limit opportunities. It supports completing only the employee's own task with a version check, audit and Outbox event.
- Verification passed: `tests/page-e-001-api.test.mjs`, `playwright.page-e-001.config.ts` (390px normal/login-recovery screenshots and traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test`, `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-E-001/ACCEPTANCE.md`. Next task: `PAGE-E-002` employee task detail.

## PAGE-C-006 completed

- `PAGE-C-006` is PASS at `b7c5a59`: `/c/processes/[id]` reads persisted CORE-007 order results through an expiring tenant-bound secret. It shows order, consultation, appointment, verification, result receipts and exception feedback without returning customer identity fields.
- Verification passed: `tests/page-c-006-api.test.mjs`, `playwright.page-c-006.config.ts` (390px normal and recovery screenshots plus traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test` 72/72, `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-C-006/ACCEPTANCE.md`. Next task: `PAGE-C-007` consumer identity and membership.

## PAGE-C-005 completed

- `PAGE-C-005` is PASS at `37d5d61`: consumer entry actions open `/c/actions/[id]`, which confirms the action before a trusted browser redirect and keeps a safe local return path. Non-link actions expose a copyable code and recovery UI.
- Verification passed: `tests/page-c-005-api.test.mjs`, `playwright.page-c-005.config.ts` (390px redirect and unavailable screenshots plus traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test` 70/70, `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-C-005/ACCEPTANCE.md`. Next task: `PAGE-C-006` consumer process and result query.

## PAGE-C-004 completed

- `PAGE-C-004` is PASS at `b49f21b`: `/c/services/[id]` shows the persisted service, applicable store and benefit records in a tenant-scoped public read model. Its consultation action is server-resolved and idempotently records the existing consumer event, audit log and Outbox message.
- Verification passed: `tests/page-c-004-api.test.mjs`, `playwright.page-c-004.config.ts` (390px normal and unavailable screenshots plus traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test` 68/68, `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-C-004/ACCEPTANCE.md`. Next task: `PAGE-C-005` consumer external-action redirect and recovery.

## PAGE-C-003 completed

- `PAGE-C-003` is PASS at `97bdd48`: `/c/stores/[id]` renders tenant-scoped stores, services, benefits and content from PostgreSQL. Deep links preserve source context; public consultation is idempotent and writes a consumer action event, audit log and Outbox event.
- Verification passed: `tests/page-c-003-api.test.mjs`, `playwright.page-c-003.config.ts` (390px normal and unavailable screenshots plus traces), full `lint`, `format:check`, `typecheck`, `test:unit`, `test` 66/66, `build`, `db:migrate`, `db:seed`, `evidence:check` and `git diff --check`.
- Evidence: `evidence/PAGE-C-003/ACCEPTANCE.md`. Next task: `PAGE-C-004` consumer service and benefit detail.

## PAGE-C-002 completed

- `PAGE-C-002` is PASS at `04a39cc`: `/c/discovery` reads the public consumer discovery API. Channel recommendations, fixed business circles and LBS results have separate persisted models and queries; every read is scoped by active tenant ID. Coordinates are pair-validated and range-validated.
- Verification passed: `node --test tests/page-c-002-api.test.mjs`, `pnpm.cmd exec playwright test --config playwright.page-c-002.config.ts`, and the full repository gates (`lint`, `format:check`, `typecheck`, `test:unit`, `test` 64/64, `build`, `db:migrate`, `db:seed`, `evidence:check`, `git diff --check`). Evidence: `evidence/PAGE-C-002/ACCEPTANCE.md`, three 390px state screenshots and Playwright traces.
- The full suite exposed shared-fixture interference in PAGE-C-001; its public read fixture now uses a separate persisted tenant while retaining its protected template publishing validation. The concurrent full suite passed after the repair.
- Next task: `PAGE-C-003` consumer merchant detail page.

## PAGE-C-001 已交接

- `PAGE-C-001` 已 PASS：`/c/entry` 使用租户已发布的消费者模板和外部动作渲染品牌、场景、推荐、权益、咨询及固定底部导航；公共 API 对 slug 输入和租户范围严格校验。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（62/62）、`test:unit`、`build`、`db:migrate`、`db:seed`、`tests/page-c-001-api.test.mjs`、`playwright.page-c-001.config.ts`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/PAGE-C-001/ACCEPTANCE.md`，含移动端正常、空、不可用截图与 Playwright trace。下一任务：`PAGE-C-002` — 消费者发现页。

## CORE-010 已交接 / CORE 阶段验收 PASS

- `CORE-010` 已 PASS：工作流定义、版本发布、实例、上下文条件、员工任务、审批和超时处理均已持久化；实例以发布版本为准，关键动作有审计和带 correlation/trace 的 Outbox 事件。
- 验证：`pnpm.cmd typecheck`、`lint`、`format:check`、`test`（60/60）、`test:unit`、`build`、`db:migrate`、`db:seed`、`tests/core-010-e2e.test.mjs`、`evidence:check` 与 `git diff --check` 均通过。
- 证据：`evidence/CORE-010/ACCEPTANCE.md`。无页面或第三方服务调用，页面 E2E/截图、无障碍和外部服务失败不适用。
- 阶段：CORE-001 至 CORE-010 已完成并通过自动阶段验收，报告为 `evidence/CORE-PHASE/ACCEPTANCE.md`；下一任务为 `PAGE-C-001` — 消费者统一入口。

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
