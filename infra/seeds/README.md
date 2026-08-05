# 数据库种子

种子源代码位于 `packages/database/src/seeds`。运行 `pnpm.cmd db:seed` 会先迁移，再以冲突忽略方式写入确定性的基础权限数据，因此可重复执行。
