# 可观测性与发布

## 日志

结构化 JSON，包含 request_id、trace_id、tenant_id、actor_id、route、duration、result。

## 指标

- API 可用率和延迟；
- 队列积压；
- 连接器失败率；
- 工作流超时；
- AI任务耗时与失败率；
- 页面核心 Web Vitals；
- 多租户异常和权限拒绝。

## 发布

- 开发、测试、预发布、生产环境隔离；
- 数据库迁移可回滚或前向修复；
- Feature Flag 控制高风险能力；
- 发布前自动跑商业 MVP 冒烟链路；
- 发布失败自动停止，不继续迁移或扩散。
