# G1-W∞-125 ACCEPTANCE — Channel 开通委托同一 READY Run（§5 首刀）

- recorded_at: 2026-08-15 Asia/Shanghai
- task: `G1-R-READY-CHANNEL-SAME-RUN` / W∞-125
- plan: `TENANT_ONE_CLICK_PROVISIONING_SPEC.md` + `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §5（主人「开始第五节」解锁）
- executor: IDE Agent（本机）
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；无储值/支付；不复活 consumer_orders；不宣称全部商用

## Delivered

把渠道 `/ch/merchants/new` 从「独立基础租户初始化」收敛为 **同一 `tenant_provisioning_runs` READY command**：

1. `ChannelMerchantOnboardingService.create` 委托 `PlatformOnboardingService.create`（`source_mode=channel_referral` + `channelId`）
2. `channel_circle` 步对 `channel_referral` **真实写入** `platform_channel_merchants`（不再空 stub）
3. 渠道侧写 `channel_merchant_onboardings` 台账，响应带回 `runId` / `provisioningState` / `steps`
4. `POST .../delivery` 标记 `delivered` 时强制校验存在 `state=ready` 的 Run（否则 `READY_REQUIRED`）
5. `/ch/merchants/new` 列表展示 READY 状态徽标

## Evidence

- `node --test tests/g1-winf125-channel-same-ready-run.test.mjs` → **3/3**
- `node --test tests/page-p-003-api.test.mjs` → **1/1**（平台直开通未回归）
- `pnpm typecheck` → 20/20；`pnpm build` → 20/20；`pnpm test:unit` → 49/49

## Out of scope（后续切片）

- mid-run resume / Outbox saga
- Owner activation token（无浏览器长存密码）
- 三场景 QR / Worker health 全断言
- Circle 双审批可见性

## Honest boundaries

开通仅登记渠道归属与本地 READY 交付；商圈曝光仍走独立邀请/双审批；不含支付/GMV/本平台下单。
