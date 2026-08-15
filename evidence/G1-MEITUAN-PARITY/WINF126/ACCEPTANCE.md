# G1-W∞-126 ACCEPTANCE — 三场景 QR 交付（§5 续刀）

- recorded_at: 2026-08-15 Asia/Shanghai
- task: `G1-R-READY-THREE-SCENE-QR` / W∞-126
- plan: `TENANT_ONE_CLICK_PROVISIONING_SPEC.md` step 8 + `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §5
- executor: IDE Agent（本机）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；不复活 consumer_orders；不宣称全部商用

## Delivered

把开通交付从「单一 primary ONE-CODE」推进为 **三类可解析、可撤销、可追踪** 的交付码：

1. `consumer_storefront` — 消费者数字门店入口（兼容既有 `delivery.oneCode`）
2. `owner_activation` — 老板激活 / 管理端入口（`role=management`）
3. `employee_onboarding` — 员工入职 / 工作台入口（`role=employee`）
4. `POST /api/v1/platform/onboarding/:runId/delivery/revoke` — 按 scene 撤销；解析立即 404；写 audit + outbox
5. `/p/tenants/new` 展示三场景列表与撤销按钮
6. READY 校验要求三场景均 active（`consumer_qr_ready` / `owner_qr_ready` / `employee_qr_ready` + `one_code_ready`）

## Evidence

- `node --test tests/g1-winf126-three-scene-qr.test.mjs` → **2/2**
- `node --test tests/page-p-003-api.test.mjs` → **1/1**（`one_codes: 3`）
- `node --test tests/g1-winf125-channel-same-ready-run.test.mjs` → **3/3**
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49

## Out of scope（后续切片）

- mid-run resume / Outbox saga 续跑
- Owner 一次性激活令牌（替代开通表单长存密码）
- Worker health 全断言 / Circle 双审批可见性

## Honest boundaries

交付码仅为本地短链解析与撤销；老板激活场景指向管理端入口，本刀不改为无密码激活令牌流程；不含支付/GMV/本平台下单。
