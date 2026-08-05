# 数据库迁移

迁移源代码位于 `packages/database/src/migrations`，由编译后的数据库 CLI 加载，避免在生产环境执行未编译的 TypeScript。

- `pnpm.cmd db:migrate`：执行未应用迁移。
- `pnpm.cmd db:rollback`：仅回退最近一项迁移；仅用于本地开发或受控修复。
- `pnpm.cmd db:repair`：安全的前向修复，执行到最新迁移版本。

所有迁移必须向前兼容；已共享环境的问题使用新的迁移修复，不得改写已应用的迁移文件。
