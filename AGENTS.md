# ONEDAY V3 开发规则

本仓库写代码执行器（2026-08-10 起）：

| 模式 | 执行器 | 条件 |
| ---- | ------ | ---- |
| **本地无人值守施工** | **Cursor Headless CLI**（`scripts/local-unattended-construction.ps1`） | 主人授权 I；计划任务或 daemon 运行中 |
| **人工窗口 / 验收** | Cursor IDE Agent | 与 Headless **不得并行写入**同一分支 |
| **禁止** | Codex、Cloud 并行写入、第二个写入代理 | 始终 |

见 `PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`、`PROJECT_STATE/EXECUTOR_HANDOFF.md`。

## 任务纪律

1. 每次只处理一个 `TASK`；不得跨任务扩展或重复开发状态已为 `PASS` 的任务。
2. 开始开发前必须读取：
   - `PROJECT_STATE/COMMERCIAL_EXECUTION_CHARTER.md`（**不可偏离总纲**）
   - `PROJECT_STATE/CURRENT_STATE.md`
   - `PROJECT_STATE/TASK_QUEUE.md`
   - `PROJECT_STATE/LATEST_HANDOFF.md`
   - 当前任务文件及其直接依赖规范
   - `git status`
3. 仅可修改 `D:\ONEDAY_V3`。`D:\1DAY_V2` 仅可作为明确授权的只读参考，禁止修改、迁移、覆盖或删除。

## 完成门槛

任务完成前必须依次完成并保留真实证据：

1. 编码；
2. 自测；
3. 类型检查；
4. 构建；
5. 适用测试；
6. 更新项目状态；
7. Git 提交。

没有可核验的测试、构建或验收证据，不得标记 `PASS`。状态文件只能记录已验证事实。

## 故障与安全

- 技术错误允许自主诊断和修复，最多三轮；第三轮后仍失败，立即停止并生成 `PROJECT_STATE/BLOCKED_REPORT.md`。
- 产品不明确、权限不足、账号问题或必须安装系统级软件时，不得猜测或绕过；生成 `PROJECT_STATE/BLOCKED_REPORT.md` 后停止当前任务。
- 禁止执行 `git reset --hard`、`git clean -fd`、强制推送、删除数据库、删除 Docker 数据、修改 Windows 系统设置或用户权限。
- 允许在项目范围内安装项目依赖、执行测试和构建，以及进行正常的非强制 Git 提交。

## 状态与分支

- 使用任务对应分支：`foundation/FOUNDATION-xxx`、`core/CORE-xxx`、`page/PAGE-*-xxx`、`channel/CHANNEL-xxx` 或 `hardening/HARDENING-xxx`。
- 每个通过的任务必须更新 `CURRENT_STATE.md`、`TASK_QUEUE.md`、`CHANGELOG.md` 和 `LATEST_HANDOFF.md`，并在 `evidence/<TASK-ID>/` 保存验收证据。
