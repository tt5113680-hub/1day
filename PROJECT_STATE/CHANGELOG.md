# CHANGELOG

## 2026-08-06 — PAGE-C-005 PASS

- Delivered `/c/actions/[id]` as a real external-action confirmation and recovery flow, connected from the consumer entry rather than directly trusting browser-side destinations.
- Added a tenant-scoped public confirmation API and persisted redirect events with idempotency, audit records, Outbox events and safe local-only return paths.
- HTTP tenant/isolation/idempotency tests, two 390px Chromium scenarios with screenshots/traces, and full gates passed: 70 repository tests, lint, format, 17-package typecheck/build, migration/seed and evidence checks.

## 2026-08-06 — PAGE-C-004 PASS

- Delivered a tenant-scoped consumer service page at `/c/services/[id]`, including applicable store, benefits, explicit consultation result and loading/error/unavailable states.
- The service action is resolved server-side, reuses the persisted, idempotent, audited consumer-action flow, and preserves strict tenant/store/action boundaries.
- HTTP isolation and idempotency checks, 390px Chromium interaction/screenshots/traces, plus full gates passed: lint, format, 17-package typecheck/build, Vitest, 68 repository tests, migration/seed and evidence checks.

## 2026-08-06 — PAGE-C-003 PASS

- Delivered a real consumer store detail experience with persisted services, benefits, content, action entry, deep-link source retention and complete loading/empty/error/forbidden feedback.
- Public consultation clicks are tenant/store/action scoped, idempotent, audited and published as `consumer.action.clicked.v1`. CORS is an explicit environment allowlist rather than a wildcard.
- HTTP isolation and event tests, 390px browser interaction/screenshots/traces, and full gates passed: 66 repository tests, 17-package typecheck/build, lint, format, migration/seed and evidence checks.

## 2026-08-06 — PAGE-C-002 PASS

- Delivered the consumer discovery page backed by distinct tenant-scoped channel, business-circle and merchant-location models. Public coordinate validation, empty/error/forbidden/loading states, browser geolocation action and 390px responsive interaction are implemented.
- Real HTTP data-isolation validation, two Chromium E2E scenarios with normal/empty/forbidden screenshots and traces, and the full repository gate passed: lint, format, 17-package typecheck/build, Vitest, 64 repository tests, migration/seed and evidence checks.
- Isolated PAGE-C-001 public-entry fixtures so concurrent repository tests no longer select each other’s published content.

## 2026-08-06 — PAGE-C-001 PASS

- 交付真实数据驱动的消费者统一入口：已发布模板、服务权益、推荐和外部行动入口按租户公开呈现，包含空、不可用、加载和错误恢复状态。
- 构建后 HTTP API、390px Playwright 交互与三种状态截图/trace 已通过；全仓质量闸门和 evidence check 已通过。

## 2026-08-06 — CORE 阶段验收 PASS

- CORE-001 至 CORE-010 的任务提交、验收证据、HTTP/权限/租户边界与全仓质量闸门已复核通过；报告：`evidence/CORE-PHASE/ACCEPTANCE.md`。

## 2026-08-06 — CORE-010 PASS / CORE 阶段完成

- 交付版本化工作流定义、实例、条件、真实任务生成、指派审批和超时终止；每个关键状态变更均有租户/RBAC 边界、审计与 Outbox 事件。
- 构建后 HTTP E2E 验证定义幂等、发布、任务、条件、审批、超时、认证、无权限和跨租户拒绝；60 项仓库测试、Vitest、typecheck、lint、format、build、迁移、种子和 evidence check 已通过。

## 2026-08-06 — CORE-009 PASS

- 交付租户隔离的 HTTP(S) 链接、小程序路径和平台入口配置，以及可追踪的点击事件。
- 构建后 HTTP E2E 验证幂等、动作事件、审计、Outbox、输入校验、未登录、无权限与跨租户拒绝；58 项仓库测试、Vitest、typecheck、lint、format、build、迁移、种子和 evidence check 已通过。

## 2026-08-06 — CORE-008 PASS

- 交付租户页面模板、模块实例、版本草稿、预览、发布和回滚；关键操作采用乐观锁、审计与 Outbox 事件。
- 构建后 HTTP E2E 验证完整版本状态机及认证/跨租户拒绝；56 项仓库测试、Vitest、typecheck、lint、format、build、迁移、种子和 evidence check 已通过。

## 2026-08-06 — CORE-007 PASS

- 交付客户订单、图片证据文件、哈希化核销码和连接器结果回执；图片仅接受受限格式并经租户授权下载。
- 构建后 HTTP E2E 验证订单幂等、文件安全、核销、回执、审计、Outbox、未登录、无角色和跨租户拒绝；54 项仓库测试、Vitest、typecheck、lint、format、build、迁移和 evidence check 已通过。

