# G1-W∞-130 ACCEPTANCE — Circle 双审批可见性（§5 续刀）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-READY-CIRCLE-DUAL-APPROVAL-EXPOSURE` / W∞-130
- plan: `TENANT_ONE_CLICK_PROVISIONING_SPEC.md` Channel/Circle + §7 + `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §5
- executor: IDE Agent（本机）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；不复活 consumer_orders；不宣称全部商用

## Delivered

开通可选申请商圈，基础 READY 不阻塞，Consumer 在双审批前不可见：

1. onboarding 接受可选 `circleId`；写入 `platform_business_circle_merchants`（`circle_approval_status=pending` + `approval_status=pending` + `display_config.visible=false`）
2. delivery.`circle.exposure=pending`；`channel_circle` 步骤标记 succeeded
3. verify 新增 `circle_not_consumer_visible`（禁止未双审批且可见的商圈成员）
4. `/p/tenants/new` 展示商圈曝光状态 + verification 项
5. Consumer discovery 对 pending 成员不返回（既有双审批过滤 + 本刀断言）

## Evidence

- `node --test tests/g1-winf130-circle-dual-approval-exposure.test.mjs` → **2/2**
- page-p-003 + winf125..129 回归 → **12/12**
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49

## Out of scope（后续）

- 读模型/缓存版本全断言
- Phase4 连接器（待 API/商务）
- 主人 UI 签验 / 腾讯云（G）

## Honest boundaries

商圈曝光仅为本地双审批可见性；不调用美团/抖音；不含支付/GMV/本平台下单。
