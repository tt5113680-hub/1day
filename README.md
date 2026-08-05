# ONEDAY V3

ONEDAY V3 是企业 AI 经营操作系统的 Monorepo。该仓库由 pnpm 10 与 Turborepo 管理，包含四个 Web 端、API、Worker 及共享领域包。

## 工作区

- `apps/consumer-web`：消费者端
- `apps/employee-web`：员工端
- `apps/management-web`：管理端
- `apps/platform-web`：平台端
- `apps/api`：NestJS + Fastify API
- `apps/worker`：异步任务 Worker
- `packages/*`：共享契约、数据、认证、事件、工作流、AI、可观测性、设计与测试能力

## 基础命令

在 PowerShell 中使用 `pnpm.cmd`：

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
```
