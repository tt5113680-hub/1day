# CHANGELOG

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
