# Git 与状态协议

## 分支

- foundation/FOUNDATION-xxx
- core/CORE-xxx
- page/PAGE-C-xxx
- page/PAGE-E-xxx
- page/PAGE-M-xxx
- page/PAGE-P-xxx
- channel/CHANNEL-xxx
- hardening/HARDENING-xxx

## 提交格式

`type(scope): task-id 中文摘要`

示例：

`feat(employee): PAGE-E-001 员工工作台`

## 状态文件

- CURRENT_STATE.md：当前任务、分支、开始时间、最后安全提交；
- TASK_QUEUE.md：任务顺序和状态；
- CHANGELOG.md：已完成事实；
- LATEST_HANDOFF.md：下个会话恢复说明；
- DECISION_REQUIRED.md：产品决策阻塞；
- BLOCKED_REPORT.md：技术阻塞。

状态文件只能记录已验证事实，不记录推测。
