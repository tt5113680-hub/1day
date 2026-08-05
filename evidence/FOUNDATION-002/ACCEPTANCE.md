# FOUNDATION-002 验收证据

## 范围

- [x] PostgreSQL 18、Redis 8、API 和 Worker 已在单个 Docker Compose 文件中定义。
- [x] 每个服务均有健康检查；API 与 Worker 使用实际 HTTP 健康端点。
- [x] 本地端口与旧项目的 `5432`、`6379` 隔离。

## 质量证据

- [x] `docker compose -f infra/docker/compose.yaml config`：配置展开成功，Compose 项目名为 `oneday-v3`。
- [x] `docker compose -f infra/docker/compose.yaml up --build -d`：四个服务成功构建并启动。
- [x] `docker compose ... ps`：PostgreSQL、Redis、API、Worker 均为 `healthy`；PostgreSQL 使用 `5434`、Redis 使用 `6380`，未触碰旧项目容器。
- [x] HTTP 自测：`GET http://127.0.0.1:3001/api/v1/health` 返回 `{"status":"ok","service":"oneday-api"}`；`GET http://127.0.0.1:3002/health` 返回 `{"status":"ok","service":"oneday-worker"}`。
- [x] `pnpm.cmd install --frozen-lockfile`：锁文件最新，退出码 0。
- [x] `pnpm.cmd typecheck`：17/17 工作区成功。
- [x] `pnpm.cmd test`：25/25 根目录契约测试通过，17/17 工作区测试命令成功。
- [x] `pnpm.cmd build`：17/17 工作区成功。
- [x] `pnpm.cmd audit --prod --audit-level high`：无已知高危漏洞。

## 不适用项

- 数据库迁移、认证、租户隔离、RBAC、事件、页面 E2E 与视觉回归由后续任务实现；本任务未将其标记为通过。
