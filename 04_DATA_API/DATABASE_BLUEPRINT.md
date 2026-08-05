# 数据库蓝图

## 身份与组织

- tenants
- organizations
- organization_relations
- users
- memberships
- roles
- permissions
- role_permissions
- data_scopes
- stores
- channels
- business_circles
- business_circle_merchants

## 客户与经营

- customers
- customer_identities
- customer_sources
- customer_ownerships
- customer_tags
- customer_tag_evidence
- customer_interactions
- leads
- lead_assignments
- follow_ups
- tasks
- reminders
- approvals
- deals
- payments
- orders
- order_evidence
- verifications
- contributions
- nurture_segments
- nurture_actions

## 页面与插件

- page_templates
- pages
- page_versions
- page_modules
- module_instances
- entry_points
- scene_codes
- plugins
- plugin_installs
- connectors
- connector_credentials
- connector_runs
- external_actions

## 工作流与 AI

- workflow_definitions
- workflow_versions
- workflow_instances
- workflow_steps
- workflow_tasks
- ai_suggestions
- ai_actions
- ai_feedback
- knowledge_sources
- generated_contents

## 事件与审计

- domain_events
- outbox_events
- audit_logs
- export_logs
- notification_logs
- security_incidents

## 通用字段

主表至少包含：id、tenant_id、status、created_at、created_by、updated_at、updated_by、deleted_at、version。

不依赖数据库外键时，必须通过应用层校验、唯一索引、事务、迁移检查和孤儿数据测试保证完整性。
