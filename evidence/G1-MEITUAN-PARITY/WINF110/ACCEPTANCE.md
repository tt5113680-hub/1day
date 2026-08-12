# G1-W∞-110 会员闭环加固：等级/权益规则 + 到期提醒 + 异常告警（Phase1 / 1.5 MPC-08）

- slice: `G1-R-MEMBERSHIP-RULES-ALERTS`
- recorded_at: 2026-08-13 Asia/Shanghai
- status: **PASS** (engineering closed-loop; 等级/权益规则 + 到期提醒 + 异常告警；真实 DB；禁止假 BI；无储值/支付；不含 §5 READY)
- branch: `hardening/COMMERCIAL-COMPLETION`
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §7 Phase1/1.5（跳过 §5 READY）

## Delivered

承接 W∞-109（CRM RFM 深操作）+ W∞-108（Storefront 发布链）+ W∞-107（工作台队列处置）+ W∞-88/46/41（会员中心概况条/分布/视觉），本刀把 **MPC-08 会员中心**（Phase1 1.5）从「发放/吊销/时间线」推进到可作业闭环：**等级/权益规则 + 到期提醒 + 异常告警**，全部由真实会员/权益档案推导，禁止假 BI，无储值/支付。

- **等级/权益规则 `membership_benefit_rules`（migration `065_membership_rules_alerts`）**：tenant_scoped 规则配置表。字段 = `title`/`tier`/`benefits_config`(jsonb 权益清单 benefitId+benefitTitle+maxQuantity)/`validity_days`/`enforce_quantity`/`enabled` + 生命周期 + `version`。`(tenant_id,tier)` 唯一 + `membership_benefit_rules_tenant_enabled_idx` 索引。同一迁移给 `membership_enrollments` 增加 `expires_at`（会员有效期截止，供到期提醒）与 `last_active_at`（最近核销时间，供活跃度与异常），为真实到期/活跃信号提供字段。
- **`GET/ POST /api/v1/management/memberships/rules`（`ManagementMembershipDepthController/Service`）**：`tenant.manage` fail-closed；`rules` 列出租户等级→权益规则（真实档案行）；`POST rules` 幂等 upsert（Idempotency-Key 重放，`(tenant_id,tier)` on-conflict，写 `audit_logs membership.rule_upserted` + `outbox_events membership.benefit_rule.upserted.v1`（correlation/trace），返回 `{id,tier,version}`）。
- **`GET /api/v1/management/memberships/renewals`（到期提醒）**：`tenant.manage`；真实档案信号 —— 有效期临近 3 天内（`expires_at <= now()+3d`）、已过期不在册？不，取 active 且 `expires_at` 临期、或 `last_active_at` 超过 90 天、或从未活跃且入会超 120 天。返回真实 enrollment 行（member_code/tier/display_name/store_name/joined_at/expires_at/last_active_at）。
- **`GET /api/v1/management/memberships/alerts`（异常告警）**：`tenant.manage`；真实档案信号 —— 分 `suspended`（enrollment_status in suspended/cancelled）、`expired`（active 且 expires_at 已过）、`no_recent_activity`（active 且 last_active_at 超 180 天）。
- **列表集成（`membership-commercial.service.ts`）**：`list` 查询新增返回 `e.tier/e.expires_at/e.last_active_at`；员工 `redeem`（`change` 中 entryType=redeem）同步回写 `last_active_at=now()`，使到期/活跃信号与核销真实联动。
- **Management `/m/memberships`（MPC-08）**：`load()` 并行拉取 `rules/renewals/alerts`；新增「等级/权益规则」白卡面板（真实规则行列表 + 快捷按已建档权益保存规则表单：等级/有效天数/保存，幂等 POST）+「到期提醒」白卡（真实提醒行，StatusBadge tier + 有效期/最近核销/长期无活跃 信号标注）+「异常告警」白卡（真实告警行，danger 徽标 已暂停/已取消/有效期已过/长期未核销）；会员列表行新增 `等级 <tier>` 与 `有效期至 <date>`。honest 底注（规则不含储值、不含支付、不代第三方成交）。

