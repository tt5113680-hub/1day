# G1-W∞-1 美团代理后台深层 — 省市区代理结算 / 配额 / 审批（MP-03 深层）

- slice: `G1-R-AGENT-DEEP-OPS`
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS**（engineering；非 owner G1 签收）

## What changed

平台/代理 PC 在 W6 省市区代理树之上补齐**代理商深层运营**（结算 / 配额 / 审批），对标美团代理后台 deep ops。

1. **数据层**：迁移 `057_agent_operations.ts`（注册进 migrator 057）
   - `agent_quotas` — 代理商入驻配额（`merchant_quota`，唯一 `tenant_id+agent_id`）
   - `agent_settlements` — 代理商周期结算（`period_code`/`period_start`/`period_end`/`settlement_status`/`amount_cents`，唯一 `tenant_id+agent_id+period_code`）
   - `agent_onboarding_approvals` — 商户入驻开通审批（`approval_status` pending/approved/rejected，唯一 `agent_id+merchant_tenant_id`）
   - 三类各建索引；**无演示 seed**（仅真实基建；商户/代理沿用 056 结构）。
2. **API 层**：`PlatformAgentService`/`Controller` 扩展（写操作均需 `platform.manage`，读沿用 `platform.read`）
   - `GET /api/v1/platform/agents` 投影扩展 `quotas/settlements/approvals`
   - `POST /api/v1/platform/agents/:id/quota` — 设定/更新配额（不得小于已用商户数 → 400）
   - `POST /api/v1/platform/agents/:id/settlements` — 开启结算期（重复 period → 409）
   - `POST /api/v1/platform/agents/settlements/:settlementId/finalize` — 按「已归属商户数 × 每商户应收」结算并关闭（重复 → 409）
   - `POST /api/v1/platform/agents/:id/approvals` — 发起入驻审批（重复 → 409）
   - `POST /api/v1/platform/agents/approvals/:approvalId/decide` — 通过（自动执行商户归属）/ 驳回（重复 → 409）
3. **UI 层**：Platform PC `/p/agents` 深层运营区
   - 入驻配额面板：选代理商 + 可开通席位数 → 保存配额
   - 周期结算面板：选代理商 + 结算期编码 + 起止日期 + 每商户应收（元）→ 开启结算期
   - 入驻审批面板：选代理商 + 待入驻商户 → 发起审批
   - 结算记录卡：结算中（应收 X 元 + 结算按钮）/ 已结算；审批记录卡：待审批（通过/驳回）/ 已通过/已驳回
   - 代理树卡片新增「配额 X 席 · 已用 Y 席」；全部 `--od-*` token，无 raw hex。

## Verification

- `pnpm typecheck` **20/20 PASS**
- `pnpm build` **20/20 PASS**（platform-web 路由含 `/p/agents`）
- `tests/page-p-agent-ops.test.mjs`（node API+DB，L2）**PASS**：登录系统账号 → 建区域→建代理→设配额 5→归属 1 商户→配额低于已用 400→开结算期（open）→重复 period 409→结算（unit 100 元=10000 分，1 商户→amount 10000、merchantCount 1）→重复结算 409→发起审批（pending）→重复 409→通过（自动归属 merchant2）→重复裁决 409→列表投影 quotas（5）+ settlements（finalized）+ approvals（approved）+agent.merchantCount=2；DB `agent_quotas/agent_settlements/agent_onboarding_approvals` 计数 1/1/1；无 token 401
- 回归：`page-p-agents` **1/1 PASS**；`menu-dto.vitest.ts` 17/17 + `platform-shell-tokens` 2/2 PASS；`sys-6-network-packs`+`sys-29-admin-nav-groups`+`sys-28-platform-shell-isolation`+`page-p-004-api`+`channel-001-api` **9/9 PASS**

## Honest boundary

- 结算/配额/审批 = **本地试点记录**；未接美团实时结算/配额/审批数据。
- 结算金额按「当前归属商户数 × 每商户应收」本地计算；非第三方对账。
- 审批通过触发既有 `affiliate` 归属逻辑（本地归属记录）。非全量美团代理后台 pixel parity。
- Not full 美团代理后台 pixel parity；未接真实第三方数据。
- Do not auto-sign `PRODUCT_OWNER_UI_ACCEPTANCE.md`。
- Next: 继续 W∞-2 其余 GAP 逐页（Consumer H5 搜索/下单/订单、Management PC 深页等），直到 owner 签 G1。

## Pre-existing failures not caused by this slice

- `tests/tokens.vitest.ts`、`tests/storefront-renderer.vitest.ts`（design-token `brand-800` 投影）在本次改动前即失败（`@oneday/design-tokens` / storefront 文件，本切片未触碰），与 W∞-1 无关（W6 acceptance 已记录）。
