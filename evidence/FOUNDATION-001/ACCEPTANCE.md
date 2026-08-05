# FOUNDATION-001 验收证据

## 范围

- [x] 初始化 Git 仓库及 `foundation/FOUNDATION-001` 分支。
- [x] 建立 pnpm 10 与 Turborepo Monorepo 配置。
- [x] 建立四个 Next.js Web 应用、NestJS + Fastify API 和 Worker。
- [x] 建立技术栈规定的 11 个共享包目录与 TypeScript 构建入口。
- [x] 建立 `infra`、`docs`、`PROJECT_STATE` 和 `evidence` 目录。

## 质量证据

- [x] `pnpm.cmd install --frozen-lockfile`：18 个工作区，锁文件最新，退出码 0。
- [x] `pnpm.cmd typecheck`：Turbo 在 17 个工作区完成类型检查，17/17 成功。
- [x] `pnpm.cmd test`：结构契约测试 20/20 通过；Turbo 17/17 工作区测试命令成功。
- [x] `pnpm.cmd build`：Turbo 17/17 工作区构建成功；四个 Next.js 应用均生成 `/` 和 `/_not-found` 静态路由。
- [x] API 自测：使用 Fastify 注入请求 `GET /api/v1/health`，返回 `{"status":"ok","service":"oneday-api"}`。
- [x] `pnpm.cmd audit --prod --audit-level high`：无已知高危漏洞。

## 修复记录

- TypeScript 6 不再接受 API 的旧 `moduleResolution: node`；已改为 `Node16`，复验通过。
- 生产依赖审计发现 `find-my-way` 高危版本；已通过 pnpm override 固定至 `9.7.0`，复验无高危漏洞。

## 不适用项

- 数据库迁移、认证、租户隔离、RBAC、事件、E2E、视觉回归和无障碍检查由后续任务实现；本任务未伪造其通过状态。
- 页面视觉验收不适用：本任务只建立应用入口骨架，页面任务尚未开始。