**诚实边界全保留**：等级权益仅为「规则配置」，到期提醒与异常告警为真实会员/权益档案信号；**不含储值、不含支付、不代第三方成交、不含成交金额**；不接美团/抖音实时；不复活 consumer_orders / 本平台下单/收单；`/m/workflows` 保持 CUSTOM；§5 READY 未触碰。

## Files

- `packages/database/src/migrations/065_membership_rules_alerts.ts`（新）→ `membership_benefit_rules` 表 + `expires_at``last_active_at` 列
- `packages/database/src/migrator.ts` / `packages/database/src/types.ts` → 注册 migration + `MembershipBenefitRulesTable` + `Database` 接口 + enrollments 新列类型
- `apps/api/src/management-membership-depth.controller.ts` / `management-membership-depth.service.ts`（新）→ `rules` / `rules` POST / `renewals` / `alerts`（audit + outbox + 幂等）
- `apps/api/src/app.module.ts` → 注册 `ManagementMembershipDepthController/Service`
- `apps/api/src/membership-commercial.service.ts` → list 返回 tier/expires_at/last_active_at；redeem 回写 last_active_at
- `apps/management-web/app/m/memberships/page.tsx` / `page.module.css` → 等级/权益规则 + 到期提醒 + 异常告警 面板 + 会员行等级/有效期
- `tests/g1-winf110-membership-rules-alerts.test.mjs`（新, 7/7 静态契约）
- `tests/management-membership-rules-alerts.test.mjs`（新, 1/1 真实 DB 闭环）

## Verify

```text
pnpm --filter @oneday/database build/typecheck   # PASS（含 065）
pnpm --filter @oneday/api build/typecheck        # PASS
pnpm typecheck                                   # 20/20
pnpm build                                       # 20/20
pnpm db:migrate（DATABASE_URL=oneday_v3_test）   # apply 065（已应用验证）
node --test tests/management-membership-rules-alerts.test.mjs  # 1/1（真实 DB：租户 owner login → 跨租户 deny → rules 幂等 upsert/重放 → rules 回读 → renewals 含临期真实行 → alerts 含 suspended/expired/no_recent_activity → audit/outbox 落库断言）
node --test tests/g1-winf110-membership-rules-alerts.test.mjs  # 7/7 静态契约
node --test --test-concurrency=1 tests/g1-winf*.test.mjs        # 392/392（原 385 + g1-winf110 7）
node --test tests/management-*.membership-rules-alerts / management-crm-rfm-360 / management-queue-disposition / management-notifications  # 相关回归 10/10
pnpm test:unit                                    # 49/49（12 files）
npx eslint <changed>.ts/.tsx                      # clean
npx prettier --check <changed>                    # clean
```

> 全部 `g1-winf*` 392/392 通过。全仓 `tests/*.test.mjs` 中的 9 个失败（hardening-001/002、page-c-002/search、page-m-012、sys-11/22、sys-5×2）为 **clean HEAD 基线复现一致** 的既有失败，与本节无关（已 stash 基线对照验证，与 W∞-110 无涉）。

## Gates

- migration 065 apply（`membership_benefit_rules` + enrollments 到期/活跃列）PASS；
- 真实 DB 闭环（租户 owner login → 跨租户 403/404 deny → `rules` 幂等 upsert/重放 → `rules` 回读 → `renewals` 含临期真实行 → `alerts` 含 suspended/expired/no_recent_activity → audit/outbox 落库断言）PASS；
- 到期提醒与异常告警由真实 `membership_enrollments` 档案信号现场推导（禁止假 BI）；
- 诚实边界全保留（不含储值、不含支付、不代第三方成交、不含成交金额）；
- typecheck/build/unit/g1-winf 全绿；eslint + prettier clean；`/m/workflows` CUSTOM；§5 READY 未开工；无 GMV、不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
