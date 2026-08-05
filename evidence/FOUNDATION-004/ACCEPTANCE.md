# FOUNDATION-004 验收证据

## 实现范围

- `@oneday/database` 提供 Kysely PostgreSQL 客户端、类型化表模型和 `001_foundation_schema` 迁移。
- CLI 支持 `migrate`、单步 `down`、前向 `repair`、幂等 `seed` 和受保护的 `test:prepare`。
- 迁移建立租户、用户/成员、角色/权限/范围、Outbox 与审计基础表，以及租户和 Outbox 分发索引。
- 基础种子写入系统租户及两条基础权限，使用冲突忽略确保重复执行安全。

## 已执行验证

| 验证 | 命令 | 结果 |
| --- | --- | --- |
| 冻结依赖 | `pnpm.cmd install --frozen-lockfile` | PASS |
| 类型检查 | `pnpm.cmd typecheck` | PASS，17 个工作区 |
| Lint | `pnpm.cmd lint` | PASS |
| 格式检查 | `pnpm.cmd format:check` | PASS |
| 自动化测试 | `pnpm.cmd test` | PASS，根测试 28 项、工作区测试 17 个 |
| 构建 | `pnpm.cmd build` | PASS，17 个工作区 |
| PostgreSQL 迁移 | `migrate` 两次、`seed` 两次、`down`、`repair`、再次 `seed` | PASS |

## 实际数据库结果

测试库 `oneday_v3_test` 在 PostgreSQL 18 容器中完成迁移、回滚和前向修复。最终查询结果：

- `kysely_migration.name = 001_foundation_schema`
- `tenants = 1`
- `permissions = 2`

测试库创建仅在 `ONEDAY_ALLOW_TEST_DATABASE=1` 时允许，且名称必须匹配 `oneday*_test*`；本任务没有删除任何数据库或 Docker 数据卷。
