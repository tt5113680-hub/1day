# 事件驱动模型

## 事件命名

`领域.对象.动作.v版本`

示例：

- consumer.session.started.v1
- consumer.action.clicked.v1
- lead.created.v1
- customer.ownership.assigned.v1
- employee.task.overdue.v1
- evidence.submitted.v1
- order.result.confirmed.v1
- ai.suggestion.generated.v1
- business_circle.merchant.joined.v1

## 事件字段

每个事件至少包含：

- event_id
- event_name
- event_version
- occurred_at
- tenant_id
- organization_id
- actor_type / actor_id
- subject_type / subject_id
- source_type / source_id
- correlation_id
- causation_id
- trace_id
- payload
- evidence_refs

## 使用原则

- 核心业务先写数据库事务，再通过 Outbox 投递事件。
- 消费端必须幂等。
- 不允许仅靠前端埋点作为关键成交或归属证据。
- 所有事件可追溯到请求、人员、场景和原始证据。
