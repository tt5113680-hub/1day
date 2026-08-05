# 多租户与权限架构

## 隔离维度

- tenant_id：租户边界
- organization_id：组织边界
- merchant_id：商户边界
- store_id：门店边界
- channel_id：一级渠道边界
- business_circle_id：固定商圈边界

## 权限模型

RBAC + 数据范围 + 动作级权限：

- 角色决定“能做什么”；
- 数据范围决定“能看谁的数据”；
- 动作权限决定“是否可执行敏感操作”；
- 审批规则决定“是否需要上级确认”。

## 强制要求

- 所有业务表必须有 tenant_id。
- 跨租户访问默认拒绝。
- API 不得相信前端传入的 tenant_id。
- 查询必须通过统一 TenantContext 注入。
- 敏感操作必须写 audit_logs。
- 导出、批量转移、权限修改、客户归属修改必须记录操作者、原因、前后值和请求ID。
