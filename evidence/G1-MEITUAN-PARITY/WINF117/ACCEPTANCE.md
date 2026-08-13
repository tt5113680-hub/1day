# G1-W∞-117 ACCEPTANCE — 通知已读/忽略/批量 + 设置变更审计（MPC-13 / MPC-12）

- recorded_at: 2026-08-13 Asia/Shanghai
- task: `G1-R-MANAGEMENT-NOTIFICATION-DEPTH` / W∞-117
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` Phase2（§4 P1 MPC-12/13：变更审计；通知已读/忽略/批量）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；§5 READY 未触碰

## Delivered

把 MPC-13 `/m/notifications`（通知中心）从「只读待推进列表」推进到 **汇总→已读→忽略→批量→设置变更审计** 的可作业闭环，全部由真实租户档案行现场推导/落库（禁止假 BI）：

### 1. 迁移 `070_management_notifications`（新表 | MPC-13）
- `management_notifications`：tenant_scoped，`(tenant_id, category, source_type, source_id)` 唯一，字段 id/tenant_id/category(anomaly|approval|workflow)/source_type/source_id/title/body/deep_link/sent_at/read_at/status(active|ignored)/version + 生命周期；
- `management_notifications_inbox_idx`（tenant_id, status, read_at, sent_at）；
- 与 `employee_notifications` 同构，把派生即弃的管理通知物化为持久档案行，具备稳定 `notificationId` 与状态。

### 2. 通知已读 / 忽略 / 批量（`management-notification.service.ts` + `management-notification.controller.ts` | MPC-13）
- `list`：先 `materialize`（按 overdue tasks / pending ownership approvals / active workflows 派生，`on conflict do nothing`）再回读持久行；新增 `state=all|unread|read|ignored` 筛选 + 每行返回 `notificationId/readAt/status/version`（`id` 保留源聚合 id 向后兼容）；
- `PATCH /api/v1/management/notifications/:id/read` `markRead`：Idempotency-Key 幂等重放 + 乐观锁 version（409）+ 已忽略 409（IGNORED）+ 未知 404 + `audit_logs management.notification_read` + `outbox management.notification_read.v1`；
- `POST /api/v1/management/notifications/batch` `batch`（`@HttpCode(200)`）：`action ∈ read|unread|ignore|unignore`、`ids` 1–200，批量更新状态/已读（ignore/unignore 互斥忽略可见），Idempotency-Key 幂等重放 + `audit_logs management.notification_batch` + `outbox management.notification_batch.v1`；忽略行默认从 `all` 隐藏、可在 `state=ignored` 查见。

### 3. 设置变更审计（`settingsAudit` | MPC-12）
- `GET /api/v1/management/notifications/settings-audit`：仅读 `audit_logs.action='tenant.operating_settings_updated'` 真实档案行，返回 `records[]{actorName/createdAt/resourceId/correlationId/detail}` + `count`；
- 与既有 `tenant_operating_settings` 写路径（already 写 `tenant.operating_settings_updated` audit + outbox）形成「变更→审计」闭环；仅记录工具规则变更轨迹，不碰钱/销售。

### 4. `/m/notifications` UI（`page.tsx` + `notifications.module.css` | MPC-13/12）
- 新增批量操作工具条：勾选态 checkbox + 批量标为已读/批量标为未读/批量忽略；
- 新增状态筛选（全部/未读/已读/已忽略）+ 类型筛选（全部类型/异常/审批/工作流）；
- 每行新增状态徽标（未读/已读/已忽略）+「标为已读」按钮（乐观锁 version）；
- 新增「工具设置变更审计」面板（MPC-12）：真实设置变更审计档案行表格（时间/操作者/资源/关联）；
- 全部真实数据现场推导，禁止假 BI；loading/forbidden/error/empty 与分布面板/诚实底注全保留。

## Evidence commands

- `node --test tests/g1-winf117-management-notification-depth.test.mjs` → **1/1**（真实 DB round-trip：独立租户 + owner 登录 → 401/跨租户 403 deny → list 物化稳定 notificationId/version → 非法 batch action 400 → 单条 markRead 乐观锁升级 version + Idempotency-Key 幂等重放得同一 payload → 陈旧 version 409 → 未知 id 404 → state=read 回显已读/仍见 all → batch ignore 2 条 updatedCount=2 + 幂等重放 → 忽略从 all 隐藏/state=ignored 可见 → batch unignore → batch unread 重置 → settings-audit 跨租户 403 + count 为 number → audit management.notification_read/batch 落库 + outbox .v1 落库断言）
- 随动回归：`node --test tests/management-notifications.test.mjs` → **1/1**（既有只读聚合接口向后兼容不回归）
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → **428/428**（原 427 + 本刀 1）
- 真实 DB 串行复核（W107–117 + matrix-sync-gateway + p1-b-content-sync + management-notifications）→ **109/109**
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49（12 文件）
- `node tests/evidence-contract.test.mjs` → 74/74；变更文件 eslint（0 errors）+ prettier clean
- `pnpm db:migrate`（DATABASE_URL=oneday_v3_test）apply **070_management_notifications**

## Honest boundaries

- 通知状态（已读/忽略/批量）与设置变更审计仅是**推广员工具在租户内的待推进痕迹与工具规则变更审计**
- **不接美团/抖音实时、不包含支付金额、销售成交或第三方订单履约状态、非本平台下单**
- `list`/`markRead`/`batch`/`settingsAudit` 全 `tenant.manage` fail-closed；Idempotency-Key + 乐观锁全保留
- 忽略仅从通知中心默认视图隐藏该待推进项，**不会代第三方履约 / 不会删除源任务**
- **无 GMV、无储值/支付、非本平台下单**；`/m/workflows` CUSTOM；§5 READY deferred；不复活 consumer_orders / 本平台下单 / 收单

## Next

- **W∞-118** 配额触顶拦截（Phase3 SaaS 最强，§6 W∞-SAAS-QUOTA）——Phase2 收尾完成，进入 Phase3。

- Not owner sign-off — 工程对标断言，不等于 `PRODUCT_OWNER_UI_ACCEPTANCE.md` 已签。
