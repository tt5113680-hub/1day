# 质量闸门

每个任务按适用性执行：

1. pnpm install --frozen-lockfile
2. typecheck
3. lint
4. format check
5. unit tests
6. integration tests
7. contract tests
8. database migration tests
9. permission and tenant-isolation tests
10. build
11. E2E
12. accessibility checks
13. visual screenshot checks
14. security checks
15. evidence completeness check

## PASS 条件

- 所有适用闸门通过；
- 不适用项写明原因；
- 无高危安全问题；
- 任务包验收项逐条有证据；
- 工作区干净；
- Git 提交和状态文件已更新。

禁止用“页面能打开”“大体完成”“暂时忽略”代替 PASS。
