# ONEDAY V3 本地基础设施

仅用于本机开发。请在仓库根目录执行：

```powershell
docker compose -f infra/docker/compose.yaml up --build -d
```

服务地址：PostgreSQL `localhost:5434`、Redis `localhost:6380`、API `http://localhost:3001/api/v1/health`、Worker `http://localhost:3002/health`。

该 Compose 项目名固定为 `oneday-v3`，端口特意避开旧项目的 `5432` 和 `6379`。不要将 `oneday_local_only` 用于任何非本地环境。
