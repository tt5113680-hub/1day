# G1-W∞-137 ACCEPTANCE — 会员等级分布 + 批量到期策略（§2 densify）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-MEMBERSHIP-TIERS-BATCH-EXPIRY` / W∞-137（§2 会员 densify 续刀）
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §2「会员：等级规则、批量发放、到期提醒、异常告警、cohort」
- executor: DeepSeek Plan B（无人值守）
- claim_boundary: 工程 PASS；非主人 UI 签验；无储值/支付/GMV、不含第三方成交或履约，未复活 consumer_orders / 本平台下单/收单。

## Delivered

1. `GET /api/v1/management/memberships/tiers`
   - 会员等级分布：按真实 `membership_enrollments` 档案 `tier` 聚合——在册 `enrolled` / 仍有效 `stillValid` / 14 天内临期 `expiringSoon` / 已过期 `expired`；join `membership_benefit_rules` 带出 `validityDays` / `ruleEnabled` / `ruleTitle`；未配置规则等级兜底（`unassigned` → `tier: null`）。租户隔离；真实聚合，禁止假 BI；不含储值/支付/GMV。
2. `POST /api/v1/management/memberships/batch-expiry`
   - 批量到期策略：对选中的在册会员（≤50）一次延后/设置 `expires_at`（`addDays` 1–3650，无到期设置则自 now 起算）；每个成功会员 `version+1`、写 per-enrollment `audit_logs` + `outbox_events`（同事务）；整批幂等（`idempotency_keys` 重放返回原响应）；范围 `storeIds` 越界记 `OUT_OF_SCOPE` 跳过；校验失败 400。
   - audit（`membership.batch_expiry_applied` batch 级 + `membership.expiry_extended` per-enrollment）+ outbox（`membership.expiry.extended.v1`）。
3. `/m/memberships` UI：
   - 新增白卡分布面板 `会员等级分布`（等级 · 在册/仍有效/14天内临期/已过期，`data-testid="tier-<tier>"`，真实档案现场推导）。
   - 新增 `批量到期策略` 面板：勾选在册会员 → 输入延后天数 → 应用到期策略（幂等 POST，`idempotency-key`），成功/失败提示，成功后刷新；不满足校验时提示。
   - honest 底注：等级/到期分布由本地 membership_enrollments 与规则档聚合，不含储值/支付/GMV，不代表第三方成交。

## Evidence

- `tests/g1-winf137-membership-tiers-expiry.test.mjs` — **2/2**
  - 静态：controller `@Get('tiers')` / `batch-expiry`、service `tiers`/`batchExpiry`、page `会员等级分布`/`批量到期策略`/`expiryDays`、无 Math.random。
  - DB：真实库种子 gold/standard 会员 + gold 规则 → `tiers` 返回等级/在册/临期（baseline-relative，隔离持久 `oneday_v3_test` 既有 254 行 seed，gold 与 standard 相对基线 +1）、disclaimer；`batch-expiry` 90 天 → `addDays=90`/`updatedCount=2`/`skippedCount=0`、重放幂等返回相同 updatedCount、`expires_at` 已延后到未来、audit `membership.batch_expiry_applied` 相对基线 +1、outbox `membership.expiry.extended.v1` 2 条、非法 `addDays=0` → 400。
  - **测试隔离修正**：断言改为相对基线（持久测试库累积了 prior-slice seed 数据），使 W137 在非重置测试库上可复跑且确定。
- `pnpm --filter @oneday/api build` PASS、`pnpm --filter @oneday/management-web build` PASS（含 `/m/memberships`）。
- `pnpm typecheck` **20/20**、`pnpm build` **20/20**。
- `pnpm test:unit` **49/49**。
- 回归：`tests/g1-winf137`（2/2）+ `g1-winf133`（1/1）+ `g1-winf135`（2/2）+ `g1-winf41`（4/4）通过。
- eslint + prettier clean（变更 TS/test 文件）。

## 修复（W137 生产代码 bug）

- `batch-expiry` 批级 audit 的 `resource_id` 原传 `${tenantId}:batch` 字符串，`audit_logs.resource_id` 为 `uuid NOT NULL` 导致 500；改为使用该操作 `correlation_id`（合法 uuid）作为 `resource_id`，批上下文保留在 `details`。W137 测试捕获并验证通过。

## Honest boundaries

等级/到期分布与批量策略均作用于本地 `membership_enrollments` 档案与规则档；不含储值/支付/GMV、不代表第三方成交或履约；不接美团/抖音实时会员数据；未复活 consumer_orders / 本平台下单/收单；不代签主人 UI 验收。

## Pre-existing note（与本次无关）

- `g1-winf88` 对 `/m/memberships` summaryStrip 断言 `repeat(3)`，而该页现状为 `repeat(4)`（`page.module.css` `.summaryStrip` 未改动）——为 HEAD 既有预存偏差（W136 acceptance 已记录同类 W89 偏差）；本次未触碰 memberships 的 CSS，不在 W137 范围。
