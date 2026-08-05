# ONEDAY V3 环境检查报告

检查时间：2026-08-05  
检查范围：`D:\ONEDAY_V3` 本机开发环境（未修改系统设置、旧项目或 Docker 数据）。

| 项目                    | 结果       | 证据/处理                                                                                                 |
| ----------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| Node.js                 | 通过       | `v24.19.0`，满足 Node.js 24 LTS 要求。                                                                    |
| Corepack                | 通过       | `0.35.0`。                                                                                                |
| pnpm                    | 通过       | `pnpm.cmd --version` 与 `corepack pnpm --version` 均为 `10.34.0`，满足 pnpm 10 要求。                     |
| Git                     | 通过       | `git version 2.53.0.windows.3`。                                                                          |
| Docker CLI/Daemon       | 通过       | Docker `29.6.2`，Docker Compose `v5.3.1`，守护进程可用。                                                  |
| PostgreSQL/Redis 镜像   | 可用       | 本机已有 `postgres:18` 和 `redis:8` 镜像。                                                                |
| PostgreSQL/Redis 客户端 | 非必需缺失 | `psql` 与 `redis-cli` 未在 PATH；后续应使用项目 Docker 服务或容器内客户端，不安装系统级软件。             |
| 新项目数据库            | 尚未建立   | 当前运行容器属于旧项目（`1day_v2-*`），禁止复用、修改或停止；`FOUNDATION-002` 应创建 ONEDAY V3 独立服务。 |
| 项目依赖                | 尚未建立   | 目前没有 `package.json` 或 `pnpm-lock.yaml`；`FOUNDATION-001` 创建清单后再安装依赖。                      |

## 注意事项

- PowerShell 的 `pnpm.ps1` 受现有执行策略限制。不会修改 Windows 执行策略；项目命令统一使用 `pnpm.cmd`（或 `corepack pnpm`）。
- 未发现需要自动安装的项目依赖。系统级客户端缺失不自动安装，符合安全规则。
- Docker 中现有旧项目容器仅作为隔离风险记录，未访问其数据、未执行任何状态变更。
