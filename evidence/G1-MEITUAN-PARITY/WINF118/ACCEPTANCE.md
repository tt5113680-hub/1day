# G1-W∞-118 ACCEPTANCE — 配额触顶拦截（W∞-SAAS-QUOTA）

- recorded_at: 2026-08-14 Asia/Shanghai
- task: `G1-R-SAAS-QUOTA` / W∞-118
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` Phase3（§6 套餐配额触顶硬拦截）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；§5 READY 未触碰

## Delivered

把 Phase3 SaaS 配额从「平台设置里的数字」推进到 **用量现场推导 → 触顶硬拦截超额新建写 → 被拒台账 + 审计 + Outbox → `/m/settings` 升级引导** 的可作业闭环，全部由真实档案行现场推导/落库（禁止假 BI）：

### 1. 迁移 `071_tenant_quota_rejections`
- `tenant_quota_rejections`：每次配额触顶、写被硬拒的持久台账（dimension=`users|customers|stores`、source_resource、当时 usage/limit、actor）
- `tenant_quota_rejections_tenant_dimension_idx`（tenant_id, dimension, rejected_at）
- 与 `platform_tenant_settings.quotas` `{users,customers,stores}` 构成配额闭环；套餐默认 starter/growth/enterprise 回落

### 2. 硬拦截写路径（`TenantQuotaService.assertWithin`）
- `createStore` / `customers.create` / `employees.invite` 在写事务内先 `assertWithin`
- 用量：开放账号 = 在册 active memberships + pending 未过期邀请；客户 = active customers；门店 = active stores
- 触顶：HTTP **400** `QUOTA_LIMIT_REACHED`（结构化 message），超额行不落库
- 被拒台账 / `audit_logs management.quota_rejected` / `outbox tenant.quota_rejected.v1` 走 **独立 auto-commit** 连接，避免外层 `withIdempotency` rollback 把拒绝记录一起抹掉；台账失败也不得把硬拦截变成 500

### 3. 状态 API + `/m/settings` 面板
- `GET /api/v1/management/quota/status`（`tenant.manage` fail-closed + `x-request-id`）：plan/planLabel + 三维 usage/limit/remaining/reached + 最近被拒
- `/m/settings` 新增「套餐配额用量」白卡（已用满徽标 + 升级引导 + 最近拦截），诚实底注 source=local

## Evidence commands

- `node --test tests/g1-winf118-tenant-quota-interception.test.mjs` → **1/1**（真实 DB：401/跨租户 403 → status 三维 → stores/customers/users 各「额度+1 内创建 201 / 超额 400 QUOTA_LIMIT_REACHED 且不落库」→ status.reached + rejection ledger + audit/outbox ≥3）
- `node --test --test-concurrency=1 tests/g1-winf*.test.mjs` → **429/429**（原 428 + 本刀 1）
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49（12 文件）
- `node tests/evidence-contract.test.mjs` → 74/74；变更文件 eslint（0 errors）+ prettier clean
- `pnpm db:migrate`（DATABASE_URL=oneday_v3_test）apply **071_tenant_quota_rejections**

## Honest boundaries

- 配额仅登记推广员工具在租户内可承载的入口/客户/开放账号规模上限
- 拦截只拒绝超额新建写，不改既有数据、不碰钱/销售/管店、无 GMV、不含支付金额、非本平台下单、不接美团/抖音实时
- `/m/workflows` CUSTOM；§5 READY deferred；不复活 consumer_orders / 本平台下单 / 收单

## Next

- **W∞-119** suspend 会话即时失效（Phase3 SaaS，§6 W∞-SAAS-LIFE）

- Not owner sign-off — 工程对标断言，不等于 `PRODUCT_OWNER_UI_ACCEPTANCE.md` 已签。
