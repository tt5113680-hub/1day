# G1-W∞-122 ACCEPTANCE — 代理结算周期 + 合同状态机（无资金托管）

- recorded_at: 2026-08-14 Asia/Shanghai
- task: `G1-R-AGENT-CONTRACT-SETTLEMENT` / W∞-122（Phase3 §7 / §6 W∞-SAAS，toward PARITY）
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §2「BD/合同（代理）」+ §7 `W∞-122 代理结算周期 + 合同状态（无资金）`
- executor: DeepSeek / Plan B（本切片，DeepSeek）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；**无资金托管、不含费率/佣金/分账**；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单

## Delivered

把 `/p/agents`（MP-03 省市区代理深层运营）从「结算(open/finalized)+配额+审批」推进到 **合同状态机 + 结算周期监控** 两块可作业闭环数据，全部由真实 `agent_contracts` / `agent_settlements` 档案行现场推导（禁止假 BI）。

### 1. migration `075_agent_contracts`
- 新表 `agent_contracts`（tenant_scoped）：`contract_code`/`contract_title`/`contract_status`（状态机）+ 生命周期字段 `sign_date`/`start_date`/`end_date`/`reason`/`approved_by`/`approved_at`/`paused_at`/`resumed_at`/`expired_at`/`terminated_at`；`(tenant_id,contract_code)` 唯一 + agent 维度索引。**不含资金、不含费率、不含佣金**。
- `agent_settlements` 新增 `cycle_number`（结算周期序号，同一代理商按开启顺序递增）+ `agent_settlements_cycle_idx`，使「周期」显式可观测（cycle 号 + period_code 双键）。

### 2. API `PlatformAgentController` + `PlatformAgentService`
- 合同状态机：`POST /api/v1/platform/agents/:id/contracts`（建 draft）+ `POST .../:id/contracts/:contractId/transition`（迁移），状态迁移校验 `CONTRACT_TRANSITIONS`：
  - `draft → pending → active`（激活写 approved_by/approved_at）+ `paused → active`（恢复写 resumed_at）；
  - `active/paused → paused/expired/terminated`；非允许迁移返回 `409`。
- 结算周期监控：`GET /api/v1/platform/agents/settlement-cycles`（只读）：按代理商聚合 `max_cycle`/`periods`/`finalized`/`finalizedAmountCents`。
- **写路径自审计 + Outbox**：建立合同/迁移/开启结算期/结算全部写 `audit_logs`（`platform.agent_contract_created`/`platform.agent_contract_transitioned`/`platform.agent_settlement_opened`/`platform.agent_settlement_finalized`）+ `outbox_events`（`.created.v1`/`.transitioned.v1`/`.opened.v1`/`.finalized.v1`），使合同/结算作业全程可追溯。
- `list()` 返回新增 `contracts[]`（含 agentName/regionName/生命周期）与 `settlementCycles[]`（含周期进度）；合约 endpoints 均 `platform.manage` fail-closed + `x-request-id` 校验。

### 3. `/p/agents` 平台页
- 新增「合同状态机」面板（合作合同 · 状态机 表单：代理商/合同编码/标题/签署日期 → 建立合同草稿）。
- 新增「合作合同记录」：每条合同显示 状态徽标 + 生命周期（签署/原因）+ 迁移按钮（草稿→提交审核；待审核→生效/作废；生效→暂停/终止；已暂停→恢复/终止）。
- 新增「结算周期监控」：每代理显示 至第 N 期 / 结算期数 / 已结算 / 应收合计 + 已全部结算|仍有待结算 徽标。
- `代理运营分布` 新增「合同状态分布」「结算周期分布」「分期结算进度分布」三面板（宽度百分比 `barWidth`，空数据「暂无记录」，禁止假 BI）。
- 诚实底注：`结算/配额是代理运营账，不是消费者成交；合同仅登记合作状态、无资金托管、不含费率/佣金/分账；本地试点记录，未接美团实时代理数据；不包含本平台收款、非本平台下单。`

## Evidence commands

- `pnpm --filter @oneday/database build` + `pnpm --filter @oneday/database migrate`（DATABASE_URL=oneday_v3_test）apply `075_agent_contracts:Up`
- `pnpm --filter @oneday/api build`；`pnpm --filter @oneday/platform-web build`；`pnpm build` → 20/20
- `pnpm typecheck` → 20/20；`pnpm test:unit` → 49/49；`pnpm evidence:check` → 74/74
- 变更文件 eslint（0 errors）+ prettier clean
- `node --test tests/g1-winf122-agent-contract-settlement.test.mjs` → **3/3**（静态 + 真实 DB round-trip：建立合同 draft→pending→active→paused→active；非法迁移 409；重复合同 code 409；结算周期 cycle 1→2 + settlement-cycles 监控；audit/outbox 落库断言；未授权 401）
- 回退回归 `tests/page-p-agent-ops.test.mjs` → 1/1（原有配额/结算/审批不受影响，`cycle_number` 兼容默认 0）
- `node --test tests/g1-winf*.test.mjs` → 串行 **440/441**（唯一失败 `g1-winf116` 为并行 API 起服 `ECONNRESET` 瞬断，隔离复跑 3 轮 7/7 通过，与本刀无涉）

## Honest boundaries

合同/结算均为推广员工具侧本地合作与代理运营档案：合同状态机**无资金托管、不含费率/佣金/分账**；结算/配额是代理运营账，不是消费者成交；不接美团/抖音实时代理/结算数据、不代表第三方成交、不含支付金额、非本平台下单、无 GMV；`/m/workflows` 维持 CUSTOM；§5 READY 未触碰；不复活 consumer_orders/本平台下单/收单。

Not owner sign-off（`PRODUCT_OWNER_UI_ACCEPTANCE.md` 由主人签署）。
