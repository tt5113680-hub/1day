# Codex 唯一执行协议

## 单一执行器

- Cursor 内 Codex 是唯一写代码代理。
- Cursor Agent、Headless 和其他代理不得同时写仓库。
- Codex 不得通过额外自动化脚本递归调用第二个写入代理。

## 每个任务的固定流程

1. 读取任务文件和依赖规范；
2. 检查 master 干净；
3. 创建任务分支；
4. 写施工计划；
5. 实现最小完整闭环；
6. 执行适用质量闸门；
7. 自动修复，最多三轮；
8. 生成 evidence；
9. 逐条验收；
10. 提交 Git；
11. 更新 PROJECT_STATE；
12. 返回简短报告。

## 禁止事项

- 不读取全部施工包后凭印象施工；
- 不跨任务批量修改；
- 不改产品冻结文件；
- 不删除未知代码；
- 不 reset --hard；
- 不伪造测试结果；
- 不在失败状态合并 master；
- 不把 TODO 当成已实现；
- 不以 mock 页面冒充真实业务闭环。

## 上下文管理

每个任务结束后必须把全部事实写回项目状态文件。新 Codex 会话只需读取：

- AGENTS.md
- PROJECT_STATE/CURRENT_STATE.md
- PROJECT_STATE/TASK_QUEUE.md
- PROJECT_STATE/LATEST_HANDOFF.md
- 当前任务包
- Git 状态

不得依赖聊天记忆。
