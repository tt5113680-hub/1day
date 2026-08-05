# FOUNDATION-008 验收证据

- `PostgresOutbox` 持久化 `tenant_id`、事件名、聚合、payload、`correlation_id`、`trace_id`。
- `004_event_consumptions` 以 `(event_id, consumer_name)` 唯一约束实现消费者幂等。
- 真实 PostgreSQL 测试：首次消费成功，重复消费返回 false，处理器仅执行一次。
- 全仓 typecheck、lint、format:check、33 项根测试和 build：PASS。
