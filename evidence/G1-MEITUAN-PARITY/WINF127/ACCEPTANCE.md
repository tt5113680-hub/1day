# G1-W∞-127 ACCEPTANCE — Owner activation token（§5 续刀）

- recorded_at: 2026-08-15 Asia/Shanghai
- task: `G1-R-READY-OWNER-ACTIVATION-TOKEN` / W∞-127
- plan: `TENANT_ONE_CLICK_PROVISIONING_SPEC.md` Owner 激活 + `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §5
- executor: IDE Agent（本机）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；不复活 consumer_orders；不宣称全部商用

## Delivered

平台开通支持 **一次性激活令牌**，避免操作员浏览器长期保存老板明文密码：

1. migration `076_owner_activation_tokens`（pending → used，7 天过期）
2. `activationMode=token|password`：token 模式不收密码，老板用户 `status=pending` + `password_hash=null`
3. token 开通结束于 `awaiting_activation`；`ready_handoff` 保持 pending
4. `POST /api/v1/auth/owner-activate`（token 或 owner 场景 one-code）设置密码 → Run 进 `ready` + 签发会话
5. owner_activation QR 指向 `/owner-activate?code=...`；`/owner-activate` 页 + `/p/tenants/new` 默认 token 模式并展示令牌
6. password 模式保留兼容既有 fixtures / page-p-003

## Evidence

- `node --test tests/g1-winf127-owner-activation-token.test.mjs` → **2/2**
- `node --test tests/page-p-003-api.test.mjs` → **1/1**
- `node --test tests/g1-winf125-channel-same-ready-run.test.mjs` → **3/3**
- `node --test tests/g1-winf126-three-scene-qr.test.mjs` → **2/2**
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49
- `pnpm db:migrate`（test）apply `076_owner_activation_tokens`

## Out of scope（后续切片）

- mid-run resume / Outbox saga 续跑
- Worker health 全断言 / Circle 双审批可见性
- 渠道开通默认切到 token 模式（仍可传 password）

## Honest boundaries

激活令牌仅为本地开通交付；不含支付/GMV/本平台下单；不以平台操作员密码代替 Owner 激活（token 路径）。
