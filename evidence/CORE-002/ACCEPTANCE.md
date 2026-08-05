# CORE-002 验收证据

- 迁移 `006_employee_membership` 新增租户边界内的员工与成员邀请持久化模型。
- API 支持员工列表、幂等邀请、邀请接受（创建用户/成员/员工）和版本化离职；关键写操作写入 audit log 和 outbox event。
- `node --test tests/core-002-e2e.test.mjs`：1/1 通过，覆盖生命周期、幂等、版本冲突、未登录与跨租户拒绝。
