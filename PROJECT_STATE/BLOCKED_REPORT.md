# 部署阻塞报告（2026-08-09）

## 目标

在腾讯云轻量服务器 `49.232.124.130` 上，以独立目录 `/opt/oneday-v3` 构建 ONEDAY V3 的临时 IP 预览环境；不影响既有站点。

## 已完成且已核验

- 已创建独立项目目录、独立 Docker Postgres 容器和独立数据卷；未改动原有站点文件。
- 已从 GitHub 部署分支 `codex/deploy-source-e698b794` 下载并校验发布包，解压成功。
- 已使用 Node 24 Docker 基础镜像开始构建，未替换服务器现有 Node 22。

## 阻塞原因

Docker 发布构建在 API TypeScript 编译阶段失败：

```text
src/auth.service.ts(8,8): error TS2307: Cannot find module '@oneday/auth'
src/task.service.ts(246,52): error TS2307: Cannot find module '@oneday/events'
```

发布 Dockerfile 的 `human-pilot` 阶段先执行 `@oneday/api` 的构建，但没有先构建 API 所依赖的工作区包 `@oneday/auth` 和 `@oneday/events`。因此干净环境不能生成 API 镜像。

## 已执行轮次

1. 原始 Dockerfile 构建：依赖包未先构建，API 编译失败。
2. 服务器部署副本的临时构建顺序替换：替换语法异常，生成的 RUN 指令无效。
3. 以原始 Dockerfile 重建临时部署副本后重试：有效 Docker 构建链仍在 API 编译处失败。

依据仓库 `AGENTS.md` 的“最多三轮”规则，停止继续重试，未启动任何对外 ONEDAY 服务。

## 建议的下一步

在仓库中修正 `infra/docker/Dockerfile` 的 `human-pilot` 构建顺序，确保至少先构建：

```dockerfile
RUN pnpm --filter @oneday/auth build \
 && pnpm --filter @oneday/events build \
 && pnpm --filter @oneday/api build \
 && pnpm --filter @oneday/worker build
```

随后在干净 Docker 环境完成镜像构建验证，再恢复部署。该修复需作为一个新的、可验证的任务处理。

## Resolution follow-up（2026-08-09）

HARDENING-006 已恢复处理：服务器干净镜像构建还发现 `@oneday/session-client` 和 `@oneday/ui` 也须先构建。Dockerfile 已补齐该依赖阶段，正在进行新的干净构建验证。证据见 `evidence/HARDENING-006/ACCEPTANCE.md`。
