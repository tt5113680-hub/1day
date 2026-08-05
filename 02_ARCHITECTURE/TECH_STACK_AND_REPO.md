# 技术栈与仓库结构

## 固定技术栈

- Node.js 24 LTS
- pnpm 10（Corepack）
- TypeScript 6
- Turborepo Monorepo
- Next.js 16 + React 19
- NestJS 11 + Fastify
- PostgreSQL 18
- Redis 8
- Kysely
- BullMQ
- Pino
- OpenTelemetry
- Vitest
- Playwright
- CSS Modules + PostCSS

## 新仓库目录

```text
D:\ONEDAY_V3
├─ apps
│  ├─ consumer-web
│  ├─ employee-web
│  ├─ management-web
│  ├─ platform-web
│  ├─ api
│  └─ worker
├─ packages
│  ├─ ui
│  ├─ design-tokens
│  ├─ contracts
│  ├─ database
│  ├─ auth
│  ├─ events
│  ├─ workflows
│  ├─ ai-core
│  ├─ observability
│  ├─ testing
│  └─ config
├─ infra
│  ├─ docker
│  ├─ migrations
│  ├─ seeds
│  └─ scripts
├─ docs
├─ PROJECT_STATE
└─ evidence
```

## 前后端边界

- Web 只负责显示、交互、表单校验和本地状态。
- 权限、数据隔离、业务规则、审计和状态机必须在 API 层再次校验。
- Worker 负责异步提醒、AI任务、连接器同步、超时检测和报表聚合。
- Contracts 包作为前后端共享契约唯一来源。