## 2026-08-06 — CORE-006 PASS

- 交付租户隔离的任务、持久化提醒、超时升级、员工勿扰偏好和通知日志；关键写操作均有乐观锁、审计和 Outbox 事件。
- 构建后 HTTP E2E 验证到期升级、提醒投递、勿扰抑制/恢复、未登录和跨租户拒绝；52 项仓库测试、Vitest、typecheck、lint、format、build、迁移和 evidence check 已通过。

## 2026-08-06 — CORE-005 PASS

- 交付客户来源、推荐/接待/成交/核销贡献、归属链与审批式转移；所有关键写操作均有乐观锁、审计和 Outbox 事件。
- 锁定依赖安装、lint、format、Vitest、50 项仓库测试、typecheck、build 和 evidence check 已通过。

## 2026-08-06 — CORE-004 PASS

- 交付客户主档、手机号/微信身份哈希与脱敏、同租户去重、乐观锁身份新增和客户合并。
- 所有客户写操作均通过动作权限、TenantContext、审计日志和带 correlation/trace 的 Outbox 事件保护。
- 锁定依赖安装、lint、format、Vitest、48 项仓库测试、typecheck、build 和 evidence check 已通过。

## 2026-08-06 — FOUNDATION-010 PASS

- 配置 Vitest、Playwright Chromium、evidence 校验和可重复截图/trace 输出。
- 生成 Consumer 应用壳截图并通过最终全仓质量闸门；代码提交：`0666f345d009334c705b5604d0334c0319834846`。

## 2026-08-06 — FOUNDATION-009 PASS

- 建立设计令牌、统一状态文案及四端应用壳/状态边界。
- 四端构建和全仓质量闸门通过；代码提交：`2b3aac67876a84cff99048e0087adaee38171f5f`。

## 2026-08-06 — FOUNDATION-008 PASS

- 实现 PostgreSQL Outbox、消费者唯一键幂等与 correlation/trace 追踪字段。
- 实际数据库一致性测试和全仓质量闸门通过；代码提交：`f16ef6a1b98ace697eaa74be1d908233c02ab519`。

## 2026-08-06 — FOUNDATION-007 PASS

- 建立成员角色映射、统一授权服务和权限矩阵 HTTP E2E。
- 全仓质量闸门通过；代码提交：`678a4e5041057c4dc7651205c87e1a9ea73f82b8`。

## 2026-08-06 — FOUNDATION-006 PASS

- 建立基于认证声明的 TenantContext，拒绝客户端租户头与服务端声明不一致的请求。
- 真实 HTTP 跨租户读/写隔离测试和全仓质量闸门通过；代码提交：`d218f82044c979103ae264420c2d898257796341`。

## 2026-08-06 — FOUNDATION-005 PASS

- 实现持久化登录、刷新轮换、登出与会话撤销 API，并以会话租户字段拒绝跨租户撤销。
- 认证 HTTP E2E 和全仓质量闸门均通过；代码提交：`c9f40f810a6b259a7c0abdcb4636d63436144959`。

## 2026-08-06 — FOUNDATION-004 PASS

- 建立 Kysely PostgreSQL 数据访问、类型化基础表迁移、回滚与前向修复 CLI。
- 建立可重复执行的系统租户和基础权限种子，并提供受保护的测试数据库准备器。
- 实测 PostgreSQL 18 测试库的迁移、幂等迁移/种子、回滚和前向修复；完成全仓质量闸门。
- 任务代码提交：`3685e9a07be6e98e4980d00afabeb33be8087106`。

## 2026-08-05 — FOUNDATION-001 PASS

- 初始化 Git 仓库、pnpm 10 与 Turborepo Monorepo。
- 建立四个 Next.js 16 Web 入口、NestJS 11 + Fastify API、Worker 与 11 个共享包。
- 通过冻结依赖安装、17 工作区类型检查、20 项结构契约测试、17 工作区构建、API health 注入测试和生产依赖安全审计。
- 任务提交：`1d94bb72ac8b89d2dab8948d7a1f8a7567c94f06`。

## 2026-08-05 — FOUNDATION-002 PASS

- 建立 PostgreSQL 18、Redis 8、API 与 Worker 的 Docker Compose，并将项目名、数据卷和主机端口与旧项目隔离。
- API 和 Worker 均具备真实 HTTP 健康检查；容器实测全部 healthy。
- 通过冻结依赖安装、17 工作区类型检查、25 项契约测试、17 工作区构建和生产依赖安全审计。
- 任务提交：`b32844de7d84e5a6a94a3305bfaf57b999417cf8`。

## 2026-08-06 — FOUNDATION-003 PASS

- 建立统一 ESLint、Prettier、Commitlint 和 Zod 环境变量校验。
- 通过格式、类型、Lint、26 项契约测试、17 工作区构建和生产依赖安全审计。
